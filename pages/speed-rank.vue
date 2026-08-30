<template>
  <view class="page">
    <AppHeader theme="blue" title="速度排行" subtitle="速度种族值分档榜" leftAction="back">
      <template #right>
        <view class="header-capsule">
          <AppIcon name="wind" :size="11" color="#FFFFFF" :stroke-width="2.4" />
          <text class="header-capsule-text">{{ speedGroups.length }} 档</text>
        </view>
      </template>
    </AppHeader>

    <scroll-view scroll-y class="content" :show-scrollbar="false" lower-threshold="140" @scrolltolower="loadMoreGroups">
      <view class="hero card">
        <view class="hero-icon">
          <AppIcon name="wind" :size="16" color="#2C6FD1" :stroke-width="2.4" />
        </view>
        <view class="hero-text">
          <text class="hero-title">速度种族值分档</text>
          <text class="hero-sub">默认显示最高形态；不同形态速度不同时按形态分别入榜。</text>
        </view>
      </view>

      <view class="group-list">
        <view
          v-for="(group, index) in visibleGroups"
          :key="group.speed"
          class="group-card card"
          :class="tierClass(index)"
        >
          <view class="group-head">
            <view class="speed-seal" :class="tierClass(index)">
              <text class="speed-seal-num">{{ group.speed }}</text>
              <text class="speed-seal-label">速档</text>
            </view>

            <view class="group-info">
              <view class="group-title-row">
                <text class="group-title">{{ group.speed }} 速档</text>
                <view v-if="index < 3" class="tier-tag" :class="`tier-${index + 1}`">
                  <AppIcon name="star" :size="8" color="#FFF9EC" />
                  <text class="tier-tag-text">{{ tierLabel(index) }}</text>
                </view>
              </view>
              <text class="group-sub">{{ group.pets.length }} 只精灵 · 默认面板速 {{ group.panelSpeed }}</text>
            </view>

            <view class="group-count">
              <text class="group-count-num">{{ group.pets.length }}</text>
              <text class="group-count-label">只</text>
            </view>
          </view>

          <view class="pet-grid">
            <PetCard
              v-for="pet in group.pets"
              :key="pet.variantImage || `${pet.id}-${pet.name}`"
              :img="pet.img"
              :name="pet.name"
              :code="'#' + String(pet.id).padStart(3, '0')"
              :badge="getPetBadge(pet)"
              :badge-tone="isLeaderPet(pet) ? 'gold' : 'gray'"
              compact
              @click="goDetail(pet)"
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
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import PetCard from '@/components/PetCard/PetCard.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { petTypes, petDetail } from '@/data/pet/pet_detail.js'
import { hasLeaderFormPetId } from '@/data/pet/leader_forms.js'
import { petRaceSpeed } from '@/data/pet/pet_race_speed.js'
import { getSpeedRankEntries, calculatePetPanel } from '@/data/config/game_math.js'
import { buildBasePetList, getPetVariants, getPetVariantDetails } from '@/utils/petListBuilder.js'

const GROUP_STEP = 12

const _pets = buildBasePetList()
const _petVariantsCompat = (() => {
  const result = {}
  for (const [seq, variants] of Object.entries(petDetail)) {
    if (Array.isArray(variants) && variants.length > 0) {
      result[seq] = variants.map(v => v.img).filter(Boolean)
    }
  }
  return result
})()

const _petVariantDetailsCompat = (() => {
  const result = {}
  for (const [seq, variants] of Object.entries(petDetail)) {
    if (!Array.isArray(variants)) continue
    const map = {}
    for (const v of variants) {
      if (v.img) {
        map[v.img] = { race: v.race, trait: v.trait, type: v.type, name: v.page_title, img: v.img }
      }
    }
    if (Object.keys(map).length) result[seq] = map
  }
  return result
})()

export default {
  components: {
    AppHeader,
    AppIcon,
    PetCard,
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
      const rankEntries = getSpeedRankEntries(_pets, petRaceSpeed, _petVariantsCompat, _petVariantDetailsCompat)
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
          }),
          panelSpeed: this.computeDefaultPanelSpeed(speed)
        }))
    },
    loadMoreGroups() {
      if (this.renderCount >= this.speedGroups.length) return
      this.renderCount = Math.min(this.renderCount + GROUP_STEP, this.speedGroups.length)
    },
    tierClass(index) {
      if (index === 0) return 'tier-gold'
      if (index === 1) return 'tier-silver'
      if (index === 2) return 'tier-bronze'
      return ''
    },
    tierLabel(index) {
      const labels = ['第一速档', '第二速档', '第三速档']
      return labels[index] || ''
    },
    getTypeColor(type) {
      return petTypes.find((item) => item.key === type)?.color || '#5b7cf5'
    },
    isLeaderPet(pet) {
      return hasLeaderFormPetId(pet.id)
    },
    getPetBadge(pet) {
      if (this.isLeaderPet(pet)) return '首领化'
      const variants = petDetail[String(pet.id)]
      if (Array.isArray(variants) && variants.length > 1) return '多形态'
      return ''
    },
    computeDefaultPanelSpeed(baseSpeed) {
      if (typeof baseSpeed !== 'number' || Number.isNaN(baseSpeed)) return 0
      const race = { speed: baseSpeed }
      const ivs = { hp: 0, attack: 0, mattack: 0, defense: 0, mdefense: 0, speed: 10 }
      const panel = calculatePetPanel({ race }, { level: 60, star: 5, ivs, natureUp: '速度', natureDown: '无' }) || {}
      return Math.round(Number(panel.speed) || 0)
    },
    goDetail(pet) {
      const id = pet?.id
      if (!id) {
        console.error('Missing pet id:', pet)
        return
      }
      const query = pet?.variantImage
        ? `?id=${id}&variantImage=${encodeURIComponent(pet.variantImage)}`
        : `?id=${id}`
      uni.navigateTo({
        url: '/pages/detail' + query,
        fail: (err) => {
          console.error('Navigate to detail failed:', err)
        }
      })
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
    radial-gradient(circle at 12% 6%, rgba(44, 111, 209, 0.08) 0, transparent 42%),
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

/* ===== 顶部说明卡 ===== */
.hero {
  margin: 12px 14px 0;
  padding: 12px 13px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #E3F0FC;
  border: 1.5px solid #4F9CFF;
  box-shadow: 0 2px 0 rgba(35, 80, 143, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-text {
  min-width: 0;
}

.hero-title {
  display: block;
  font-size: 14.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.hero-sub {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: #6B7A6E;
  line-height: 1.5;
}

/* ===== 速档卡 ===== */
.group-list {
  padding: 12px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-card {
  position: relative;
  overflow: hidden;
  padding: 12px 13px;
}

.group-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, #2C6FD1, #4F9CFF);
}

.group-card.tier-gold::before {
  background: linear-gradient(90deg, #A97F35, #D9B96A);
}

.group-card.tier-silver::before {
  background: linear-gradient(90deg, #8C97A8, #B9C2CE);
}

.group-card.tier-bronze::before {
  background: linear-gradient(90deg, #B0714E, #D19A76);
}

.group-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.speed-seal {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border-radius: 999px;
  background: linear-gradient(135deg, #2C6FD1 0%, #4F9CFF 100%);
  border: 1.5px solid #23508F;
  box-shadow: 0 2.5px 0 rgba(35, 80, 143, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.speed-seal.tier-gold {
  background: linear-gradient(135deg, #A97F35 0%, #D9B96A 100%);
  border-color: #8A6A2C;
  box-shadow: 0 2.5px 0 rgba(138, 106, 44, 0.45);
}

.speed-seal.tier-silver {
  background: linear-gradient(135deg, #8C97A8 0%, #B9C2CE 100%);
  border-color: #6F7A8C;
  box-shadow: 0 2.5px 0 rgba(111, 122, 140, 0.45);
}

.speed-seal.tier-bronze {
  background: linear-gradient(135deg, #B0714E 0%, #D19A76 100%);
  border-color: #8F5A3E;
  box-shadow: 0 2.5px 0 rgba(143, 90, 62, 0.45);
}

.speed-seal-num {
  font-size: 16px;
  line-height: 1;
  font-weight: 800;
  color: #FFF9EC;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.speed-seal-label {
  font-size: 8px;
  line-height: 1;
  font-weight: 700;
  color: rgba(255, 250, 236, 0.85);
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.group-title {
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
}

.tier-tag {
  height: 21px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 1.5px solid;
}

.tier-tag.tier-1 {
  background: linear-gradient(135deg, #A97F35 0%, #D9B96A 100%);
  border-color: #8A6A2C;
}

.tier-tag.tier-2 {
  background: linear-gradient(135deg, #8C97A8 0%, #B9C2CE 100%);
  border-color: #6F7A8C;
}

.tier-tag.tier-3 {
  background: linear-gradient(135deg, #B0714E 0%, #D19A76 100%);
  border-color: #8F5A3E;
}

.tier-tag-text {
  font-size: 9.5px;
  font-weight: 700;
  color: #FFF9EC;
}

.group-sub {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #6B7A6E;
}

.group-count {
  flex-shrink: 0;
  min-width: 44px;
  padding: 5px 9px;
  border-radius: 999px;
  background: #F2EBDA;
  border: 1px solid #E3DCC8;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
}

.group-count-num {
  font-size: 13px;
  font-weight: 800;
  color: #2C6FD1;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.group-count-label {
  font-size: 9px;
  font-weight: 700;
  color: #6B7A6E;
}

/* ===== 精灵格 ===== */
.pet-grid {
  margin-top: 11px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

@media screen and (min-width: 640px) {
  .pet-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.loading-more {
  padding: 14px 0 0;
  text-align: center;
  font-size: 11px;
  color: #A3AE9F;
}

.bottom-space {
  height: calc(28px + env(safe-area-inset-bottom));
}
</style>
