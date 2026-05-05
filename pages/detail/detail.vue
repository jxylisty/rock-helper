<template>
  <view class="detail-container">
    <view class="header">
      <view class="image-wrapper">
        <image class="pet-image" :src="currentVariantImage" mode="aspectFit" @error="onImageError"></image>
        <view class="yise-nav" v-if="hasYise">
          <view class="nav-btn" :class="{active: !showYise}" @click="showYise = false">原皮</view>
          <view class="nav-btn" :class="{active: showYise}" @click="showYise = true">异色</view>
        </view>
      </view>
      <view class="pet-basic">
        <text class="pet-name">{{ petInfo.name }}</text>
        <view class="pet-types">
          <view
            v-for="(type, index) in petInfo.type"
            :key="index"
            class="type-pill"
          >
            <image
              class="type-icon"
              :src="getTypeIconPath(type)"
              mode="aspectFit"
            />
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

    <view class="section" v-if="petInfo.race">
      <view class="section-title" @click="showCalculator = !showCalculator">
        面板计算器
        <text class="toggle-icon">{{ showCalculator ? '▼' : '▶' }}</text>
      </view>
      <view class="calculator-panel" v-if="showCalculator">
        <view class="calc-row">
          <text class="calc-label">等级</text>
          <input class="calc-input" type="number" v-model="calcLevel" placeholder="1-100" />
        </view>
        <view class="calc-row">
          <text class="calc-label">性格↑</text>
          <picker :value="natureUpIndex" :range="attrOptions" @change="onNatureUpChange">
            <view class="calc-picker">{{ attrOptions[natureUpIndex] }}</view>
          </picker>
        </view>
        <view class="calc-row">
          <text class="calc-label">性格↓</text>
          <picker :value="natureDownIndex" :range="attrOptions" @change="onNatureDownChange">
            <view class="calc-picker">{{ attrOptions[natureDownIndex] }}</view>
          </picker>
        </view>
        <view class="calc-row">
          <text class="calc-label">星级</text>
          <picker :value="starLevel" :range="starOptions" @change="onStarLevelChange">
            <view class="calc-picker">{{ starOptions[starLevel] }}</view>
          </picker>
        </view>
        <view class="calc-section-title">个体资质 (0-10)</view>
        <view class="iv-grid">
          <view class="iv-item">
            <text class="iv-label">生命</text>
            <input class="iv-input" type="number" v-model="calcIV.hp" placeholder="0-10" />
          </view>
          <view class="iv-item">
            <text class="iv-label">物攻</text>
            <input class="iv-input" type="number" v-model="calcIV.attack" placeholder="0-10" />
          </view>
          <view class="iv-item">
            <text class="iv-label">魔攻</text>
            <input class="iv-input" type="number" v-model="calcIV.mattack" placeholder="0-10" />
          </view>
          <view class="iv-item">
            <text class="iv-label">物防</text>
            <input class="iv-input" type="number" v-model="calcIV.defense" placeholder="0-10" />
          </view>
          <view class="iv-item">
            <text class="iv-label">魔防</text>
            <input class="iv-input" type="number" v-model="calcIV.mdefense" placeholder="0-10" />
          </view>
          <view class="iv-item">
            <text class="iv-label">速度</text>
            <input class="iv-input" type="number" v-model="calcIV.speed" placeholder="0-10" />
          </view>
        </view>
        <view class="calc-btn" @click="calculatePanel">计算面板</view>
        <view class="calc-result" v-if="calcResult">
          <view class="result-title">计算结果 ({{ calcLevel }}级)</view>
          <view class="result-grid">
            <view class="result-item">
              <text class="result-label">生命</text>
              <text class="result-value hp">{{ calcResult.hp }}</text>
              <text class="result-growth">+{{ calcResult.growth.hp }}/级</text>
            </view>
            <view class="result-item">
              <text class="result-label">物攻</text>
              <text class="result-value attack">{{ calcResult.attack }}</text>
              <text class="result-growth">+{{ calcResult.growth.attack }}/级</text>
            </view>
            <view class="result-item">
              <text class="result-label">魔攻</text>
              <text class="result-value mattack">{{ calcResult.mattack }}</text>
              <text class="result-growth">+{{ calcResult.growth.mattack }}/级</text>
            </view>
            <view class="result-item">
              <text class="result-label">物防</text>
              <text class="result-value defense">{{ calcResult.defense }}</text>
              <text class="result-growth">+{{ calcResult.growth.defense }}/级</text>
            </view>
            <view class="result-item">
              <text class="result-label">魔防</text>
              <text class="result-value mdefense">{{ calcResult.mdefense }}</text>
              <text class="result-growth">+{{ calcResult.growth.mdefense }}/级</text>
            </view>
            <view class="result-item">
              <text class="result-label">速度</text>
              <text class="result-value speed">{{ calcResult.speed }}</text>
              <text class="result-growth">+{{ calcResult.growth.speed }}/级</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="petInfo.trait">
      <view class="section-title">特性</view>
      <view class="trait-panel">
        <image
          v-if="petInfo.traitImage"
          class="trait-image"
          :src="petInfo.traitImage"
          mode="aspectFit"
        />
        <view class="trait-copy">
          <text class="trait-name">{{ traitTitle }}</text>
          <text class="trait-content">{{ traitDescription || petInfo.trait }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="petInfo.skills && petInfo.skills.length">
      <view class="section-title">技能</view>
      <view class="skill-type-tabs">
        <view class="skill-tab" :class="{active: selectedSkillType === '精灵技能'}" @click="selectedSkillType = '精灵技能'" v-if="petInfo.skill_types && petInfo.skill_types['精灵技能']">
          精灵技能 ({{ petInfo.skill_types['精灵技能'].length }})
        </view>
        <view class="skill-tab" :class="{active: selectedSkillType === '血脉技能'}" @click="selectedSkillType = '血脉技能'" v-if="petInfo.skill_types && petInfo.skill_types['血脉技能']">
          血脉技能 ({{ petInfo.skill_types['血脉技能'].length }})
        </view>
        <view class="skill-tab" :class="{active: selectedSkillType === '可学技能石'}" @click="selectedSkillType = '可学技能石'" v-if="petInfo.skill_types && petInfo.skill_types['可学技能石']">
          可学技能石 ({{ petInfo.skill_types['可学技能石'].length }})
        </view>
      </view>
      <view class="skills-grid">
        <view class="skill-grid-item" v-for="(skill, index) in filteredSkills" :key="index" @click="showSkillDetail(skill)">
          <image class="skill-grid-icon" :src="getSkillIcon(skill.name)" mode="aspectFit"></image>
          <view class="skill-grid-info">
            <view class="skill-grid-header">
              <text class="skill-grid-name">{{ skill.name }}</text>
              <image class="skill-attr-icon" :src="'/static/icons/' + skill.attr + '.png'" mode="aspectFit" v-if="skill.attr"></image>
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
          <image class="skill-detail-icon" :src="currentSkillIcon" mode="aspectFit"></image>
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
import { pets, petTypes, rarityColors, typeRestriction, typeIconMap } from '@/data/pets.js'
import { petsDetail } from '@/data/pets_detail.js'
import { petVariants } from '@/data/pet_variants.js'
import { petVariantDetails } from '@/data/pet_variant_details.js'
import { petYise } from '@/data/pet_yise.js'
import { petTraitImages } from '@/data/pet_trait_images.js'
import { skillIcons } from '@/data/skill_icons.js'
import { skillsData } from '@/data/skills.js'
import { safeBack } from '@/utils/nav.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

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
      showCalculator: false,
      calcLevel: 1,
      calcIV: {
        hp: 0,
        attack: 0,
        mattack: 0,
        defense: 0,
        mdefense: 0,
        speed: 0
      },
      natureUpIndex: 0,
      natureDownIndex: 0,
      attrOptions: ['无', '生命', '物攻', '魔攻', '物防', '魔防', '速度'],
      calcResult: null,
      starLevel: 0,
      starOptions: ['0星', '1星', '2星', '3星', '4星', '5星'],
      baseDetailInfo: null
    }
  },
  computed: {
    variantItems() {
      if (!this.variants.length) return []
      return this.variants.map((image) => ({
        image,
        name: this.extractVariantName(image) || '默认'
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
        return skillTypeData
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
      const match = String(imagePath || '').match(/（([^）]+)）/)
      return match ? match[1] : ''
    },
    applyCurrentVariantData() {
      const base = this.baseDetailInfo || {}
      const variantMap = petVariantDetails[String(this.petId)] || {}
      const imageKey = this.variants[this.currentVariantIndex] || ''
      const variantInfo = imageKey ? variantMap[imageKey] : null

      const nextInfo = {
        ...base,
        ...(variantInfo || {})
      }

      nextInfo.type = base.type || []
      nextInfo.img = this.currentVariantImage
      nextInfo.traitImage = resolveAssetPath(variantInfo?.traitImage || base.traitImage || '')
      nextInfo.race = nextInfo.race || base.race || null
      nextInfo.skills = nextInfo.skills || base.skills || []
      nextInfo.skill_types = nextInfo.skill_types || base.skill_types || {}
      this.petInfo = nextInfo

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
    goBack() {
      safeBack('/pages/index/index')
    },
    getSkillIcon(skillName) {
      return resolveAssetPath(skillIcons[skillName] || '')
    },
    showSkillDetail(skill) {
      this.currentSkillDetail = skillsData[skill.name] || {
        name: skill.name,
        type: skill.type || '-',
        attr: '-',
        consume: '-',
        power: skill.power ? skill.power + '技能威力' : '-',
        describe: ''
      }
      this.currentSkillIcon = resolveAssetPath(skillIcons[skill.name] || '')
      this.showSkillModal = true
    },
    closeSkillModal() {
      this.showSkillModal = false
    },
    onNatureUpChange(e) {
      this.natureUpIndex = e.detail.value
    },
    onNatureDownChange(e) {
      this.natureDownIndex = e.detail.value
    },
    onStarLevelChange(e) {
      this.starLevel = parseInt(e.detail.value)
    },
    calculatePanel() {
      const level = parseInt(this.calcLevel) || 1
      const iv = {
        hp: Math.min(10, Math.max(0, parseInt(this.calcIV.hp) || 0)),
        attack: Math.min(10, Math.max(0, parseInt(this.calcIV.attack) || 0)),
        mattack: Math.min(10, Math.max(0, parseInt(this.calcIV.mattack) || 0)),
        defense: Math.min(10, Math.max(0, parseInt(this.calcIV.defense) || 0)),
        mdefense: Math.min(10, Math.max(0, parseInt(this.calcIV.mdefense) || 0)),
        speed: Math.min(10, Math.max(0, parseInt(this.calcIV.speed) || 0))
      }
      const natureUp = this.attrOptions[this.natureUpIndex]
      const natureDown = this.attrOptions[this.natureDownIndex]
      const star = this.starLevel
      const race = this.petInfo.race
      
      if (!race) return
      
      const starBonus = star * 10
      const starBonusHP = star * 20
      const starNatureBonus = star === 0 ? 0 : (star === 1 ? 0.12 : (star === 2 ? 0.14 : (star === 3 ? 0.16 : (star === 4 ? 0.18 : 0.20))))
      
      const attrMap = {
        '生命': 'hp',
        '物攻': 'attack',
        '魔攻': 'mattack',
        '物防': 'defense',
        '魔防': 'mdefense',
        '速度': 'speed'
      }
      
      const calcAttr = (raceValue, ivValue, attrType, attrKey) => {
        let base
        ivValue=ivValue*(star+1)
        base = raceValue * 0.5 + ivValue * 0.25 + 10
        
        const perLevelGrowth = (raceValue + ivValue * 0.5) * (attrType === 'hp' ? 0.02 : 0.01) + (attrType === 'hp' ? 1 : 0)
        let panel = base + level * perLevelGrowth
        
        let natureMod = 1.0
        const attrName = Object.keys(attrMap).find(key => attrMap[key] === attrKey)
        if (natureUp === attrName) natureMod = 1 + starNatureBonus
        else if (natureDown === attrName) natureMod = 0.9
        else natureMod = 1.0
        
        const bonus = attrType === 'hp' ? starBonusHP : starBonus
        panel = panel * natureMod + bonus
        
        return {
          panel: Math.round(panel),
          growth: Math.round(perLevelGrowth * 100) / 100
        }
      }
      
      const hpResult = calcAttr(race.hp, iv.hp, 'hp', 'hp')
      const atkResult = calcAttr(race.attack, iv.attack, 'atk', 'attack')
      const matkResult = calcAttr(race.mattack, iv.mattack, 'atk', 'mattack')
      const defResult = calcAttr(race.defense, iv.defense, 'def', 'defense')
      const mdefResult = calcAttr(race.mdefense, iv.mdefense, 'def', 'mdefense')
      const spdResult = calcAttr(race.speed, iv.speed, 'spd', 'speed')
      
      this.calcResult = {
        hp: hpResult.panel,
        attack: atkResult.panel,
        mattack: matkResult.panel,
        defense: defResult.panel,
        mdefense: mdefResult.panel,
        speed: spdResult.panel,
        growth: {
          hp: hpResult.growth,
          attack: atkResult.growth,
          mattack: matkResult.growth,
          defense: defResult.growth,
          mdefense: mdefResult.growth,
          speed: spdResult.growth
        }
      }
    }
  }
}
</script>

<style scoped>
.detail-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.header {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.image-wrapper {
  position: relative;
}

.pet-image {
  width: 200rpx;
  height: 200rpx;
  background: #f0f0f0;
  border-radius: 16rpx;
}

.variant-strip {
  margin-top: 12rpx;
  white-space: nowrap;
}

.page-variant-strip {
  margin: 0 0 20rpx;
  padding: 0 20rpx 0;
}

.variant-list {
  display: inline-flex;
  gap: 10rpx;
  padding-right: 8rpx;
}

.variant-chip {
  min-height: 48rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: #e8edf8;
  color: #5a6886;
  font-size: 22rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.variant-chip.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.nav-btn {
  width: 48rpx;
  height: 48rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: bold;
}

.yise-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12rpx;
  gap: 8rpx;
}

.yise-nav .nav-btn {
  width: auto;
  height: 48rpx;
  padding: 0 20rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  background: #ccc;
}

.yise-nav .nav-btn.active {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.pet-basic {
  margin-left: 30rpx;
  flex: 1;
}

.pet-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.pet-types {
  display: flex;
  gap: 10rpx;
  margin-bottom: 8rpx;
  flex-wrap: wrap;
}

.type-pill {
  min-height: 46rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: #eef3fb;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.type-icon {
  width: 34rpx;
  height: 34rpx;
}

.type-name {
  font-size: 22rpx;
  color: #334155;
  font-weight: 700;
}

.section {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #eee;
}

.race-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.race-item {
  background: #f8f8f8;
  border-radius: 12rpx;
  padding: 20rpx;
  text-align: center;
}

.race-item.total {
  grid-column: span 3;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.race-item.total .race-label,
.race-item.total .race-value {
  color: white;
}

.race-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.race-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.race-value.hp { color: #e74c3c; }
.race-value.attack { color: #e67e22; }
.race-value.mattack { color: #f39c12; }
.race-value.defense { color: #3498db; }
.race-value.mdefense { color: #9b59b6; }
.race-value.speed { color: #2ecc71; }

.trait-panel {
  display: flex;
  gap: 18rpx;
  align-items: flex-start;
  padding: 18rpx;
  border-radius: 16rpx;
  background: #f8f8f8;
}

.trait-image {
  width: 112rpx;
  height: 112rpx;
  border-radius: 12rpx;
  background: #fff;
  flex-shrink: 0;
}

.trait-copy {
  flex: 1;
  min-width: 0;
}

.trait-name {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
}

.trait-content {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #666;
  line-height: 1.7;
}

.skills-list {
  max-height: 800rpx;
  overflow-y: auto;
}

.skill-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.skill-item:last-child {
  border-bottom: none;
}

.skill-name {
  font-size: 28rpx;
  color: #333;
  flex: 1;
}

.skill-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.skill-level {
  font-size: 22rpx;
  color: #999;
  min-width: 60rpx;
}

.skill-type {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  color: white;
}

.skill-type.物攻 { background: #e74c3c; }
.skill-type.魔攻 { background: #3498db; }
.skill-type.防御 { background: #2ecc71; }
.skill-type.状态 { background: #9b59b6; }

.skill-power {
  font-size: 26rpx;
  font-weight: bold;
  color: #e67e22;
  min-width: 50rpx;
  text-align: right;
}

.back-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 24rpx;
  border-radius: 50rpx;
  font-size: 32rpx;
  margin-top: 20rpx;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.skill-type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.skill-tab {
  padding: 10rpx 20rpx;
  background: #e8e8e8;
  border-radius: 30rpx;
  font-size: 24rpx;
  color: #666;
  transition: all 0.2s;
}

.skill-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.skill-grid-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 12rpx 16rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  transition: all 0.2s;
}

.skill-grid-item:active {
  background: #e8e8e8;
}

.skill-grid-icon {
  width: 80rpx;
  height: 80rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.skill-grid-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.skill-grid-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 6rpx;
}

.skill-grid-name {
  font-size: 26rpx;
  color: #333;
  font-weight: bold;
  margin-right: 8rpx;
}

.skill-attr-icon {
  width: 32rpx;
  height: 32rpx;
}

.skill-grid-power {
  font-size: 20rpx;
  color: #666;
  margin-bottom: 4rpx;
}

.skill-grid-desc {
  font-size: 18rpx;
  color: #888;
  line-height: 1.4;
}

.skill-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.skill-detail-content {
  background: white;
  border-radius: 24rpx;
  width: 90%;
  max-width: 600rpx;
  max-height: 80vh;
  overflow: hidden;
}

.skill-detail-header {
  display: flex;
  align-items: center;
  padding: 30rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.skill-detail-icon {
  width: 100rpx;
  height: 100rpx;
  margin-right: 20rpx;
}

.skill-detail-title {
  flex: 1;
}

.skill-detail-name {
  font-size: 36rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.skill-detail-tags {
  display: flex;
  gap: 12rpx;
}

.skill-tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.3);
}

.skill-detail-close {
  font-size: 60rpx;
  line-height: 1;
  padding: 0 20rpx;
  opacity: 0.8;
}

.skill-detail-info {
  padding: 30rpx;
}

.skill-info-row {
  display: flex;
  margin-bottom: 20rpx;
}

.skill-info-row:last-child {
  margin-bottom: 0;
}

.skill-info-label {
  font-size: 26rpx;
  color: #999;
  min-width: 80rpx;
}

.skill-info-value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}

.skill-info-value.describe {
  line-height: 1.6;
  color: #555;
}

.toggle-icon {
  float: right;
  font-size: 24rpx;
  color: #999;
}

.calculator-panel {
  padding-top: 20rpx;
}

.calc-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.calc-label {
  font-size: 28rpx;
  color: #333;
  width: 120rpx;
}

.calc-input {
  flex: 1;
  height: 60rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.calc-picker {
  flex: 1;
  height: 60rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  line-height: 60rpx;
  color: #333;
}

.calc-section-title {
  font-size: 26rpx;
  color: #666;
  margin: 20rpx 0 16rpx;
  padding-bottom: 10rpx;
  border-bottom: 1rpx solid #eee;
}

.iv-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.iv-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.iv-label {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.iv-input {
  width: 100%;
  height: 60rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  text-align: center;
  font-size: 28rpx;
}

.calc-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 20rpx;
  border-radius: 50rpx;
  font-size: 30rpx;
  margin-top: 20rpx;
}

.calc-result {
  margin-top: 30rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #eee;
}

.result-title {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.result-item {
  background: #f8f8f8;
  border-radius: 12rpx;
  padding: 16rpx;
  text-align: center;
}

.result-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.result-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.result-value.hp { color: #e74c3c; }
.result-value.attack { color: #e67e22; }
.result-value.mattack { color: #f39c12; }
.result-value.defense { color: #3498db; }
.result-value.mdefense { color: #9b59b6; }
.result-value.speed { color: #2ecc71; }

.result-growth {
  font-size: 20rpx;
  color: #27ae60;
  display: block;
  margin-top: 4rpx;
}
</style>
