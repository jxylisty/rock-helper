<template>
  <view v-if="visible" class="sheet-mask" @click="handleMaskClick">
    <view class="sheet-panel" @click.stop>
      <view class="sheet-handle"></view>

      <view class="sheet-topbar">
        <view class="top-btn ghost" @click="$emit('close')">取消</view>
        <text class="sheet-title">{{ title }}</text>
        <view class="top-btn primary" @click="submit">{{ mode === 'add' ? '添加' : '保存' }}</view>
      </view>

      <view v-if="mode === 'add'" class="sheet-body add-body">
        <view class="selector-card">
          <text class="section-title">搜索精灵</text>
          <view class="search-row">
            <input
              class="search-input"
              :value="keyword"
              placeholder="搜索最高形态精灵"
              placeholder-class="input-placeholder"
              @input="onKeywordInput"
            />
            <view v-if="keyword" class="search-clear" @click="clearKeyword">清空</view>
          </view>

          <view class="filter-head">
            <text class="section-title">属性筛选</text>
            <view class="filter-clear" @click="clearTypes">全部</view>
          </view>

          <view class="selected-row">
            <text class="selected-label">已选属性</text>
            <view v-if="selectedTypes.length" class="selected-types">
              <TypeBadge
                v-for="type in selectedTypes"
                :key="type"
                :label="type"
                :color="getTypeColor(type)"
                compact
              />
            </view>
            <text v-else class="selected-empty">未选择</text>
          </view>

          <view class="type-grid">
            <view
              v-for="type in typeOptions"
              :key="type.key"
              class="type-chip"
              :class="{ active: selectedTypes.includes(type.key) }"
              :style="selectedTypes.includes(type.key) ? { borderColor: type.color } : null"
              @click="toggleType(type.key)"
            >
              <TypeBadge :label="type.key" :color="type.color" compact />
              <text class="chip-text">{{ type.label }}</text>
            </view>
          </view>

          <text class="result-tip">当前显示 {{ filteredPets.length }} 只精灵</text>
        </view>

        <scroll-view scroll-y class="pet-list-scroll">
          <view class="pet-grid">
            <view
              v-for="pet in filteredPets"
              :key="pet.id"
              class="pet-card"
              :class="{ active: draft.petId === pet.id }"
              @click="selectPet(pet)"
            >
              <RemoteImage class="pet-card-image" :src="resolvePetImage(pet.img)" mode="aspectFit" />
              <text class="pet-card-name">{{ pet.name }}</text>
              <view class="pet-card-types">
                <TypeBadge
                  v-for="type in pet.types"
                  :key="type"
                  :label="type"
                  :color="getTypeColor(type)"
                  compact
                />
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view v-else class="sheet-body edit-body">
        <view class="selected-card">
          <RemoteImage class="selected-image" :src="resolvePetImage(selectedPet?.img)" mode="aspectFit" />
          <view class="selected-info">
            <text class="selected-name">{{ selectedPet?.name || '未选择精灵' }}</text>
            <text class="selected-type">{{ formatTypes(selectedPet?.types || []) }}</text>
            <text class="selected-note">等级 60 / 星级 5 固定。攻击技能看属性克制，血脉技能只允许一项。</text>
          </view>
        </view>

        <view class="editor-tabs">
          <view class="editor-tab" :class="{ active: activeSection === 'skills' }" @click="activeSection = 'skills'">
            技能组
          </view>
          <view class="editor-tab" :class="{ active: activeSection === 'build' }" @click="activeSection = 'build'">
            个体 / 性格
          </view>
        </view>

        <scroll-view scroll-y class="config-scroll">
          <view v-if="activeSection === 'skills'" class="config-stack">
            <view class="config-card">
              <view class="section-head">
                <text class="section-title">已选技能</text>
                <text class="section-note">先点技能槽，再点下面的技能卡</text>
              </view>
              <view class="picked-grid">
                <view
                  v-for="(skill, index) in skillSlots"
                  :key="`picked-${index}`"
                  class="picked-card"
                  :class="{ active: activeSkillSlot === index }"
                  @click="activeSkillSlot = index"
                >
                  <view class="picked-top">
                    <text class="picked-slot">技能{{ index + 1 }}</text>
                    <text class="picked-clear" @click.stop="clearSkillSlot(index)">清空</text>
                  </view>
                  <RemoteImage v-if="skill.icon" class="picked-icon" :src="resolvePetImage(skill.icon)" mode="aspectFit" />
                  <view v-else class="picked-icon empty-icon"></view>
                  <text class="picked-name">{{ skill.name || '点击选择技能' }}</text>
                </view>
              </view>
              <text v-if="skillWarning" class="field-warning">{{ skillWarning }}</text>
            </view>

            <view class="config-card">
              <view class="section-head">
                <text class="section-title">技能筛选</text>
                <text class="section-note">血脉技能最多一个</text>
              </view>
              <view class="filter-chips">
                <view
                  v-for="item in skillFilterOptions"
                  :key="item.value"
                  class="filter-chip"
                  :class="{ active: activeSkillFilter === item.value }"
                  @click="activeSkillFilter = item.value"
                >
                  {{ item.label }}
                </view>
              </view>
            </view>

            <view class="config-card">
              <view class="section-head">
                <text class="section-title">可选技能</text>
                <text class="section-note">当前编辑技能{{ activeSkillSlot + 1 }}</text>
              </view>
              <view v-if="filteredSkillOptions.length" class="skill-option-list">
                <view
                  v-for="skill in filteredSkillOptions"
                  :key="`${skill.name}-${skill.skillType}`"
                  class="skill-option-card"
                  :class="[
                    { active: isSkillSelectedOnActiveSlot(skill), chosen: isSkillChosen(skill) },
                    skill.skillType === '血脉技能' ? 'bloodline' : '',
                    skill.skillType === '可学技能石' ? 'stone' : '',
                    skill.skillType === '精灵技能' ? 'normal' : ''
                  ]"
                  @click="selectSkillCard(skill)"
                >
                  <RemoteImage v-if="skill.icon" class="skill-option-icon" :src="resolvePetImage(skill.icon)" mode="aspectFit" />
                  <view v-else class="skill-option-icon empty-icon"></view>
                  <text class="skill-option-name">{{ skill.name }}</text>
                  <view class="skill-option-meta">
                    <text class="skill-option-tag">{{ skill.type }}</text>
                    <TypeBadge v-if="skill.attr && skill.attr !== '-'" :label="skill.attr" :color="getTypeColor(skill.attr)" compact />
                    <text class="skill-option-tag muted">{{ skill.skillTypeLabel }}</text>
                  </view>
                  <text class="skill-option-desc">{{ skill.describe || '暂无描述' }}</text>
                </view>
              </view>
              <view v-else class="empty-skills">
                <text>当前精灵没有可选技能数据</text>
              </view>
            </view>
          </view>

          <view v-else class="config-stack">
            <view class="config-card">
              <text class="section-title">性格增益 / 减益</text>
              <view class="picker-stack">
                <picker :range="natureLabels" :value="upIndex" @change="onNatureChange('up', $event)">
                  <view class="picker-box">增益：{{ getNatureLabel(draft.natureUp) }}</view>
                </picker>
                <picker :range="natureLabels" :value="downIndex" @change="onNatureChange('down', $event)">
                  <view class="picker-box">减益：{{ getNatureLabel(draft.natureDown) }}</view>
                </picker>
              </view>
              <text v-if="natureWarning" class="field-warning">{{ natureWarning }}</text>
            </view>

            <view class="config-card">
              <text class="section-title">个体值</text>
              <view class="iv-summary">
                <text class="iv-summary-label">当前提升</text>
                <view v-if="filledIvItems.length" class="iv-summary-tags">
                  <text v-for="item in filledIvItems" :key="item.key" class="iv-summary-tag">
                    {{ item.label }} +{{ item.value }}
                  </text>
                </view>
                <text v-else class="iv-summary-empty">默认全为 0，未增加任何个体值</text>
              </view>
              <text class="iv-rule-tip">规则：每项只能填 1-10，最多只能提升 3 项，其余保持 0。</text>
              <text class="iv-rule-tip">默认策略：性格增益优先 +10，减益保持 0，并按种族值自动补满另外两项。</text>
              <text v-if="ivWarning" class="field-warning">{{ ivWarning }}</text>
              <view class="iv-grid">
                <view
                  v-for="item in ivFields"
                  :key="item.key"
                  class="iv-item"
                  :class="{ active: Number(draft.ivs[item.key]) > 0 }"
                >
                  <text class="iv-label">{{ item.label }}</text>
                  <input
                    class="iv-input"
                    type="number"
                    :value="draft.ivs[item.key]"
                    @input="onIvInput(item.key, $event)"
                  />
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { petTypes } from '@/data/pet/pet_detail.js'
import { resolveAssetPath } from '@/utils/asset-path.js'
import { buildSuggestedIvs } from '@/utils/buildSuggestedIvs.js'
import { savePetConfig, loadPetConfig } from '@/utils/petConfigCache.js'

const IV_FIELDS = [
  { key: 'hp', label: '生命' },
  { key: 'attack', label: '物攻' },
  { key: 'mattack', label: '魔攻' },
  { key: 'defense', label: '物防' },
  { key: 'mdefense', label: '魔防' },
  { key: 'speed', label: '速度' }
]

const NATURE_OPTIONS = [
  { value: '无', label: '无' },
  { value: 'hp', label: '生命' },
  { value: 'attack', label: '物攻' },
  { value: 'mattack', label: '魔攻' },
  { value: 'defense', label: '物防' },
  { value: 'mdefense', label: '魔防' },
  { value: 'speed', label: '速度' }
]

const TYPE_OPTIONS = petTypes
  .map((item) => ({
    key: item.key,
    label: item.label || item.key,
    color: item.color
  }))
  .filter((item, index, list) => item.key && list.findIndex((other) => other.key === item.key) === index)

const SKILL_FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '精灵技能', label: '普通技能' },
  { value: '血脉技能', label: '血脉技能' },
  { value: '可学技能石', label: '技能石' }
]

function createDraft(data = null) {
  return {
    petId: data?.petId || '',
    petName: data?.petName || '',
    image: data?.image || '',
    types: Array.isArray(data?.types) ? [...data.types] : [],
    level: Number(data?.level ?? 60),
    star: Number(data?.star ?? 5),
    ivs: {
      hp: Number(data?.ivs?.hp ?? 0),
      attack: Number(data?.ivs?.attack ?? 0),
      mattack: Number(data?.ivs?.mattack ?? 0),
      defense: Number(data?.ivs?.defense ?? 0),
      mdefense: Number(data?.ivs?.mdefense ?? 0),
      speed: Number(data?.ivs?.speed ?? 0)
    },
    skills: Array.isArray(data?.skills) ? data.skills.slice(0, 4) : [],
    natureUp: data?.natureUp || '无',
    natureDown: data?.natureDown || '无'
  }
}

function createEmptySkill() {
  return {
    name: '',
    type: '-',
    attr: '-',
    consume: '-',
    describe: '',
    icon: '',
    skillType: '',
    skillTypeLabel: '空槽'
  }
}

export default {
  name: 'TeamEditSheet',
  components: {
    TypeBadge
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: 'add'
    },
    editData: {
      type: Object,
      default: null
    },
    pets: {
      type: Array,
      default: () => []
    },
    skillOptions: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      draft: createDraft(),
      keyword: '',
      selectedTypes: [],
      activeSection: 'skills',
      activeSkillSlot: 0,
      activeSkillFilter: 'all'
    }
  },
  computed: {
    title() {
      return this.mode === 'add' ? '添加精灵' : '编辑配置'
    },
    ivFields() {
      return IV_FIELDS
    },
    natureLabels() {
      return NATURE_OPTIONS.map((item) => item.label)
    },
    typeOptions() {
      return TYPE_OPTIONS
    },
    skillFilterOptions() {
      return SKILL_FILTER_OPTIONS
    },
    upIndex() {
      return Math.max(0, NATURE_OPTIONS.findIndex((item) => item.value === this.draft.natureUp))
    },
    downIndex() {
      return Math.max(0, NATURE_OPTIONS.findIndex((item) => item.value === this.draft.natureDown))
    },
    filteredPets() {
      const keyword = String(this.keyword || '').trim().toLowerCase()
      return this.pets.filter((pet) => {
        const matchKeyword = !keyword || String(pet.name || '').toLowerCase().includes(keyword)
        const matchType =
          this.selectedTypes.length === 0 ||
          this.selectedTypes.every((type) => (pet.types || []).includes(type))
        return matchKeyword && matchType
      })
    },
    selectedPet() {
      return this.pets.find((pet) => pet.id === this.draft.petId) || null
    },
    selectedRace() {
      return this.selectedPet?.race || null
    },
    skillSlots() {
      return Array.from({ length: 4 }, (_, index) => this.draft.skills[index] || createEmptySkill())
    },
    filteredSkillOptions() {
      if (this.activeSkillFilter === 'all') return this.skillOptions
      return this.skillOptions.filter((item) => item.skillType === this.activeSkillFilter)
    },
    bloodlineSelectedCount() {
      return this.skillSlots.filter((item) => item.skillType === '血脉技能' && item.name).length
    },
    skillWarning() {
      if (this.bloodlineSelectedCount > 1) {
        return '血脉技能最多只能选择一个'
      }
      if (this.hasDuplicateSkills()) {
        return '同一只精灵不能携带两个相同技能'
      }
      return ''
    },
    natureWarning() {
      if (this.draft.natureUp !== '无' && this.draft.natureUp === this.draft.natureDown) {
        return '增益和减益不能选择同一项'
      }
      return ''
    },
    filledIvItems() {
      return this.ivFields
        .map((item) => ({
          ...item,
          value: Number(this.draft.ivs[item.key]) || 0
        }))
        .filter((item) => item.value > 0)
    },
    ivWarning() {
      if (this.filledIvItems.length > 3) {
        const labels = this.filledIvItems.map((item) => item.label).join('、')
        return `精灵只有三项个体提升，请保留 3 项。当前已填写：${labels}`
      }
      return ''
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler(value) {
        if (!value) return
        this.draft = createDraft(this.editData)
        this.keyword = ''
        this.selectedTypes = []
        this.activeSection = this.mode === 'add' ? 'skills' : 'skills'
        this.activeSkillSlot = 0
        this.activeSkillFilter = 'all'
      }
    },
    editData: {
      deep: true,
      handler(value) {
        if (this.visible) {
          this.draft = createDraft(value)
        }
      }
    }
  },
  methods: {
    handleMaskClick() {
      if (this.mode === 'edit') {
        this.$emit('autosave', this.sanitizeDraft())
        return
      }
      this.$emit('close')
    },
    onKeywordInput(event) {
      this.keyword = event.detail.value
    },
    clearKeyword() {
      this.keyword = ''
    },
    clearTypes() {
      this.selectedTypes = []
    },
    toggleType(type) {
      const index = this.selectedTypes.indexOf(type)
      if (index >= 0) {
        this.selectedTypes.splice(index, 1)
        return
      }
      if (this.selectedTypes.length >= 2) {
        this.selectedTypes.shift()
      }
      this.selectedTypes.push(type)
    },
    getTypeColor(type) {
      return TYPE_OPTIONS.find((item) => item.key === type)?.color || '#5b7cf5'
    },
    resolvePetImage(src) {
      return resolveAssetPath(src)
    },
    selectPet(pet) {
      this.draft.petId = pet.id
      this.draft.petName = pet.name
      this.draft.image = resolveAssetPath(pet.img)
      this.draft.types = [...(pet.types || [])]
      const cached = loadPetConfig(pet.id)
      if (cached && cached.ivs) {
        this.draft.ivs = { ...cached.ivs }
        if (cached.natureUp) this.draft.natureUp = cached.natureUp
        if (cached.natureDown) this.draft.natureDown = cached.natureDown
        if (cached.star !== undefined) this.draft.star = cached.star
        if (cached.level !== undefined) this.draft.level = cached.level
      } else {
        this.applySuggestedBuild()
      }
    },
    onNatureChange(kind, event) {
      const option = NATURE_OPTIONS[Number(event.detail.value)] || NATURE_OPTIONS[0]
      if (kind === 'up') {
        this.draft.natureUp = option.value
        if (this.draft.natureUp !== '无' && this.draft.natureUp === this.draft.natureDown) {
          this.draft.natureDown = '无'
        }
      } else {
        this.draft.natureDown = option.value
        if (this.draft.natureDown !== '无' && this.draft.natureDown === this.draft.natureUp) {
          this.draft.natureUp = '无'
        }
      }
      this.applySuggestedBuild()
      this.saveCurrentConfig()
    },
    applySuggestedBuild() {
      if (!this.selectedRace) return
      this.draft.ivs = buildSuggestedIvs(this.selectedRace, this.draft.natureUp, this.draft.natureDown)
    },
    saveCurrentConfig() {
      if (!this.draft.petId) return
      savePetConfig(this.draft.petId, {
        ivs: this.draft.ivs,
        natureUp: this.draft.natureUp,
        natureDown: this.draft.natureDown,
        star: this.draft.star,
        level: this.draft.level
      })
    },
    clearSkillSlot(index) {
      const nextSkills = this.skillSlots.slice(0, 4).map((item) => ({ ...item }))
      nextSkills[index] = createEmptySkill()
      this.draft.skills = nextSkills
      this.activeSkillSlot = index
    },
    hasDuplicateSkills(nextSkills = this.skillSlots) {
      const seen = new Set()
      return nextSkills.some((item) => {
        if (!item?.name) return false
        const key = `${item.name}|${item.skillType || ''}`
        if (seen.has(key)) return true
        seen.add(key)
        return false
      })
    },
    isSkillSelectedOnActiveSlot(skill) {
      const current = this.skillSlots[this.activeSkillSlot]
      return current?.name === skill.name && current?.skillType === skill.skillType
    },
    isSkillChosen(skill) {
      return this.skillSlots.some((item) => item.name === skill.name && item.skillType === skill.skillType)
    },
    selectSkillCard(skill) {
      if (skill.skillType === '血脉技能') {
        const existed = this.skillSlots.findIndex(
          (item, index) => index !== this.activeSkillSlot && item.skillType === '血脉技能' && item.name
        )
        if (existed >= 0) {
          uni.showToast({ title: '血脉技能最多只能选择一个', icon: 'none' })
          return
        }
      }

      const nextSkills = this.skillSlots.slice(0, 4).map((item) => ({ ...item }))
      const duplicateIndex = nextSkills.findIndex(
        (item, index) => index !== this.activeSkillSlot && item.name === skill.name && item.skillType === skill.skillType
      )
      if (duplicateIndex >= 0) {
        uni.showToast({ title: '同一只精灵不能带两个相同技能', icon: 'none' })
        return
      }
      nextSkills[this.activeSkillSlot] = { ...skill }
      this.draft.skills = nextSkills

      if (this.activeSkillSlot < 3) {
        this.activeSkillSlot += 1
      }
    },
    onIvInput(key, event) {
      const raw = Number(event.detail.value)
      const value = Number.isFinite(raw) ? Math.max(0, Math.min(10, Math.round(raw))) : 0
      this.$set(this.draft.ivs, key, value)
      this.saveCurrentConfig()
    },
    getNatureLabel(value) {
      return NATURE_OPTIONS.find((item) => item.value === value)?.label || '无'
    },
    formatTypes(types = []) {
      return types.join(' / ')
    },
    sanitizeDraft() {
      const draft = createDraft(this.draft)
      draft.skills = this.skillSlots
        .filter((item) => item.name)
        .map((item) => ({
          name: item.name,
          type: item.type,
          attr: item.attr,
          consume: item.consume,
          describe: item.describe,
          icon: item.icon,
          skillType: item.skillType,
          skillTypeLabel: item.skillTypeLabel
        }))
      return draft
    },
    submit() {
      if (!this.draft.petId) {
        uni.showToast({ title: '请先选择精灵', icon: 'none' })
        return
      }
      if (this.mode === 'edit' && this.natureWarning) {
        uni.showToast({ title: this.natureWarning, icon: 'none' })
        return
      }
      if (this.mode === 'edit' && this.ivWarning) {
        uni.showToast({ title: '个体值最多只能提升 3 项', icon: 'none' })
        return
      }
      if (this.mode === 'edit' && this.skillWarning) {
        uni.showToast({ title: this.skillWarning, icon: 'none' })
        return
      }
      const data = this.sanitizeDraft()
      savePetConfig(this.draft.petId, {
        ivs: data.ivs,
        natureUp: data.natureUp,
        natureDown: data.natureDown,
        star: data.star,
        level: data.level
      })
      this.$emit('save', data)
    }
  }
}
</script>

<style scoped>
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(61, 52, 43, 0.5);
  display: flex;
  align-items: flex-end;
}

.sheet-panel {
  width: 100%;
  height: 84vh;
  border-radius: 16rpx 16rpx 0 0;
  background: #FFFFFF;
  padding: 12rpx 16rpx calc(12rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(61, 52, 43, 0.08);
  display: flex;
  flex-direction: column;
}

.sheet-handle {
  width: 56rpx;
  height: 6rpx;
  border-radius: 8rpx;
  background: #E2E8F0;
  margin: 0 auto;
}

.sheet-topbar {
  display: grid;
  grid-template-columns: 120rpx 1fr 120rpx;
  align-items: center;
  gap: 10rpx;
  margin-top: 12rpx;
}

.top-btn {
  height: 52rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 600;
}

.top-btn.ghost {
  background: #F8FAFC;
  color: #64748B;
}

.top-btn.primary {
  background: #22C55E;
  color: #FFFFFF;
}

.sheet-title {
  text-align: center;
  font-size: 26rpx;
  font-weight: 700;
  color: #1E293B;
}

.sheet-body {
  flex: 1;
  min-height: 0;
  margin-top: 14rpx;
}

.add-body {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.edit-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.selector-card,
.config-card,
.selected-card {
  padding: 14rpx;
  border-radius: 16rpx;
  background: #FFFFFF;
  box-shadow: 0 4rpx 12rpx rgba(61, 52, 43, 0.05);
}

.pet-list-scroll,
.config-scroll {
  flex: 1;
  min-height: 0;
}

.search-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.search-input {
  flex: 1;
  height: 60rpx;
  border-radius: 8rpx;
  background: #F8FAFC;
  padding: 0 16rpx;
  font-size: 22rpx;
  color: #1E293B;
}

.input-placeholder {
  color: #94A3B8;
}

.search-clear,
.filter-clear {
  font-size: 20rpx;
  font-weight: 600;
  color: #22C55E;
}

.section-title {
  display: block;
  font-size: 22rpx;
  font-weight: 700;
  color: #1E293B;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10rpx;
}

.section-note,
.selected-label,
.selected-empty,
.result-tip,
.selected-type,
.selected-note,
.iv-summary-label,
.iv-summary-empty,
.iv-rule-tip,
.field-warning,
.skill-option-meta,
.skill-picker-type {
  font-size: 18rpx;
  color: #64748B;
}

.filter-head,
.selected-row {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.selected-types,
.type-grid,
.pet-card-types,
.iv-summary-tags,
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6rpx;
}

.type-grid {
  margin-top: 12rpx;
}

.type-chip,
.filter-chip {
  min-height: 48rpx;
  padding: 6rpx 10rpx;
  border-radius: 8rpx;
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.type-chip.active,
.filter-chip.active {
  background: rgba(246, 185, 59, 0.1);
  border-color: #22C55E;
  color: #22C55E;
}

.chip-text {
  font-size: 18rpx;
  color: #1E293B;
}

.result-tip {
  display: block;
  margin-top: 10rpx;
}

.pet-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10rpx;
  padding: 2rpx;
}

.pet-card {
  padding: 12rpx;
  border-radius: 16rpx;
  background: #FFFFFF;
  box-shadow: 0 4rpx 12rpx rgba(61, 52, 43, 0.05);
  border: 1px solid #E2E8F0;
}

.pet-card.active {
  border-color: #22C55E;
  box-shadow: 0 4rpx 16rpx rgba(246, 185, 59, 0.15);
}

.pet-card-image {
  width: 100%;
  height: 100rpx;
}

.pet-card-name,
.selected-name {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  font-weight: 700;
  color: #1E293B;
}

.selected-card {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.selected-image {
  width: 100rpx;
  height: 100rpx;
  flex: 0 0 auto;
}

.selected-info {
  min-width: 0;
}

.editor-tabs {
  margin-top: 12rpx;
  display: flex;
  gap: 10rpx;
  flex-shrink: 0;
}

.editor-tab {
  flex: 1;
  height: 56rpx;
  border-radius: 8rpx;
  background: #F8FAFC;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  color: #64748B;
}

.editor-tab.active {
  background: #22C55E;
  color: #FFFFFF;
}

.config-scroll {
  margin-top: 12rpx;
  height: 0;
}

.config-stack {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12rpx;
  padding-bottom: 20rpx;
}

.picked-grid {
  margin-top: 10rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10rpx;
}

.picked-card {
  padding: 10rpx;
  border-radius: 8rpx;
  background: #F8FAFC;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.picked-card.active {
  border-color: #22C55E;
  background: rgba(246, 185, 59, 0.08);
}

.picked-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6rpx;
  width: 100%;
}

.picked-slot,
.picked-name {
  color: #1E293B;
}

.picked-slot {
  font-size: 18rpx;
  font-weight: 700;
}

.picked-clear {
  font-size: 16rpx;
  color: #E55039;
  font-weight: 600;
}

.picked-name {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
}

.picked-icon {
  width: 60rpx;
  height: 60rpx;
  margin-top: 8rpx;
  border-radius: 8rpx;
  background: #FFFFFF;
}

.skill-option-list {
  margin-top: 10rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10rpx;
}

.skill-option-card {
  padding: 10rpx;
  border-radius: 8rpx;
  background: #F8FAFC;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #E2E8F0;
}

.skill-option-card.active {
  border-color: #22C55E;
  background: rgba(34, 197, 94, 0.08);
}

.skill-option-card.chosen:not(.active) {
  border-color: rgba(246, 185, 59, 0.3);
}

.skill-option-card.bloodline {
  border-color: rgba(229, 80, 57, 0.2);
}

.skill-option-card.stone {
  border-color: rgba(74, 105, 189, 0.2);
}

.skill-option-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 8rpx;
  background: #FFFFFF;
}

.skill-option-name {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  font-weight: 700;
  color: #1E293B;
  line-height: 1.3;
  text-align: center;
}

.skill-option-meta {
  margin-top: 6rpx;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 4rpx;
}

.skill-option-tag {
  height: 30rpx;
  padding: 0 8rpx;
  border-radius: 8rpx;
  background: #FFFFFF;
  color: #64748B;
  font-size: 16rpx;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  border: 1px solid #E2E8F0;
}

.skill-option-tag.muted {
  background: #F8FAFC;
  color: #94A3B8;
}

.skill-option-desc {
  display: -webkit-box;
  margin-top: 4rpx;
  font-size: 16rpx;
  line-height: 1.4;
  color: #64748B;
  text-align: center;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-skills {
  margin-top: 10rpx;
  padding: 16rpx;
  border-radius: 8rpx;
  background: #F8FAFC;
  font-size: 20rpx;
  color: #94A3B8;
  text-align: center;
}

.picker-stack {
  margin-top: 10rpx;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10rpx;
}

.picker-box {
  min-height: 60rpx;
  border-radius: 8rpx;
  background: #F8FAFC;
  padding: 0 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
  font-size: 20rpx;
  color: #1E293B;
}

.field-warning {
  display: block;
  margin-top: 8rpx;
  color: #E55039;
}

.iv-summary {
  margin-top: 10rpx;
}

.iv-summary-tag {
  min-height: 34rpx;
  padding: 2rpx 8rpx;
  border-radius: 8rpx;
  background: #F8FAFC;
  color: #1E293B;
  font-size: 16rpx;
  font-weight: 600;
  font-family: Monaco, Consolas, 'Courier New', monospace;
  border: 1px solid #E2E8F0;
}

.iv-grid {
  margin-top: 10rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10rpx;
}

.iv-item {
  padding: 10rpx;
  border-radius: 8rpx;
  background: #F8FAFC;
  border: 1px solid transparent;
}

.iv-item.active {
  border-color: #22C55E;
  background: rgba(246, 185, 59, 0.06);
}

.iv-label {
  display: block;
  font-size: 18rpx;
  font-weight: 600;
  color: #64748B;
}

.iv-input {
  margin-top: 8rpx;
  height: 52rpx;
  border-radius: 8rpx;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  padding: 0 12rpx;
  font-size: 22rpx;
  color: #1E293B;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}
</style>
