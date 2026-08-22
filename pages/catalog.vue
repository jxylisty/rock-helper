<template>
  <view class="page">
    <AppHeader theme="green" title="图鉴" subtitle="本地收录全部精灵" leftAction="back">
      <template #right>
        <view class="header-capsule">
          <AppIcon name="book" :size="12" color="#FFFFFF" :stroke-width="2.4" />
          <text class="header-capsule-text">{{ petsList.length }} 只</text>
        </view>
      </template>
    </AppHeader>

    <view class="toolbar">
      <view class="search-pill">
        <AppIcon name="search" :size="14" color="#A3AE9F" :stroke-width="2.4" />
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索精灵名称或属性，例如：火、水、机械"
          placeholder-class="search-placeholder"
        />
      </view>

      <scroll-view scroll-x class="ui-tag-tabs" :show-scrollbar="false">
        <view class="tag-tabs-inner">
          <view
            v-for="tag in uiTagOptions"
            :key="tag.key"
            class="ui-tag-tab"
            :class="{ active: selectedUiTag === tag.key }"
            hover-class="press-down"
            @click="selectedUiTag = tag.key"
          >
            <text class="ui-tag-text">{{ tag.label }}</text>
            <text class="ui-tag-count">{{ tag.count }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="filter-head" hover-class="press-down" @click="toggleFilterPanel">
        <view class="filter-title-row">
          <view class="filter-dot"></view>
          <text class="filter-title">属性筛选</text>
          <AppIcon
            name="chevron-down"
            :size="13"
            color="#6B7A6E"
            :stroke-width="2.6"
            :class="['filter-chevron', { open: filterExpanded }]"
          />
        </view>
        <view class="filter-head-right">
          <view v-if="selectedTypes.length" class="filter-count-badge">
            <AppIcon name="shield" :size="9" color="#8A6A2C" :stroke-width="2.2" />
            <text class="filter-count-text">已选 {{ selectedTypes.length }}/2</text>
          </view>
          <view v-if="selectedTypes.length" class="clear-btn" hover-class="press-down" @click.stop="clearTypes">
            <AppIcon name="close" :size="10" color="#C64B38" :stroke-width="2.8" />
            <text class="clear-btn-text">清空</text>
          </view>
        </view>
      </view>

      <view v-if="filterExpanded" class="type-panel">
        <view class="type-grid">
          <view
            v-for="type in typeOptions"
            :key="type.key"
            class="type-chip"
            :class="{ active: selectedTypes.includes(type.key) }"
            :style="typeChipStyle(type)"
            hover-class="press-down"
            @click="toggleType(type.key)"
          >
            <RemoteImage class="type-chip-icon" :src="getTypeIconPath(type.key)" mode="aspectFit" />
            <text class="type-chip-text" :style="selectedTypes.includes(type.key) ? { color: type.color } : null">{{ type.label }}</text>
          </view>
        </view>
        <view class="filter-foot">
          <text class="filter-foot-tip">最多同时选择 2 个属性</text>
          <view class="filter-done-btn" hover-class="press-down" @click="toggleFilterPanel">
            <AppIcon name="check" :size="10" color="#FFF5EC" :stroke-width="3" />
            <text class="filter-done-text">完成</text>
          </view>
        </view>
      </view>

      <view class="stats-row">
        <view class="stats-capsule">
          <AppIcon name="shield" :size="11" color="#6B7A6E" :stroke-width="2.2" />
          <text class="stats-text">{{ selectedTypes.length ? '已选 ' + selectedTypes.join(' · ') : '未选属性' }}</text>
        </view>
        <view class="stats-capsule count">
          <text class="stats-mono">{{ filteredPets.length }} / {{ petsList.length }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="list-wrap" lower-threshold="160" :show-scrollbar="false" @scrolltolower="loadMore">
      <view class="grid">
        <PetCard
          v-for="pet in visiblePets"
          :key="pet.id"
          :img="pet.img"
          :name="pet.name"
          :accent-colors="getAccentColors(pet)"
          :code="'#' + String(pet.id).padStart(3, '0')"
          :badge="getCornerBadge(pet)"
          :badge-tone="hasLeaderForm(pet.id) ? 'gold' : 'gray'"
          compact
          @click="goToDetail(pet.id)"
        >
          <template #tags>
            <TypeBadge
              v-for="type in pet.type"
              :key="type"
              :label="type"
              :color="getTypeColor(type)"
              compact
            />
          </template>
        </PetCard>
      </view>

      <view v-if="!filteredPets.length" class="empty">
        <view class="empty-ring">
          <AppIcon name="search" :size="18" color="#A3AE9F" :stroke-width="2.2" />
        </view>
        <text class="empty-title">没有找到匹配的精灵</text>
        <text class="empty-sub">试试换个名称、属性或形态标签</text>
      </view>

      <view v-if="visiblePets.length < filteredPets.length" class="loading-more">
        <text>继续下滑加载更多精灵</text>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import PetCard from '@/components/PetCard/PetCard.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { petTypes, petDetail } from '@/data/pet/pet_detail.js'
import { petIndex } from '@/data/pet/pet_index.js'
import { hasLeaderFormPetId } from '@/data/pet/leader_forms.js'
import { resolveAssetPath } from '@/utils/asset-path.js'
import finalFormMap from '@/data/config/final_form_map.json'

const typeOptions = petTypes
  .map((item) => ({
    key: item.key,
    label: item.label || item.key,
    color: item.color
  }))
  .filter((item, index, list) => item.key && list.findIndex((other) => other.key === item.key) === index)

function tint(color, alpha) {
  const hex = String(color || '').replace('#', '')
  if (hex.length !== 6 && hex.length !== 3) return 'rgba(44, 58, 47, 0.04)'
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// 从 petIndex 构建精灵列表（每个 wikiId 只取主form）
function buildPetsList() {
  const seen = new Set()
  const result = []
  for (const [k, v] of Object.entries(petIndex)) {
    if (!seen.has(v.wikiId)) {
      seen.add(v.wikiId)
      const detail = petDetail[String(v.seq)]?.[0]
      result.push({
        id: v.seq,
        name: v.name,
        type: detail?.type || [],
        img: detail?.img || '',
        uiTag: v.uiTag,
        wikiId: v.wikiId
      })
    }
  }
  return result
}

const petsList = buildPetsList()

const INITIAL_RENDER_COUNT = 48
const RENDER_STEP = 32
const highestPetIdSet = new Set(
  petsList
    .filter((pet) => Number(finalFormMap[String(pet.id)] || pet.id) === Number(pet.id))
    .map((pet) => Number(pet.id))
)

export default {
  components: {
    AppHeader,
    AppIcon,
    PetCard,
    TypeBadge
  },
  data() {
    return {
      petsList,
      keyword: '',
      selectedTypes: [],
      leaderBadgeLabel: '\u9996\u9886\u5316',
      variantBadgeLabel: '\u591a\u5f62\u6001',
      leaderFilterLabel: '\u53ea\u770b\u9996\u9886\u5f62\u6001',
      onlyLeaderForms: false,
      typeOptions,
      selectedUiTag: '全部',
      filterExpanded: false,
      renderCount: INITIAL_RENDER_COUNT
    }
  },
  computed: {
    uiTagOptions() {
      const tagMap = {}
      for (const pet of this.petsList) {
        const tag = pet.uiTag || '其他'
        tagMap[tag] = (tagMap[tag] || 0) + 1
      }
      // 固定顺序：全部 > 最终形态 > I阶 > II阶 > 首领形态
      const order = ['全部', '最终形态', 'I阶', 'II阶', '首领形态']
      const result = [{ key: '全部', label: '全部', count: this.petsList.length }]
      for (const key of order.slice(1)) {
        if (tagMap[key]) {
          result.push({ key, label: key, count: tagMap[key] })
        }
      }
      // 其他未分类的标签
      for (const [key, count] of Object.entries(tagMap)) {
        if (!order.includes(key)) {
          result.push({ key, label: key, count })
        }
      }
      return result
    },
    finalPets() {
      return this.petsList
    },
    filteredPets() {
      const kw = this.keyword.trim().toLowerCase()
      return this.finalPets.filter((pet) => {
        const nameMatch = !kw || String(pet.name || '').toLowerCase().includes(kw)
        const typeMatch = !kw || (pet.type || []).some((type) => String(type).toLowerCase().includes(kw))
        const attrMatch =
          this.selectedTypes.length === 0 ||
          this.selectedTypes.every((type) => (pet.type || []).includes(type))
        const tagMatch =
          this.selectedUiTag === '全部' ||
          (pet.uiTag || '') === this.selectedUiTag
        return nameMatch && typeMatch && attrMatch && tagMatch
      })
    },
    visiblePets() {
      return this.filteredPets.slice(0, this.renderCount)
    }
  },
  watch: {
    keyword() {
      this.resetRenderCount()
    },
    selectedTypes: {
      deep: true,
      handler() {
        this.resetRenderCount()
      }
    },
    onlyLeaderForms() {
      this.resetRenderCount()
    },
    selectedUiTag() {
      this.resetRenderCount()
    }
  },
  methods: {
    resetRenderCount() {
      this.renderCount = INITIAL_RENDER_COUNT
    },
    loadMore() {
      if (this.renderCount >= this.filteredPets.length) return
      this.renderCount = Math.min(this.renderCount + RENDER_STEP, this.filteredPets.length)
    },
    clearTypes() {
      this.selectedTypes = []
    },
    toggleFilterPanel() {
      this.filterExpanded = !this.filterExpanded
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
    getTypeIconPath(type) {
      return resolveAssetPath(`/static/icons/${type}.webp`)
    },
    typeChipStyle(type) {
      if (this.selectedTypes.includes(type.key)) {
        return {
          background: tint(type.color, 0.12),
          borderColor: type.color
        }
      }
      return null
    },
    getAccentColors(pet) {
      return (pet.type || []).map((type) => this.getTypeColor(type))
    },
    getCornerBadge(pet) {
      if (this.hasLeaderForm(pet.id)) return this.leaderBadgeLabel
      if (this.hasVariants(pet.id)) return this.variantBadgeLabel
      return ''
    },
    getTypeColor(type) {
      const found = petTypes.find((item) => item.key === type)
      return found ? found.color : '#5b7cf5'
    },
    hasVariants(id) {
      const variants = petDetail[String(id)]
      return Array.isArray(variants) && variants.length > 1
    },
    hasLeaderForm(id) {
      return hasLeaderFormPetId(id)
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
    radial-gradient(circle at 12% 6%, rgba(47, 158, 95, 0.06) 0, transparent 42%),
    radial-gradient(circle at 88% 24%, rgba(201, 161, 78, 0.07) 0, transparent 40%);
}

.header-capsule {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 4px 11px 4px 8px;
}

.header-capsule-text {
  font-size: 11px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0.02em;
}

/* ===== 筛选工具卡 ===== */
.toolbar {
  margin: 12px 14px 0;
  padding: 12px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  border-radius: 18px;
  box-shadow: 0 3px 0 rgba(44, 58, 47, 0.10);
}

.search-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 14px;
  background: #FFFFFF;
  border: 1.5px solid #E3DCC8;
  border-radius: 999px;
  box-shadow: 0 2px 0 rgba(44, 58, 47, 0.06);
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  font-size: 13.5px;
  color: #2C3A2F;
}

.search-placeholder {
  color: #A3AE9F;
  font-size: 12.5px;
}

.ui-tag-tabs {
  margin-top: 10px;
  white-space: nowrap;
}

.tag-tabs-inner {
  display: inline-flex;
  gap: 7px;
  padding-right: 4px;
}

.ui-tag-tab {
  flex-shrink: 0;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #F2EBDA;
  border: 1.5px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: transform 0.12s ease;
}

.ui-tag-tab.active {
  background: #E4F2E8;
  border-color: #2F9E5F;
}

.ui-tag-text {
  font-size: 12.5px;
  font-weight: 700;
  color: #6B7A6E;
  white-space: nowrap;
}

.ui-tag-tab.active .ui-tag-text {
  color: #1E7A46;
}

.ui-tag-count {
  font-size: 10.5px;
  color: #A3AE9F;
  font-weight: 700;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.ui-tag-tab.active .ui-tag-count {
  color: rgba(30, 122, 70, 0.65);
}

.filter-head {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  transition: transform 0.12s ease;
}

.filter-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-chevron {
  transition: transform 0.2s ease;
}

.filter-chevron.open {
  transform: rotate(180deg);
}

.filter-head-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-count-badge {
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #FBF3DD;
  border: 1px solid #D9B96A;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.filter-count-text {
  font-size: 10.5px;
  font-weight: 700;
  color: #8A6A2C;
}

.filter-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #C9A14E;
}

.filter-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #2C3A2F;
}

.clear-btn {
  height: 26px;
  padding: 0 11px;
  border-radius: 999px;
  background: #FBE9E4;
  border: 1px solid #E0604E;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  transition: transform 0.12s ease;
}

.clear-btn-text {
  font-size: 11px;
  font-weight: 700;
  color: #C64B38;
}

.type-panel {
  margin-top: 9px;
  padding: 10px;
  border-radius: 14px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  box-shadow: 0 2.5px 0 rgba(44, 58, 47, 0.10);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

@media screen and (min-width: 640px) {
  .type-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.filter-foot {
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px dashed #E3DCC8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.filter-foot-tip {
  font-size: 10px;
  color: #A3AE9F;
  font-weight: 700;
}

.filter-done-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 13px;
  border-radius: 999px;
  background: linear-gradient(135deg, #1E7A46 0%, #2F9E5F 100%);
  border: 1.5px solid #166235;
  box-shadow: 0 2px 0 rgba(22, 98, 53, 0.35);
  transition: transform 0.12s ease;
}

.filter-done-text {
  font-size: 11px;
  font-weight: 700;
  color: #FFF5EC;
}

.type-chip {
  min-width: 0;
  height: 34px;
  padding: 0 6px;
  border-radius: 11px;
  background: #F7F1E3;
  border: 1.5px dashed #CFC7AE;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-sizing: border-box;
  transition: transform 0.12s ease;
}

.type-chip.active {
  border-style: solid;
  background: #FFFDF7;
}

.type-chip-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.type-chip-text {
  font-size: 12px;
  font-weight: 700;
  color: #6B7A6E;
  white-space: nowrap;
}

.stats-row {
  margin-top: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.stats-capsule {
  min-height: 28px;
  padding: 3px 12px;
  border-radius: 999px;
  background: #F2EBDA;
  border: 1px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 70%;
}

.stats-text {
  font-size: 11.5px;
  font-weight: 700;
  color: #6B7A6E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-capsule.count {
  max-width: 30%;
  background: #FFFDF7;
}

.stats-mono {
  font-size: 12.5px;
  font-weight: 700;
  color: #1E7A46;
  font-family: Monaco, Consolas, 'Courier New', monospace;
  white-space: nowrap;
}

.press-down {
  transform: scale(0.94);
  opacity: 0.85;
}

/* ===== 图鉴网格 ===== */
.list-wrap {
  flex: 1;
  min-height: 0;
}

.grid {
  padding: 12px 14px 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.empty {
  margin: 14px 14px 0;
  padding: 26px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  background: #FFFDF7;
  border: 1.5px dashed #CFC7AE;
  border-radius: 18px;
}

.empty-ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px dashed #CFC7AE;
  background: #FFFDF7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  display: block;
  margin-top: 4px;
  font-size: 15px;
  font-weight: 700;
  color: #2C3A2F;
}

.empty-sub {
  display: block;
  font-size: 12.5px;
  color: #6B7A6E;
}

.loading-more {
  padding: 12px 0 0;
  text-align: center;
  font-size: 12px;
  color: #A3AE9F;
}

.bottom-space {
  height: 24px;
}
</style>
