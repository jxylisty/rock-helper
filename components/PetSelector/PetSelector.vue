<template>
  <view v-if="visible" class="pet-selector-mask" @click="handleClose">
    <view class="pet-selector-sheet" @click.stop>
      <view class="sheet-grabber"></view>

      <view class="ps-head">
        <view class="ps-title-row">
          <view class="ps-title-seal">
            <AppIcon name="sparkles" :size="12" color="#FFF5EC" :stroke-width="2.4" />
          </view>
          <text class="ps-title">{{ title }}</text>
        </view>
        <view class="ps-close" hover-class="press-down" @click="handleClose">
          <AppIcon name="close" :size="11" color="#FFF5EC" :stroke-width="2.8" />
        </view>
      </view>

      <view class="sheet-toolbar">
        <!-- 搜索药丸 -->
        <view class="search-pill">
          <AppIcon name="search" :size="13" color="#A3AE9F" :stroke-width="2.4" />
          <input
            :value="keyword"
            class="search-input"
            placeholder="搜索精灵名称"
            placeholder-class="search-placeholder"
            @input="onKeywordInput"
          />
          <view v-if="keyword" class="search-clear" hover-class="press-down" @click="clearKeyword">
            <AppIcon name="close" :size="9" color="#C64B38" :stroke-width="2.8" />
          </view>
        </view>

        <!-- 形态筛选标签 -->
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

        <!-- 属性筛选可展开面板 -->
        <view class="filter-head" hover-class="press-down" @click="filterExpanded = !filterExpanded">
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
              <text class="filter-count-text">已选 {{ selectedTypes.length }}</text>
            </view>
            <view v-if="selectedTypes.length" class="clear-btn" hover-class="press-down" @click.stop="clearTypes">
              <AppIcon name="close" :size="10" color="#C64B38" :stroke-width="2.8" />
              <text class="clear-btn-text">清空</text>
            </view>
            <view class="result-badge">
              <AppIcon name="users" :size="9" color="#8A6A2C" :stroke-width="2.2" />
              <text class="result-badge-text">{{ filteredPets.length }} 只</text>
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
              :style="selectedTypes.includes(type.key) ? { borderColor: type.color, background: type.color + '14' } : null"
              hover-class="press-down"
              @click="toggleType(type.key)"
            >
              <TypeBadge :label="type.key" :color="type.color" compact />
              <text class="chip-text">{{ type.label }}</text>
            </view>
          </view>
          <view class="filter-foot">
            <text class="filter-foot-tip">可多选，同时满足所选属性</text>
            <view class="filter-done-btn" hover-class="press-down" @click="filterExpanded = false">
              <AppIcon name="check" :size="10" color="#FFF5EC" :stroke-width="3" />
              <text class="filter-done-text">完成</text>
            </view>
          </view>
        </view>
      </view>

      <scroll-view
        scroll-y
        class="ps-scroll"
        :show-scrollbar="false"
        :style="scrollHeight ? { height: scrollHeight, flex: 'none' } : null"
      >
        <view class="pet-grid">
          <view
            v-for="pet in filteredPets"
            :key="pet.id || pet.key"
            class="pet-card"
            :class="{ active: isActive(pet) }"
            hover-class="press-down"
            @click="handleSelect(pet)"
          >
            <view v-if="isActive(pet)" class="pet-card-check">
              <AppIcon name="check" :size="10" color="#FFF5EC" :stroke-width="3" />
            </view>
            <view v-if="getPetBadge(pet)" class="pet-card-badge" :class="{ leader: isLeaderPet(pet) }">
              <text>{{ getPetBadge(pet) }}</text>
            </view>
            <view class="pet-card-art">
              <RemoteImage class="pet-card-image" :src="resolvePetImage(getPetImg(pet))" mode="aspectFit" />
            </view>
            <text class="pet-card-name">{{ pet.fullName || pet.name }}</text>
            <text class="pet-card-code">{{ getPetCode(pet) }}</text>
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
        <view v-if="!filteredPets.length" class="empty-state">
          <view class="empty-icon">
            <AppIcon name="search" :size="18" color="#A3AE9F" :stroke-width="2.2" />
          </view>
          <text class="empty-text">没有找到符合条件的精灵</text>
          <text class="empty-sub">试试换个关键词或清空属性筛选</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import RemoteImage from '@/components/RemoteImage/RemoteImage.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import { petTypes, petDetail } from '@/data/pet/pet_detail.js'
import { hasLeaderFormPetId } from '@/data/pet/leader_forms.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

const TYPE_OPTIONS = (petTypes || [])
  .map((item) => ({ key: item.key, label: item.label || item.key, color: item.color || '#5b7cf5' }))
  .filter((item, index, list) => item.key && list.findIndex((o) => o.key === item.key) === index)

const UI_TAG_ORDER = ['全部', '最终形态', 'I阶', 'II阶', '首领形态', '变体形态']

function resolveBaseId(pet) {
  if (pet.baseId != null) return pet.baseId
  return pet.id != null ? pet.id : pet.seq
}

function matchSpecialTag(pet, tag) {
  const id = resolveBaseId(pet)
  if (tag === '首领形态') return hasLeaderFormPetId(id)
  if (tag === '变体形态') {
    const variants = petDetail[String(id)]
    return Array.isArray(variants) && variants.length > 1
  }
  return null
}

export default {
  name: 'PetSelector',
  components: { TypeBadge, RemoteImage, AppIcon },
  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '选择精灵' },
    pets: { type: Array, default: () => [] },
    activeId: { type: [Number, String], default: null },
    scrollHeight: { type: String, default: '' },
    defaultTag: { type: String, default: '最终形态' }
  },
  data() {
    return {
      keyword: '',
      selectedTypes: [],
      selectedUiTag: '最终形态',
      filterExpanded: false
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
        if (key === '首领形态' || key === '变体形态') {
          const count = this.pets.filter((pet) => matchSpecialTag(pet, key)).length
          if (count) result.push({ key, label: key, count })
          continue
        }
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
        let matchTag = true
        if (tag === '首领形态') {
          matchTag = matchSpecialTag(pet, '首领形态')
        } else if (tag === '变体形态') {
          matchTag = matchSpecialTag(pet, '变体形态')
        } else if (tag !== '全部') {
          matchTag = (pet.uiTag || '其他') === tag
        }
        return matchKw && matchType && matchTag
      })
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.keyword = ''
        this.selectedTypes = []
        this.selectedUiTag = this.defaultTag
        this.filterExpanded = false
      }
    }
  },
  methods: {
    getTypeColor(type) {
      return TYPE_OPTIONS.find((t) => t.key === type)?.color || '#5b7cf5'
    },
    resolvePetImage(src) { return resolveAssetPath(src) },
    getPetImg(pet) { return pet.img || (pet.detail && pet.detail.img) || '' },
    isLeaderPet(pet) { return hasLeaderFormPetId(resolveBaseId(pet)) },
    getPetBadge(pet) {
      if (this.isLeaderPet(pet)) return '首领化'
      const variants = petDetail[String(resolveBaseId(pet))]
      if (Array.isArray(variants) && variants.length > 1) return '多形态'
      return ''
    },
    getPetCode(pet) {
      const id = resolveBaseId(pet)
      if (id == null || id === '') return '#—'
      return '#' + String(id).padStart(3, '0')
    },
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
  background: rgba(30, 25, 14, 0.55);
  display: flex;
  align-items: flex-end;
}

.pet-selector-sheet {
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
.ps-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #1E7A46 0%, #2F9E5F 100%);
  border-bottom: 1.5px solid rgba(22, 98, 53, 0.5);
  box-shadow: 0 3px 0 rgba(22, 98, 53, 0.18);
}

.ps-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ps-title-seal {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  border: 1.5px solid rgba(255, 245, 236, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ps-title {
  font-size: 16.5px;
  font-weight: 700;
  color: #FFF5EC;
  letter-spacing: 0.02em;
}

.ps-close {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  border: 1.5px solid rgba(255, 245, 236, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 工具区 ===== */
.sheet-toolbar {
  flex-shrink: 0;
  padding: 10px 14px 0;
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

.search-clear {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #FBE9E4;
  border: 1px solid rgba(198, 75, 56, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 形态筛选标签 - 与 catalog 页一致 */
.ui-tag-tabs {
  margin-top: 10px;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
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

/* 属性筛选可展开面板 - 与 catalog 页一致 */
.filter-head {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.filter-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
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

.result-badge {
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #E9F0FA;
  border: 1px solid #7FA3D8;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.result-badge-text {
  font-size: 10.5px;
  font-weight: 700;
  color: #2C6FD1;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.clear-btn {
  height: 24px;
  padding: 0 9px;
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

@media screen and (min-width: 560px) {
  .type-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.type-chip {
  min-height: 34px;
  padding: 4px 6px;
  border-radius: 10px;
  border: 1.5px solid #E3DCC8;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  transition: transform 0.12s ease;
}

.type-chip.active {
  border-width: 2px;
}

.chip-text {
  font-size: 11px;
  font-weight: 700;
  color: #2C3A2F;
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

/* ===== 精灵滚动区 ===== */
.ps-scroll {
  flex: 1;
  height: 0;
  margin-top: 10px;
  overflow: hidden;
}

.pet-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  padding: 2px 14px 16px;
}

@media screen and (min-width: 560px) {
  .pet-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.pet-card {
  position: relative;
  padding: 7px 6px 8px;
  border-radius: 14px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  box-shadow: 0 2.5px 0 rgba(44, 58, 47, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.12s ease;
}

.pet-card.active {
  border-color: #2F9E5F;
  border-width: 2px;
  background: #F2FAF4;
  box-shadow: 0 2.5px 0 rgba(30, 122, 70, 0.25);
}

.pet-card-check {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1E7A46 0%, #2F9E5F 100%);
  border: 2px solid #FFFDF7;
  box-shadow: 0 2px 0 rgba(22, 98, 53, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.pet-card-badge {
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 2;
  height: 17px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(255, 253, 247, 0.92);
  border: 1px solid #D8D0BA;
  display: inline-flex;
  align-items: center;
}

.pet-card-badge text {
  font-size: 9px;
  font-weight: 700;
  color: #6B7A6E;
  white-space: nowrap;
}

.pet-card-badge.leader {
  background: #FBF3DD;
  border-color: #D9B96A;
}

.pet-card-badge.leader text {
  color: #A97F35;
}

.pet-card-art {
  width: 100%;
  height: 62px;
  border-radius: 10px;
  background:
    radial-gradient(circle at 50% 62%, rgba(201, 161, 78, 0.10) 0, transparent 62%),
    #FFFFFF;
  border: 1px solid rgba(227, 220, 200, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pet-card-image {
  width: 100%;
  height: 100%;
}

.pet-card-name {
  margin-top: 5px;
  font-size: 11.5px;
  font-weight: 700;
  color: #2C3A2F;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-card-code {
  margin-top: 1px;
  font-size: 9.5px;
  font-weight: 700;
  color: #A3AE9F;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.pet-card-types {
  margin-top: 3px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 3px;
}

/* ===== 空态 ===== */
.empty-state {
  margin: 22px 14px 30px;
  padding: 26px 16px;
  border-radius: 18px;
  background: #FFFDF7;
  border: 1.5px dashed #D8CFB4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.empty-icon {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background: #F2EBDA;
  border: 1.5px solid #E3DCC8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}

.empty-text {
  font-size: 13px;
  font-weight: 700;
  color: #6B7A6E;
}

.empty-sub {
  font-size: 11px;
  color: #A3AE9F;
  font-weight: 600;
}

.press-down {
  transform: scale(0.96);
  opacity: 0.88;
}
</style>
