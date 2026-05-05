<template>
  <view class="page">
    <AppHeader title="速度排行" leftAction="back" />

    <scroll-view scroll-y class="content" lower-threshold="140" @scrolltolower="loadMoreGroups">
      <view class="hero card">
        <text class="hero-title">速度种族值分档</text>
        <text class="hero-sub">默认显示最高形态；如果不同形态速度不同，会按形态分别入榜。</text>
      </view>

      <view class="group-list">
        <view v-for="group in visibleGroups" :key="group.speed" class="group-card card">
          <view class="group-head">
            <view>
              <text class="group-title">{{ group.speed }} 速档</text>
              <text class="group-sub">{{ group.pets.length }} 只精灵</text>
            </view>
          </view>

          <view class="pet-grid">
            <view
              v-for="pet in group.pets"
              :key="pet.variantImage || `${pet.id}-${pet.name}`"
              class="pet-item"
              @click="goDetail(pet)"
            >
              <RemoteImage class="pet-image" :src="resolvePetImage(pet.img)" mode="aspectFit" />
              <text class="pet-name">{{ pet.name }}</text>
              <view class="pet-types">
                <TypeBadge
                  v-for="type in pet.type"
                  :key="type"
                  :label="type"
                  :color="getTypeColor(type)"
                  compact
                />
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="visibleGroups.length < speedGroups.length" class="loading-more">
        <text>继续下滑加载更多速度档</text>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { pets, petTypes } from '@/data/pets.js'
import { petVariants } from '@/data/pet_variants.js'
import { petVariantDetails } from '@/data/pet_variant_details.js'
import { petRaceSpeed } from '@/data/pet_race_speed.js'
import { getSpeedRankEntries } from '@/data/game_math.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

const GROUP_STEP = 12

export default {
  components: {
    AppHeader,
    TypeBadge
  },
  data() {
    return {
      speedGroups: [],
      renderCount: GROUP_STEP
    }
  },
  computed: {
    visibleGroups() {
      return this.speedGroups.slice(0, this.renderCount)
    }
  },
  onLoad() {
    this.buildSpeedGroups()
  },
  methods: {
    buildSpeedGroups() {
      const rankEntries = getSpeedRankEntries(pets, petRaceSpeed, petVariants, petVariantDetails)
      const groupMap = new Map()

      rankEntries.forEach((pet) => {
        const speed = Number(pet.speed) || 0
        if (!groupMap.has(speed)) groupMap.set(speed, [])
        groupMap.get(speed).push({
          ...pet,
          speed
        })
      })

      this.speedGroups = Array.from(groupMap.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([speed, list]) => ({
          speed,
          pets: list.sort((a, b) => {
            if (a.id !== b.id) return a.id - b.id
            return String(a.name || '').localeCompare(String(b.name || ''))
          })
        }))
    },
    loadMoreGroups() {
      if (this.renderCount >= this.speedGroups.length) return
      this.renderCount = Math.min(this.renderCount + GROUP_STEP, this.speedGroups.length)
    },
    getTypeColor(type) {
      return petTypes.find((item) => item.key === type)?.color || '#5b7cf5'
    },
    resolvePetImage(src) {
      return resolveAssetPath(src)
    },
    goDetail(pet) {
      const query = pet?.variantImage
        ? `?id=${pet.id}&variantImage=${encodeURIComponent(pet.variantImage)}`
        : `?id=${pet.id}`
      uni.navigateTo({ url: '/pages/detail/detail' + query })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f6f8fc 0%, #edf3fb 100%);
}

.content {
  height: calc(100vh - 96rpx);
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
  font-size: 38rpx;
  font-weight: 800;
}

.hero-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.5;
}

.group-list {
  padding: 20rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.group-card {
  padding: 18rpx;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.group-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #1c2748;
}

.group-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #6b7590;
}

.pet-grid {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10rpx;
}

.pet-item {
  padding: 12rpx 8rpx;
  border-radius: 18rpx;
  background: linear-gradient(180deg, #f7f9fe 0%, #eef3fb 100%);
  border: 1rpx solid rgba(91, 124, 245, 0.08);
}

.pet-image {
  width: 72rpx;
  height: 72rpx;
  display: block;
  margin: 0 auto;
}

.pet-name {
  display: block;
  margin-top: 8rpx;
  text-align: center;
  font-size: 20rpx;
  font-weight: 700;
  color: #1c2748;
  line-height: 1.35;
  word-break: break-all;
}

.pet-types {
  margin-top: 8rpx;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6rpx;
}

.loading-more {
  padding: 18rpx 0 0;
  text-align: center;
  font-size: 22rpx;
  color: #7f8aa8;
}

.bottom-space {
  height: calc(80rpx + env(safe-area-inset-bottom));
}
</style>
