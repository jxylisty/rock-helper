<template>
  <view class="page">
    <AppHeader title="图鉴" leftAction="back" />

    <view class="toolbar card">
      <input
        class="search-input"
        v-model="keyword"
        placeholder="搜索精灵名称或属性，例如：火、水、机械"
      />

      <view class="filter-head">
        <text class="filter-title">属性筛选</text>
        <view class="filter-actions">
          <view class="mini-btn" :class="{ active: selectedTypes.length === 0 }" @click="clearTypes">
            全部
          </view>
          <view class="mini-btn" :class="{ active: onlyLeaderForms }" @click="onlyLeaderForms = !onlyLeaderForms">
            {{ leaderFilterLabel }}
          </view>
          <view class="mini-btn" :class="{ active: onlyFinalForms }" @click="onlyFinalForms = !onlyFinalForms">
            只看最高形态
          </view>
        </view>
      </view>

      <view class="selected-row">
        <text class="selected-label">已选属性</text>
        <view class="selected-types" v-if="selectedTypes.length">
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
    </view>

    <view class="summary card">
      <text class="summary-title">图鉴总数</text>
      <text class="summary-value">{{ filteredPets.length }} / {{ pets.length }}</text>
    </view>

    <scroll-view scroll-y class="list-wrap" lower-threshold="160" @scrolltolower="loadMore">
      <view class="grid">
        <PetCard
          v-for="pet in visiblePets"
          :key="pet.id"
          :img="pet.img"
          :name="pet.name"
          :subtitle="getPetTypes(pet)"
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
          <template #extra>
            <view class="pet-meta">
              <view v-if="hasLeaderForm(pet.id)" class="variant-badge leader-badge">{{ leaderBadgeLabel }}</view>
              <view v-else-if="hasVariants(pet.id)" class="variant-badge">{{ variantBadgeLabel }}</view>
              <view class="pet-id">#{{ String(pet.id).padStart(3, '0') }}</view>
            </view>
          </template>
        </PetCard>
      </view>

      <view v-if="!filteredPets.length" class="empty card">
        <text class="empty-title">没有找到匹配的精灵</text>
        <text class="empty-sub">试试换个名称、属性，或者关闭最高形态筛选</text>
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
import PetCard from '@/components/PetCard/PetCard.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { pets, petTypes } from '@/data/pets.js'
import { petVariants } from '@/data/pet_variants.js'
import { hasLeaderFormPetId, leaderFormPetIdSet } from '@/data/leader_forms.js'
import finalFormMap from '@/data/final_form_map.json'

const typeOptions = petTypes
  .map((item) => ({
    key: item.key,
    label: item.label || item.key,
    color: item.color
  }))
  .filter((item, index, list) => item.key && list.findIndex((other) => other.key === item.key) === index)

const INITIAL_RENDER_COUNT = 48
const RENDER_STEP = 32
const highestPetIdSet = new Set(
  pets
    .filter((pet) => Number(finalFormMap[String(pet.id)] || pet.id) === Number(pet.id))
    .map((pet) => Number(pet.id))
)

export default {
  components: {
    AppHeader,
    PetCard,
    TypeBadge
  },
  data() {
    return {
      pets,
      keyword: '',
      selectedTypes: [],
      leaderBadgeLabel: '\u9996\u9886\u5316',
      variantBadgeLabel: '\u591a\u5f62\u6001',
      leaderFilterLabel: '\u53ea\u770b\u9996\u9886\u5f62\u6001',
      onlyLeaderForms: false,
      onlyFinalForms: false,
      typeOptions,
      renderCount: INITIAL_RENDER_COUNT
    }
  },
  computed: {
    finalPets() {
      let list = this.pets
      if (this.onlyLeaderForms) {
        list = list.filter((pet) => leaderFormPetIdSet.has(Number(pet.id)))
      }
      if (!this.onlyFinalForms) {
        return list
      }
      return list.filter((pet) => highestPetIdSet.has(Number(pet.id)))
    },
    filteredPets() {
      const kw = this.keyword.trim().toLowerCase()
      return this.finalPets.filter((pet) => {
        const nameMatch = !kw || String(pet.name || '').toLowerCase().includes(kw)
        const typeMatch = !kw || (pet.type || []).some((type) => String(type).toLowerCase().includes(kw))
        const attrMatch =
          this.selectedTypes.length === 0 ||
          this.selectedTypes.every((type) => (pet.type || []).includes(type))
        return nameMatch && typeMatch && attrMatch
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
    onlyFinalForms() {
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
    getPetTypes(pet) {
      return (pet.type || []).join(' / ')
    },
    getTypeColor(type) {
      const found = petTypes.find((item) => item.key === type)
      return found ? found.color : '#5b7cf5'
    },
    hasVariants(id) {
      return Array.isArray(petVariants[String(id)]) && petVariants[String(id)].length > 1
    },
    hasLeaderForm(id) {
      return hasLeaderFormPetId(id)
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
  background: linear-gradient(180deg, #f6f8fc 0%, #edf3fb 100%);
}

.card {
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 16rpx 40rpx rgba(31, 47, 87, 0.08);
}

.toolbar {
  margin: 18rpx 24rpx 0;
  padding: 18rpx;
}

.search-input {
  height: 76rpx;
  border-radius: 18rpx;
  padding: 0 20rpx;
  background: #f8fbff;
  box-shadow: inset 0 0 0 1rpx rgba(91, 124, 245, 0.08);
  font-size: 24rpx;
}

.filter-head {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.filter-title {
  font-size: 26rpx;
  font-weight: 800;
  color: #1c2748;
}

.filter-actions {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.mini-btn {
  height: 56rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: #f1f4fb;
  color: #51607f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  border: 1rpx solid transparent;
}

.mini-btn.active {
  background: rgba(91, 124, 245, 0.1);
  border-color: rgba(91, 124, 245, 0.28);
  color: #5b7cf5;
}

.selected-row {
  margin-top: 16rpx;
  padding: 14rpx 16rpx;
  border-radius: 18rpx;
  background: #f8fbff;
}

.selected-label {
  display: block;
  font-size: 22rpx;
  color: #6b7590;
  margin-bottom: 10rpx;
}

.selected-types {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.selected-empty {
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
  width: calc((100% - 20rpx) / 3);
  min-height: 70rpx;
  padding: 10rpx 12rpx;
  border-radius: 18rpx;
  background: #f1f4fb;
  color: #51607f;
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
}

.summary {
  margin: 18rpx 24rpx 0;
  padding: 20rpx 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-title {
  font-size: 26rpx;
  color: #6b7590;
}

.summary-value {
  font-size: 30rpx;
  font-weight: 800;
  color: #1c2748;
}

.list-wrap {
  height: calc(100vh - 390rpx);
}

.grid {
  padding: 16rpx 24rpx 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.pet-id {
  font-size: 22rpx;
  color: #7f8aa8;
  font-weight: 700;
}

.pet-meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  align-items: flex-end;
}

.variant-badge {
  min-height: 34rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(91, 124, 245, 0.1);
  color: #4a66c2;
  font-size: 18rpx;
  font-weight: 700;
}

.leader-badge {
  background: rgba(255, 178, 35, 0.16);
  color: #b76b00;
}

.empty {
  margin: 18rpx 24rpx 0;
  padding: 26rpx 24rpx;
}

.empty-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #1c2748;
}

.empty-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #6b7590;
}

.loading-more {
  padding: 18rpx 24rpx 0;
  text-align: center;
  font-size: 22rpx;
  color: #7f8aa8;
}

.bottom-space {
  height: 40rpx;
}
</style>
