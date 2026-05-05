<template>
  <view class="page">
    <AppHeader title="阵容编辑" leftAction="back">
      <template #right>
        <text class="save-btn" @click="saveTeam">保存</text>
      </template>
    </AppHeader>

    <scroll-view scroll-y class="content">
      <view class="hero-card">
        <view>
          <text class="hero-title">我的阵容</text>
          <text class="hero-subtitle">先选择最高形态精灵，再配置技能、个体值和性格。</text>
        </view>
        <view class="hero-actions">
          <view class="ghost-btn" @click="clearTeam">全部清空</view>
        </view>
      </view>

      <view class="team-grid">
        <view v-for="(slot, index) in team" :key="`slot-${index}`" class="team-card-wrap">
          <view v-if="!slot" class="team-card empty-card" @click="openAddSelector(index)">
            <view class="empty-inner">
              <text class="empty-plus">+</text>
              <text class="empty-title">添加精灵</text>
              <text class="empty-subtitle">点击选择最高形态精灵</text>
            </view>
          </view>

          <view v-else class="team-card">
            <view class="card-main">
              <view class="pet-art">
                <view class="pet-glow"></view>
                <image class="pet-image" :src="resolvePetImage(slot.image)" mode="aspectFit" />
              </view>

              <view class="pet-side">
                <view class="title-row">
                  <view class="title-main">
                    <text class="pet-name">{{ slot.petName }}</text>
                    <view class="type-row">
                      <TypeBadge
                        v-for="type in slot.types"
                        :key="`${slot.petId}-${type}`"
                        :label="type"
                        :color="getTypeColor(type)"
                        compact
                      />
                    </view>
                  </view>
                  <view class="panel-btn" @click="togglePanel(index)">
                    {{ panelExpandedIndexes.includes(index) ? '收起面板' : '查看面板' }}
                  </view>
                </view>

                <view class="info-row">
                  <text class="info-label">性格</text>
                  <text class="info-value">{{ getNatureSummary(slot) }}</text>
                </view>

                <view class="info-row">
                  <text class="info-label">个体值</text>
                  <text class="info-value">{{ getIvSummary(slot) }}</text>
                </view>

                <view class="skill-row">
                  <view
                    v-for="(skill, skillIndex) in buildSkillItems(slot.skills)"
                    :key="`${slot.petId}-skill-${skillIndex}`"
                    class="skill-slot"
                    :class="{ empty: !skill.name }"
                    @click="openConfigEditor(index)"
                  >
                    <image v-if="skill.icon" class="skill-icon" :src="resolvePetImage(skill.icon)" mode="aspectFit" />
                    <view v-else class="skill-fallback" :style="{ background: getSkillFallbackColor(skill) }">
                      <text class="skill-fallback-text">{{ getSkillShortName(skill.name) }}</text>
                    </view>
                    <view class="skill-name-bar">
                      <text class="skill-name">{{ skill.name || '+ 技能' }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <view v-if="panelExpandedIndexes.includes(index)" class="panel-preview">
              <text class="panel-preview-title">面板预览</text>
              <text class="panel-preview-subtitle">根据等级、个体值和性格增减益计算</text>
              <StatPanel :stats="buildStatItems(slot.panel, slot.ivs)" :columns="3" />
            </view>

            <view class="card-actions">
              <view class="action-btn primary" @click="openConfigEditor(index)">编辑配置</view>
              <view class="action-btn danger" @click="confirmDelete(index)">删除</view>
            </view>
          </view>
        </view>
      </view>

      <view class="analysis-grid">
        <view class="analysis-card">
          <text class="analysis-title">克制打击面不足</text>
          <text class="analysis-sub">这些属性目前缺少明显克制手段</text>
          <view v-if="coverageSummary.memberCount" class="analysis-tags">
            <view
              v-for="item in missingCoveragePreview"
              :key="'missing-' + item.type"
              class="type-tag neutral"
            >
              <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
              <text class="tag-text">{{ item.type }}</text>
            </view>
            <text v-if="!missingCoveragePreview.length" class="analysis-empty">当前阵容打击面比较完整</text>
          </view>
          <text v-else class="analysis-empty">先添加精灵，系统再帮你分析打击面。</text>
        </view>

        <view class="analysis-card">
          <text class="analysis-title">属性预警</text>
          <text class="analysis-sub">这些属性会克制队伍里大部分精灵</text>
          <view v-if="coverageSummary.memberCount" class="analysis-tags">
            <view
              v-for="item in alertThreatPreview"
              :key="'alert-' + item.type"
              class="type-tag warning"
            >
              <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
              <text class="tag-text">{{ item.type }}</text>
              <text class="tag-note">{{ item.threatenedCount }}/{{ coverageSummary.memberCount }}</text>
              <text v-if="item.maxMultiplier === 3" class="tag-alert">最高3倍克制</text>
            </view>
            <text v-if="!alertThreatPreview.length" class="analysis-empty">暂时没有特别集中的危险属性</text>
          </view>
          <text v-else class="analysis-empty">阵容为空时无法判断危险属性。</text>
        </view>
      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <TeamEditSheet
      :visible="sheetVisible"
      :mode="sheetMode"
      :edit-data="currentEditData"
      :pets="petChoices"
      :skill-options="currentSkillOptions"
      @close="closeSheet"
      @save="handleSave"
      @autosave="handleAutoSave"
    />
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import StatPanel from '@/components/StatPanel/StatPanel.vue'
import TeamEditSheet from '@/components/TeamEditSheet/TeamEditSheet.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { pets, petTypes } from '@/data/pets.js'
import { petsDetail } from '@/data/pets_detail.js'
import { skillIcons } from '@/data/skill_icons.js'
import { analyzeTeamTypeCoverage, calculatePetPanel, getHighestFormPets } from '@/data/game_math.js'
import { readStorage, writeStorage } from '@/utils/nav.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

const STORAGE_KEY = 'team_draft'
const DEFAULT_LEVEL = 60
const DEFAULT_STAR = 5

const NATURE_LABEL_MAP = {
  none: '无',
  hp: '生命',
  attack: '物攻',
  magicAttack: '魔攻',
  defense: '物防',
  magicDefense: '魔防',
  speed: '速度'
}

const IV_LABEL_MAP = {
  hp: '生命',
  attack: '物攻',
  magicAttack: '魔攻',
  defense: '物防',
  magicDefense: '魔防',
  speed: '速度'
}

const TYPE_COLOR_MAP = petTypes.reduce((acc, item) => {
  if (item && item.key && !acc[item.key]) acc[item.key] = item.color
  return acc
}, {})

function createEmptyTeamSlots() {
  return Array.from({ length: 6 }, () => null)
}

function createDefaultEditorData() {
  return {
    petId: '',
    petName: '',
    image: '',
    types: [],
    skills: [],
    level: DEFAULT_LEVEL,
    star: DEFAULT_STAR,
    ivs: {
      hp: 0,
      attack: 0,
      magicAttack: 0,
      defense: 0,
      magicDefense: 0,
      speed: 0
    },
    natureUp: 'none',
    natureDown: 'none'
  }
}

function normalizeSavedSlot(slot) {
  if (!slot || !slot.petId) return null
  return {
    ...createDefaultEditorData(),
    ...slot,
    level: Number(slot.level ?? DEFAULT_LEVEL),
    star: Number(slot.star ?? DEFAULT_STAR),
    types: Array.isArray(slot.types) ? [...slot.types] : [],
    skills: Array.isArray(slot.skills) ? slot.skills.slice(0, 4) : [],
    ivs: {
      ...createDefaultEditorData().ivs,
      ...(slot.ivs || {})
    },
    panel: slot.panel || null,
    natureUpLabel: slot.natureUpLabel || NATURE_LABEL_MAP[slot.natureUp] || '无',
    natureDownLabel: slot.natureDownLabel || NATURE_LABEL_MAP[slot.natureDown] || '无'
  }
}

function clampIv(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(10, Math.round(number)))
}

export default {
  components: {
    AppHeader,
    StatPanel,
    TeamEditSheet,
    TypeBadge
  },
  data() {
    return {
      team: createEmptyTeamSlots(),
      panelExpandedIndexes: [],
      sheetVisible: false,
      sheetMode: 'add',
      editingIndex: -1,
      petChoices: [],
      petMap: {},
      detailMap: petsDetail
    }
  },
  computed: {
    currentEditData() {
      if (this.editingIndex < 0) return null
      return this.team[this.editingIndex] || createDefaultEditorData()
    },
    currentSkillOptions() {
      const petId = this.currentEditData?.petId
      if (!petId) return []
      return this.buildSkillOptions(petId)
    },
    coverageSummary() {
      return analyzeTeamTypeCoverage(this.team)
    },
    missingCoveragePreview() {
      return this.coverageSummary.missingCoverage.slice(0, 8)
    },
    alertThreatPreview() {
      return this.coverageSummary.alerts.slice(0, 6)
    }
  },
  onLoad() {
    this.preparePetChoices()
    this.loadTeam()
  },
  methods: {
    preparePetChoices() {
      this.petChoices = getHighestFormPets(pets, petsDetail).map((pet) => ({
        id: pet.id,
        name: pet.name,
        img: pet.img,
        types: Array.isArray(pet.type) ? [...pet.type] : [],
        colors: (pet.type || []).map((type) => TYPE_COLOR_MAP[type] || '#5b7cf5')
      }))
      this.petMap = this.petChoices.reduce((acc, pet) => {
        acc[String(pet.id)] = pet
        return acc
      }, {})
    },
    loadTeam() {
      const draft = readStorage(STORAGE_KEY, null)
      if (!Array.isArray(draft)) {
        this.team = createEmptyTeamSlots()
        return
      }
      const normalized = draft.slice(0, 6).map((slot) => normalizeSavedSlot(slot))
      while (normalized.length < 6) normalized.push(null)
      this.team = normalized
    },
    saveTeam(showToast = true) {
      writeStorage(STORAGE_KEY, this.team)
      if (showToast) {
        uni.showToast({ title: '阵容已保存', icon: 'success' })
      }
    },
    clearTeam() {
      uni.showModal({
        title: '清空阵容',
        content: '确认清空全部阵容吗？',
        success: ({ confirm }) => {
          if (!confirm) return
          this.team = createEmptyTeamSlots()
          this.panelExpandedIndexes = []
          this.saveTeam()
        }
      })
    },
    openAddSelector(index) {
      this.sheetMode = 'add'
      this.editingIndex = index
      this.sheetVisible = true
    },
    openConfigEditor(index) {
      if (!this.team[index]) return
      this.sheetMode = 'edit'
      this.editingIndex = index
      this.sheetVisible = true
    },
    closeSheet() {
      this.sheetVisible = false
      this.editingIndex = -1
    },
    handleAutoSave(draft) {
      if (this.sheetMode !== 'edit') {
        this.closeSheet()
        return
      }
      if (this.editingIndex < 0 || !draft?.petId) {
        this.closeSheet()
        return
      }
      this.persistSlot(this.editingIndex, draft, false)
      this.closeSheet()
    },
    handleSave(draft) {
      if (this.editingIndex < 0) return
      if (this.sheetMode === 'add') {
        this.addPetToSlot(this.editingIndex, draft.petId)
      } else {
        this.persistSlot(this.editingIndex, draft, true)
      }
      this.closeSheet()
    },
    addPetToSlot(index, petId) {
      const pet = this.petMap[String(petId)]
      if (!pet) return

      const slotData = {
        ...createDefaultEditorData(),
        petId: pet.id,
        petName: pet.name,
        image: pet.img,
        types: [...(pet.types || [])],
        skills: []
      }

      slotData.panel = this.calculatePanel(slotData)
      slotData.natureUpLabel = '无'
      slotData.natureDownLabel = '无'
      this.$set(this.team, index, slotData)
      this.saveTeam()
    },
    calculatePanel(slotLike) {
      const pet = this.petMap[String(slotLike.petId)]
      if (!pet) return null
      const race = this.detailMap[String(pet.id)]?.race || {}
      const ivs = {
        hp: clampIv(slotLike.ivs?.hp),
        attack: clampIv(slotLike.ivs?.attack),
        magicAttack: clampIv(slotLike.ivs?.magicAttack),
        defense: clampIv(slotLike.ivs?.defense),
        magicDefense: clampIv(slotLike.ivs?.magicDefense),
        speed: clampIv(slotLike.ivs?.speed)
      }

      return calculatePetPanel(
        { ...pet, race },
        {
          level: DEFAULT_LEVEL,
          star: DEFAULT_STAR,
          ivs,
          natureUp: slotLike.natureUp,
          natureDown: slotLike.natureDown
        }
      )
    },
    persistSlot(index, draft, showToast) {
      const pet = this.petMap[String(draft.petId)]
      if (!pet) return

      const slotData = {
        petId: pet.id,
        petName: pet.name,
        image: pet.img,
        types: [...(pet.types || [])],
        level: DEFAULT_LEVEL,
        star: DEFAULT_STAR,
        ivs: {
          hp: clampIv(draft.ivs?.hp),
          attack: clampIv(draft.ivs?.attack),
          magicAttack: clampIv(draft.ivs?.magicAttack),
          defense: clampIv(draft.ivs?.defense),
          magicDefense: clampIv(draft.ivs?.magicDefense),
          speed: clampIv(draft.ivs?.speed)
        },
        natureUp: draft.natureUp,
        natureDown: draft.natureDown,
        skills: Array.isArray(draft.skills) ? draft.skills.slice(0, 4) : []
      }

      slotData.panel = this.calculatePanel(slotData)
      slotData.natureUpLabel = NATURE_LABEL_MAP[draft.natureUp] || '无'
      slotData.natureDownLabel = NATURE_LABEL_MAP[draft.natureDown] || '无'

      this.$set(this.team, index, slotData)
      this.saveTeam(showToast)
    },
    confirmDelete(index) {
      uni.showModal({
        title: '删除精灵',
        content: '确认清空这个阵容位吗？',
        success: ({ confirm }) => {
          if (!confirm) return
          this.$set(this.team, index, null)
          this.panelExpandedIndexes = this.panelExpandedIndexes.filter((item) => item !== index)
          this.saveTeam()
        }
      })
    },
    togglePanel(index) {
      if (!this.team[index]) return
      if (this.panelExpandedIndexes.includes(index)) {
        this.panelExpandedIndexes = this.panelExpandedIndexes.filter((item) => item !== index)
        return
      }
      this.panelExpandedIndexes = [...this.panelExpandedIndexes, index]
    },
    buildSkillOptions(petId) {
      const skills = Array.isArray(this.detailMap[String(petId)]?.skills) ? this.detailMap[String(petId)].skills : []
      const seen = new Set()
      return skills
        .map((skill) => {
          if (!skill?.name) return null
          const key = `${skill.name}|${skill.skill_type || '精灵技能'}`
          if (seen.has(key)) return null
          seen.add(key)
          return {
            name: skill.name,
            type: skill.type || '-',
            attr: skill.attr || '-',
            consume: `${Number(skill.consume ?? 0)}耗能`,
            describe: skill.describe || '',
            icon: resolveAssetPath(skillIcons[skill.name] || ''),
            skillType: skill.skill_type || '精灵技能',
            skillTypeLabel: skill.skill_type || '精灵技能'
          }
        })
        .filter(Boolean)
    },
    buildSkillItems(skills = []) {
      const normalized = Array.isArray(skills) ? skills.slice(0, 4) : []
      return Array.from({ length: 4 }, (_, index) => normalized[index] || {
        name: '',
        type: '-',
        attr: '-',
        consume: '-',
        describe: '',
        icon: '',
        skillType: '空槽',
        skillTypeLabel: '空槽'
      })
    },
    buildStatItems(panel, ivs = {}) {
      const ivMap = {
        hp: Number(ivs.hp) || 0,
        attack: Number(ivs.attack) || 0,
        mattack: Number(ivs.magicAttack ?? ivs.mattack) || 0,
        defense: Number(ivs.defense) || 0,
        mdefense: Number(ivs.magicDefense ?? ivs.mdefense) || 0,
        speed: Number(ivs.speed) || 0
      }

      const makeItem = (key, label, value) => ({
        key,
        label,
        value,
        highlighted: ivMap[key] > 0,
        hint: `个体+${ivMap[key]}`
      })

      if (!panel) {
        return [
          makeItem('hp', '生命', '-'),
          makeItem('attack', '物攻', '-'),
          makeItem('mattack', '魔攻', '-'),
          makeItem('defense', '物防', '-'),
          makeItem('mdefense', '魔防', '-'),
          makeItem('speed', '速度', '-')
        ]
      }

      return [
        makeItem('hp', '生命', panel.hp),
        makeItem('attack', '物攻', panel.attack),
        makeItem('mattack', '魔攻', panel.mattack),
        makeItem('defense', '物防', panel.defense),
        makeItem('mdefense', '魔防', panel.mdefense),
        makeItem('speed', '速度', panel.speed)
      ]
    },
    getTypeColor(type) {
      return TYPE_COLOR_MAP[type] || '#5b7cf5'
    },
    resolvePetImage(src) {
      return resolveAssetPath(src)
    },
    getNatureSummary(slot) {
      const up = slot?.natureUpLabel && slot.natureUpLabel !== '无' ? slot.natureUpLabel : ''
      const down = slot?.natureDownLabel && slot.natureDownLabel !== '无' ? slot.natureDownLabel : ''
      if (!up && !down) return '无'
      if (up && down) return `${up} / ${down}`
      return up || down
    },
    getIvSummary(slot) {
      if (!slot?.ivs) return '无'
      const items = Object.keys(IV_LABEL_MAP)
        .filter((key) => Number(slot.ivs[key]) > 0)
        .map((key) => IV_LABEL_MAP[key])
      return items.length ? items.slice(0, 3).join(' / ') : '无'
    },
    getSkillShortName(name) {
      if (!name) return '+'
      return String(name).slice(0, 2)
    },
    getSkillFallbackColor(skill) {
      const colorMap = {
        火: '#ef6a4f',
        水: '#4c8ef7',
        草: '#52b36b',
        电: '#f5c74d',
        冰: '#68c7de',
        武: '#c98649',
        毒: '#8c66d9',
        地: '#b98a52',
        翼: '#7ea0ff',
        萌: '#f59cc8',
        虫: '#77b255',
        幽: '#6a64b8',
        龙: '#6a8bd9',
        恶: '#655b55',
        机械: '#7b8798',
        光: '#e2b34d',
        幻: '#9a66d8',
        普通: '#9aa4b2'
      }
      return colorMap[skill?.attr] || '#8b95a5'
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f7f2e8 0%, #efe7d8 100%);
}

.content {
  height: calc(100vh - 120rpx);
}

.save-btn {
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
}

.hero-card {
  margin: 22rpx 24rpx 0;
  padding: 22rpx 24rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #67553b 0%, #8b734b 55%, #b89a62 100%);
  box-shadow: 0 18rpx 40rpx rgba(85, 67, 36, 0.14);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  color: #fffaf0;
}

.hero-title {
  display: block;
  font-size: 36rpx;
  font-weight: 900;
}

.hero-subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 21rpx;
  line-height: 1.55;
  color: rgba(255, 250, 240, 0.86);
}

.hero-actions {
  flex-shrink: 0;
}

.ghost-btn {
  min-width: 144rpx;
  height: 68rpx;
  padding: 0 18rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 250, 240, 0.14);
  color: #fffaf0;
  font-size: 22rpx;
  font-weight: 800;
}

.team-grid {
  padding: 18rpx 24rpx 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16rpx;
}

@media screen and (min-width: 980rpx) {
  .team-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.team-card-wrap {
  min-width: 0;
}

.team-card {
  padding: 16rpx;
  border-radius: 28rpx;
  background: rgba(255, 252, 244, 0.98);
  box-shadow: 0 14rpx 28rpx rgba(68, 56, 32, 0.08);
  border: 1rpx solid rgba(229, 220, 198, 0.8);
}

.team-card.empty-card {
  min-height: 188rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-style: dashed;
}

.empty-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.empty-plus {
  font-size: 54rpx;
  line-height: 1;
  color: #c58c2b;
  font-weight: 800;
}

.empty-title {
  font-size: 24rpx;
  color: #7f6b46;
  font-weight: 800;
}

.empty-subtitle {
  font-size: 20rpx;
  color: #a08b67;
}

.card-main {
  display: grid;
  grid-template-columns: 36% 64%;
  gap: 14rpx;
  align-items: stretch;
}

.pet-art {
  min-height: 168rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #efe6d6 0%, #f9f3ea 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pet-glow {
  position: absolute;
  width: 110rpx;
  height: 110rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.42);
  filter: blur(6rpx);
}

.pet-image {
  position: relative;
  width: 132rpx;
  height: 132rpx;
}

.pet-side {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10rpx;
}

.title-row {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
}

.title-main {
  min-width: 0;
  flex: 1;
}

.pet-name {
  display: block;
  font-size: 30rpx;
  font-weight: 900;
  color: #1f1a12;
  line-height: 1.1;
  word-break: break-all;
}

.type-row {
  margin-top: 8rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.panel-btn {
  flex-shrink: 0;
  min-width: 118rpx;
  height: 48rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(95, 148, 255, 0.36);
  color: #3b82f6;
  font-size: 20rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 246, 255, 0.9);
}

.info-row {
  display: grid;
  grid-template-columns: 92rpx 1fr;
  gap: 10rpx;
  align-items: center;
}

.info-label {
  height: 40rpx;
  border-radius: 10rpx;
  background: linear-gradient(180deg, #ffcb55 0%, #ffb300 100%);
  color: #1f1a12;
  font-size: 19rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-value {
  min-height: 40rpx;
  padding: 0 12rpx;
  border-radius: 10rpx;
  background: rgba(255, 255, 255, 0.82);
  color: #1f1a12;
  font-size: 20rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8rpx;
}

.skill-slot {
  border-radius: 14rpx;
  overflow: hidden;
  background: #2a2e35;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 94rpx;
}

.skill-slot.empty {
  background: #4d5563;
}

.skill-icon,
.skill-fallback {
  width: 100%;
  height: 60rpx;
}

.skill-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-fallback-text {
  color: #fff;
  font-size: 20rpx;
  font-weight: 900;
}

.skill-name-bar {
  min-height: 34rpx;
  padding: 4rpx 6rpx;
  background: rgba(0, 0, 0, 0.46);
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-name {
  display: block;
  color: #fff;
  font-size: 16rpx;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-preview {
  margin-top: 14rpx;
  padding: 16rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.92);
}

.panel-preview-title {
  display: block;
  font-size: 24rpx;
  font-weight: 900;
  color: #2f2618;
}

.panel-preview-subtitle {
  display: block;
  margin-top: 6rpx;
  margin-bottom: 14rpx;
  font-size: 20rpx;
  color: #7a6a50;
}

.card-actions {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10rpx;
}

.action-btn {
  height: 58rpx;
  border-radius: 16rpx;
  font-size: 22rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.primary {
  background: linear-gradient(135deg, #5b7cf5 0%, #38bdf8 100%);
  color: #fff;
}

.action-btn.danger {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.analysis-grid {
  padding: 18rpx 24rpx 0;
  display: grid;
  gap: 16rpx;
}

.analysis-card {
  padding: 20rpx;
  border-radius: 24rpx;
  background: rgba(255, 252, 244, 0.96);
  box-shadow: 0 14rpx 32rpx rgba(85, 67, 36, 0.08);
}

.analysis-title {
  display: block;
  font-size: 28rpx;
  font-weight: 900;
  color: #2f2618;
}

.analysis-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  line-height: 1.55;
  color: #7a6a50;
}

.analysis-tags {
  margin-top: 14rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.type-tag {
  min-height: 56rpx;
  padding: 8rpx 12rpx;
  border-radius: 16rpx;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.type-tag.neutral {
  background: #f1e9da;
}

.type-tag.warning {
  background: rgba(239, 68, 68, 0.1);
}

.tag-text {
  font-size: 22rpx;
  font-weight: 800;
  color: #2f2618;
}

.tag-note {
  font-size: 20rpx;
  color: #7a6a50;
}

.tag-alert {
  font-size: 20rpx;
  font-weight: 900;
  color: #dc2626;
}

.analysis-empty {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #a1927a;
}

.footer-space {
  height: calc(48rpx + env(safe-area-inset-bottom));
}
</style>
