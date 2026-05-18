<template>
  <view class="page">
    <AppHeader title="属性克制" subtitle="先看四类关系，底部再看最高形态精灵例子" leftAction="back">
      <template #right>
        <text class="header-btn" @click="openGraph">克制图</text>
      </template>
    </AppHeader>

    <scroll-view scroll-y class="content">
      <view class="control-card card">
        <view class="mode-row">
          <view class="mode-btn" :class="{ active: !doubleMode }" @click="setDoubleMode(false)">
            单属性
          </view>
          <view class="mode-btn" :class="{ active: doubleMode }" @click="setDoubleMode(true)">
            双属性
          </view>
        </view>

        <view class="slot-row">
          <view class="slot-card" :class="{ active: activeSlot === 'primary' }" @click="activeSlot = 'primary'">
            <text class="slot-label">主属性</text>
            <view class="slot-value">
              <TypeBadge v-if="selectedPrimary" :label="selectedPrimary" :color="getTypeColor(selectedPrimary)" />
              <text v-else class="slot-empty">请选择</text>
            </view>
          </view>

          <view v-if="doubleMode" class="slot-card" :class="{ active: activeSlot === 'secondary' }" @click="activeSlot = 'secondary'">
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
            :style="isSelectedType(item.key) ? { borderColor: item.color } : null"
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
          <view class="action-btn primary" @click="openGraph">查看克制图</view>
          <view class="action-btn ghost" @click="resetSelection">重置</view>
        </view>
      </view>

      <view class="summary-grid">
        <view class="summary-card card">
          <text class="summary-title danger">克制我</text>
          <text class="summary-sub">这些属性打我更痛</text>
          <view class="type-list">
            <view
              v-for="item in defenseWeakTypes"
              :key="'dw-' + item.type"
              class="result-chip danger clickable"
              :class="{ active: getSelectedExampleType('defenseWeak', defenseWeakTypes) === item.type }"
              @click="selectExampleType('defenseWeak', item.type)"
            >
              <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
              <text class="result-name">{{ item.type }}</text>
              <text class="result-multi danger-text">{{ item.multiplier }}</text>
            </view>
            <text v-if="!defenseWeakTypes.length" class="empty-text">暂无明显被克制属性</text>
          </view>
        </view>

        <view class="summary-card card">
          <text class="summary-title strong">我克制</text>
          <text class="summary-sub">我打这些属性更痛</text>
          <view class="type-list">
            <view
              v-for="item in attackStrongTypes"
              :key="'as-' + item.type"
              class="result-chip strong clickable"
              :class="{ active: getSelectedExampleType('attackStrong', attackStrongTypes) === item.type }"
              @click="selectExampleType('attackStrong', item.type)"
            >
              <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
              <text class="result-name">{{ item.type }}</text>
              <text class="result-multi danger-text">{{ item.multiplier }}</text>
            </view>
            <text v-if="!attackStrongTypes.length" class="empty-text">暂无明显克制属性</text>
          </view>
        </view>

        <view class="summary-card card">
          <text class="summary-title resist">我抵抗</text>
          <text class="summary-sub">这些属性打我更轻</text>
          <view class="type-list">
            <view
              v-for="item in defenseResistTypes"
              :key="'dr-' + item.type"
              class="result-chip resist clickable"
              :class="{ active: getSelectedExampleType('defenseResist', defenseResistTypes) === item.type }"
              @click="selectExampleType('defenseResist', item.type)"
            >
              <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
              <text class="result-name">{{ item.type }}</text>
              <text class="result-multi weak-text">{{ item.multiplier }}</text>
            </view>
            <text v-if="!defenseResistTypes.length" class="empty-text">暂无明显抵抗属性</text>
          </view>
        </view>

        <view class="summary-card card">
          <text class="summary-title blocked">抵抗我</text>
          <text class="summary-sub">我打这些属性会被削弱</text>
          <view class="type-list">
            <view
              v-for="item in attackResistTypes"
              :key="'ar-' + item.type"
              class="result-chip blocked clickable"
              :class="{ active: getSelectedExampleType('attackResist', attackResistTypes) === item.type }"
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
          <view class="example-head" @click="toggleExamples(section.key)">
            <view>
              <text class="example-title">{{ section.title }}</text>
             
            </view>
            <view class="example-right">
              <text class="example-count">{{ section.pets.length }} 只</text>
              <text class="example-arrow">{{ expandedExamples[section.key] ? '⌄' : '›' }}</text>
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
      <view class="dialog-card card" @click.stop>
        <view class="dialog-head">
          <text class="dialog-title">属性克制图</text>
          <text class="dialog-close" @click="showGraphDialog = false">关闭</text>
        </view>

        <view class="dialog-tabs">
          <view class="dialog-tab" :class="{ active: graphMode === 'defense' }" @click="graphMode = 'defense'">
            当前分析
          </view>
          <view class="dialog-tab" :class="{ active: graphMode === 'overview' }" @click="graphMode = 'overview'">
            属性总览
          </view>
        </view>

        <view class="dialog-tip">
          <text>红色箭头表示克制，蓝色箭头表示抵抗。双属性时会按 2x / 3x / 1/2x / 1/3x 计算。</text>
        </view>

        <view class="graph-box">
          <TypeGraph
            :mode="graphMode"
            :selectedType1="selectedPrimary"
            :selectedType2="doubleMode ? selectedSecondary : ''"
            :typeList="typeOptions"
            :relationTable="typeEffectChart"
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
import PetCard from '@/components/PetCard/PetCard.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import TypeGraph from '@/components/TypeGraph/TypeGraph.vue'
import { pets, petTypes } from '@/data/pets.js'
import { petsDetail } from '@/data/pets_detail_light.js'
import { getAttrMultiplier, getBestAttackMatchup, getHighestFormPets, normalizeAttr, typeEffectChart } from '@/data/game_math.js'
import { getTypeList } from '@/utils/typeGraph.js'

const typeOptions = getTypeList(typeEffectChart)
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
  if (value === 1 / 3) return '0.33x'
  return `${value}x`
}

export default {
  components: {
    AppHeader,
    PetCard,
    TypeBadge,
    TypeGraph
  },
  data() {
    return {
      pets,
      petsDetail,
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
      return getHighestFormPets(this.pets, this.petsDetail)
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
      uni.navigateTo({ url: '/pages/detail/detail?id=' + id })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f7f9fc 0%, #edf3fb 100%);
}

.header-btn {
  font-size: 24rpx;
  color: #fff;
  font-weight: 700;
}

.content {
  height: calc(100vh - 96rpx);
}

.card {
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 16rpx 40rpx rgba(31, 47, 87, 0.08);
}

.control-card {
  margin: 18rpx 24rpx 0;
  padding: 18rpx;
}

.mode-row {
  display: flex;
  gap: 12rpx;
}

.mode-btn {
  flex: 1;
  height: 76rpx;
  border-radius: 18rpx;
  background: #f6f8fc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  color: #51607f;
  border: 1rpx solid transparent;
}

.mode-btn.active {
  background: rgba(91, 124, 245, 0.1);
  border-color: rgba(91, 124, 245, 0.28);
  color: #5b7cf5;
}

.slot-row {
  display: flex;
  gap: 12rpx;
  margin-top: 14rpx;
}

.slot-card {
  flex: 1;
  min-width: 0;
  padding: 14rpx;
  border-radius: 18rpx;
  background: #f8fbff;
  border: 1rpx solid transparent;
}

.slot-card.active {
  border-color: rgba(91, 124, 245, 0.28);
  background: #fff;
}

.slot-label {
  display: block;
  font-size: 20rpx;
  color: #6b7590;
}

.slot-value {
  margin-top: 8rpx;
  min-height: 44rpx;
  display: flex;
  align-items: center;
}

.slot-empty {
  font-size: 22rpx;
  color: #9aa4bb;
}

.type-grid {
  margin-top: 14rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.type-chip {
  width: calc((100% - 30rpx) / 4);
  min-height: 72rpx;
  padding: 10rpx 12rpx;
  border-radius: 18rpx;
  background: #f1f4fb;
  border: 1rpx solid transparent;
  display: flex;
  align-items: center;
  gap: 8rpx;
  box-sizing: border-box;
}

.type-chip.active {
  background: #fff;
}

.chip-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #1c2748;
}

.selected-strip {
  margin-top: 14rpx;
  padding: 14rpx 16rpx;
  border-radius: 18rpx;
  background: #f8fbff;
}

.selected-title {
  display: block;
  font-size: 22rpx;
  color: #6b7590;
}

.selected-types {
  margin-top: 10rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.action-row {
  display: flex;
  gap: 12rpx;
  margin-top: 14rpx;
}

.action-btn {
  flex: 1;
  height: 76rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.action-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, #5b7cf5 0%, #38bdf8 100%);
}

.action-btn.ghost {
  color: #3f557c;
  background: #edf2fb;
}

.summary-grid {
  padding: 18rpx 24rpx 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.summary-card {
  padding: 18rpx;
}

.summary-title {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
}

.summary-title.danger,
.danger-text {
  color: #ef4444;
}

.summary-title.strong {
  color: #dc2626;
}

.summary-title.resist,
.weak-text {
  color: #2563eb;
}

.summary-title.blocked {
  color: #1d4ed8;
}

.summary-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #6b7590;
}

.type-list {
  margin-top: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.result-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-height: 56rpx;
  padding: 8rpx 10rpx;
  border-radius: 16rpx;
}

.result-chip.clickable {
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  border: 1rpx solid transparent;
}

.result-chip.clickable.active {
  transform: translateY(-2rpx);
  box-shadow: 0 10rpx 24rpx rgba(31, 47, 87, 0.08);
  border-color: rgba(91, 124, 245, 0.26);
}

.result-chip.danger,
.result-chip.strong {
  background: rgba(239, 68, 68, 0.08);
}

.result-chip.resist,
.result-chip.blocked {
  background: rgba(37, 99, 235, 0.08);
}

.result-name {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  font-weight: 700;
  color: #1c2748;
}

.result-multi {
  font-size: 22rpx;
  font-weight: 800;
}

.examples-wrap {
  padding: 18rpx 24rpx 0;
}

.example-card {
  padding: 18rpx;
  margin-bottom: 14rpx;
}

.example-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.example-title {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #1c2748;
}

.example-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #6b7590;
}

.example-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.example-count {
  font-size: 20rpx;
  color: #6b7590;
}

.example-arrow {
  font-size: 34rpx;
  color: #7f8aa8;
  line-height: 1;
}

.pet-grid {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.pet-extra {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
}

.pet-id {
  font-size: 20rpx;
  color: #7f8aa8;
  font-weight: 700;
}

.pet-relation {
  font-size: 20rpx;
  font-weight: 800;
}

.empty-box {
  margin-top: 14rpx;
}

.empty-text {
  font-size: 22rpx;
  color: #9aa4bb;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(8, 14, 28, 0.58);
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-card {
  width: 100%;
  max-width: 760rpx;
  max-height: 90vh;
  padding: 18rpx;
  display: flex;
  flex-direction: column;
}

.dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.dialog-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #1c2748;
}

.dialog-close {
  font-size: 24rpx;
  color: #5b7cf5;
  font-weight: 700;
}

.dialog-tabs {
  display: flex;
  gap: 10rpx;
  margin-top: 12rpx;
}

.dialog-tab {
  flex: 1;
  height: 68rpx;
  border-radius: 16rpx;
  background: #f4f7fd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  color: #51607f;
}

.dialog-tab.active {
  background: rgba(91, 124, 245, 0.12);
  color: #5b7cf5;
}

.dialog-tip {
  margin-top: 12rpx;
  font-size: 20rpx;
  color: #6b7590;
  line-height: 1.7;
}

.graph-box {
  margin-top: 14rpx;
  height: 66vh;
  min-height: 560rpx;
}

.bottom-space {
  height: calc(80rpx + env(safe-area-inset-bottom));
}
</style>
