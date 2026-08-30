<template>
  <view class="page">
    <AppHeader theme="gold" title="技能查询" subtitle="技能库 · 按名称检索" leftAction="back">
      <template #right>
        <view class="header-capsule" hover-class="press-down" @click="clearQuery">
          <AppIcon name="close" :size="10" color="#FFFFFF" :stroke-width="2.8" />
          <text class="header-capsule-text">清空</text>
        </view>
      </template>
    </AppHeader>

    <view class="search-row">
      <view class="search-pill">
        <AppIcon name="search" :size="14" color="#A3AE9F" :stroke-width="2.4" />
        <input
          class="search-input"
          :value="keyword"
          placeholder="输入技能名，例如：闪光、烈焰、防御"
          placeholder-class="search-placeholder"
          @input="onSearchInput"
        />
      </view>
      <view class="stats-capsule">
        <AppIcon name="sparkles" :size="11" color="#A97F35" />
        <text class="stats-mono">{{ filteredSkills.length }} 技能</text>
      </view>
    </view>

    <view class="body">
      <scroll-view scroll-y class="skill-list" :show-scrollbar="false" lower-threshold="120" @scrolltolower="loadMoreSkills">
        <view class="skill-list-inner">
          <view v-for="skill in visibleSkills" :key="skill.name" class="skill-row-slot">
            <SkillRow
              :skill="skill"
              :active="currentSkill && currentSkill.name === skill.name"
              @click="selectSkill(skill)"
            />
          </view>

          <view v-if="!visibleSkills.length" class="list-empty">
            <view class="empty-ring">
              <AppIcon name="search" :size="16" color="#A3AE9F" :stroke-width="2.2" />
            </view>
            <text class="list-empty-title">没有找到匹配技能</text>
            <text class="list-empty-sub">换个关键词试试</text>
          </view>

          <view v-if="visibleSkills.length && visibleSkills.length < filteredSkills.length" class="loading-more">
            <text>继续下滑加载更多技能</text>
          </view>
        </view>
      </scroll-view>

      <scroll-view scroll-y class="result-panel" :show-scrollbar="false" lower-threshold="120" @scrolltolower="loadMorePets">
        <view class="result-inner">
          <view v-if="currentSkill" class="panel card">
            <view class="panel-head">
              <view class="panel-skill-frame">
                <RemoteImage class="panel-skill-img" :src="getSkillIcon(currentSkill.name)" mode="aspectFit" />
              </view>
              <view class="panel-head-text">
                <text class="panel-title">{{ currentSkill.name }}</text>
                <view class="panel-badges">
                  <view class="badge">
                    <text class="badge-text">{{ currentSkill.type }}</text>
                  </view>
                  <TypeBadge v-if="currentSkill.attr" :label="currentSkill.attr" :color="getTypeColor(currentSkill.attr)" compact />
                  <text class="panel-consume mono">{{ currentSkill.consume || '-' }}</text>
                </view>
              </view>
            </view>
            <text class="panel-desc">{{ currentSkill.describe || '暂无说明' }}</text>
          </view>

          <view v-if="currentSkill" class="pets-panel card">
            <view class="section-head">
              <view class="section-left">
                <view class="section-icon">
                  <AppIcon name="users" :size="11" color="#A97F35" />
                </view>
                <text class="section-title">拥有这个技能的精灵</text>
              </view>
              <view class="count-capsule">
                <text class="count">{{ skillPets.length }} 只</text>
              </view>
            </view>

            <view v-if="skillPets.length" class="pet-list">
              <PetCard
                v-for="pet in visibleSkillPets"
                :key="pet.id"
                :img="pet.img"
                :name="pet.name"
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

            <view v-if="visibleSkillPets.length && visibleSkillPets.length < skillPets.length" class="loading-more">
              <text>继续下滑加载更多精灵</text>
            </view>

            <view v-else-if="!skillPets.length" class="empty">
              <view class="empty-ring">
                <AppIcon name="egg" :size="15" color="#A3AE9F" />
              </view>
              <text class="empty-title">没有找到匹配精灵</text>
              <text class="empty-sub">可以继续输入技能名，或者从左侧技能列表里直接选择。</text>
            </view>
          </view>

          <view v-else class="panel card empty-panel">
            <view class="empty-ring">
              <AppIcon name="sparkles" :size="16" color="#C9A14E" />
            </view>
            <text class="empty-title">先选一个技能</text>
            <text class="empty-sub">从左侧技能列表点选，右侧会展示技能详情和拥有它的精灵。</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import PetCard from '@/components/PetCard/PetCard.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { skillsData } from '@/data/skill/skills.js'
import { skillIcons } from '@/data/skill/skill_icons.js'
import { petTypes, petDetail } from '@/data/pet/pet_detail.js'
import { petSkills } from '@/data/pet/pet_skills.js'
import { getFinalForm } from '@/data/config/game_math.js'
import { resolveAssetPath } from '@/utils/asset-path.js'
import { buildBasePetList, getPetSkillNames } from '@/utils/petListBuilder.js'

const SKILL_RENDER_STEP = 80
const PET_RENDER_STEP = 24

const _pets = buildBasePetList()

// getFinalForm 需要的 detailMap：skills 来自 pet_skills.js，trait 来自 pet_detail.js
const _petsDetail = (() => {
  const result = {}
  for (const [seq, variants] of Object.entries(petDetail)) {
    if (Array.isArray(variants) && variants.length) {
      result[seq] = {
        skills: (petSkills[seq] && petSkills[seq].skills) || [],
        trait: variants[0].trait || ''
      }
    }
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
      // 一次遍历建反向索引：技能名 -> 精灵列表（按最终形态去重）
      const bySkill = Object.create(null)
      for (const pet of _pets) {
        const skillNames = getPetSkillNames(pet.id)
        if (!skillNames.length) continue
        const finalForm = getFinalForm(pet, _pets, _petsDetail) || pet
        const key = String(finalForm.id || pet.id)
        for (const entry of skillNames) {
          const name = entry && entry.name
          if (!name) continue
          if (!bySkill[name]) bySkill[name] = new Map()
          if (!bySkill[name].has(key)) {
            bySkill[name].set(key, { ...finalForm, basePet: pet, finalForm })
          }
        }
      }
      const cache = Object.create(null)
      this.skills.forEach((skill) => {
        const map = bySkill[skill.name]
        cache[skill.name] = map ? Array.from(map.values()).sort((a, b) => a.id - b.id) : []
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
    radial-gradient(circle at 12% 6%, rgba(201, 161, 78, 0.10) 0, transparent 42%),
    radial-gradient(circle at 88% 22%, rgba(169, 127, 53, 0.06) 0, transparent 40%);
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

/* ===== 搜索行 ===== */
.search-row {
  padding: 12px 14px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-pill {
  flex: 1;
  min-width: 0;
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

.stats-capsule {
  flex-shrink: 0;
  min-height: 28px;
  padding: 3px 12px;
  border-radius: 999px;
  background: #F6EEDB;
  border: 1px solid #D9B96A;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.stats-mono {
  font-size: 12px;
  font-weight: 700;
  color: #A97F35;
  font-family: Monaco, Consolas, 'Courier New', monospace;
  white-space: nowrap;
}

/* ===== 双栏主体 ===== */
.body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
  padding: 0 12px 14px;
}

.card {
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  border-radius: 18px;
  box-shadow: 0 3px 0 rgba(44, 58, 47, 0.10);
}

.skill-list {
  flex: 46;
  min-width: 0;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  border-radius: 18px;
  box-shadow: 0 3px 0 rgba(44, 58, 47, 0.10);
}

.skill-list-inner {
  padding: 9px;
}

.result-panel {
  flex: 54;
  min-width: 0;
}

.result-inner {
  padding-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

/* ===== 技能行（SkillRow 通用组件） ===== */
.skill-row-slot {
  margin-bottom: 9px;
}

.list-empty {
  padding: 26px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.empty-ring {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: #F6EEDB;
  border: 1.5px dashed #C9A14E;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-empty-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.list-empty-sub {
  font-size: 11.5px;
  color: #A3AE9F;
}

/* ===== 技能详情面板 ===== */
.panel {
  padding: 14px;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 11px;
}

.panel-skill-frame {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 15px;
  background: #F6EEDB;
  border: 1.5px solid #D9B96A;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.panel-skill-img {
  width: 48px;
  height: 48px;
}

.panel-head-text {
  min-width: 0;
  flex: 1;
}

.panel-title {
  display: block;
  font-size: 16px;
  font-weight: 800;
  color: #2C3A2F;
}

.panel-badges {
  margin-top: 7px;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.badge {
  height: 23px;
  padding: 0 10px;
  border-radius: 8px;
  background: #F2EBDA;
  border: 1px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
}

.badge-text {
  font-size: 11.5px;
  color: #6B7A6E;
  font-weight: 700;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.panel-consume {
  font-size: 11.5px;
  color: #A97F35;
  font-weight: 700;
}

.mono {
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.panel-desc {
  display: block;
  margin-top: 12px;
  font-size: 13px;
  color: #6B7A6E;
  line-height: 1.65;
}

/* ===== 精灵面板 ===== */
.pets-panel {
  padding: 15px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-left {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.section-icon {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: #F6EEDB;
  border: 1px solid #E0D3AE;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title {
  font-size: 15px;
  font-weight: 800;
  color: #2C3A2F;
}

.count-capsule {
  flex-shrink: 0;
  min-height: 28px;
  padding: 2px 12px;
  border-radius: 999px;
  background: #F6EEDB;
  border: 1px solid #D9B96A;
  display: inline-flex;
  align-items: center;
}

.count {
  font-size: 12px;
  color: #A97F35;
  font-weight: 700;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.pet-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin-top: 13px;
}

.empty {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px 0 4px;
}

.empty-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 26px 18px;
}

.empty-title {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
}

.empty-sub {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: #6B7A6E;
  line-height: 1.65;
  text-align: center;
}

.loading-more {
  padding: 14px 0 6px;
  text-align: center;
  font-size: 12px;
  color: #A3AE9F;
}
</style>
