<template>
  <view class="page">
    <AppHeader title="技能查询" leftAction="back">
      <template #right>
        <text class="save-btn" @click="clearQuery">清空</text>
      </template>
    </AppHeader>

    <view class="search-wrap">
      <input
        class="search-input"
        :value="keyword"
        placeholder="输入技能名，例如：闪光、烈焰、防御"
        @input="onSearchInput"
      />
    </view>

    <view class="body">
      <scroll-view scroll-y class="skill-list" lower-threshold="120" @scrolltolower="loadMoreSkills">
        <view
          v-for="skill in visibleSkills"
          :key="skill.name"
          class="skill-item"
          :class="{ active: currentSkill && currentSkill.name === skill.name }"
          @click="selectSkill(skill)"
        >
          <image class="skill-icon" :src="getSkillIcon(skill.name)" mode="aspectFit" />
          <view class="skill-meta">
            <text class="skill-name">{{ skill.name }}</text>
            <view class="skill-sub">
              <text class="skill-sub-text">{{ skill.type }} ·</text>
              <TypeBadge :label="skill.attr" compact />
              <text class="skill-sub-text">{{ skill.consume || '-' }}</text>
            </view>
            <text class="skill-desc">{{ skill.describe || '暂无描述' }}</text>
          </view>
        </view>
      </scroll-view>

      <scroll-view scroll-y class="result-panel" lower-threshold="120" @scrolltolower="loadMorePets">
        <view v-if="currentSkill" class="panel card">
          <view class="panel-head">
            <text class="panel-title">{{ currentSkill.name }}</text>
            <view class="badge">{{ currentSkill.type }}</view>
          </view>
          <view class="panel-attr" v-if="currentSkill.attr">
            <TypeBadge :label="currentSkill.attr" :color="getTypeColor(currentSkill.attr)" />
          </view>
          <text class="panel-desc">{{ currentSkill.describe || '暂无说明' }}</text>
        </view>

        <view v-if="currentSkill" class="panel">
          <view class="section-head">
            <text class="section-title">拥有这个技能的精灵</text>
            <text class="count">{{ skillPets.length }} 只</text>
          </view>

          <view v-if="skillPets.length" class="pet-list">
            <PetCard
              v-for="pet in visibleSkillPets"
              :key="pet.id"
              :img="pet.img"
              :name="pet.name"
              :subtitle="getPetTypes(pet)"
              @click="goToDetail(pet.id)"
            >
              <template #tags>
                <TypeBadge
                  v-for="type in pet.type"
                  :key="type"
                  :label="type"
                  :color="getTypeColor(type)"
                />
              </template>
            </PetCard>
          </view>

          <view v-if="visibleSkillPets.length < skillPets.length" class="loading-more">
            <text>继续下滑加载更多精灵</text>
          </view>

          <view v-else-if="!skillPets.length" class="empty card">
            <text class="empty-title">没有找到匹配精灵</text>
            <text class="empty-sub">可以继续输入技能名，或者从左侧技能列表里直接选择。</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import PetCard from '@/components/PetCard/PetCard.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { skillsData } from '@/data/skills.js'
import { skillIcons } from '@/data/skill_icons.js'
import { pets, petTypes } from '@/data/pets.js'
import { petsDetail } from '@/data/pets_detail.js'
import { searchPetsBySkill } from '@/data/game_math.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

const SKILL_RENDER_STEP = 80
const PET_RENDER_STEP = 24

export default {
  components: {
    AppHeader,
    PetCard,
    TypeBadge
  },
  data() {
    return {
      keyword: '',
      debouncedKeyword: '',
      currentSkill: null,
      skills: Object.values(skillsData),
      skillPetsMap: Object.create(null),
      skillRenderCount: SKILL_RENDER_STEP,
      petRenderCount: PET_RENDER_STEP,
      searchTimer: null
    }
  },
  computed: {
    filteredSkills() {
      const kw = this.debouncedKeyword.trim().toLowerCase()
      return this.skills.filter((skill) => {
        if (!kw) return true
        return (
          String(skill.name || '').toLowerCase().includes(kw) ||
          String(skill.describe || '').toLowerCase().includes(kw)
        )
      })
    },
    visibleSkills() {
      return this.filteredSkills.slice(0, this.skillRenderCount)
    },
    skillPets() {
      if (!this.currentSkill) return []
      return this.skillPetsMap[this.currentSkill.name] || []
    },
    visibleSkillPets() {
      return this.skillPets.slice(0, this.petRenderCount)
    }
  },
  watch: {
    filteredSkills: {
      immediate: true,
      handler(list) {
        if (!this.currentSkill && list.length) {
          this.currentSkill = list[0]
        }
        if (this.currentSkill && !list.find((item) => item.name === this.currentSkill.name)) {
          this.currentSkill = list[0] || null
        }
      }
    },
    currentSkill() {
      this.petRenderCount = PET_RENDER_STEP
    }
  },
  created() {
    this.buildSkillPetsIndex()
    this.debouncedKeyword = ''
  },
  beforeDestroy() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }
  },
  methods: {
    buildSkillPetsIndex() {
      const cache = Object.create(null)
      this.skills.forEach((skill) => {
        cache[skill.name] = searchPetsBySkill(skill.name, pets, petsDetail)
      })
      this.skillPetsMap = cache
    },
    onSearchInput(event) {
      this.keyword = event.detail.value
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.debouncedKeyword = this.keyword
        this.skillRenderCount = SKILL_RENDER_STEP
      }, 120)
    },
    clearQuery() {
      this.keyword = ''
      this.debouncedKeyword = ''
      this.skillRenderCount = SKILL_RENDER_STEP
      this.currentSkill = this.filteredSkills[0] || null
    },
    selectSkill(skill) {
      this.currentSkill = skill
    },
    loadMoreSkills() {
      if (this.skillRenderCount >= this.filteredSkills.length) return
      this.skillRenderCount = Math.min(this.skillRenderCount + SKILL_RENDER_STEP, this.filteredSkills.length)
    },
    loadMorePets() {
      if (this.petRenderCount >= this.skillPets.length) return
      this.petRenderCount = Math.min(this.petRenderCount + PET_RENDER_STEP, this.skillPets.length)
    },
    getSkillIcon(name) {
      return resolveAssetPath(skillIcons[name] || '')
    },
    getPetTypes(pet) {
      return (pet.type || []).join(' / ')
    },
    getTypeColor(type) {
      return petTypes.find((item) => item.key === type)?.color || '#5b7cf5'
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

.save-btn {
  font-size: 24rpx;
  color: #fff;
  font-weight: 700;
}

.search-wrap {
  padding: 18rpx 24rpx;
}

.search-input {
  height: 76rpx;
  border-radius: 18rpx;
  padding: 0 20rpx;
  background: #fff;
  box-shadow: 0 10rpx 24rpx rgba(31, 47, 87, 0.06);
  font-size: 24rpx;
}

.body {
  display: grid;
  grid-template-columns: 0.92fr 1.08fr;
  gap: 16rpx;
  padding: 0 24rpx;
  height: calc(100vh - 216rpx);
}

.skill-list,
.result-panel {
  border-radius: 24rpx;
  overflow: hidden;
}

.skill-list {
  padding: 12rpx;
  background: #fff;
  box-shadow: 0 16rpx 40rpx rgba(31, 47, 87, 0.08);
}

.skill-item {
  display: flex;
  gap: 12rpx;
  padding: 14rpx;
  border-radius: 18rpx;
  background: #f7f9fe;
  margin-bottom: 10rpx;
}

.skill-item.active {
  background: linear-gradient(180deg, #edf4ff 0%, #dbe8ff 100%);
}

.skill-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 14rpx;
  background: #fff;
}

.skill-meta {
  flex: 1;
  min-width: 0;
}

.skill-name {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
  color: #1c2748;
}

.skill-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #6b7590;
  line-height: 1.5;
}

.skill-sub {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 4rpx;
  flex-wrap: wrap;
}

.skill-sub-text {
  font-size: 20rpx;
  color: #6b7590;
}

.result-panel {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.panel,
.card {
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 16rpx 40rpx rgba(31, 47, 87, 0.08);
  padding: 18rpx;
}

.panel-head,
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.panel-title,
.section-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #1c2748;
}

.badge {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #edf2fb;
  color: #5b7cf5;
  font-size: 20rpx;
}

.panel-attr {
  margin-top: 10rpx;
}

.panel-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #6b7590;
  line-height: 1.7;
}

.count {
  font-size: 20rpx;
  color: #6b7590;
}

.pet-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 12rpx;
}

.empty {
  margin-top: 12rpx;
}

.empty-title {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #1c2748;
}

.empty-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #6b7590;
  line-height: 1.7;
}

.loading-more {
  padding: 18rpx 0 6rpx;
  text-align: center;
  font-size: 22rpx;
  color: #7f8aa8;
}
</style>
