<template>
  <view class="page">
    <AppHeader title="精灵详情" leftAction="back" :background="headerGradient">
      <template #right>
        <view class="header-capsule">
          <text class="header-capsule-text">图鉴 #{{ petId ? String(petId).padStart(3, '0') : '—' }}</text>
        </view>
      </template>

      <template #hero>
        <view class="det-hero">
          <view class="det-portrait">
            <view class="det-portrait-glow"></view>
            <RemoteImage class="det-image" :src="currentVariantImage" mode="aspectFit" @error="onImageError" />
          </view>
          <view class="det-info">
            <text class="det-name">{{ petInfo.name }}</text>
            <text class="det-id">#{{ petId ? String(petId).padStart(3, '0') : '—' }}{{ variantLabel ? ' · ' + variantLabel : '' }}</text>
            <view class="det-pills">
              <view v-for="(type, index) in petInfo.type" :key="index" class="det-pill">
                <RemoteImage class="det-pill-icon" :src="getTypeIconPath(type)" mode="aspectFit" />
                <text class="det-pill-text">{{ type }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-if="hasYise" class="det-yise">
          <view class="det-yise-btn" :class="{ active: !showYise }" hover-class="press-down" @click="showYise = false">原皮</view>
          <view class="det-yise-btn" :class="{ active: showYise }" hover-class="press-down" @click="showYise = true">异色</view>
        </view>
      </template>
    </AppHeader>

    <scroll-view
      v-if="showVariantNav"
      scroll-x
      class="variant-strip"
      :show-scrollbar="false"
      :scroll-into-view="variantScrollId"
      scroll-with-animation
    >
      <view class="variant-list">
        <view
          v-for="(item, index) in variantItems"
          :id="`vchip-${index}`"
          :key="item.image"
          class="variant-chip"
          :class="{ active: index === currentVariantIndex && !showYise }"
          :style="index === currentVariantIndex && !showYise ? activeVariantStyle : null"
          hover-class="press-down"
          @click="setVariantIndex(index)"
        >
          {{ item.name }}
        </view>
      </view>
    </scroll-view>

    <view class="section" v-if="petInfo.race">
      <view class="section-head">
        <view class="section-title-row">
          <view class="section-dot"></view>
          <text class="section-title">种族值</text>
        </view>
        <text class="section-more">总和 {{ petInfo.race.total || '-' }}</text>
      </view>
      <view class="race-grid">
        <view class="race-item" v-for="stat in raceStats" :key="stat.key">
          <text class="race-label">{{ stat.label }}</text>
          <text class="race-value" :style="{ color: stat.color }">{{ stat.value }}</text>
          <view class="race-bar">
            <view class="race-bar-fill" :style="{ width: stat.barWidth, background: stat.color }"></view>
          </view>
        </view>
        <view class="race-item total">
          <text class="race-label">种族总和</text>
          <text class="race-value">{{ petInfo.race.total || '-' }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="petInfo.race">
      <view class="section-head" hover-class="press-down" @click="showCalculator = !showCalculator">
        <view class="section-title-row">
          <view class="section-dot"></view>
          <text class="section-title">面板计算器</text>
        </view>
        <view class="toggle-chevron" :class="{ open: showCalculator }">
          <AppIcon name="chevron-down" :size="14" color="#6B7A6E" :stroke-width="2.4" />
        </view>
      </view>
      <view class="calculator-panel" v-if="showCalculator">
        <view class="calc-row">
          <text class="calc-label">等级</text>
          <input class="calc-input" type="number" v-model="calcLevel" placeholder="1-100" placeholder-class="calc-placeholder" />
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
            <input class="iv-input" type="number" v-model="calcIV.hp" placeholder="0-10" placeholder-class="calc-placeholder" />
          </view>
          <view class="iv-item">
            <text class="iv-label">物攻</text>
            <input class="iv-input" type="number" v-model="calcIV.attack" placeholder="0-10" placeholder-class="calc-placeholder" />
          </view>
          <view class="iv-item">
            <text class="iv-label">魔攻</text>
            <input class="iv-input" type="number" v-model="calcIV.mattack" placeholder="0-10" placeholder-class="calc-placeholder" />
          </view>
          <view class="iv-item">
            <text class="iv-label">物防</text>
            <input class="iv-input" type="number" v-model="calcIV.defense" placeholder="0-10" placeholder-class="calc-placeholder" />
          </view>
          <view class="iv-item">
            <text class="iv-label">魔防</text>
            <input class="iv-input" type="number" v-model="calcIV.mdefense" placeholder="0-10" placeholder-class="calc-placeholder" />
          </view>
          <view class="iv-item">
            <text class="iv-label">速度</text>
            <input class="iv-input" type="number" v-model="calcIV.speed" placeholder="0-10" placeholder-class="calc-placeholder" />
          </view>
        </view>
        <view class="calc-btn" hover-class="press-down" @click="calculatePanel">
          <AppIcon name="zap" :size="13" color="#FFFFFF" :stroke-width="2.4" />
          <text>计算面板</text>
        </view>
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
      <view class="section-head">
        <view class="section-title-row">
          <view class="section-dot"></view>
          <text class="section-title">特性</text>
        </view>
      </view>
      <view class="trait-panel">
        <RemoteImage
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
      <view class="section-head">
        <view class="section-title-row">
          <view class="section-dot"></view>
          <text class="section-title">技能</text>
        </view>
        <text class="section-more">{{ selectedSkillType }}</text>
      </view>
      <view class="skill-type-tabs">
        <view
          class="skill-tab"
          :class="{ active: selectedSkillType === '精灵技能' }"
          hover-class="press-down"
          @click="selectedSkillType = '精灵技能'"
          v-if="petInfo.skill_types && petInfo.skill_types['精灵技能']"
        >
          精灵技能 <text class="skill-tab-count">{{ petInfo.skill_types['精灵技能'].length }}</text>
        </view>
        <view
          class="skill-tab"
          :class="{ active: selectedSkillType === '血脉技能' }"
          hover-class="press-down"
          @click="selectedSkillType = '血脉技能'"
          v-if="petInfo.skill_types && petInfo.skill_types['血脉技能']"
        >
          血脉技能 <text class="skill-tab-count">{{ petInfo.skill_types['血脉技能'].length }}</text>
        </view>
        <view
          class="skill-tab"
          :class="{ active: selectedSkillType === '可学技能石' }"
          hover-class="press-down"
          @click="selectedSkillType = '可学技能石'"
          v-if="petInfo.skill_types && petInfo.skill_types['可学技能石']"
        >
          可学技能石 <text class="skill-tab-count">{{ petInfo.skill_types['可学技能石'].length }}</text>
        </view>
      </view>
      <view class="skills-list">
        <view class="skill-row-slot" v-for="(skill, index) in filteredSkills" :key="index">
          <SkillRow :skill="skill" @click="showSkillDetail(skill)" />
        </view>
      </view>
    </view>

    <view class="skill-modal-mask" v-if="showSkillModal" @click="closeSkillModal">
      <view class="skill-sheet" @click.stop>
        <view class="sheet-grabber"></view>
        <view class="sheet-head">
          <view class="sheet-icon-wrap" :style="{ background: currentSkillIconBg }">
            <RemoteImage class="sheet-icon" :src="currentSkillIcon" mode="aspectFit"></RemoteImage>
          </view>
          <view class="sheet-title-wrap">
            <text class="sheet-name">{{ currentSkillDetail.name }}</text>
            <view class="sheet-tags">
              <text class="sheet-tag">{{ currentSkillDetail.type }}</text>
              <text class="sheet-tag">{{ currentSkillDetail.attr }}</text>
            </view>
          </view>
          <view class="sheet-close" hover-class="press-down" @click="closeSkillModal">
            <AppIcon name="close" :size="14" color="#6B7A6E" :stroke-width="2.6" />
          </view>
        </view>
        <view class="sheet-body">
          <view class="skill-info-row" v-if="currentSkillDetail.attr && currentSkillDetail.attr !== '-'">
            <text class="skill-info-label">属性</text>
            <view class="skill-info-attr">
              <RemoteImage class="skill-detail-attr-icon" :src="getTypeIconPath(currentSkillDetail.attr)" mode="aspectFit" v-if="currentSkillDetail.attr"></RemoteImage>
              <text class="skill-info-value">{{ currentSkillDetail.attr }}</text>
            </view>
          </view>
          <view class="skill-info-row" v-if="currentSkillDetail.consume !== undefined && currentSkillDetail.consume !== null && currentSkillDetail.consume !== '-'">
            <text class="skill-info-label">消耗</text>
            <text class="skill-info-value">{{ currentSkillDetail.consume !== 0 ? '能耗' + currentSkillDetail.consume : '无消耗' }}</text>
          </view>
          <view class="skill-info-row" v-if="(currentSkillDetail.type === '物攻' || currentSkillDetail.type === '魔攻') && currentSkillDetail.power && currentSkillDetail.power !== '-'">
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

    <view class="back-fab" :style="backFabStyle" hover-class="press-down" @click="goBack">
      <AppIcon name="chevron-left" :size="20" color="#FFFFFF" :stroke-width="3" />
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import { petTypes, rarityColors, typeRestriction, typeIconMap, petDetail } from '@/data/pet/pet_detail.js'
import { petIndex } from '@/data/pet/pet_index.js'
import { petSkills } from '@/data/pet/pet_skills.js'
import { skillIcons } from '@/data/skill/skill_icons.js'
import { skillsData } from '@/data/skill/skills.js'
import { safeBack } from '@/utils/nav.js'
import { resolveAssetPath } from '@/utils/asset-path.js'
import { getAttrIconName } from '@/data/config/typeChart.js'

function shade(hex, percent) {
  const raw = String(hex || '').replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  if (full.length !== 6) return '#2F9E5F'
  const num = parseInt(full, 16)
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
  const r = clamp(((num >> 16) & 255) * (1 + percent))
  const g = clamp(((num >> 8) & 255) * (1 + percent))
  const b = clamp((num & 255) * (1 + percent))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function tint(hex, alpha) {
  const raw = String(hex || '').replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  if (full.length !== 6) return 'rgba(44, 58, 47, 0.05)'
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function hasCompleteRace(race) {
  if (!race || typeof race !== 'object') return false
  const keys = ['hp', 'attack', 'mattack', 'defense', 'mdefense', 'speed', 'total']
  return keys.every((key) => Number.isFinite(Number(race[key])))
}

function hasUsableSkills(skills) {
  return Array.isArray(skills) && skills.some((skill) => String(skill?.name || '').trim())
}

function hasUsableTypes(types) {
  return Array.isArray(types) && types.some((type) => String(type || '').trim())
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

export default {
  components: { AppHeader, AppIcon },
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
      baseDetailInfo: null,
      loadedFullSkills: {},
      unifiedSkillDb: {}
    }
  },
  created() {
    this.buildUnifiedSkillDb()
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
    variantLabel() {
      const name = this.currentVariantName
      if (!name || name === this.basePet?.name || name === '基础形态') return ''
      return name
    },
    showVariantNav() {
      return this.variants.length > 1
    },
    variantScrollId() {
      if (!this.showVariantNav || this.showYise) return ''
      return `vchip-${this.currentVariantIndex}`
    },
    hasYise() {
      const variants = petDetail[String(this.petId)]
      return Array.isArray(variants) && variants.some(v => v.yiseImg)
    },
    yiseImage() {
      const variants = petDetail[String(this.petId)]
      if (!Array.isArray(variants)) return null
      // 返回当前变体的异色图，如果没有则返回第一个有异色的
      const current = variants[this.currentVariantIndex]
      if (current?.yiseImage || current?.yiseImg) return current.yiseImg || current.yiseImage
      return variants.find(v => v.yiseImg)?.yiseImg || null
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
    typeColor() {
      const types = this.petInfo.type || []
      return this.getTypeColor(types[0]) || '#2F9E5F'
    },
    backFabStyle() {
      const color = this.typeColor
      return {
        background: color,
        borderColor: shade(color, -0.18),
        boxShadow: `0 4px 0 ${shade(color, -0.3)}`
      }
    },
    headerGradient() {
      const types = this.petInfo.type || []
      const c1 = this.getTypeColor(types[0]) || '#2F9E5F'
      if (types[1]) {
        const c2 = this.getTypeColor(types[1])
        return `linear-gradient(135deg, ${shade(c1, -0.24)} 0%, ${c1} 58%, ${shade(c2, 0.06)} 100%)`
      }
      return `linear-gradient(135deg, ${shade(c1, -0.26)} 0%, ${c1} 60%, ${shade(c1, 0.22)} 100%)`
    },
    activeVariantStyle() {
      const color = this.typeColor
      return {
        background: tint(color, 0.16),
        borderColor: color,
        color: shade(color, -0.28)
      }
    },
    currentSkillIconBg() {
      return tint(this.getTypeColor(this.currentSkillDetail.attr) || '#6B7A6E', 0.16)
    },
    raceStats() {
      const race = this.petInfo.race
      if (!race) return []
      const defs = [
        { key: 'hp', label: '生命', color: '#E0604E' },
        { key: 'attack', label: '物攻', color: '#E8833C' },
        { key: 'mattack', label: '魔攻', color: '#C9922E' },
        { key: 'defense', label: '物防', color: '#4F9CFF' },
        { key: 'mdefense', label: '魔防', color: '#8E6FD5' },
        { key: 'speed', label: '速度', color: '#2F9E5F' }
      ]
      return defs.map((def) => ({
        ...def,
        value: race[def.key] ?? '-',
        barWidth: Math.min(100, Math.max(5, (Number(race[def.key]) || 0) / 1.6)) + '%'
      }))
    },
    filteredSkills() {
      const skillTypeData = this.petInfo.skill_types?.[this.selectedSkillType]
      if (skillTypeData && Array.isArray(skillTypeData)) {
        return skillTypeData.map(skill => {
          const dbSkill = this.getSkillFromDb(skill.name)
          return {
            name: skill.name,
            type: dbSkill.type || skill.type || skill.skill_type || '-',
            attr: dbSkill.attr || skill.attr || '-',
            consume: dbSkill.consume ?? skill.consume,
            power: dbSkill.power ?? skill.power,
            describe: dbSkill.describe || skill.describe || ''
          }
        })
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
    getTypeColor(type) {
      if (!type) return ''
      const found = petTypes.find((item) => item.key === type)
      return found ? found.color : ''
    },
    skillIconBg(skill) {
      return tint(this.getTypeColor(skill?.attr) || '#6B7A6E', 0.14)
    },
    buildUnifiedSkillDb() {
      // 技能详情统一从 skillsData 获取，这里只做 name→skill 的快速映射
      const db = {}
      for (const seqId in petSkills) {
        const entry = petSkills[seqId]
        const skills = entry?.skills || []
        for (const skill of skills) {
          if (skill.name && !db[skill.name]) {
            db[skill.name] = { ...skill }
          }
        }
      }
      this.unifiedSkillDb = db
    },
    getSkillFromDb(skillName) {
      // 优先从 skillsData（技能详情库）获取完整信息
      const raw = skillsData[skillName] || this.unifiedSkillDb[skillName] || {}
      // 清洗字段格式：提取数值、去除后缀
      const consumeVal = typeof raw.consume === 'string'
        ? Number(raw.consume.replace(/[^0-9]/g, '')) || 0
        : (raw.consume ?? 0)
      const powerVal = typeof raw.power === 'string'
        ? Number(raw.power.replace(/[^0-9]/g, '')) || 0
        : (raw.power ?? 0)
      let attrVal = raw.attr || ''
      if (typeof attrVal === 'string' && attrVal.endsWith('系')) {
        attrVal = attrVal.slice(0, -1)
      }
      return {
        ...raw,
        consume: consumeVal,
        power: powerVal,
        attr: attrVal
      }
    },
    loadPetDetail() {
      const variants = petDetail[String(this.petId)]
      if (!variants || !variants.length) {
        uni.showToast({ title: '数据加载失败', icon: 'none' })
        setTimeout(() => this.goBack(), 1500)
        return
      }
      // basePet: 从 index 获取名称等元数据
      const indexEntry = Object.values(petIndex).find(v => v.seq === this.petId)
      const mainVariant = variants[0]

      this.basePet = {
        id: this.petId,
        name: indexEntry?.name || mainVariant.page_title,
        type: mainVariant.type || [],
        img: mainVariant.img || ''
      }

      this.baseDetailInfo = {
        race: mainVariant.race || null,
        trait: mainVariant.trait || '',
        type: mainVariant.type || [],
        rarity: '普通',
        img: mainVariant.img || '',
        name: this.basePet.name,
        traitImage: resolveAssetPath(mainVariant.traitImg || '')
      }

      this.loadVariants()
      this.applyCurrentVariantData()
    },
    loadVariants() {
      const variants = petDetail[String(this.petId)]
      if (variants && Array.isArray(variants) && variants.length > 0) {
        this.variants = variants.map(v => v.img).filter(Boolean)
        const preferredImage = this.initialVariantImage || this.basePet?.img || ''
        const preferredIndex = this.variants.findIndex((item) => item === preferredImage)
        this.currentVariantIndex = preferredIndex >= 0 ? preferredIndex : 0
      } else {
        this.variants = []
        this.currentVariantIndex = 0
      }
    },
    extractVariantName(imagePath) {
      const variants = petDetail[String(this.petId)] || []
      const variantInfo = variants.find(v => v.img === imagePath)
      const variantName = String(variantInfo?.page_title || '').trim()
      if (variantName) return variantName

      const fileName = String(imagePath || '').split('/').pop() || ''
      const title = fileName.replace(/^\d+_/, '').replace(/\.webp$/i, '').replace(/\.png$/i, '').trim()
      const match = title.match(/（([^）]+)）/)
      if (match) return match[1].trim()
      return title
    },
    getVariantDisplayName(imagePath) {
      const rawName = String(this.extractVariantName(imagePath) || '').trim()
      if (!rawName || rawName === '默认') {
        return String(this.basePet?.name || '').trim() || '基础形态'
      }
      if (rawName === '本来的样子') {
        return '基础形态'
      }
      return rawName
    },
    applyCurrentVariantData() {
      const base = this.baseDetailInfo || {}
      const allVariants = petDetail[String(this.petId)] || []
      const currentVariant = allVariants[this.currentVariantIndex] || null

      // 技能数据从 petSkills 获取（不随变体变化）
      const skillEntry = petSkills[String(this.petId)]
      const skills = skillEntry?.skills || []

      const nextInfo = {
        ...base,
        race: hasCompleteRace(currentVariant?.race) ? currentVariant.race : (base.race || null),
        trait: String(currentVariant?.trait || '').trim() || base.trait || '',
        type: currentVariant?.type || base.type || [],
        img: this.currentVariantImage,
        traitImage: base.traitImage || '',
        skills: hasUsableSkills(skills) ? skills : (base.skills || []),
        skill_types: Object.keys(buildSkillTypes(skills)).length
          ? buildSkillTypes(skills)
          : (base.skill_types || {})
      }

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
      const attrMap = {
        '火系': '火', '水系': '水', '草系': '草', '冰系': '冰',
        '电系': '电', '虫系': '虫', '翼系': '翼', '地系': '地',
        '石系': '石', '毒系': '毒', '普通系': '普通', '机械系': '机械',
        '武系': '武', '幽系': '幽', '龙系': '龙', '光系': '光',
        '萌系': '萌', '恶系': '恶', '幻系': '幻'
      }
      const iconName = attrMap[type] || type
      return resolveAssetPath('/static/icons/' + getAttrIconName(iconName) + '.webp')
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
      safeBack('/pages/index')
    },
    getSkillIcon(skillName) {
      return resolveAssetPath(skillIcons[skillName] || '')
    },
    showSkillDetail(skill) {
      const dbSkill = this.getSkillFromDb(skill.name)
      this.currentSkillDetail = {
        name: skill.name,
        type: dbSkill.type || skill.type || skill.skill_type || '-',
        attr: dbSkill.attr || skill.attr || '-',
        consume: dbSkill.consume ?? skill.consume,
        power: dbSkill.power ?? skill.power,
        describe: dbSkill.describe || skill.describe || '暂无描述'
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
.page {
  min-height: 100vh;
  background: #FAF6EC;
  background-image:
    radial-gradient(circle at 12% 6%, rgba(47, 158, 95, 0.05) 0, transparent 42%),
    radial-gradient(circle at 88% 24%, rgba(201, 161, 78, 0.06) 0, transparent 40%);
  padding-bottom: 4px;
}

.press-down {
  transform: scale(0.96);
  opacity: 0.85;
}

/* ===== 头栏 hero ===== */
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
  font-family: Monaco, Consolas, 'Courier New', monospace;
  letter-spacing: 0.02em;
}

.det-hero {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
}

.det-portrait {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.22);
  border: 2px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.det-portrait-glow {
  position: absolute;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0) 70%);
}

.det-image {
  position: relative;
  z-index: 1;
  width: 80px;
  height: 80px;
}

.det-info {
  flex: 1;
  min-width: 0;
}

.det-name {
  display: block;
  font-size: 21px;
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: 0.03em;
  line-height: 1.25;
}

.det-id {
  display: block;
  margin-top: 3px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.85);
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.det-pills {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.det-pill {
  min-height: 26px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
  border: 1px solid rgba(255, 255, 255, 0.45);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.det-pill-icon {
  width: 16px;
  height: 16px;
}

.det-pill-text {
  font-size: 11.5px;
  font-weight: 700;
  color: #FFFFFF;
}

.det-yise {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  display: flex;
  gap: 6px;
}

.det-yise-btn {
  min-height: 26px;
  padding: 3px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  display: inline-flex;
  align-items: center;
}

.det-yise-btn.active {
  background: #FFFFFF;
  color: #C2583F;
}

/* ===== 形态切换条 ===== */
.variant-strip {
  margin: 12px 14px 0;
  width: auto;
  max-width: 100%;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.variant-list {
  display: inline-flex;
  width: max-content;
  gap: 7px;
  padding: 2px 4px 2px 0;
}

.variant-chip {
  min-height: 30px;
  padding: 0 13px;
  border-radius: 999px;
  background: #FFFDF7;
  border: 1.5px dashed #CFC7AE;
  color: #6B7A6E;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  transition: transform 0.12s ease;
}

.variant-chip.active {
  border-style: solid;
}

/* ===== 区块贴纸卡 ===== */
.section {
  margin: 12px 14px 0;
  padding: 14px 15px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  border-radius: 18px;
  box-shadow: 0 3px 0 rgba(44, 58, 47, 0.10);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.section-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #C9A14E;
}

.section-title {
  font-size: 16.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #2C3A2F;
}

.section-more {
  font-size: 12px;
  color: #6B7A6E;
  font-weight: 600;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.toggle-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-90deg);
  transition: transform 150ms ease-out;
}

.toggle-chevron.open {
  transform: rotate(0deg);
}

/* ===== 种族值 ===== */
.race-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.race-item {
  background: #F2EBDA;
  border-radius: 12px;
  padding: 9px 8px 10px;
  text-align: center;
}

.race-item.total {
  grid-column: span 3;
  background: #F6EEDB;
  border: 1px solid #C9A14E;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 8px;
}

.race-label {
  font-size: 11px;
  color: #6B7A6E;
  display: block;
  font-weight: 600;
}

.race-item.total .race-label {
  color: #A97F35;
}

.race-value {
  font-size: 19px;
  font-weight: 700;
  color: #2C3A2F;
  display: block;
  margin-top: 2px;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.race-item.total .race-value {
  margin-top: 0;
  font-size: 22px;
  color: #A97F35;
}

.race-bar {
  margin-top: 6px;
  height: 5px;
  border-radius: 999px;
  background: rgba(44, 58, 47, 0.08);
  overflow: hidden;
}

.race-bar-fill {
  height: 100%;
  border-radius: 999px;
}

/* ===== 面板计算器 ===== */
.calculator-panel {
  padding-top: 2px;
}

.calc-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.calc-label {
  flex-shrink: 0;
  width: 52px;
  height: 26px;
  margin-right: 10px;
  border-radius: 999px;
  background: #E4F2E8;
  border: 1px solid #BFDCC8;
  color: #1E7A46;
  font-size: 11.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.calc-input {
  flex: 1;
  height: 40px;
  background: #FFFFFF;
  border: 1.5px solid #E3DCC8;
  border-radius: 12px;
  padding: 0 14px;
  font-size: 14px;
  color: #2C3A2F;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.calc-placeholder {
  color: #A3AE9F;
}

.calc-picker {
  flex: 1;
  height: 40px;
  background: #FFFFFF;
  border: 1.5px solid #E3DCC8;
  border-radius: 12px;
  padding: 0 14px;
  font-size: 14px;
  line-height: 40px;
  color: #2C3A2F;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.calc-section-title {
  font-size: 12.5px;
  color: #6B7A6E;
  margin: 14px 0 10px;
  padding-bottom: 8px;
  border-bottom: 1.5px dashed #E3DCC8;
  font-weight: 700;
}

.iv-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.iv-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.iv-label {
  font-size: 11.5px;
  color: #6B7A6E;
  font-weight: 600;
}

.iv-input {
  width: 100%;
  height: 38px;
  background: #FFFFFF;
  border: 1.5px solid #E3DCC8;
  border-radius: 11px;
  text-align: center;
  font-size: 13.5px;
  color: #2C3A2F;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.calc-btn {
  background: #2F9E5F;
  border: 1px solid #1E7A46;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 44px;
  padding: 0 16px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 3px 0 #1E7A46;
  transition: transform 0.12s ease;
}

.calc-result {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1.5px dashed #E3DCC8;
}

.result-title {
  font-size: 13.5px;
  color: #2C3A2F;
  font-weight: 700;
  margin-bottom: 10px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.result-item {
  background: #F2EBDA;
  border-radius: 12px;
  padding: 9px 6px;
  text-align: center;
}

.result-label {
  font-size: 11px;
  color: #6B7A6E;
  display: block;
  font-weight: 600;
}

.result-value {
  font-size: 17px;
  font-weight: 700;
  color: #2C3A2F;
  font-family: Monaco, Consolas, 'Courier New', monospace;
  display: block;
  margin-top: 2px;
}

.result-value.hp { color: #E0604E; }
.result-value.attack { color: #E8833C; }
.result-value.mattack { color: #C9922E; }
.result-value.defense { color: #4F9CFF; }
.result-value.mdefense { color: #8E6FD5; }
.result-value.speed { color: #2F9E5F; }

.result-growth {
  font-size: 10.5px;
  color: #A3AE9F;
  display: block;
  margin-top: 2px;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

/* ===== 特性 ===== */
.trait-panel {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 14px;
  background: #F2EBDA;
  border: 1px solid #E3DCC8;
}

.trait-image {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
  flex-shrink: 0;
}

.trait-copy {
  flex: 1;
  min-width: 0;
}

.trait-name {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #2C3A2F;
}

.trait-content {
  display: block;
  margin-top: 5px;
  font-size: 12.5px;
  color: #6B7A6E;
  line-height: 1.6;
}

/* ===== 技能 ===== */
.skill-type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 12px;
}

.skill-tab {
  min-height: 30px;
  padding: 4px 13px;
  background: #F2EBDA;
  border: 1.5px solid #E3DCC8;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #6B7A6E;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: transform 0.12s ease;
}

.skill-tab.active {
  background: #E4F2E8;
  border-color: #2F9E5F;
  color: #1E7A46;
}

.skill-tab-count {
  font-size: 10.5px;
  opacity: 0.7;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 技能行已统一使用 SkillRow 通用组件 */

/* ===== 技能详情弹窗（底部贴纸） ===== */
.skill-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(44, 58, 47, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 14px;
  z-index: 1000;
}

.skill-sheet {
  width: 100%;
  max-width: 680px;
  padding: 8px 18px 20px;
  border-radius: 24px 24px 16px 16px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  box-shadow: 0 -6px 28px rgba(44, 58, 47, 0.18);
}

.sheet-grabber {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: #D8D0BA;
  margin: 6px auto 12px;
}

.sheet-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sheet-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(44, 58, 47, 0.06);
}

.sheet-icon {
  width: 42px;
  height: 42px;
}

.sheet-title-wrap {
  flex: 1;
  min-width: 0;
}

.sheet-name {
  font-size: 17px;
  font-weight: 700;
  color: #2C3A2F;
  display: block;
}

.sheet-tags {
  display: flex;
  gap: 6px;
  margin-top: 5px;
}

.sheet-tag {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 999px;
  background: #F2EBDA;
  border: 1px solid #E3DCC8;
  color: #6B7A6E;
  font-weight: 700;
}

.sheet-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #F2EBDA;
  border: 1px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.12s ease;
}

.sheet-body {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-info-row {
  display: flex;
  align-items: flex-start;
}

.skill-info-label {
  flex-shrink: 0;
  min-width: 52px;
  height: 24px;
  padding: 0 9px;
  margin-right: 10px;
  border-radius: 999px;
  background: #E4F2E8;
  border: 1px solid #BFDCC8;
  color: #1E7A46;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.skill-info-value {
  flex: 1;
  font-size: 13px;
  color: #2C3A2F;
  font-family: Monaco, Consolas, 'Courier New', monospace;
  line-height: 1.5;
}

.skill-info-attr {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.skill-detail-attr-icon {
  width: 18px;
  height: 18px;
  margin-right: 6px;
}

.skill-info-value.describe {
  line-height: 1.6;
  color: #6B7A6E;
  font-family: inherit;
}

/* ===== 悬浮返回钮 ===== */
.back-fab {
  position: fixed;
  right: 16px;
  bottom: calc(24px + env(safe-area-inset-bottom));
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #1E7A46;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
  transition: transform 0.12s ease;
}

.bottom-space {
  height: 28px;
}
</style>
