<template>
  <view class="detail-container">
    <view class="header">
      <view class="image-wrapper">
        <RemoteImage class="pet-image" :src="currentVariantImage" mode="aspectFit" @error="onImageError"></RemoteImage>
        <view class="yise-nav" v-if="hasYise">
          <view class="nav-btn" :class="{active: !showYise}" @click="showYise = false">原皮</view>
          <view class="nav-btn" :class="{active: showYise}" @click="showYise = true">异色</view>
        </view>
      </view>
      <view class="pet-basic">
        <text class="pet-name">{{ petInfo.name }}</text>
        <view class="pet-types">
          <view v-for="(type, index) in petInfo.type" :key="index" class="type-pill">
            <RemoteImage class="type-icon" :src="getTypeIconPath(type)" mode="aspectFit" />
            <text class="type-name">{{ type }}</text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-x class="variant-strip page-variant-strip" v-if="showVariantNav">
      <view class="variant-list">
        <view
          v-for="(item, index) in variantItems"
          :key="item.image"
          class="variant-chip"
          :class="{ active: index === currentVariantIndex }"
          @click="setVariantIndex(index)"
        >
          {{ item.name }}
        </view>
      </view>
    </scroll-view>

    <view class="section" v-if="petInfo.race">
      <view class="section-title">种族值</view>
      <view class="race-grid">
        <view class="race-item">
          <text class="race-label">生命</text>
          <text class="race-value hp">{{ petInfo.race.hp || '-' }}</text>
        </view>
        <view class="race-item">
          <text class="race-label">攻击</text>
          <text class="race-value attack">{{ petInfo.race.attack || '-' }}</text>
        </view>
        <view class="race-item">
          <text class="race-label">魔攻</text>
          <text class="race-value mattack">{{ petInfo.race.mattack || '-' }}</text>
        </view>
        <view class="race-item">
          <text class="race-label">防御</text>
          <text class="race-value defense">{{ petInfo.race.defense || '-' }}</text>
        </view>
        <view class="race-item">
          <text class="race-label">魔防</text>
          <text class="race-value mdefense">{{ petInfo.race.mdefense || '-' }}</text>
        </view>
        <view class="race-item">
          <text class="race-label">速度</text>
          <text class="race-value speed">{{ petInfo.race.speed || '-' }}</text>
        </view>
        <view class="race-item total">
          <text class="race-label">总和</text>
          <text class="race-value">{{ petInfo.race.total || '-' }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="petInfo.trait">
      <view class="section-title">特性</view>
      <view class="trait-panel">
        <RemoteImage v-if="petInfo.traitImage" class="trait-image" :src="petInfo.traitImage" mode="aspectFit" />
        <view class="trait-copy">
          <text class="trait-name">{{ traitTitle }}</text>
          <text class="trait-content">{{ traitDescription || petInfo.trait }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="petInfo.skills && petInfo.skills.length">
      <view class="section-title">技能</view>
      <view class="skill-type-tabs">
        <view
          class="skill-tab"
          :class="{active: selectedSkillType === '精灵技能'}"
          @click="selectedSkillType = '精灵技能'"
          v-if="petInfo.skill_types && petInfo.skill_types['精灵技能']"
        >
          精灵技能 ({{ petInfo.skill_types['精灵技能'].length }})
        </view>
        <view
          class="skill-tab"
          :class="{active: selectedSkillType === '血脉技能'}"
          @click="selectedSkillType = '血脉技能'"
          v-if="petInfo.skill_types && petInfo.skill_types['血脉技能']"
        >
          血脉技能 ({{ petInfo.skill_types['血脉技能'].length }})
        </view>
        <view
          class="skill-tab"
          :class="{active: selectedSkillType === '可学技能石'}"
          @click="selectedSkillType = '可学技能石'"
          v-if="petInfo.skill_types && petInfo.skill_types['可学技能石']"
        >
          可学技能石 ({{ petInfo.skill_types['可学技能石'].length }})
        </view>
      </view>
      <view class="skills-grid">
        <view class="skill-grid-item" v-for="(skill, index) in filteredSkills" :key="index" @click="showSkillDetail(skill)">
          <RemoteImage class="skill-grid-icon" :src="getSkillIcon(skill.name)" mode="aspectFit"></RemoteImage>
          <view class="skill-grid-info">
            <view class="skill-grid-header">
              <text class="skill-grid-name">{{ skill.name }}</text>
              <RemoteImage class="skill-attr-icon" :src="getTypeIconPath(skill.attr)" mode="aspectFit" v-if="skill.attr"></RemoteImage>
            </view>
            <text class="skill-grid-power">威力: {{ skill.power || '-' }} 能耗: {{ skill.consume || '-' }} 类型: {{ skill.type || '-' }}</text>
            <text class="skill-grid-desc">{{ skill.describe || '暂无描述' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="skill-detail-modal" v-if="showSkillModal" @click="closeSkillModal">
      <view class="skill-detail-content" @click.stop>
        <view class="skill-detail-header">
          <RemoteImage class="skill-detail-icon" :src="currentSkillIcon" mode="aspectFit"></RemoteImage>
          <view class="skill-detail-title">
            <text class="skill-detail-name">{{ currentSkillDetail.name }}</text>
            <view class="skill-detail-tags">
              <text class="skill-tag type-tag">{{ currentSkillDetail.type }}</text>
              <text class="skill-tag attr-tag">{{ currentSkillDetail.attr }}</text>
            </view>
          </view>
          <view class="skill-detail-close" @click="closeSkillModal">×</view>
        </view>
        <view class="skill-detail-info">
          <view class="skill-info-row">
            <text class="skill-info-label">消耗</text>
            <text class="skill-info-value">{{ currentSkillDetail.consume }}</text>
          </view>
          <view class="skill-info-row">
            <text class="skill-info-label">威力</text>
            <text class="skill-info-value">{{ currentSkillDetail.power }}</text>
          </view>
          <view class="skill-info-row" v-if="currentSkillDetail.describe">
            <text class="skill-info-label">描述</text>
            <text class="skill-info-value describe">{{ currentSkillDetail.describe }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="back-btn" @click="goBack">返回</view>
  </view>
</template>

<script>
import { pets, petTypes } from '@/data/pets.js'
import { petsDetail } from '@/data/pets_detail_light.js'
import { petsDetail as petsDetailFull } from '@/data/pets_detail.js'
import { petVariants } from '@/data/pet_variants.js'
import { petVariantDetails } from '@/data/pet_variant_details.js'
import { petYise } from '@/data/pet_yise.js'
import { petTraitImages } from '@/data/pet_trait_images.js'
import { hasLeaderFormPetId } from '@/data/leader_forms.js'
import { skillIcons } from '@/data/skill_icons.js'
import { skillsData } from '@/data/skills.js'
import { safeBack } from '@/utils/nav.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

function hasCompleteRace(race) {
  if (!race || typeof race !== 'object') return false
  const keys = ['hp', 'attack', 'mattack', 'defense', 'mdefense', 'speed', 'total']
  return keys.every((key) => Number.isFinite(Number(race[key])))
}

function hasUsableSkills(skills) {
  return Array.isArray(skills) && skills.some((skill) => String(skill?.name || '').trim())
}

function buildSkillTypes(skills = []) {
  return skills.reduce((acc, skill) => {
    const key = String(skill?.skill_type || '').trim()
    if (!key) return acc
    if (!acc[key]) acc[key] = []
    acc[key].push(skill)
    return acc
  }, {})
}

function enrichSkillWithDetails(skill, petId) {
  const skillData = skillsData[skill.name] || {}
  const fullPetDetail = petsDetailFull[petId] || {}
  const fullSkillList = fullPetDetail.skills || []
  const fullSkill = fullSkillList.find(s => s.name === skill.name) || {}
  return {
    ...skill,
    type: skillData.type || skill.type || fullSkill.type || '-',
    attr: skillData.attr || skill.attr || fullSkill.attr || '-',
    consume: skillData.consume ?? skill.consume ?? fullSkill.consume ?? '-',
    power: skillData.power ?? skill.power ?? fullSkill.power ?? '-',
    describe: skillData.describe || skill.describe || fullSkill.describe || '暂无描述'
  }
}

export default {
  data() {
    return {
      petInfo: {},
      petId: null,
      variants: [],
      currentVariantIndex: 0,
      basePet: null,
      showYise: false,
      showSkillModal: false,
      currentSkillDetail: {},
      currentSkillIcon: '',
      selectedSkillType: '精灵技能',
      initialVariantImage: '',
      baseDetailInfo: null,
      loadedFullSkills: {}
    }
  },
  computed: {
    variantItems() {
      if (!this.variants.length) return []
      return this.variants.map((image) => ({
        image,
        name: this.getVariantDisplayName(image)
      }))
    },
    currentVariantImage() {
      if (this.showYise && this.yiseImage) {
        return resolveAssetPath(this.yiseImage)
      }
      if (this.variants.length > 0 && this.currentVariantIndex >= 0) {
        return resolveAssetPath(this.variants[this.currentVariantIndex])
      }
      return resolveAssetPath(this.baseDetailInfo?.img || this.basePet?.img || '')
    },
    currentVariantName() {
      if (this.showYise && this.yiseImage) return '异色'
      return this.variantItems[this.currentVariantIndex]?.name || ''
    },
    showVariantNav() {
      return this.variants.length > 1
    },
    hasYise() {
      return !!petYise[String(this.petId)]
    },
    yiseImage() {
      return petYise[String(this.petId)]?.img || null
    },
    traitTitle() {
      const text = String(this.petInfo.trait || '').trim()
      if (!text) return ''
      const firstSpace = text.indexOf(' ')
      return firstSpace === -1 ? text : text.slice(0, firstSpace)
    },
    traitDescription() {
      const text = String(this.petInfo.trait || '').trim()
      if (!text) return ''
      const firstSpace = text.indexOf(' ')
      return firstSpace === -1 ? '' : text.slice(firstSpace + 1)
    },
    filteredSkills() {
      const skillTypeData = this.petInfo.skill_types?.[this.selectedSkillType]
      if (skillTypeData && Array.isArray(skillTypeData)) {
        return skillTypeData.map(skill => this.loadedFullSkills[skill.name] || skill)
      }
      return []
    }
  },
  onLoad(options) {
    if (options.id) {
      this.petId = parseInt(options.id)
      this.initialVariantImage = decodeURIComponent(options.variantImage || '')
      this.loadPetDetail()
    }
  },
  methods: {
    loadPetDetail() {
      this.basePet = pets.find(p => p.id === this.petId)
      if (petsDetail[this.petId]) {
        this.baseDetailInfo = {
          ...petsDetail[this.petId],
          type: this.basePet ? this.basePet.type : [],
          rarity: this.basePet ? this.basePet.rarity : '普通',
          img: this.basePet ? this.basePet.img : '',
          traitImage: resolveAssetPath(petTraitImages[String(this.petId)] || '')
        }
        this.loadVariants()
        this.applyCurrentVariantData()
      } else {
        uni.showToast({ title: '数据加载失败', icon: 'none' })
        setTimeout(() => this.goBack(), 1500)
      }
    },
    loadFullSkillDetails(skillNames) {
      skillNames.forEach(name => {
        if (!this.loadedFullSkills[name]) {
          const skillData = skillsData[name] || {}
          const fullPetDetail = petsDetailFull[this.petId] || {}
          const fullSkillList = fullPetDetail.skills || []
          const fullSkill = fullSkillList.find(s => s.name === name) || {}
          this.loadedFullSkills[name] = {
            ...this.petInfo.skill_types?.[this.selectedSkillType]?.find(s => s.name === name),
            name,
            type: skillData.type || fullSkill.type || '-',
            attr: skillData.attr || fullSkill.attr || '-',
            consume: skillData.consume ?? fullSkill.consume ?? '-',
            power: skillData.power ?? fullSkill.power ?? '-',
            describe: skillData.describe || fullSkill.describe || '暂无描述'
          }
        }
      })
    },
    loadVariants() {
      const variantData = petVariants[String(this.petId)]
      if (variantData && Array.isArray(variantData) && variantData.length > 0) {
        this.variants = variantData
        const preferredImage = this.initialVariantImage || this.basePet?.img || ''
        const preferredIndex = variantData.findIndex((item) => item === preferredImage)
        this.currentVariantIndex = preferredIndex >= 0 ? preferredIndex : 0
      } else {
        this.variants = []
        this.currentVariantIndex = 0
      }
    },
    extractVariantName(imagePath) {
      const variantInfo = petVariantDetails[String(this.petId)]?.[imagePath]
      const variantName = String(variantInfo?.variantName || '').trim()
      if (variantName) return variantName

      const fileName = String(imagePath || '').split('/').pop() || ''
      const title = fileName.replace(/^\d+_/, '').replace(/\.png$/i, '').trim()
      const match = title.match(/（([^）]+)）/)
      if (match) return match[1].trim()
      return title
    },
    getVariantDisplayName(imagePath) {
      const rawName = String(this.extractVariantName(imagePath) || '').trim()
      const baseName = String(this.basePet?.name || '').trim()
      const fileName = String(imagePath || '').split('/').pop() || ''
      const title = fileName.replace(/^\d+_/, '').replace(/\.png$/i, '').trim()
      const isBaseVariant = !rawName || rawName === '默认' || rawName === '本来的样子' || rawName === baseName || title === baseName
      const isNamedLeaderVariant = hasLeaderFormPetId(this.petId) && !title.includes('（') && title !== baseName

      if (hasLeaderFormPetId(this.petId)) {
        if (isBaseVariant) {
          return '基础形态'
        }
        if (isNamedLeaderVariant) {
          return '首领化形态'
        }
      }

      if (!rawName || rawName === '默认') {
        return baseName || '基础形态'
      }
      if (rawName === '本来的样子') {
        return '基础形态'
      }
      return rawName
    },
    applyCurrentVariantData() {
      const base = this.baseDetailInfo || {}
      const variantMap = petVariantDetails[String(this.petId)] || {}
      const imageKey = this.variants[this.currentVariantIndex] || ''
      const variantInfo = imageKey ? variantMap[imageKey] : null
      const fallbackVariantTraitImage = Object.values(variantMap).find((detail) => {
        const path = String(detail?.traitImage || '').trim()
        const name = String(detail?.variantName || '').trim()
        return path && (name === '默认' || name === '本来的样子')
      })?.traitImage || ''

      const nextInfo = {
        ...base,
        ...(variantInfo || {})
      }

      nextInfo.type = base.type || []
      nextInfo.img = this.currentVariantImage
      nextInfo.trait = String(variantInfo?.trait || '').trim() || base.trait || ''
      nextInfo.traitImage = resolveAssetPath(fallbackVariantTraitImage || base.traitImage || '')
      nextInfo.race = hasCompleteRace(variantInfo?.race) ? variantInfo.race : (base.race || null)
      nextInfo.skills = hasUsableSkills(variantInfo?.skills) ? variantInfo.skills : (base.skills || [])
      nextInfo.skill_types = Object.keys(buildSkillTypes(nextInfo.skills)).length
        ? buildSkillTypes(nextInfo.skills)
        : (base.skill_types || {})
      this.petInfo = nextInfo
      this.loadedFullSkills = {}

      if (!this.petInfo.skill_types?.[this.selectedSkillType]?.length) {
        const firstType = ['精灵技能', '血脉技能', '可学技能石'].find((key) => this.petInfo.skill_types?.[key]?.length)
        this.selectedSkillType = firstType || '精灵技能'
      }
    },
    setVariantIndex(index) {
      if (index < 0 || index >= this.variants.length) return
      this.showYise = false
      this.currentVariantIndex = index
      this.applyCurrentVariantData()
    },
    getTypeIconPath(type) {
      return resolveAssetPath('/static/icons/' + type + '.png')
    },
    onImageError(e) {
      if (this.variants.length > 0) {
        this.variants.splice(this.currentVariantIndex, 1)
        if (this.currentVariantIndex >= this.variants.length) {
          this.currentVariantIndex = Math.max(0, this.variants.length - 1)
        }
        this.applyCurrentVariantData()
      } else {
        this.petInfo.img = this.baseDetailInfo?.img || this.basePet?.img || ''
      }
    },
    getSkillIcon(name) {
      return resolveAssetPath(skillIcons[name] || '')
    },
    showSkillDetail(skill) {
      const enrichedSkill = enrichSkillWithDetails(skill, this.petId)
      this.currentSkillDetail = enrichedSkill
      this.currentSkillIcon = this.getSkillIcon(skill.name)
      this.showSkillModal = true
    },
    closeSkillModal() {
      this.showSkillModal = false
    },
    goBack() {
      safeBack()
    }
  }
}
</script>

<style scoped>
.detail-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}
.header {
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  padding: 30rpx;
  padding-top: 180rpx;
}
.image-wrapper {
  position: relative;
  width: 300rpx;
  height: 300rpx;
  margin: 0 auto 30rpx;
}
.pet-image {
  width: 300rpx;
  height: 300rpx;
}
.yise-nav {
  display: flex;
  justify-content: center;
  gap: 20rpx;
  margin-top: 20rpx;
}
.nav-btn {
  padding: 10rpx 30rpx;
  background: rgba(255,255,255,0.3);
  border-radius: 30rpx;
  color: #fff;
  font-size: 24rpx;
}
.nav-btn.active {
  background: #fff;
  color: #667eea;
}
.pet-basic {
  text-align: center;
}
.pet-name {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 20rpx;
}
.pet-types {
  display: flex;
  justify-content: center;
  gap: 20rpx;
}
.type-pill {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.3);
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}
.type-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 8rpx;
}
.type-name {
  color: #fff;
  font-size: 24rpx;
}
.variant-strip {
  background: #fff;
  padding: 20rpx;
}
.variant-list {
  display: flex;
  gap: 20rpx;
}
.variant-chip {
  padding: 10rpx 30rpx;
  background: #f0f0f0;
  border-radius: 20rpx;
  font-size: 24rpx;
  white-space: nowrap;
}
.variant-chip.active {
  background: #667eea;
  color: #fff;
}
.section {
  background: #fff;
  margin: 20rpx;
  padding: 30rpx;
  border-radius: 20rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: #333;
}
.race-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}
.race-item {
  text-align: center;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 10rpx;
}
.race-label {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
}
.race-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
}
.race-value.hp { color: #e74c3c; }
.race-value.attack { color: #e67e22; }
.race-value.mattack { color: #9b59b6; }
.race-value.defense { color: #3498db; }
.race-value.mdefense { color: #1abc9c; }
.race-value.speed { color: #f39c12; }
.race-item.total {
  grid-column: span 3;
  background: linear-gradient(90deg, #667eea, #764ba2);
}
.race-item.total .race-label,
.race-item.total .race-value {
  color: #fff;
}
.trait-panel {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}
.trait-image {
  width: 120rpx;
  height: 120rpx;
  flex-shrink: 0;
}
.trait-copy {
  flex: 1;
}
.trait-name {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}
.trait-content {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}
.skill-type-tabs {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
  overflow-x: auto;
}
.skill-tab {
  padding: 15rpx 30rpx;
  background: #f0f0f0;
  border-radius: 30rpx;
  font-size: 26rpx;
  white-space: nowrap;
}
.skill-tab.active {
  background: #667eea;
  color: #fff;
}
.skills-grid {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.skill-grid-item {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 15rpx;
}
.skill-grid-icon {
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
}
.skill-grid-info {
  flex: 1;
}
.skill-grid-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 10rpx;
}
.skill-grid-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}
.skill-attr-icon {
  width: 32rpx;
  height: 32rpx;
}
.skill-grid-power {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
}
.skill-grid-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.skill-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.skill-detail-content {
  background: #fff;
  width: 600rpx;
  max-height: 80vh;
  border-radius: 20rpx;
  overflow: hidden;
}
.skill-detail-header {
  display: flex;
  align-items: center;
  padding: 30rpx;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
}
.skill-detail-icon {
  width: 100rpx;
  height: 100rpx;
}
.skill-detail-title {
  flex: 1;
  margin-left: 20rpx;
}
.skill-detail-name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}
.skill-detail-tags {
  display: flex;
  gap: 10rpx;
  margin-top: 10rpx;
}
.skill-tag {
  padding: 5rpx 15rpx;
  background: rgba(255,255,255,0.3);
  border-radius: 15rpx;
  font-size: 22rpx;
  color: #fff;
}
.skill-detail-close {
  font-size: 50rpx;
  color: #fff;
  padding: 10rpx;
}
.skill-detail-info {
  padding: 30rpx;
}
.skill-info-row {
  display: flex;
  margin-bottom: 20rpx;
}
.skill-info-label {
  width: 100rpx;
  font-size: 28rpx;
  color: #666;
}
.skill-info-value {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}
.skill-info-value.describe {
  line-height: 1.6;
}
.back-btn {
  position: fixed;
  bottom: 30rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 20rpx 80rpx;
  background: #667eea;
  color: #fff;
  border-radius: 50rpx;
  font-size: 30rpx;
}
</style>
