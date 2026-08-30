<template>
  <view class="page">
    <AppHeader theme="red" title="属性克制" subtitle="四类克制关系 · 附精灵示例" leftAction="back">
      <template #right>
        <view class="header-capsule" hover-class="press-down" @click="openGraph">
          <AppIcon name="map" :size="11" color="#FFFFFF" />
          <text class="header-capsule-text">克制图</text>
        </view>
      </template>
    </AppHeader>

    <scroll-view scroll-y class="content" :show-scrollbar="false">
      <view class="control-card card">
        <view class="mode-row">
          <view class="mode-btn" :class="{ active: !doubleMode }" hover-class="press-down" @click="setDoubleMode(false)">
            <text class="mode-btn-text">单属性</text>
          </view>
          <view class="mode-btn" :class="{ active: doubleMode }" hover-class="press-down" @click="setDoubleMode(true)">
            <text class="mode-btn-text">双属性</text>
          </view>
        </view>

        <view class="slot-row">
          <view class="slot-card" :class="{ active: activeSlot === 'primary' }" hover-class="press-down" @click="activeSlot = 'primary'">
            <text class="slot-label">主属性</text>
            <view class="slot-value">
              <TypeBadge v-if="selectedPrimary" :label="selectedPrimary" :color="getTypeColor(selectedPrimary)" />
              <text v-else class="slot-empty">请选择</text>
            </view>
          </view>

          <view v-if="doubleMode" class="slot-card" :class="{ active: activeSlot === 'secondary' }" hover-class="press-down" @click="activeSlot = 'secondary'">
            <text class="slot-label">副属性</text>
            <view class="slot-value">
              <TypeBadge v-if="selectedSecondary" :label="selectedSecondary" :color="getTypeColor(selectedSecondary)" />
              <text v-else class="slot-empty">请选择</text>
            </view>
          </view>
        </view>

        <view class="type-grid">
          <view
            v-for="item in typeOptions"
            :key="item.key"
            class="type-chip"
            :class="{ active: isSelectedType(item.key) }"
            :style="isSelectedType(item.key) ? { borderColor: item.color, background: tintBg(item.color) } : null"
            hover-class="press-down"
            @click="pickType(item.key)"
          >
            <TypeBadge :label="item.key" :color="item.color" compact />
            <text class="chip-text">{{ item.label }}</text>
          </view>
        </view>

        <view class="selected-strip">
          <text class="selected-title">当前分析</text>
          <view class="selected-types">
            <TypeBadge
              v-for="type in selectedTypes"
              :key="type"
              :label="type"
              :color="getTypeColor(type)"
            />
          </view>
        </view>

        <view class="action-row">
          <view class="action-btn primary" hover-class="press-down" @click="openGraph">
            <AppIcon name="map" :size="11" color="#FFF5EC" />
            <text class="action-btn-text primary-text">查看克制图</text>
          </view>
          <view class="action-btn ghost" hover-class="press-down" @click="resetSelection">
            <AppIcon name="close" :size="10" color="#C64B38" :stroke-width="2.6" />
            <text class="action-btn-text ghost-text">重置</text>
          </view>
        </view>
      </view>

      <view class="summary-grid">
        <view class="summary-card card tone-danger">
          <view class="mini-card-head">
            <view class="mini-icon danger">
              <AppIcon name="shield" :size="12" color="#FFFFFF" />
            </view>
            <view class="mini-head-text">
              <text class="summary-title">克制我</text>
              <text class="summary-sub">这些属性打我更痛</text>
            </view>
          </view>
          <view class="type-list">
            <view
              v-for="item in defenseWeakTypes"
              :key="'dw-' + item.type"
              class="result-chip clickable"
              :class="{ active: getSelectedExampleType('defenseWeak', defenseWeakTypes) === item.type }"
              hover-class="press-down"
              @click="selectExampleType('defenseWeak', item.type)"
            >
              <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
              <text class="result-name">{{ item.type }}</text>
              <text class="result-multi danger-text">{{ item.multiplier }}</text>
            </view>
            <text v-if="!defenseWeakTypes.length" class="empty-text">暂无明显被克制属性</text>
          </view>
        </view>

        <view class="summary-card card tone-strong">
          <view class="mini-card-head">
            <view class="mini-icon strong">
              <AppIcon name="zap" :size="12" color="#FFFFFF" />
            </view>
            <view class="mini-head-text">
              <text class="summary-title">我克制</text>
              <text class="summary-sub">我打这些属性更痛</text>
            </view>
          </view>
          <view class="type-list">
            <view
              v-for="item in attackStrongTypes"
              :key="'as-' + item.type"
              class="result-chip clickable"
              :class="{ active: getSelectedExampleType('attackStrong', attackStrongTypes) === item.type }"
              hover-class="press-down"
              @click="selectExampleType('attackStrong', item.type)"
            >
              <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
              <text class="result-name">{{ item.type }}</text>
              <text class="result-multi danger-text">{{ item.multiplier }}</text>
            </view>
            <text v-if="!attackStrongTypes.length" class="empty-text">暂无明显克制属性</text>
          </view>
        </view>

        <view class="summary-card card tone-resist">
          <view class="mini-card-head">
            <view class="mini-icon resist">
              <AppIcon name="wind" :size="12" color="#FFFFFF" />
            </view>
            <view class="mini-head-text">
              <text class="summary-title">我抵抗</text>
              <text class="summary-sub">这些属性打我更轻</text>
            </view>
          </view>
          <view class="type-list">
            <view
              v-for="item in defenseResistTypes"
              :key="'dr-' + item.type"
              class="result-chip clickable"
              :class="{ active: getSelectedExampleType('defenseResist', defenseResistTypes) === item.type }"
              hover-class="press-down"
              @click="selectExampleType('defenseResist', item.type)"
            >
              <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
              <text class="result-name">{{ item.type }}</text>
              <text class="result-multi weak-text">{{ item.multiplier }}</text>
            </view>
            <text v-if="!defenseResistTypes.length" class="empty-text">暂无明显抵抗属性</text>
          </view>
        </view>

        <view class="summary-card card tone-block">
          <view class="mini-card-head">
            <view class="mini-icon block">
              <AppIcon name="block" :size="12" color="#FFFFFF" :stroke-width="2.4" />
            </view>
            <view class="mini-head-text">
              <text class="summary-title">抵抗我</text>
              <text class="summary-sub">我打这些属性会被削弱</text>
            </view>
          </view>
          <view class="type-list">
            <view
              v-for="item in attackResistTypes"
              :key="'ar-' + item.type"
              class="result-chip clickable"
              :class="{ active: getSelectedExampleType('attackResist', attackResistTypes) === item.type }"
              hover-class="press-down"
              @click="selectExampleType('attackResist', item.type)"
            >
              <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
              <text class="result-name">{{ item.type }}</text>
              <text class="result-multi weak-text">{{ item.multiplier }}</text>
            </view>
            <text v-if="!attackResistTypes.length" class="empty-text">暂无明显被抵抗属性</text>
          </view>
        </view>
      </view>

      <view class="examples-wrap">
        <view v-for="section in exampleSections" :key="section.key" class="example-card card">
          <view class="example-head" hover-class="press-down" @click="toggleExamples(section.key)">
            <view class="example-left">
              <view class="example-dot" :class="`dot-${section.key}`"></view>
              <text class="example-title">{{ section.title }}</text>
              <view v-if="section.selectedType" class="example-type-chip">
                <text class="example-type-text">{{ section.selectedType }}</text>
              </view>
            </view>
            <view class="example-right">
              <view class="example-count-capsule">
                <text class="example-count">{{ section.pets.length }} 只</text>
              </view>
              <AppIcon
                name="chevron-down"
                :size="12"
                color="#A3AE9F"
                :stroke-width="2.8"
                :class="{ 'flip-up': expandedExamples[section.key] }"
              />
            </view>
          </view>

          <view v-if="expandedExamples[section.key]" class="pet-grid">
            <PetCard
              v-for="pet in section.pets"
              :key="section.key + '-' + pet.id"
              :img="pet.img"
              :name="pet.name"
              :subtitle="getPetTypes(pet)"
              compact
              @click="goToDetail(pet.id)"
            >
              <template #tags>
                <TypeBadge v-for="type in pet.type" :key="type" :label="type" :color="getTypeColor(type)" compact />
              </template>
              <template #extra>
                <view class="pet-extra">
                  <text class="pet-id">#{{ String(pet.id).padStart(3, '0') }}</text>
                  <text
                    v-if="pet.relationMultiplier !== 1"
                    class="pet-relation"
                    :class="pet.relationMultiplier > 1 ? 'danger-text' : 'weak-text'"
                  >
                    {{ pet.relationText }}
                  </text>
                </view>
              </template>
            </PetCard>
            <view v-if="!section.pets.length" class="empty-box">
              <text class="empty-text">暂无符合条件的最高形态精灵</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <view v-if="showGraphDialog" class="dialog-mask" @click="showGraphDialog = false">
      <view class="dialog-card" @click.stop>
        <view class="dialog-head">
          <view class="dialog-head-left">
            <view class="dialog-head-icon">
              <AppIcon name="map" :size="13" color="#FFF5EC" />
            </view>
            <text class="dialog-title">属性克制图</text>
          </view>
          <view class="dialog-close" hover-class="press-down" @click="showGraphDialog = false">
            <AppIcon name="close" :size="10" color="#C64B38" :stroke-width="2.6" />
            <text class="dialog-close-text">关闭</text>
          </view>
        </view>

        <view class="dialog-tabs">
          <view class="dialog-tab" :class="{ active: graphMode === 'defense' }" hover-class="press-down" @click="graphMode = 'defense'">
            <text class="dialog-tab-text">当前分析</text>
          </view>
          <view class="dialog-tab" :class="{ active: graphMode === 'overview' }" hover-class="press-down" @click="graphMode = 'overview'">
            <text class="dialog-tab-text">属性总览</text>
          </view>
        </view>

        <view class="dialog-tip">
          <AppIcon name="info" :size="11" color="#A97F35" />
          <text class="dialog-tip-text">行看攻击、列看防守：红格=克制(2x/3x)，蓝格=抵抗(½x/¼x)。双属性时会自动合并倍率。</text>
        </view>

        <view class="graph-box">
          <TypeMatrix
            :mode="graphMode"
            :selectedType1="selectedPrimary"
            :selectedType2="doubleMode ? selectedSecondary : ''"
            :typeList="typeOptions"
            @selectType="onGraphSelect"
            @clearSelect="onGraphClear"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import PetCard from '@/components/PetCard/PetCard.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import TypeMatrix from '@/components/TypeMatrix/TypeMatrix.vue'
import { petTypes, petDetail } from '@/data/pet/pet_detail.js'
import { getAttrMultiplier, getBestAttackMatchup, getHighestFormPets, normalizeAttr, typeEffectChart } from '@/data/config/game_math.js'
import { buildBasePetList } from '@/utils/petListBuilder.js'

const typeOptions = Object.keys(typeEffectChart)
  .map((key) => {
    const found = petTypes.find((item) => normalizeAttr(item.key) === key)
    return {
      key,
      label: found?.label || key,
      color: found?.color || '#5b7cf5'
    }
  })
  .filter((item, index, list) => item.key && list.findIndex((other) => other.key === item.key) === index)

const validTypeSet = new Set(typeOptions.map((item) => item.key))

function formatMultiplier(value) {
  if (value === 3) return '3x'
  if (value === 2) return '2x'
  if (value === 0.5) return '0.5x'
  if (value === 1 / 4) return '0.25x'
  return `${value}x`
}

const _pets = buildBasePetList()

export default {
  components: {
    AppHeader,
    AppIcon,
    PetCard,
    TypeBadge,
    TypeMatrix
  },
  data() {
    return {
      pets: _pets,
      typeEffectChart,
      typeOptions,
      doubleMode: false,
      activeSlot: 'primary',
      selectedPrimary: typeOptions[0]?.key || '',
      selectedSecondary: '',
      showGraphDialog: false,
      graphMode: 'defense',
      exampleTypeSelection: {
        defenseWeak: '',
        attackStrong: '',
        defenseResist: '',
        attackResist: ''
      },
      expandedExamples: {
        defenseWeak: false,
        attackStrong: false,
        defenseResist: false,
        attackResist: false
      }
    }
  },
  computed: {
    selectedTypes() {
      if (!this.selectedPrimary) return []
      if (this.doubleMode && this.selectedSecondary && this.selectedSecondary !== this.selectedPrimary) {
        return [this.selectedPrimary, this.selectedSecondary]
      }
      return [this.selectedPrimary]
    },
    attackStrongTypes() {
      return this.typeOptions
        .map((item) => {
          const value = Math.max(...this.selectedTypes.map((type) => getAttrMultiplier(type, [item.key])))
          return { type: item.key, multiplier: formatMultiplier(value), value }
        })
        .filter((item) => item.value > 1)
        .sort((a, b) => b.value - a.value)
    },
    attackResistTypes() {
      return this.typeOptions
        .map((item) => {
          const value = Math.min(...this.selectedTypes.map((type) => getAttrMultiplier(type, [item.key])))
          return { type: item.key, multiplier: formatMultiplier(value), value }
        })
        .filter((item) => item.value < 1)
        .sort((a, b) => a.value - b.value)
    },
    defenseWeakTypes() {
      return this.typeOptions
        .map((item) => {
          const value = getAttrMultiplier(item.key, this.selectedTypes)
          return { type: item.key, multiplier: formatMultiplier(value), value }
        })
        .filter((item) => item.value > 1)
        .sort((a, b) => b.value - a.value)
    },
    defenseResistTypes() {
      return this.typeOptions
        .map((item) => {
          const value = getAttrMultiplier(item.key, this.selectedTypes)
          return { type: item.key, multiplier: formatMultiplier(value), value }
        })
        .filter((item) => item.value < 1)
        .sort((a, b) => a.value - b.value)
    },
    exampleSections() {
      return [
        {
          key: 'defenseWeak',
          title: '克制我的精灵',
          selectedType: this.getSelectedExampleType('defenseWeak', this.defenseWeakTypes),
          pets: this.pickExamplePets(this.defenseWeakTypes, 'petAttackToSelected', 'strong', this.getSelectedExampleType('defenseWeak', this.defenseWeakTypes))
        },
        {
          key: 'attackStrong',
          title: '我克制的精灵',
          selectedType: this.getSelectedExampleType('attackStrong', this.attackStrongTypes),
          pets: this.pickExamplePets(this.attackStrongTypes, 'selectedToPet', 'strong', this.getSelectedExampleType('attackStrong', this.attackStrongTypes))
        },
        {
          key: 'defenseResist',
          title: '我抵抗的精灵',
          selectedType: this.getSelectedExampleType('defenseResist', this.defenseResistTypes),
          pets: this.pickExamplePets(this.defenseResistTypes, 'petAttackToSelected', 'resist', this.getSelectedExampleType('defenseResist', this.defenseResistTypes))
        },
        {
          key: 'attackResist',
          title: '抵抗我的精灵',
          selectedType: this.getSelectedExampleType('attackResist', this.attackResistTypes),
          pets: this.pickExamplePets(this.attackResistTypes, 'selectedToPet', 'resist', this.getSelectedExampleType('attackResist', this.attackResistTypes))
        }
      ]
    }
  },
  methods: {
    getSelectedExampleType(sectionKey, items = []) {
      const current = this.exampleTypeSelection[sectionKey]
      if (current && items.some((item) => item.type === current)) {
        return current
      }
      return items[0]?.type || ''
    },
    selectExampleType(sectionKey, type) {
      this.$set(this.exampleTypeSelection, sectionKey, type)
      if (!this.expandedExamples[sectionKey]) {
        this.$set(this.expandedExamples, sectionKey, true)
      }
    },
    getCandidatePets() {
      return getHighestFormPets(this.pets, petDetail)
        .filter((pet) => {
          const normalizedTypes = (pet.type || []).map(normalizeAttr).filter(Boolean)
          return normalizedTypes.length && normalizedTypes.every((type) => validTypeSet.has(type))
        })
        .sort((a, b) => b.id - a.id)
    },
    setDoubleMode(value) {
      this.doubleMode = value
      this.activeSlot = 'primary'
      if (!value) {
        this.selectedSecondary = ''
      }
    },
    isSelectedType(type) {
      return this.selectedPrimary === type || this.selectedSecondary === type
    },
    pickType(type) {
      if (!this.doubleMode) {
        this.selectedPrimary = type
        return
      }

      if (this.activeSlot === 'secondary') {
        this.selectedSecondary = type === this.selectedPrimary ? '' : type
        return
      }

      this.selectedPrimary = type
      if (this.selectedSecondary === type) {
        this.selectedSecondary = ''
      }
      this.activeSlot = 'secondary'
    },
    resetSelection() {
      this.doubleMode = false
      this.activeSlot = 'primary'
      this.selectedPrimary = this.typeOptions[0]?.key || ''
      this.selectedSecondary = ''
    },
    tintBg(color, alpha = 0.1) {
      const hex = String(color || '').replace('#', '')
      if (hex.length !== 6 && hex.length !== 3) return 'rgba(44, 58, 47, 0.04)'
      const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
      const r = parseInt(full.slice(0, 2), 16)
      const g = parseInt(full.slice(2, 4), 16)
      const b = parseInt(full.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    },
    getTypeColor(type) {
      const found = this.typeOptions.find((item) => item.key === normalizeAttr(type))
      return found?.color || '#5b7cf5'
    },
    getPetTypes(pet) {
      return (pet.type || []).join(' / ')
    },
    getPetRelation(pet, mode) {
      if (!pet) {
        return {
          multiplier: 1,
          relationText: '等倍'
        }
      }

      const relation = mode === 'selectedToPet'
        ? getBestAttackMatchup(this.selectedTypes, pet.type || [])
        : getBestAttackMatchup(pet.type || [], this.selectedTypes)

      return {
        multiplier: relation.multiplier,
        relationText: relation.relationText
      }
    },
    pickExamplePets(typeItems, mode, expected, selectedType = '') {
      const normalizedSelectedType = normalizeAttr(selectedType)
      if (!normalizedSelectedType) return []

      const result = this.getCandidatePets()
        .map((pet) => {
          const normalizedTypes = (pet.type || []).map(normalizeAttr).filter(Boolean)
          if (!normalizedTypes.includes(normalizedSelectedType)) return null

          const relation = this.getPetRelation(pet, mode)
          if (expected === 'strong' && relation.multiplier <= 1) return null
          if (expected === 'resist' && relation.multiplier >= 1) return null

          return {
            ...pet,
            relationMultiplier: relation.multiplier,
            relationText: relation.relationText
          }
        })
        .filter(Boolean)

      return result
        .sort((a, b) => {
          if (expected === 'strong' && b.relationMultiplier !== a.relationMultiplier) {
            return b.relationMultiplier - a.relationMultiplier
          }
          if (expected === 'resist' && a.relationMultiplier !== b.relationMultiplier) {
            return a.relationMultiplier - b.relationMultiplier
          }
          return b.id - a.id
        })
    },
    toggleExamples(key) {
      this.$set(this.expandedExamples, key, !this.expandedExamples[key])
    },
    openGraph() {
      this.graphMode = 'defense'
      this.showGraphDialog = true
    },
    onGraphSelect(type) {
      if (!type) return
      if (this.graphMode === 'overview') {
        this.selectedPrimary = type
      } else if (!this.doubleMode || this.activeSlot === 'primary') {
        this.selectedPrimary = type
      } else {
        this.selectedSecondary = type === this.selectedPrimary ? '' : type
      }
    },
    onGraphClear() {
      if (this.graphMode === 'overview') {
        this.selectedPrimary = this.typeOptions[0]?.key || ''
      }
    },
    goToDetail(id) {
      uni.navigateTo({ url: '/pages/detail?id=' + id })
    }
  }
}
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FAF6EC;
  background-image:
    radial-gradient(circle at 12% 6%, rgba(198, 75, 56, 0.08) 0, transparent 42%),
    radial-gradient(circle at 88% 22%, rgba(201, 161, 78, 0.06) 0, transparent 40%);
}

.content {
  flex: 1;
  min-height: 0;
}

.press-down {
  transform: scale(0.95);
  opacity: 0.85;
}

.header-capsule {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  padding: 4px 12px 4px 9px;
  transition: transform 0.12s ease;
}

.header-capsule-text {
  font-size: 11px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0.02em;
}

.card {
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  border-radius: 18px;
  box-shadow: 0 3px 0 rgba(44, 58, 47, 0.10);
}

/* ===== 控制卡 ===== */
.control-card {
  margin: 12px 14px 0;
  padding: 13px;
}

.mode-row {
  display: flex;
  gap: 8px;
}

.mode-btn {
  flex: 1;
  height: 36px;
  border-radius: 12px;
  background: #F2EBDA;
  border: 1.5px solid #E3DCC8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease;
}

.mode-btn.active {
  background: linear-gradient(135deg, #C64B38 0%, #E0604E 100%);
  border-color: #9C3A2B;
  box-shadow: 0 2px 0 rgba(156, 58, 43, 0.4);
}

.mode-btn-text {
  font-size: 12.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.mode-btn.active .mode-btn-text {
  color: #FFF5EC;
}

.slot-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.slot-card {
  flex: 1;
  min-width: 0;
  padding: 9px 11px;
  border-radius: 12px;
  background: #F7F1E3;
  border: 1.5px dashed #CFC7AE;
  transition: transform 0.12s ease;
}

.slot-card.active {
  border-style: solid;
  border-color: #E0604E;
  background: #FFFDF7;
  box-shadow: 0 2px 0 rgba(198, 75, 56, 0.18);
}

.slot-label {
  display: block;
  font-size: 10.5px;
  color: #6B7A6E;
  font-weight: 700;
}

.slot-value {
  margin-top: 6px;
  min-height: 26px;
  display: flex;
  align-items: center;
}

.slot-empty {
  font-size: 12px;
  color: #A3AE9F;
}

.type-grid {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.type-chip {
  width: calc((100% - 18px) / 4);
  min-height: 38px;
  padding: 5px 8px;
  border-radius: 11px;
  background: #FFFDF7;
  border: 1.5px dashed #CFC7AE;
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  transition: transform 0.12s ease;
}

.type-chip.active {
  border-style: solid;
}

.chip-text {
  font-size: 11px;
  font-weight: 700;
  color: #6B7A6E;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-strip {
  margin-top: 10px;
  padding: 9px 12px;
  border-radius: 12px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
}

.selected-title {
  display: block;
  font-size: 11px;
  color: #6B7A6E;
  font-weight: 700;
}

.selected-types {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.action-btn {
  flex: 1;
  height: 35px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: transform 0.12s ease;
}

.action-btn.primary {
  background: linear-gradient(135deg, #C64B38 0%, #E0604E 100%);
  border: 1.5px solid #9C3A2B;
  box-shadow: 0 2.5px 0 rgba(156, 58, 43, 0.4);
}

.action-btn.ghost {
  background: #FBE9E4;
  border: 1.5px solid #E0604E;
  box-shadow: 0 2.5px 0 rgba(198, 75, 56, 0.28);
}

.action-btn-text {
  font-size: 12px;
  font-weight: 700;
}

.action-btn-text.primary-text {
  color: #FFF5EC;
}

.action-btn-text.ghost-text {
  color: #C64B38;
}

/* ===== 四色结果卡 ===== */
.summary-grid {
  padding: 12px 14px 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.summary-card {
  position: relative;
  overflow: hidden;
  padding: 12px;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
}

.tone-danger::before {
  background: linear-gradient(90deg, #C64B38, #E0604E);
}

.tone-strong::before {
  background: linear-gradient(90deg, #1E7A46, #2F9E5F);
}

.tone-resist::before {
  background: linear-gradient(90deg, #2C6FD1, #4F9CFF);
}

.tone-block::before {
  background: linear-gradient(90deg, #A97F35, #D9B96A);
}

.mini-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid;
}

.mini-icon.danger {
  background: linear-gradient(135deg, #C64B38 0%, #E0604E 100%);
  border-color: #9C3A2B;
  box-shadow: 0 2px 0 rgba(156, 58, 43, 0.4);
}

.mini-icon.strong {
  background: linear-gradient(135deg, #1E7A46 0%, #2F9E5F 100%);
  border-color: #166235;
  box-shadow: 0 2px 0 rgba(22, 98, 53, 0.4);
}

.mini-icon.resist {
  background: linear-gradient(135deg, #2C6FD1 0%, #4F9CFF 100%);
  border-color: #23508F;
  box-shadow: 0 2px 0 rgba(35, 80, 143, 0.4);
}

.mini-icon.block {
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border-color: #8A6A2C;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.4);
}

.mini-head-text {
  min-width: 0;
}

.summary-title {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
}

.summary-sub {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: #6B7A6E;
}

.type-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 5px 8px;
  border-radius: 10px;
  background: #F7F1E3;
  border: 1.5px solid transparent;
}

.result-chip.clickable {
  transition: transform 0.12s ease;
}

.result-chip.clickable.active {
  background: #FFFDF7;
  transform: translateX(2px);
}

.tone-danger .result-chip.active {
  border-color: #E0604E;
}

.tone-strong .result-chip.active {
  border-color: #2F9E5F;
}

.tone-resist .result-chip.active {
  border-color: #4F9CFF;
}

.tone-block .result-chip.active {
  border-color: #C9A14E;
}

.result-name {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: #2C3A2F;
}

.result-multi {
  font-size: 11px;
  font-weight: 800;
  font-family: Monaco, Consolas, 'Courier New', monospace;
  padding: 2px 7px;
  border-radius: 7px;
}

.danger-text {
  color: #C64B38;
  background: #FBE9E4;
}

.weak-text {
  color: #2C6FD1;
  background: #E3F0FC;
}

/* ===== 示例卡 ===== */
.examples-wrap {
  padding: 12px 14px 0;
}

.example-card {
  padding: 12px 13px;
  margin-bottom: 10px;
}

.example-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  transition: opacity 0.12s ease;
}

.example-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  flex-wrap: wrap;
}

.example-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-defenseWeak {
  background: #C64B38;
}

.dot-attackStrong {
  background: #2F9E5F;
}

.dot-defenseResist {
  background: #4F9CFF;
}

.dot-attackResist {
  background: #C9A14E;
}

.example-title {
  font-size: 13.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.example-type-chip {
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
}

.example-type-text {
  font-size: 10px;
  font-weight: 700;
  color: #6B7A6E;
}

.example-right {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

.example-count-capsule {
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: #F2EBDA;
  border: 1px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
}

.example-count {
  font-size: 10.5px;
  color: #6B7A6E;
  font-weight: 700;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.flip-up {
  transform: rotate(180deg);
}

.pet-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.pet-extra {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.pet-id {
  font-size: 10px;
  color: #A3AE9F;
  font-weight: 700;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.pet-relation {
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 6px;
}

.empty-box {
  margin-top: 10px;
}

.empty-text {
  font-size: 11px;
  color: #A3AE9F;
}

/* ===== 克制图弹窗 ===== */
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(44, 58, 47, 0.55);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-card {
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  padding: 14px;
  display: flex;
  flex-direction: column;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  border-radius: 20px;
  box-shadow: 0 4px 0 rgba(44, 58, 47, 0.18);
}

.dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dialog-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-head-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: linear-gradient(135deg, #C64B38 0%, #E0604E 100%);
  border: 1.5px solid #9C3A2B;
  box-shadow: 0 2px 0 rgba(156, 58, 43, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-title {
  font-size: 15px;
  font-weight: 800;
  color: #2C3A2F;
}

.dialog-close {
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  background: #FBE9E4;
  border: 1.5px solid #E0604E;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: transform 0.12s ease;
}

.dialog-close-text {
  font-size: 11.5px;
  font-weight: 700;
  color: #C64B38;
}

.dialog-tabs {
  display: flex;
  gap: 8px;
  margin-top: 11px;
}

.dialog-tab {
  flex: 1;
  height: 34px;
  border-radius: 11px;
  background: #F2EBDA;
  border: 1.5px solid #E3DCC8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease;
}

.dialog-tab.active {
  background: linear-gradient(135deg, #C64B38 0%, #E0604E 100%);
  border-color: #9C3A2B;
  box-shadow: 0 2px 0 rgba(156, 58, 43, 0.4);
}

.dialog-tab-text {
  font-size: 12.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.dialog-tab.active .dialog-tab-text {
  color: #FFF5EC;
}

.dialog-tip {
  margin-top: 10px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(201, 161, 78, 0.12);
  border: 1px dashed #C9A14E;
}

.dialog-tip-text {
  flex: 1;
  font-size: 11px;
  color: #A97F35;
  font-weight: 700;
  line-height: 1.5;
}

.graph-box {
  margin-top: 10px;
  height: 66vh;
  min-height: 400px;
}

.bottom-space {
  height: calc(20px + env(safe-area-inset-bottom));
}
</style>
