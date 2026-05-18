<template>
  <view class="page">
    <SideDrawer :visible="drawerOpen" @close="drawerOpen = false" />
    <AppHeader
      title="洛克王国助手"
      subtitle="本地离线助手"
      leftAction="menu"
      leftIcon="☰"
      @menu="drawerOpen = true"
    />

    <scroll-view scroll-y class="content" enhanced show-scrollbar="false">
      <view class="hero card">
        <text class="hero-title">欢迎回来</text>
        <text class="hero-sub">图鉴、孵蛋、技能、属性、阵容和地图都在本地</text>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">当前编辑</text>
          <view class="section-link-btn" hover-class="touch-active" @click="createNewTeamDraft">
            <text class="section-link">新建阵容</text>
          </view>
        </view>

        <view v-if="hasDraftTeam" class="team-panel card">
          <view class="team-panel-head">
            <view class="team-title-wrap">
              <view class="team-title-row">
                <text class="team-name">{{ draftTeamName || '未命名阵容' }}</text>
                <text class="team-badge">当前编辑</text>
                <view class="rename-link" hover-class="touch-active" @click.stop="openRename('draft', draftTeamName)">
                  <text>改名</text>
                </view>
              </view>
              <text class="team-meta">{{ currentDraftSummary }}</text>
            </view>

            <view class="team-actions">
              <view class="team-action ghost" hover-class="touch-active" @click="goTeamEditor">
                <text>编辑</text>
              </view>
              <view class="team-action primary" hover-class="touch-active" @click="saveCurrentTeamAsPreset">
                <text>另存</text>
              </view>
              <view
                class="team-collapse-badge"
                :class="{ collapsed: !isTeamExpanded('draft') }"
                hover-class="touch-active"
                @click.stop="toggleTeam('draft')"
              >
                <text class="team-collapse-text">{{ isTeamExpanded('draft') ? '收起' : '展开' }}</text>
                <text class="team-collapse-arrow" :class="{ open: isTeamExpanded('draft') }">⌄</text>
              </view>
            </view>
          </view>

          <view v-if="isTeamExpanded('draft')" class="team-panel-body">
            <view class="team-card-list">
              <view
                v-for="(slot, slotIndex) in currentDraftSlots"
                :key="`draft-${slotIndex}`"
                class="roster-card"
                :class="{ empty: !slot }"
              >
                <view v-if="slot" class="card-main">
                  <view class="pet-art">
                    <view class="pet-glow"></view>
                    <RemoteImage class="pet-image" :src="resolvePetImage(slot.image)" mode="aspectFit" />
                  </view>

                  <view class="pet-side">
                    <view class="title-row">
                      <view class="title-main">
                        <text class="pet-name">{{ slot.petName }}</text>
                        <view class="type-row">
                          <TypeBadge
                            v-for="type in slot.types"
                            :key="`draft-${slotIndex}-${type}`"
                            :label="type"
                            :color="getTypeColor(type)"
                            compact
                          />
                        </view>
                      </view>
                      <view class="panel-btn" hover-class="touch-active" @click.stop="openPanel(slot)">
                        <text>查看面板</text>
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
                        :key="`draft-${slotIndex}-skill-${skillIndex}`"
                        class="skill-slot"
                        :class="{ empty: !skill.name }"
                      >
                        <RemoteImage v-if="skill.icon" class="skill-icon" :src="resolvePetImage(skill.icon)" mode="aspectFit" />
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

                <view v-else class="empty-inner" hover-class="touch-active" @click="goTeamEditor">
                  <text class="empty-plus">+</text>
                  <text class="empty-title">添加精灵</text>
                  <text class="empty-subtitle">点击进入阵容编辑</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty card">
          <text class="empty-card-title">无自定义阵容</text>
          <text class="empty-card-sub">先新建一个空阵容，再去阵容编辑页添加精灵。</text>
          <view class="empty-actions">
            <view class="empty-btn primary" hover-class="touch-active" @click="createNewTeamDraft">
              <text>新建阵容</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">已保存阵容</text>
          <text class="section-count">{{ savedTeams.length }} 套</text>
        </view>

        <view v-if="savedTeams.length" class="team-stack">
          <view v-for="team in savedTeams" :key="team.key" class="team-panel card">
            <view class="team-panel-head">
              <view class="team-title-wrap">
                <view class="team-title-row">
                  <text class="team-name">{{ team.name }}</text>
                  <view class="rename-link" hover-class="touch-active" @click.stop="openRename(team.key, team.name)">
                    <text>改名</text>
                  </view>
                </view>
                <text class="team-meta">{{ team.summary }}</text>
              </view>

              <view class="team-actions">
                <view class="team-action ghost" hover-class="touch-active" @click="editSavedTeam(team)">
                  <text>编辑</text>
                </view>
                <view class="team-action primary" hover-class="touch-active" @click="savePresetCopy(team)">
                  <text>另存</text>
                </view>
                <view class="team-action danger" hover-class="touch-active" @click="deleteSavedTeam(team)">
                  <text>删除</text>
                </view>
                <view
                  class="team-collapse-badge"
                  :class="{ collapsed: !isTeamExpanded(team.key) }"
                  hover-class="touch-active"
                  @click.stop="toggleTeam(team.key)"
                >
                  <text class="team-collapse-text">{{ isTeamExpanded(team.key) ? '收起' : '展开' }}</text>
                  <text class="team-collapse-arrow" :class="{ open: isTeamExpanded(team.key) }">⌄</text>
                </view>
              </view>
            </view>

            <view v-if="isTeamExpanded(team.key)" class="team-panel-body">
              <view class="team-card-list">
                <view
                  v-for="(slot, slotIndex) in team.slots"
                  :key="`${team.key}-${slotIndex}`"
                  class="roster-card"
                  :class="{ empty: !slot }"
                >
                  <view v-if="slot" class="card-main">
                    <view class="pet-art">
                      <view class="pet-glow"></view>
                      <RemoteImage class="pet-image" :src="resolvePetImage(slot.image)" mode="aspectFit" />
                    </view>

                    <view class="pet-side">
                      <view class="title-row">
                        <view class="title-main">
                          <text class="pet-name">{{ slot.petName }}</text>
                          <view class="type-row">
                            <TypeBadge
                              v-for="type in slot.types"
                              :key="`${team.key}-${slotIndex}-${type}`"
                              :label="type"
                              :color="getTypeColor(type)"
                              compact
                            />
                          </view>
                        </view>
                        <view class="panel-btn" hover-class="touch-active" @click.stop="openPanel(slot, team.name)">
                          <text>查看面板</text>
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
                          :key="`${team.key}-${slotIndex}-skill-${skillIndex}`"
                          class="skill-slot"
                          :class="{ empty: !skill.name }"
                        >
                          <RemoteImage v-if="skill.icon" class="skill-icon" :src="resolvePetImage(skill.icon)" mode="aspectFit" />
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

                  <view v-else class="saved-empty-inner">
                    <text class="saved-empty-text">空位</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty card">
          <text class="empty-card-title">还没有已保存阵容</text>
          <text class="empty-card-sub">点击“另存”后，会在这里新增一套阵容，不会覆盖当前编辑。</text>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">快捷入口</text>
        </view>
        <view class="shortcut-grid">
          <view v-for="item in shortcuts" :key="item.title" class="shortcut-card" hover-class="touch-active" @click="item.action">
            <text class="shortcut-title">{{ item.title }}</text>
            <text class="shortcut-sub">{{ item.sub }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <view v-if="panelVisible" class="panel-mask" @click="closePanel">
      <view class="panel-dialog card" @click.stop>
        <view class="panel-dialog-head">
          <view class="panel-title-wrap">
            <text class="panel-title">{{ panelTitle || '面板属性' }}</text>
            <text class="panel-sub">根据等级、个体值和性格加成计算</text>
          </view>
          <view class="panel-close" hover-class="touch-active" @click="closePanel">
            <text>关闭</text>
          </view>
        </view>
        <StatPanel v-if="panelSlot" :stats="buildPreviewStats(panelSlot)" :columns="2" />
      </view>
    </view>

    <view v-if="renameVisible" class="rename-mask" @click="closeRename">
      <view class="rename-panel card" @click.stop>
        <text class="rename-title">编辑阵容名字</text>
        <input
          class="rename-input"
          :value="renameValue"
          maxlength="16"
          placeholder="输入阵容名字"
          @input="onRenameInput"
        />
        <view class="rename-actions">
          <view class="rename-btn ghost" hover-class="touch-active" @click="closeRename">
            <text>取消</text>
          </view>
          <view class="rename-btn primary" hover-class="touch-active" @click="confirmRename">
            <text>保存</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import SideDrawer from '@/components/SideDrawer/SideDrawer.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import StatPanel from '@/components/StatPanel/StatPanel.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { petTypes } from '@/data/pets.js'
import { readStorage, writeStorage } from '@/utils/nav.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

const DRAFT_STORAGE_KEY = 'team_draft'
const PRESET_STORAGE_KEY = 'team_presets'
const DRAFT_NAME_STORAGE_KEY = 'team_draft_name'
const DRAFT_INIT_STORAGE_KEY = 'team_draft_initialized'

export default {
  components: {
    SideDrawer,
    AppHeader,
    StatPanel,
    TypeBadge
  },
  data() {
    return {
      drawerOpen: false,
      draftTeam: [],
      draftTeamName: '未命名阵容',
      draftInitialized: false,
      savedTeams: [],
      expandedTeamKeys: [],
      panelVisible: false,
      panelSlot: null,
      panelTitle: '',
      renameVisible: false,
      renameTeamKey: '',
      renameValue: ''
    }
  },
  computed: {
    shortcuts() {
      return [
        { title: '属性值计算', sub: '攻守双模式工具页', action: this.goAttributeCalculator },
        { title: '技能查询', sub: '按技能查精灵', action: this.goSkillSearch },
        { title: '速度排行', sub: '按速度种族值看', action: this.goSpeedRank },
        { title: '属性克制', sub: '看倍率和例子', action: this.goRestriction },
        { title: '地图', sub: '本地地图', action: this.goMap },
        { title: '孵蛋', sub: '预测可能精灵', action: this.goEgg },
        { title: '图鉴', sub: '查看全部精灵', action: this.goCatalog }
      ]
    },
    currentDraftSlots() {
      return this.toSixSlots(this.draftTeam)
    },
    hasDraftTeam() {
      return this.draftInitialized || this.draftTeam.length > 0
    },
    currentDraftSummary() {
      return `${this.draftTeam.filter(Boolean).length}/6 已配置`
    }
  },
  onShow() {
    this.loadTeams()
  },
  methods: {
    toSixSlots(slots = []) {
      const normalized = Array.isArray(slots) ? slots.slice(0, 6) : []
      while (normalized.length < 6) normalized.push(null)
      return normalized
    },
    normalizeSlots(slots = []) {
      return Array.isArray(slots) ? slots.filter((slot) => slot && slot.petId) : []
    },
    loadTeams() {
      this.draftTeam = this.normalizeSlots(readStorage(DRAFT_STORAGE_KEY, []))
      this.draftTeamName = readStorage(DRAFT_NAME_STORAGE_KEY, '未命名阵容') || '未命名阵容'
      this.draftInitialized = !!readStorage(DRAFT_INIT_STORAGE_KEY, false)
      const presets = readStorage(PRESET_STORAGE_KEY, [])
      this.savedTeams = Array.isArray(presets)
        ? presets
            .map((team, index) => ({
              id: team?.id || `saved-${index}`,
              key: team?.id || `saved-${index}`,
              name: team?.name || `阵容 ${index + 1}`,
              slots: this.toSixSlots(this.normalizeSlots(team?.slots || [])),
              summary: `${this.normalizeSlots(team?.slots || []).length}/6 已配置`
            }))
            .filter((team) => team.slots.some(Boolean))
        : []
      this.expandedTeamKeys = []
    },
    saveCurrentTeamAsPreset() {
      const validSlots = this.normalizeSlots(this.draftTeam)
      if (!validSlots.length) {
        uni.showToast({ title: '当前编辑为空', icon: 'none' })
        return
      }

      const presets = readStorage(PRESET_STORAGE_KEY, [])
      const next = Array.isArray(presets) ? [...presets] : []
      next.unshift({
        id: `team-${Date.now()}`,
        name: this.draftTeamName || `阵容 ${next.length + 1}`,
        slots: validSlots
      })
      writeStorage(PRESET_STORAGE_KEY, next)
      this.loadTeams()
      uni.showToast({ title: '已新增一套保存阵容', icon: 'success' })
    },
    editSavedTeam(team) {
      const slots = this.normalizeSlots(team?.slots || [])
      if (!slots.length) {
        uni.showToast({ title: '这套阵容还是空的', icon: 'none' })
        return
      }

      writeStorage(DRAFT_STORAGE_KEY, this.toSixSlots(slots))
      writeStorage(DRAFT_NAME_STORAGE_KEY, team.name || '未命名阵容')
      writeStorage(DRAFT_INIT_STORAGE_KEY, true)
      this.loadTeams()
      this.goTeamEditor()
    },
    savePresetCopy(team) {
      const slots = this.normalizeSlots(team?.slots || [])
      if (!slots.length) {
        uni.showToast({ title: '这套阵容还是空的', icon: 'none' })
        return
      }

      const presets = readStorage(PRESET_STORAGE_KEY, [])
      const next = Array.isArray(presets) ? [...presets] : []
      next.unshift({
        id: `team-${Date.now()}`,
        name: `${team.name || '阵容'} 副本`,
        slots
      })
      writeStorage(PRESET_STORAGE_KEY, next)
      this.loadTeams()
      uni.showToast({ title: '已新增一套阵容副本', icon: 'success' })
    },
    deleteSavedTeam(team) {
      uni.showModal({
        title: '删除阵容',
        content: `确定删除“${team?.name || '这套阵容'}”吗？`,
        success: ({ confirm }) => {
          if (!confirm) return
          const presets = readStorage(PRESET_STORAGE_KEY, [])
          const next = Array.isArray(presets)
            ? presets.filter((item, index) => (item?.id || `saved-${index}`) !== team.key)
            : []
          writeStorage(PRESET_STORAGE_KEY, next)
          this.loadTeams()
          uni.showToast({ title: '阵容已删除', icon: 'success' })
        }
      })
    },
    createNewTeamDraft() {
      const proceed = () => {
        writeStorage(DRAFT_STORAGE_KEY, Array.from({ length: 6 }, () => null))
        writeStorage(DRAFT_NAME_STORAGE_KEY, `未命名阵容${Date.now().toString().slice(-4)}`)
        writeStorage(DRAFT_INIT_STORAGE_KEY, true)
        this.loadTeams()
        this.goTeamEditor()
      }

      if (!this.hasDraftTeam || !this.draftTeam.length) {
        proceed()
        return
      }

      uni.showModal({
        title: '新建阵容',
        content: '会新建一个空的当前编辑阵容，已保存阵容不会受影响。是否继续？',
        success: ({ confirm }) => {
          if (confirm) proceed()
        }
      })
    },
    openRename(teamKey, currentName) {
      this.renameTeamKey = teamKey
      this.renameValue = currentName || ''
      this.renameVisible = true
    },
    onRenameInput(event) {
      this.renameValue = event.detail.value
    },
    closeRename() {
      this.renameVisible = false
      this.renameTeamKey = ''
      this.renameValue = ''
    },
    confirmRename() {
      const nextName = String(this.renameValue || '').trim()
      if (!nextName) {
        uni.showToast({ title: '请输入阵容名字', icon: 'none' })
        return
      }

      if (this.renameTeamKey === 'draft') {
        writeStorage(DRAFT_NAME_STORAGE_KEY, nextName)
        writeStorage(DRAFT_INIT_STORAGE_KEY, true)
      } else {
        const presets = readStorage(PRESET_STORAGE_KEY, [])
        const nextPresets = Array.isArray(presets)
          ? presets.map((team, index) => ({
              ...team,
              name: (team?.id || `saved-${index}`) === this.renameTeamKey ? nextName : team?.name
            }))
          : []
        writeStorage(PRESET_STORAGE_KEY, nextPresets)
      }

      this.closeRename()
      this.loadTeams()
      uni.showToast({ title: '阵容名字已更新', icon: 'success' })
    },
    isTeamExpanded(teamKey) {
      return this.expandedTeamKeys.includes(teamKey)
    },
    toggleTeam(teamKey) {
      if (this.expandedTeamKeys.includes(teamKey)) {
        this.expandedTeamKeys = this.expandedTeamKeys.filter((item) => item !== teamKey)
        return
      }
      this.expandedTeamKeys = [...this.expandedTeamKeys, teamKey]
    },
    openPanel(slot, teamName = '') {
      if (!slot) return
      this.panelSlot = slot
      this.panelTitle = teamName ? `${slot.petName} · ${teamName}` : `${slot.petName} 面板`
      this.panelVisible = true
    },
    closePanel() {
      this.panelVisible = false
      this.panelSlot = null
      this.panelTitle = ''
    },
    buildPreviewStats(slot) {
      const panel = slot?.panel || {}
      const ivs = slot?.ivs || {}
      return [
        this.makeStatItem('hp', '生命', panel.hp, ivs.hp),
        this.makeStatItem('attack', '物攻', panel.attack, ivs.attack),
        this.makeStatItem('mattack', '魔攻', panel.mattack, ivs.mattack),
        this.makeStatItem('defense', '物防', panel.defense, ivs.defense),
        this.makeStatItem('mdefense', '魔防', panel.mdefense, ivs.mdefense),
        this.makeStatItem('speed', '速度', panel.speed, ivs.speed)
      ]
    },
    makeStatItem(key, label, value, ivValue) {
      const iv = Number(ivValue) || 0
      return {
        key,
        label,
        value: value ?? '-',
        highlighted: iv > 0,
        hint: `个体+${iv}`
      }
    },
    getNatureSummary(slot) {
      const up = slot?.natureUpLabel && slot.natureUpLabel !== '无' ? `${slot.natureUpLabel}↑` : ''
      const down = slot?.natureDownLabel && slot.natureDownLabel !== '无' ? `${slot.natureDownLabel}↓` : ''
      const summary = [up, down].filter(Boolean).join(' / ')
      return summary || '无性格修正'
    },
    getIvSummary(slot) {
      const ivs = slot?.ivs || {}
      const labels = {
        hp: '生命',
        attack: '物攻',
        mattack: '魔攻',
        defense: '物防',
        mdefense: '魔防',
        speed: '速度'
      }
      const active = Object.keys(labels)
        .map((key) => ({ key, label: labels[key], value: Number(ivs[key]) || 0 }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
      return active.length ? active.map((item) => item.label).join(' / ') : '未分配'
    },
    buildSkillItems(skills = []) {
      const normalized = Array.isArray(skills) ? skills.slice(0, 4) : []
      while (normalized.length < 4) {
        normalized.push({ name: '', icon: '', attr: '' })
      }
      return normalized
    },
    getSkillShortName(name = '') {
      if (!name) return '+'
      return String(name).slice(0, 2)
    },
    getSkillFallbackColor(skill = {}) {
      const map = {
        普通: '#7f8ea3',
        火: '#f08030',
        水: '#4f9cff',
        草: '#55b96b',
        电: '#f6c445',
        冰: '#7ad3f7',
        武: '#c65b4b',
        毒: '#9b59b6',
        地: '#c89b53',
        翼: '#7b9fe8',
        萌: '#f49ac2',
        虫: '#8bc34a',
        幽: '#5c6bc0',
        龙: '#6d78d5',
        恶: '#5d4037',
        机械: '#78909c',
        光: '#ffd54f',
        幻: '#8e44ad'
      }
      return map[skill?.attr] || '#6b7a90'
    },
    getTypeColor(type) {
      return petTypes.find((item) => item.key === type)?.color || '#5b7cf5'
    },
    resolvePetImage(src) {
      return resolveAssetPath(src)
    },
    goTeamEditor() {
      uni.navigateTo({ url: '/pages/team-editor/team-editor' })
    },
    goSkillSearch() {
      uni.navigateTo({ url: '/pages/skill-search/skill-search' })
    },
    goAttributeCalculator() {
      uni.navigateTo({ url: '/pages/pvp-breakpoint/pvp-breakpoint' })
    },
    goSpeedRank() {
      uni.navigateTo({ url: '/pages/speed-rank/speed-rank' })
    },
    goRestriction() {
      uni.navigateTo({ url: '/pages/restriction/restriction' })
    },
    goMap() {
      uni.navigateTo({ url: '/pages/map/map' })
    },
    goEgg() {
      uni.navigateTo({ url: '/pages/egg/egg' })
    },
    goCatalog() {
      uni.navigateTo({ url: '/pages/catalog/catalog' })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f6f8fc 0%, #edf3fb 100%);
}

.content {
  flex: 1;
  min-height: 0;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 16rpx 40rpx rgba(31, 47, 87, 0.08);
}

.hero {
  margin: 20rpx 24rpx 0;
  padding: 24rpx;
  background: linear-gradient(135deg, #1c2748 0%, #36508d 55%, #5b7cf5 100%);
  color: #fff;
}

.hero-title {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
}

.hero-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.82);
}

.section {
  margin: 24rpx 24rpx 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
  gap: 12rpx;
  flex-wrap: wrap;
}

.section-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #1c2748;
}

.section-count {
  font-size: 22rpx;
  color: #6b7590;
}

.section-link-btn {
  min-height: 52rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.section-link {
  font-size: 22rpx;
  color: #5b7cf5;
  font-weight: 700;
}

.team-stack {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.team-panel {
  padding: 18rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  border: 1rpx solid rgba(91, 124, 245, 0.08);
}

.team-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12rpx;
  padding: 2rpx 2rpx 6rpx;
}

.team-title-wrap {
  min-width: 0;
  flex: 1;
}

.team-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.team-name {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
  color: #1c2748;
}

.team-badge {
  min-height: 38rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(91, 124, 245, 0.1);
  color: #4a66c2;
  font-size: 18rpx;
  font-weight: 700;
}

.team-meta {
  display: block;
  margin-top: 4rpx;
  font-size: 19rpx;
  color: #6b7590;
}

.rename-link {
  min-height: 34rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, rgba(111, 129, 255, 0.18) 0%, rgba(141, 91, 245, 0.12) 100%);
  color: #5166d8;
  font-size: 17rpx;
  font-weight: 700;
  box-shadow: inset 0 0 0 1rpx rgba(91, 124, 245, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.team-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.team-action {
  min-width: 84rpx;
  height: 44rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 19rpx;
  font-weight: 700;
}

.team-action.ghost {
  background: #eef3fb;
  color: #46597d;
}

.team-action.primary {
  background: linear-gradient(135deg, #5b7cf5 0%, #405ee9 100%);
  color: #fff;
}

.team-action.danger {
  background: rgba(239, 68, 68, 0.12);
  color: #c53030;
}

.team-collapse-badge {
  min-width: 88rpx;
  height: 44rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: rgba(91, 124, 245, 0.1);
  color: #4a66c2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}

.team-collapse-badge.collapsed {
  background: rgba(67, 87, 132, 0.14);
  color: #445679;
}

.team-collapse-text {
  font-size: 17rpx;
  font-weight: 700;
  color: inherit;
}

.team-collapse-arrow {
  font-size: 16rpx;
  line-height: 1;
  transform: rotate(-90deg);
  transition: transform 0.22s ease;
}

.team-collapse-arrow.open {
  transform: rotate(0deg);
}

.team-panel-body {
  margin-top: 10rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid rgba(91, 124, 245, 0.08);
}

.team-card-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.roster-card {
  border-radius: 22rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  border: 1rpx solid rgba(91, 124, 245, 0.08);
  box-shadow: 0 10rpx 24rpx rgba(31, 47, 87, 0.05);
  padding: 14rpx;
}

.roster-card.empty {
  border-style: dashed;
  border-color: #d8dfec;
  background: rgba(255, 255, 255, 0.72);
}

.card-main {
  display: flex;
  gap: 16rpx;
  align-items: stretch;
}

.pet-art {
  position: relative;
  width: 34%;
  min-width: 170rpx;
  max-width: 210rpx;
  border-radius: 22rpx;
  background: linear-gradient(180deg, #f3efe3 0%, #ece6d8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.pet-glow {
  position: absolute;
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0) 72%);
}

.pet-image {
  position: relative;
  z-index: 1;
  width: 148rpx;
  height: 148rpx;
}

.pet-side {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12rpx;
}

.title-main {
  min-width: 0;
  flex: 1;
}

.pet-name {
  display: block;
  font-size: 28rpx;
  line-height: 1.25;
  font-weight: 800;
  color: #1d2437;
  word-break: break-all;
}

.type-row {
  margin-top: 6rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 6rpx;
}

.panel-btn {
  flex-shrink: 0;
  min-width: 112rpx;
  height: 44rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: rgba(76, 145, 255, 0.08);
  color: #4c78e0;
  border: 1rpx solid rgba(76, 145, 255, 0.22);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 700;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.info-label {
  flex-shrink: 0;
  min-width: 76rpx;
  height: 34rpx;
  padding: 0 12rpx;
  border-radius: 10rpx;
  background: linear-gradient(180deg, #ffc64d 0%, #ffb515 100%);
  color: #1d2437;
  font-size: 18rpx;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.info-value {
  min-width: 0;
  flex: 1;
  font-size: 22rpx;
  line-height: 1.35;
  color: #2a3248;
  font-weight: 700;
  word-break: break-all;
}

.skill-row {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8rpx;
}

.skill-slot {
  border-radius: 12rpx;
  overflow: hidden;
  background: #17243b;
  position: relative;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-slot.empty {
  background: #e6edf8;
}

.skill-icon,
.skill-fallback {
  width: 100%;
  height: 100%;
}

.skill-icon {
  display: block;
}

.skill-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-fallback-text {
  font-size: 22rpx;
  font-weight: 800;
  color: #fff;
}

.skill-name-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 28rpx;
  background: rgba(11, 18, 30, 0.68);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
}

.skill-name {
  font-size: 15rpx;
  line-height: 1;
  color: #fff;
  font-weight: 700;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-inner,
.saved-empty-inner {
  min-height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8rpx;
}

.empty-plus {
  font-size: 42rpx;
  line-height: 1;
  color: #5b7cf5;
}

.empty-title,
.saved-empty-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #4c5e7f;
}

.empty-subtitle {
  font-size: 18rpx;
  color: #7a859e;
}

.empty {
  padding: 28rpx 24rpx;
  text-align: center;
}

.empty-card-title {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #1c2748;
}

.empty-card-sub {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #6b7590;
}

.empty-actions {
  margin-top: 20rpx;
  display: flex;
  justify-content: center;
}

.empty-btn {
  min-width: 180rpx;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 800;
}

.empty-btn.primary {
  background: linear-gradient(135deg, #5b7cf5 0%, #405ee9 100%);
  color: #fff;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.shortcut-card {
  padding: 20rpx;
  border-radius: 22rpx;
  background: linear-gradient(145deg, #ffffff 0%, #f4f8ff 100%);
  box-shadow: 0 14rpx 30rpx rgba(31, 47, 87, 0.06);
  border: 1rpx solid rgba(91, 124, 245, 0.08);
}

.shortcut-title {
  display: block;
  font-size: 24rpx;
  font-weight: 800;
  color: #1c2748;
}

.shortcut-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 19rpx;
  color: #6b7590;
}

.panel-mask,
.rename-mask {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.42);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 24rpx;
  z-index: 30;
}

.panel-dialog,
.rename-panel {
  width: 100%;
  max-width: 720rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}

.panel-dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.panel-title-wrap {
  min-width: 0;
  flex: 1;
}

.panel-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #1c2748;
}

.panel-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #6b7590;
}

.panel-close {
  min-width: 88rpx;
  height: 42rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: #eef3fb;
  color: #526483;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.rename-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #1c2748;
}

.rename-input {
  margin-top: 18rpx;
  height: 84rpx;
  border-radius: 20rpx;
  background: #f5f7fb;
  padding: 0 22rpx;
  font-size: 24rpx;
  color: #1c2748;
}

.rename-actions {
  margin-top: 20rpx;
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
}

.rename-btn {
  min-width: 128rpx;
  height: 68rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 800;
}

.rename-btn.ghost {
  background: #eef3fb;
  color: #526483;
}

.rename-btn.primary {
  background: linear-gradient(135deg, #5b7cf5 0%, #405ee9 100%);
  color: #fff;
}

.bottom-space {
  height: calc(36rpx + env(safe-area-inset-bottom));
}

.touch-active {
  opacity: 0.78;
}

@media (min-width: 980rpx) {
  .team-card-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
