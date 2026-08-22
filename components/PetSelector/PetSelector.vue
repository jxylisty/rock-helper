<template>
  <view v-if="visible" class="pet-selector-mask" @click="handleClose">
    <view class="pet-selector-sheet" @click.stop>
      <view class="ps-head">
        <text class="ps-title">{{ title }}</text>
        <view class="ps-close" hover-class="touch-active" @click="handleClose">关闭</view>
      </view>

      <!-- 形态筛选标签 -->
      <view class="ui-tag-tabs">
        <view
          v-for="tag in uiTagOptions"
          :key="tag.key"
          class="ui-tag-tab"
          :class="{ active: selectedUiTag === tag.key }"
          @click="selectedUiTag = tag.key"
        >
          <text class="ui-tag-text">{{ tag.label }}</text>
          <text class="ui-tag-count">{{ tag.count }}</text>
        </view>
      </view>

      <view class="selector-card">
        <text class="section-title">搜索精灵</text>
        <view class="search-row">
          <input
            :value="keyword"
            class="search-input"
            placeholder="搜索精灵名称"
            placeholder-class="search-placeholder"
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

      <scroll-view scroll-y class="ps-scroll" :style="{ height: scrollHeight || '58vh' }">
        <view class="pet-grid">
          <view
            v-for="pet in filteredPets"
            :key="pet.id || pet.key"
            class="pet-card"
            :class="{ active: isActive(pet) }"
            @click="handleSelect(pet)"
          >
            <RemoteImage class="pet-card-image" :src="resolvePetImage(getPetImg(pet))" mode="aspectFit" />
            <text class="pet-card-name">{{ pet.fullName || pet.name }}</text>
            <view class="pet-card-types">
              <TypeBadge
                v-for="type in (pet.types || [])"
                :key="type"
                :label="type"
                :color="getTypeColor(type)"
                compact
              />
            </view>
          </view>
        </view>
        <view v-if="!filteredPets.length" class="empty-tip">没有找到符合条件的精灵</view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import RemoteImage from '@/components/RemoteImage/RemoteImage.vue'
import { petTypes } from '@/data/pet/pet_detail.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

const TYPE_OPTIONS = (petTypes || [])
  .map((item) => ({ key: item.key, label: item.label || item.key, color: item.color || '#5b7cf5' }))
  .filter((item, index, list) => item.key && list.findIndex((o) => o.key === item.key) === index)

const UI_TAG_ORDER = ['全部', '最终形态', 'I阶', 'II阶', '首领形态']

export default {
  name: 'PetSelector',
  components: { TypeBadge, RemoteImage },
  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '选择精灵' },
    pets: { type: Array, default: () => [] },
    activeId: { type: [Number, String], default: null },
    scrollHeight: { type: String, default: '' }
  },
  data() {
    return {
      keyword: '',
      selectedTypes: [],
      selectedUiTag: '最终形态'
    }
  },
  computed: {
    typeOptions() { return TYPE_OPTIONS },
    uiTagOptions() {
      const tagMap = {}
      for (const pet of this.pets) {
        const tag = pet.uiTag || '其他'
        tagMap[tag] = (tagMap[tag] || 0) + 1
      }
      const result = [{ key: '全部', label: '全部', count: this.pets.length }]
      for (const key of UI_TAG_ORDER.slice(1)) {
        if (tagMap[key]) result.push({ key, label: key, count: tagMap[key] })
      }
      // 其他未归类的标签
      for (const [key, count] of Object.entries(tagMap)) {
        if (!UI_TAG_ORDER.includes(key)) result.push({ key, label: key, count })
      }
      return result
    },
    filteredPets() {
      const kw = String(this.keyword || '').trim().toLowerCase()
      const types = this.selectedTypes
      const tag = this.selectedUiTag
      return this.pets.filter((pet) => {
        const matchKw = !kw ||
          String(pet.name || '').toLowerCase().includes(kw) ||
          String(pet.searchText || '').includes(kw)
        const matchType = !types.length ||
          types.every((t) => (pet.types || []).includes(t))
        const matchTag = tag === '全部' || (pet.uiTag || '其他') === tag
        return matchKw && matchType && matchTag
      })
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.keyword = ''
        this.selectedTypes = []
        this.selectedUiTag = '最终形态'
      }
    }
  },
  methods: {
    getTypeColor(type) {
      return TYPE_OPTIONS.find((t) => t.key === type)?.color || '#5b7cf5'
    },
    resolvePetImage(src) { return resolveAssetPath(src) },
    getPetImg(pet) { return pet.img || (pet.detail && pet.detail.img) || '' },
    isActive(pet) {
      const pid = pet.id || pet.key
      return pid != null && String(pid) === String(this.activeId)
    },
    onKeywordInput(e) { this.keyword = e.detail.value },
    clearKeyword() { this.keyword = '' },
    toggleType(key) {
      const idx = this.selectedTypes.indexOf(key)
      if (idx >= 0) this.selectedTypes.splice(idx, 1)
      else this.selectedTypes.push(key)
    },
    clearTypes() { this.selectedTypes = [] },
    handleClose() { this.$emit('close') },
    handleSelect(pet) { this.$emit('select', pet) }
  }
}
</script>

<style scoped>
.pet-selector-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}

.pet-selector-sheet {
  width: 100%;
  max-height: 90vh;
  background: #FFFFFF;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ps-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  flex-shrink: 0;
}

.ps-title {
  font-size: 17px;
  font-weight: 600;
  color: #1E293B;
}

.ps-close {
  font-size: 14px;
  color: #64748B;
  padding: 4px 8px;
}

/* 形态筛选标签 - 与 catalog 页一致 */
.ui-tag-tabs {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  overflow-x: auto;
  white-space: nowrap;
  flex-shrink: 0;
  -webkit-overflow-scrolling: touch;
}

.ui-tag-tab {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
}

.ui-tag-tab.active {
  background: rgba(34, 197, 94, 0.08);
  border-color: #22C55E;
}

.ui-tag-text {
  font-size: 13px;
  color: #64748B;
  white-space: nowrap;
}

.ui-tag-tab.active .ui-tag-text {
  color: #22C55E;
  font-weight: 600;
}

.ui-tag-count {
  font-size: 11px;
  color: #94A3B8;
  background: #E2E8F0;
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.ui-tag-tab.active .ui-tag-count {
  background: rgba(34, 197, 94, 0.15);
  color: #22C55E;
}

.ps-scroll {
  padding: 0 16px 16px;
}

.selector-card {
  padding: 10px;
  border-radius: 8px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  margin: 0 16px;
  flex-shrink: 0;
}

.search-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
  height: 40px;
  border-radius: 6px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  padding: 0 12px;
  font-size: 14px;
  color: #1E293B;
}

.search-clear,
.filter-clear {
  font-size: 12px;
  font-weight: 600;
  color: #22C55E;
}

.filter-head,
.selected-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.filter-actions,
.selected-types,
.type-grid,
.pet-card-types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.type-chip {
  min-height: 32px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #E2E8F0;
  background: #F1F5F9;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.type-chip.active {
  background: rgba(34, 197, 94, 0.08);
  border-color: #22C55E;
  color: #22C55E;
}

.chip-text {
  font-size: 12px;
  color: #1E293B;
}

.selected-label,
.selected-empty,
.result-tip {
  font-size: 12px;
  color: #64748B;
}

.result-tip {
  display: block;
  margin-top: 8px;
}

.pet-card {
  padding: 8px;
  border-radius: 6px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  text-align: center;
}

.pet-card.active {
  border-color: #22C55E;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.15);
}

.pet-card-image {
  width: 100%;
  height: 72px;
  border-radius: 6px;
  background: #FFFFFF;
}

.pet-card-name {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #1E293B;
}

.pet-card-types {
  margin-top: 3px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 3px;
}

.pet-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 2px;
}

.empty-tip {
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
  color: #94A3B8;
}
</style>
