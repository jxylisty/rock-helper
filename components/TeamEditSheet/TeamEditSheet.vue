<template>
  <view v-if="visible" class="sheet-mask" @click="handleMaskClick">
    <view class="sheet-panel" @click.stop>
      <view class="sheet-grabber"></view>

      <view class="sheet-head">
        <view class="head-title-row">
          <view class="head-seal">
            <AppIcon name="wand" :size="12" color="#FFF5EC" :stroke-width="2.4" />
          </view>
          <text class="head-title">编辑配置</text>
        </view>
        <view class="head-actions">
          <view class="head-close" hover-class="press-down" @click="$emit('close')">
            <AppIcon name="close" :size="10" color="#C64B38" :stroke-width="2.8" />
            <text class="head-close-text">取消</text>
          </view>
          <view class="head-save" hover-class="press-down" @click="submit">
            <AppIcon name="check" :size="11" color="#FFF9EC" :stroke-width="3" />
            <text class="head-save-text">保存</text>
          </view>
        </view>
      </view>

      <scroll-view scroll-y class="sheet-scroll" :show-scrollbar="false">
        <view class="sheet-inner">
          <view class="pet-card">
            <view class="pet-art">
              <RemoteImage class="pet-img" :src="resolvePetImage(selectedPet?.img)" mode="aspectFit" />
            </view>
            <view class="pet-side">
              <text class="pet-name">{{ selectedPet?.name || '未选择精灵' }}</text>
              <view class="pet-types">
                <TypeBadge
                  v-for="type in (selectedPet?.types || [])"
                  :key="type"
                  :label="type"
                  :color="getTypeColor(type)"
                  compact
                />
              </view>
              <text class="pet-note">等级 60 / 星级 5 固定。血脉技能只能带一项。</text>
            </view>
          </view>

          <view class="tab-strip">
            <view
              class="tab-pill"
              :class="{ active: activeSection === 'skills' }"
              hover-class="press-down"
              @click="activeSection = 'skills'"
            >
              <AppIcon name="zap" :size="11" :color="activeSection === 'skills' ? '#FFF5EC' : '#6B7A6E'" :stroke-width="2.4" />
              <text class="tab-text">技能组</text>
            </view>
            <view
              class="tab-pill"
              :class="{ active: activeSection === 'build' }"
              hover-class="press-down"
              @click="activeSection = 'build'"
            >
              <AppIcon name="sparkles" :size="11" :color="activeSection === 'build' ? '#FFF5EC' : '#6B7A6E'" :stroke-width="2.4" />
              <text class="tab-text">个体 / 性格</text>
            </view>
          </view>

          <template v-if="activeSection === 'skills'">
            <view class="section-card">
              <view class="section-head">
                <view class="section-title-row">
                  <view class="section-dot"></view>
                  <text class="section-title">已选技能</text>
                </view>
                <text class="section-sub">先点技能槽，再选下方技能</text>
              </view>
              <view class="picked-grid">
                <view
                  v-for="(skill, index) in skillSlots"
                  :key="`picked-${index}`"
                  class="picked-card"
                  :class="{ active: activeSkillSlot === index }"
                  hover-class="press-down"
                  @click="activeSkillSlot = index"
                >
                  <view class="picked-top">
                    <text class="picked-slot">技能{{ index + 1 }}</text>
                    <view v-if="skill.name" class="picked-clear" hover-class="press-down" @click.stop="clearSkillSlot(index)">
                      <AppIcon name="close" :size="8" color="#C64B38" :stroke-width="3" />
                    </view>
                  </view>
                  <view class="picked-icon-wrap">
                    <RemoteImage v-if="skill.icon" class="picked-icon" :src="skill.icon" mode="aspectFit" />
                    <AppIcon v-else name="plus" :size="14" color="#C9A14E" :stroke-width="2.6" />
                  </view>
                  <text class="picked-name">{{ skill.name || '点击选择' }}</text>
                </view>
              </view>
              <view v-if="skillWarning" class="warn-banner">
                <AppIcon name="info" :size="11" color="#C64B38" :stroke-width="2.4" />
                <text class="warn-text">{{ skillWarning }}</text>
              </view>
            </view>

            <view class="section-card">
              <view class="section-head">
                <view class="section-title-row">
                  <view class="section-dot"></view>
                  <text class="section-title">技能筛选</text>
                </view>
                <text class="section-sub">血脉技能最多一个</text>
              </view>
              <view class="filter-chips">
                <view
                  v-for="item in skillFilterOptions"
                  :key="item.value"
                  class="filter-chip"
                  :class="{ active: activeSkillFilter === item.value }"
                  hover-class="press-down"
                  @click="activeSkillFilter = item.value"
                >
                  <text class="filter-chip-text">{{ item.label }}</text>
                </view>
              </view>
            </view>

            <view class="section-card">
              <view class="section-head">
                <view class="section-title-row">
                  <view class="section-dot"></view>
                  <text class="section-title">可选技能</text>
                </view>
                <view class="count-badge">
                  <text class="count-badge-text">当前编辑 技能{{ activeSkillSlot + 1 }}</text>
                </view>
              </view>
              <view v-if="filteredSkillOptions.length" class="skill-option-list">
                <view
                  v-for="skill in filteredSkillOptions"
                  :key="`${skill.name}-${skill.skillType}`"
                  class="skill-option-slot"
                  :class="{ chosen: isSkillChosen(skill) && !isSkillSelectedOnActiveSlot(skill) }"
                >
                  <SkillRow
                    :skill="skill"
                    compact
                    :active="isSkillSelectedOnActiveSlot(skill)"
                    @click="selectSkillCard(skill)"
                  />
                </view>
              </view>
              <view v-else class="empty-skills">
                <AppIcon name="search" :size="15" color="#A3AE9F" :stroke-width="2.2" />
                <text class="empty-skills-text">当前精灵没有可选技能数据</text>
              </view>
            </view>
          </template>

          <template v-else>
            <view class="section-card">
              <view class="section-head">
                <view class="section-title-row">
                  <view class="section-dot"></view>
                  <text class="section-title">性格增益 / 减益</text>
                </view>
              </view>
              <view class="picker-stack">
                <picker :range="natureLabels" :value="upIndex" @change="onNatureChange('up', $event)">
                  <view class="picker-box">
                    <view class="picker-tag up">
                      <text class="picker-tag-text">增益</text>
                    </view>
                    <text class="picker-value">{{ getNatureLabel(draft.natureUp) }}</text>
                    <AppIcon name="chevron-down" :size="12" color="#A3AE9F" :stroke-width="2.6" />
                  </view>
                </picker>
                <picker :range="natureLabels" :value="downIndex" @change="onNatureChange('down', $event)">
                  <view class="picker-box">
                    <view class="picker-tag down">
                      <text class="picker-tag-text">减益</text>
                    </view>
                    <text class="picker-value">{{ getNatureLabel(draft.natureDown) }}</text>
                    <AppIcon name="chevron-down" :size="12" color="#A3AE9F" :stroke-width="2.6" />
                  </view>
                </picker>
              </view>
              <view v-if="natureWarning" class="warn-banner">
                <AppIcon name="info" :size="11" color="#C64B38" :stroke-width="2.4" />
                <text class="warn-text">{{ natureWarning }}</text>
              </view>
            </view>

            <view class="section-card">
              <view class="section-head">
                <view class="section-title-row">
                  <view class="section-dot"></view>
                  <text class="section-title">个体值</text>
                </view>
                <view class="count-badge">
                  <text class="count-badge-text">已提升 {{ filledIvItems.length }}/3 项</text>
                </view>
              </view>
              <view class="iv-summary">
                <view v-if="filledIvItems.length" class="iv-summary-tags">
                  <text v-for="item in filledIvItems" :key="item.key" class="iv-summary-tag">
                    {{ item.label }} +{{ item.value }}
                  </text>
                </view>
                <text v-else class="iv-summary-empty">默认全为 0，未增加任何个体值</text>
              </view>
              <view class="iv-rule-list">
                <view class="iv-rule-line">
                  <AppIcon name="check" :size="9" color="#1E7A46" :stroke-width="3" />
                  <text class="iv-rule-text">每项只能填 1-10，最多提升 3 项，其余保持 0。</text>
                </view>
                <view class="iv-rule-line">
                  <AppIcon name="check" :size="9" color="#1E7A46" :stroke-width="3" />
                  <text class="iv-rule-text">默认按性格增益 +10，减益 0，种族值自动补满。</text>
                </view>
              </view>
              <view v-if="ivWarning" class="warn-banner">
                <AppIcon name="info" :size="11" color="#C64B38" :stroke-width="2.4" />
                <text class="warn-text">{{ ivWarning }}</text>
              </view>
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
          </template>

          <view class="bottom-safe"></view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import SkillRow from '@/components/SkillRow/SkillRow.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { petTypes } from '@/data/pet/pet_detail.js'
import { resolveAssetPath } from '@/utils/asset-path.js'
import { buildSuggestedIvs } from '@/utils/buildSuggestedIvs.js'
import { savePetConfig } from '@/utils/petConfigCache.js'

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
    AppIcon,
    SkillRow,
    TypeBadge
  },
  props: {
    visible: {
      type: Boolean,
      default: false
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
      activeSection: 'skills',
      activeSkillSlot: 0,
      activeSkillFilter: 'all'
    }
  },
  computed: {
    ivFields() {
      return IV_FIELDS
    },
    natureLabels() {
      return NATURE_OPTIONS.map((item) => item.label)
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
        this.activeSection = 'skills'
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
      this.$emit('autosave', this.sanitizeDraft())
    },
    getTypeColor(type) {
      return TYPE_OPTIONS.find((item) => item.key === type)?.color || '#5b7cf5'
    },
    resolvePetImage(src) {
      return resolveAssetPath(src)
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
      if (this.isSkillSelectedOnActiveSlot(skill)) {
        this.clearSkillSlot(this.activeSkillSlot)
        return
      }

      const existedIndex = this.skillSlots.findIndex(
        (item, index) => index !== this.activeSkillSlot && item.name === skill.name && item.skillType === skill.skillType
      )
      if (existedIndex >= 0) {
        this.activeSkillSlot = existedIndex
        return
      }

      if (skill.skillType === '血脉技能') {
        const bloodIndex = this.skillSlots.findIndex(
          (item, index) => index !== this.activeSkillSlot && item.skillType === '血脉技能' && item.name
        )
        if (bloodIndex >= 0) {
          uni.showToast({ title: '血脉技能最多只能选择一个', icon: 'none' })
          return
        }
      }

      const nextSkills = this.skillSlots.slice(0, 4).map((item) => ({ ...item }))
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
      if (this.natureWarning) {
        uni.showToast({ title: this.natureWarning, icon: 'none' })
        return
      }
      if (this.ivWarning) {
        uni.showToast({ title: '个体值最多只能提升 3 项', icon: 'none' })
        return
      }
      if (this.skillWarning) {
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: rgba(30, 25, 14, 0.55);
  display: flex;
  align-items: flex-end;
}

.sheet-panel {
  width: 100%;
  height: 86vh;
  background: #FAF6EC;
  background-image:
    radial-gradient(circle at 10% 4%, rgba(47, 158, 95, 0.06) 0, transparent 40%),
    radial-gradient(circle at 90% 10%, rgba(201, 161, 78, 0.07) 0, transparent 38%);
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sheet-grabber {
  flex-shrink: 0;
  width: 40px;
  height: 4.5px;
  border-radius: 999px;
  background: rgba(44, 58, 47, 0.18);
  margin: 8px auto 0;
}

/* ===== 翠绿头栏 ===== */
.sheet-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 14px;
  background: linear-gradient(135deg, #1E7A46 0%, #2F9E5F 100%);
  border-bottom: 1.5px solid rgba(22, 98, 53, 0.5);
  box-shadow: 0 3px 0 rgba(22, 98, 53, 0.18);
  margin-top: 6px;
}

.head-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.head-seal {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  border: 1.5px solid rgba(255, 245, 236, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.head-title {
  font-size: 16.5px;
  font-weight: 700;
  color: #FFF5EC;
  letter-spacing: 0.02em;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

.head-close {
  height: 30px;
  padding: 0 11px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  border: 1.5px solid rgba(255, 245, 236, 0.4);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: transform 0.12s ease;
}

.head-close-text {
  font-size: 11.5px;
  font-weight: 700;
  color: #FFF5EC;
}

.head-save {
  height: 30px;
  padding: 0 13px;
  border-radius: 10px;
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border: 1.5px solid #8A6A2C;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.4);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: transform 0.12s ease;
}

.head-save-text {
  font-size: 11.5px;
  font-weight: 700;
  color: #FFF9EC;
}

/* ===== 主体 ===== */
.sheet-scroll {
  flex: 1;
  height: 0;
  overflow: hidden;
}

.sheet-inner {
  padding: 12px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.press-down {
  transform: scale(0.96);
  opacity: 0.88;
}

/* ===== 选中精灵卡 ===== */
.pet-card {
  padding: 11px;
  border-radius: 16px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  box-shadow: 0 2.5px 0 rgba(44, 58, 47, 0.10);
  display: flex;
  align-items: center;
  gap: 11px;
}

.pet-art {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background:
    radial-gradient(circle at 50% 62%, rgba(201, 161, 78, 0.12) 0, transparent 62%),
    #FFFFFF;
  border: 1px solid rgba(227, 220, 200, 0.8);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-img {
  width: 100%;
  height: 100%;
}

.pet-side {
  flex: 1;
  min-width: 0;
}

.pet-name {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: #2C3A2F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-types {
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pet-note {
  display: block;
  margin-top: 5px;
  font-size: 10.5px;
  line-height: 1.5;
  color: #6B7A6E;
}

/* ===== 选项卡 ===== */
.tab-strip {
  display: flex;
  gap: 8px;
}

.tab-pill {
  flex: 1;
  height: 34px;
  border-radius: 999px;
  background: #F2EBDA;
  border: 1.5px solid #E3DCC8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: transform 0.12s ease;
}

.tab-pill.active {
  background: linear-gradient(135deg, #1E7A46 0%, #2F9E5F 100%);
  border-color: #166235;
  box-shadow: 0 2px 0 rgba(22, 98, 53, 0.35);
}

.tab-text {
  font-size: 12.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.tab-pill.active .tab-text {
  color: #FFF5EC;
}

/* ===== 区块卡 ===== */
.section-card {
  padding: 12px;
  border-radius: 16px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  box-shadow: 0 2.5px 0 rgba(44, 58, 47, 0.10);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.section-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #C9A14E;
}

.section-title {
  font-size: 13.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.section-sub {
  font-size: 10px;
  font-weight: 600;
  color: #A3AE9F;
  flex-shrink: 0;
}

.count-badge {
  flex-shrink: 0;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  background: #E4F2E8;
  border: 1px solid #2F9E5F;
  display: inline-flex;
  align-items: center;
}

.count-badge-text {
  font-size: 10px;
  font-weight: 700;
  color: #1E7A46;
}

/* ===== 已选技能槽 ===== */
.picked-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.picked-card {
  position: relative;
  padding: 8px;
  border-radius: 12px;
  background: #FFFFFF;
  border: 1.5px solid #E3DCC8;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.12s ease;
}

.picked-card.active {
  border-color: #C9A14E;
  background: #FBF3DD;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.22);
}

.picked-top {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picked-slot {
  font-size: 10px;
  font-weight: 700;
  color: #6B7A6E;
}

.picked-clear {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #FBE9E4;
  border: 1px solid rgba(224, 96, 78, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.picked-icon-wrap {
  margin-top: 6px;
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: #F2EBDA;
  border: 1px solid #E3DCC8;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picked-icon {
  width: 100%;
  height: 100%;
}

.picked-name {
  margin-top: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #2C3A2F;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picked-card.active .picked-name {
  color: #8A6A2C;
}

.warn-banner {
  margin-top: 9px;
  padding: 7px 10px;
  border-radius: 10px;
  background: #FBE9E4;
  border: 1px dashed rgba(224, 96, 78, 0.45);
  display: flex;
  align-items: center;
  gap: 6px;
}

.warn-text {
  flex: 1;
  font-size: 10.5px;
  font-weight: 700;
  color: #C64B38;
  line-height: 1.4;
}

/* ===== 筛选 chips ===== */
.filter-chips {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.filter-chip {
  height: 28px;
  padding: 0 13px;
  border-radius: 999px;
  background: #F2EBDA;
  border: 1.5px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
  transition: transform 0.12s ease;
}

.filter-chip.active {
  background: #E4F2E8;
  border-color: #2F9E5F;
}

.filter-chip-text {
  font-size: 11.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.filter-chip.active .filter-chip-text {
  color: #1E7A46;
}

/* ===== 可选技能列表 ===== */
.skill-option-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.skill-option-slot {
  border-radius: 14px;
  transition: transform 0.12s ease;
}

.skill-option-slot.chosen {
  border: 1.5px dashed rgba(201, 161, 78, 0.55);
  border-radius: 14px;
  padding: 3px;
}

.empty-skills {
  margin-top: 10px;
  padding: 18px 12px;
  border-radius: 14px;
  background: #FFFDF7;
  border: 1.5px dashed #D8CFB4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.empty-skills-text {
  font-size: 11.5px;
  font-weight: 600;
  color: #A3AE9F;
}

/* ===== 性格 picker ===== */
.picker-stack {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker-box {
  height: 40px;
  padding: 0 11px;
  border-radius: 12px;
  background: #FFFFFF;
  border: 1.5px solid #E3DCC8;
  display: flex;
  align-items: center;
  gap: 8px;
}

.picker-tag {
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.picker-tag.up {
  background: #E4F2E8;
  border: 1px solid #2F9E5F;
}

.picker-tag.down {
  background: #FBE9E4;
  border: 1px solid rgba(224, 96, 78, 0.5);
}

.picker-tag-text {
  font-size: 9.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.picker-tag.up .picker-tag-text {
  color: #1E7A46;
}

.picker-tag.down .picker-tag-text {
  color: #C64B38;
}

.picker-value {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  color: #2C3A2F;
}

/* ===== 个体值 ===== */
.iv-summary {
  margin-top: 10px;
}

.iv-summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.iv-summary-tag {
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  background: #F6EEDB;
  border: 1px solid #D9B96A;
  color: #8A6A2C;
  font-size: 10.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.iv-summary-empty {
  font-size: 10.5px;
  color: #A3AE9F;
  font-weight: 600;
}

.iv-rule-list {
  margin-top: 9px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.iv-rule-line {
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

.iv-rule-text {
  flex: 1;
  font-size: 10px;
  line-height: 1.5;
  color: #6B7A6E;
}

.iv-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

@media screen and (min-width: 520px) {
  .iv-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.iv-item {
  padding: 8px;
  border-radius: 12px;
  background: #FFFFFF;
  border: 1.5px solid #E3DCC8;
}

.iv-item.active {
  border-color: #2F9E5F;
  background: #F2FAF4;
}

.iv-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #6B7A6E;
}

.iv-input {
  margin-top: 5px;
  width: 100%;
  height: 34px;
  border-radius: 9px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  padding: 0 10px;
  box-sizing: border-box;
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.iv-item.active .iv-input {
  border-color: rgba(47, 158, 95, 0.5);
}

.bottom-safe {
  height: 16px;
}
</style>
