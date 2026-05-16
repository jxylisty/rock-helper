<template>
  <view class="pvp-panel">
    <view class="hero-card">
      <text class="hero-title">当前精灵：{{ petName }}</text>
      <text class="hero-meta">属性：{{ attrText }}</text>
      <text class="hero-meta">速度种族：{{ speedRace }}</text>
      <text class="hero-meta">输出技能：{{ offenseSkills.length }}</text>
      <text class="hero-note">{{ targetPoolInfo || fallbackPoolInfo }}</text>
    </view>

    <view class="section-card">
      <text class="section-title">分析模式</text>
      <view class="tab-row">
        <view
          v-for="item in modeOptions"
          :key="item.key"
          class="tab-chip"
          :class="{ active: mode === item.key }"
          @click="mode = item.key"
        >
          {{ item.label }}
        </view>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">当前配置</text>
      <view class="build-chip-row">
        <view
          v-for="build in buildOptions"
          :key="build.key"
          class="build-chip"
          :class="{ active: selectedBuildKey === build.key }"
          @click="selectedBuildKey = build.key"
        >
          {{ build.label }}
        </view>
      </view>
      <view class="panel-grid">
        <view v-for="item in panelSummary" :key="item.label" class="panel-item">
          <text class="panel-label">{{ item.label }}</text>
          <text class="panel-value">{{ item.value }}</text>
        </view>
      </view>
      <text v-if="speedHintText" class="hero-meta">{{ speedHintText }}</text>
    </view>

    <view v-if="mode === 'offense'" class="section-card">
      <text class="section-title">我打谁</text>

      <view class="picker-stack">
        <picker :range="targetLabels" :value="selectedTargetIndex" @change="onTargetChange">
          <view class="picker-box">目标精灵：{{ selectedTargetLabel }}</view>
        </picker>
      </view>

      <view class="profile-card">
        <text class="sub-title">目标配置</text>
        <view class="profile-chip-row">
          <view
            v-for="profile in offenseProfileOptions"
            :key="profile.key"
            class="profile-chip"
            :class="{ active: selectedOffenseProfileKey === profile.key }"
            @click="selectedOffenseProfileKey = profile.key"
          >
            {{ profile.label }}
          </view>
        </view>
      </view>

      <view class="skill-card">
        <text class="sub-title">我方技能</text>
        <text class="sub-note">默认只显示摘要。点技能行本身选择技能，点右侧详情按钮打开弹层。</text>
        <view v-if="offenseSkills.length" class="skill-list">
          <view
            v-for="skill in offenseSkills"
            :key="skill.key"
            class="skill-item"
            :class="{ active: selectedOffenseSkillKey === skill.key }"
            @click="onSkillSelect('offense', skill)"
          >
            <view class="skill-main">
              <view class="skill-head">
                <text class="skill-name">{{ skill.name }}</text>
                <text class="skill-meta-line">{{ skill.type }}｜{{ skill.attr || '无属性' }}｜{{ skill.skillTypeLabel }}</text>
              </view>
              <text class="skill-summary">威力 {{ formatValue(skill.power) }}｜有效 {{ formatValue(skill.effectivePower) }}｜{{ formatValue(skill.consume) }}能耗</text>
              <view v-if="skill.mechanicTags.length" class="tag-row">
                <view v-for="tag in skill.mechanicTags" :key="`${skill.key}-${tag}`" class="tag-chip">{{ tag }}</view>
              </view>
            </view>
            <view class="skill-actions">
              <view class="skill-detail-btn" @click.stop="openSkillDetail(skill)">详情</view>
            </view>
          </view>
        </view>
        <text v-else class="empty-tip">当前精灵没有可用于 PVP 断点分析的真实输出技能。</text>
      </view>

      <view class="preset-card">
        <text class="preset-title">可选条件</text>
        <text class="preset-note">默认都不勾选。只有用户手动启用后，才参与重算。</text>
        <view v-if="offensePresetOptions.length" class="preset-list">
          <view
            v-for="preset in offensePresetOptions"
            :key="preset.id"
            class="preset-row"
            :class="{ active: isPresetEnabled('offense', preset.id) }"
            @click="togglePreset('offense', preset.id)"
          >
            <view class="preset-row-main">
              <text class="preset-row-name">{{ preset.name }}</text>
              <text class="preset-row-meta">{{ presetSourceText(preset) }}</text>
            </view>
            <text class="preset-row-note">{{ preset.conditionText }}</text>
          </view>
        </view>
        <text v-else class="empty-tip">当前精灵没有可识别的攻击预设。</text>
      </view>

      <view class="manual-card">
        <text class="preset-title">自定义条件</text>
        <text class="preset-note">自定义条件不一定来自该精灵自身技能，仅用于手动测试。</text>
        <view class="manual-grid">
          <view class="manual-item">
            <text class="manual-label">物攻加成 %</text>
            <input v-model="customScenario.atkBuff" class="manual-input" type="number" />
          </view>
          <view class="manual-item">
            <text class="manual-label">魔攻加成 %</text>
            <input v-model="customScenario.matkBuff" class="manual-input" type="number" />
          </view>
          <view class="manual-item">
            <text class="manual-label">威力加成 %</text>
            <input v-model="customScenario.powerBuffPercent" class="manual-input" type="number" />
          </view>
          <view class="manual-item">
            <text class="manual-label">速度固定加成</text>
            <input v-model="customScenario.speedFlat" class="manual-input" type="number" />
          </view>
          <view class="manual-item">
            <text class="manual-label">减伤 %</text>
            <input v-model="customScenario.defenseReductionPercent" class="manual-input" type="number" />
          </view>
        </view>
      </view>

      <view class="result-card">
        <text class="result-title">结果</text>
        <text v-if="offenseSpeedText" class="hero-meta">{{ offenseSpeedText }}</text>
        <DamageHpCompareBar
          v-if="offenseBaseResult"
          title="基础结果"
          :damage="offenseBaseResult.damage"
          :hp="offenseBaseResult.hp"
          damage-label="伤害"
          hp-label="生命"
        />
        <DamageHpCompareBar
          v-if="offenseEnhancedResult"
          :title="offenseEnhancedTitle"
          :damage="offenseEnhancedResult.damage"
          :hp="offenseEnhancedResult.hp"
          damage-label="伤害"
          hp-label="生命"
        />
        <text v-if="offenseResultHint" class="result-hint">{{ offenseResultHint }}</text>
      </view>
    </view>

    <view v-else-if="mode === 'defense'" class="section-card">
      <text class="section-title">谁打我</text>

      <view class="picker-stack">
        <picker :range="targetLabels" :value="selectedTargetIndex" @change="onTargetChange">
          <view class="picker-box">敌方精灵：{{ selectedTargetLabel }}</view>
        </picker>
      </view>

      <view class="profile-card">
        <text class="sub-title">敌方配置</text>
        <view class="profile-chip-row">
          <view
            v-for="profile in defenseProfileOptions"
            :key="profile.key"
            class="profile-chip"
            :class="{ active: selectedDefenseProfileKey === profile.key }"
            @click="selectedDefenseProfileKey = profile.key"
          >
            {{ profile.label }}
          </view>
        </view>
      </view>

      <view class="profile-card">
        <text class="sub-title">输出筛选</text>
        <view class="profile-chip-row">
          <view class="profile-chip" :class="{ active: defenseSkillMode === 'common' }" @click="defenseSkillMode = 'common'">
            只看常见威力技能
          </view>
          <view class="profile-chip" :class="{ active: defenseSkillMode === 'all' }" @click="defenseSkillMode = 'all'">
            显示全部输出技能
          </view>
        </view>
      </view>

      <view class="skill-card">
        <text class="sub-title">敌方输出技能</text>
        <text class="sub-note">默认按常见有效威力阈值筛选，点技能行选择，点右侧详情按钮打开弹层。</text>
        <view v-if="defenseVisibleSkills.length" class="skill-list">
          <view
            v-for="skill in defenseVisibleSkills"
            :key="skill.key"
            class="skill-item"
            :class="{ active: selectedDefenseSkillKey === skill.key }"
            @click="onSkillSelect('defense', skill)"
          >
            <view class="skill-main">
              <view class="skill-head">
                <text class="skill-name">{{ skill.name }}</text>
                <text class="skill-meta-line">{{ skill.type }}｜{{ skill.attr || '无属性' }}｜{{ skill.skillTypeLabel }}</text>
              </view>
              <text class="skill-summary">威力 {{ formatValue(skill.power) }}｜有效 {{ formatValue(skill.effectivePower) }}｜{{ formatValue(skill.consume) }}能耗</text>
              <view v-if="skill.mechanicTags.length" class="tag-row">
                <view v-for="tag in skill.mechanicTags" :key="`${skill.key}-${tag}`" class="tag-chip">{{ tag }}</view>
              </view>
            </view>
            <view class="skill-actions">
              <view class="skill-detail-btn" @click.stop="openSkillDetail(skill)">详情</view>
            </view>
          </view>
        </view>
        <text v-else class="empty-tip">当前筛选条件下没有敌方输出技能。</text>
      </view>

      <view class="result-card">
        <text class="result-title">伤害结果</text>
        <view v-if="defenseResultCards.length" class="result-list">
          <view v-for="item in defenseResultCards" :key="item.key" class="result-item">
            <view class="result-item-head">
              <text class="result-item-title">{{ item.title }}</text>
              <view class="skill-detail-btn" @click.stop="openSkillDetail(item.skill)">详情</view>
            </view>
            <text class="skill-summary">{{ item.summary }}</text>
            <DamageHpCompareBar
              :title="item.barTitle"
              :damage="item.damage"
              :hp="item.hp"
              damage-label="受到伤害"
              hp-label="自身生命"
              :reverse-diff="true"
            />
            <DamageHpCompareBar
              v-if="item.enhancedResult"
              :title="item.enhancedBarTitle"
              :damage="item.enhancedResult.damage"
              :hp="item.enhancedResult.hp"
              damage-label="受到伤害"
              hp-label="自身生命"
              :reverse-diff="true"
            />
            <text v-if="item.enhancedText" class="result-hint">{{ item.enhancedText }}</text>
          </view>
        </view>
      </view>

      <view class="manual-card">
        <text class="preset-title">自定义条件</text>
        <text class="preset-note">自定义条件不一定来自该精灵自身技能，仅用于手动测试。</text>
        <view class="manual-grid">
          <view class="manual-item">
            <text class="manual-label">物攻加成 %</text>
            <input v-model="customScenario.atkBuff" class="manual-input" type="number" />
          </view>
          <view class="manual-item">
            <text class="manual-label">魔攻加成 %</text>
            <input v-model="customScenario.matkBuff" class="manual-input" type="number" />
          </view>
          <view class="manual-item">
            <text class="manual-label">威力加成 %</text>
            <input v-model="customScenario.powerBuffPercent" class="manual-input" type="number" />
          </view>
          <view class="manual-item">
            <text class="manual-label">速度固定加成</text>
            <input v-model="customScenario.speedFlat" class="manual-input" type="number" />
          </view>
          <view class="manual-item">
            <text class="manual-label">减伤 %</text>
            <input v-model="customScenario.defenseReductionPercent" class="manual-input" type="number" />
          </view>
        </view>
      </view>
    </view>

    <view v-else class="section-card">
      <text class="section-title">配置推荐</text>
      <text class="hero-meta">当前目标：{{ selectedTargetLabel }}</text>
      <text class="hero-meta">当前敌方输出技能：{{ selectedDefenseSkillLabel }}</text>

      <view v-if="recommendationCards.length" class="recommend-stack">
        <view v-for="item in recommendationCards" :key="item.key" class="recommend-card">
          <text class="recommend-card-title">{{ item.label }}</text>
          <text class="recommend-line">速度：{{ item.speedText }}</text>
          <text class="recommend-line">{{ item.offenseText }}</text>
          <text class="recommend-line">{{ item.defenseText }}</text>
          <text class="recommend-line note">{{ item.note }}</text>
        </view>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">说明</text>
      <text class="note-text">当前仍然使用真实面板与真实伤害公式，不回退 mock；但像连击条件、应对状态、特性触发链等复杂分支仍只做了基础识别，未完整展开。</text>
    </view>

    <view v-if="skillDetailVisible" class="detail-mask" @click="closeSkillDetail">
      <view class="detail-card" @click.stop>
        <view class="detail-head">
          <text class="detail-title">{{ detailSkill?.name || '技能详情' }}</text>
          <view class="detail-close" @click="closeSkillDetail">×</view>
        </view>
        <text class="detail-line">属性：{{ detailSkill?.attr || '无属性' }}</text>
        <text class="detail-line">类型：{{ detailSkill?.type || '-' }}</text>
        <text class="detail-line">威力：{{ formatValue(detailSkill?.power) }}</text>
        <text class="detail-line">有效威力：{{ formatValue(detailSkill?.effectivePower) }}（{{ formatValue(detailSkill?.power) }} × {{ formatValue(detailSkill?.baseHits) }}）</text>
        <text class="detail-line">能耗：{{ formatValue(detailSkill?.consume) }}</text>
        <text class="detail-line">技能来源：{{ detailSkill?.skillTypeLabel || '精灵技能' }}</text>
        <text class="detail-line">完整描述：{{ detailSkill?.describe || '无' }}</text>
        <text class="detail-line">机制标签：{{ (detailSkill?.mechanicTags || []).join(' / ') || '无' }}</text>
        <text v-if="detailSkill?.isQuick" class="detail-line">迅捷：主动切换精灵时可触发，不等同于先手。</text>
      </view>
    </view>
  </view>
</template>

<script>
import commonSkillPresets from '@/src/data/pvp/commonSkillPresets.json'
import DamageHpCompareBar from './DamageHpCompareBar.vue'
import { calculateAllPanels, calculateDamageFull, canActBeforeEnemy, normalizeAttrList, normalizeBattleSkill, repairText } from '@/utils/pvpDamageEngine.js'
import { buildAvailableScenarioPresets, resolveBattleScenario } from '@/utils/pvpScenarioPresetBuilder.js'

const MODE_OPTIONS = [
  { key: 'offense', label: '我打谁' },
  { key: 'defense', label: '谁打我' },
  { key: 'recommend', label: '配置推荐' }
]

const PANEL_ITEMS = [
  { key: 'speed', label: '速度' },
  { key: 'attack', label: '物攻' },
  { key: 'mattack', label: '魔攻' },
  { key: 'defense', label: '物防' },
  { key: 'mdefense', label: '魔防' }
]

function makeIvObject(keys = []) {
  const ivs = { hp: 0, attack: 0, mattack: 0, defense: 0, mdefense: 0, speed: 0 }
  keys.forEach((key) => {
    if (ivs[key] !== undefined) ivs[key] = 10
  })
  return ivs
}

function getRaceValue(race = {}, key) {
  return Number(race?.[key] || 0)
}

function inferPrimaryAttackStat(pet = {}) {
  const skills = Array.isArray(pet?.skills) ? pet.skills : []
  const physicalCount = skills.filter((skill) => repairText(skill?.type || '') === '物攻' && Number(skill?.power || 0) > 0).length
  const magicCount = skills.filter((skill) => repairText(skill?.type || '') === '魔攻' && Number(skill?.power || 0) > 0).length
  if (physicalCount > magicCount) return 'attack'
  if (magicCount > physicalCount) return 'mattack'
  return getRaceValue(pet?.race, 'attack') >= getRaceValue(pet?.race, 'mattack') ? 'attack' : 'mattack'
}

function createBuild(key, label, race = {}, ivKeys = [], natureUp = null, natureDown = null, extraBuffs = {}) {
  return {
    key,
    label,
    ivs: makeIvObject(ivKeys),
    natureUp,
    natureDown,
    panel: calculateAllPanels({
      race,
      ivs: makeIvObject(ivKeys),
      natureUp,
      natureDown,
      buffs: extraBuffs
    })
  }
}

function buildRepresentativeBuilds(pet = {}, extraBuffs = {}) {
  const race = pet?.race || {}
  const primaryAttack = inferPrimaryAttackStat(pet)
  const dumpStat = primaryAttack === 'attack' ? 'mattack' : 'attack'
  return [
    createBuild('speed', '极速', race, ['speed', primaryAttack, 'hp'], 'speed', dumpStat, extraBuffs),
    createBuild('attack', '物攻', race, ['attack', 'speed', 'hp'], 'attack', 'mattack', extraBuffs),
    createBuild('mattack', '魔攻', race, ['mattack', 'speed', 'hp'], 'mattack', 'attack', extraBuffs),
    createBuild('defense', '物防', race, ['hp', 'defense', 'speed'], 'defense', dumpStat, extraBuffs),
    createBuild('mdefense', '魔防', race, ['hp', 'mdefense', 'speed'], 'mdefense', dumpStat, extraBuffs)
  ]
}

function pickDefaultBuildKey(pet = {}, builds = []) {
  const race = pet?.race || {}
  const attack = getRaceValue(race, 'attack')
  const mattack = getRaceValue(race, 'mattack')
  const speed = getRaceValue(race, 'speed')
  const maxStat = Math.max(attack, mattack, speed)
  if (speed >= maxStat || speed >= maxStat - 8) return builds.find((item) => item.key === 'speed')?.key || 'speed'
  if (attack >= mattack) return builds.find((item) => item.key === 'attack')?.key || 'attack'
  return builds.find((item) => item.key === 'mattack')?.key || 'mattack'
}

function resolveSkillSourceLabel(skill = {}) {
  const raw = repairText(skill?.skillType || skill?.skill_type || skill?.sourceType || '')
  if (raw.includes('血脉')) return '血脉技能'
  if (raw.includes('技能石')) return '可学技能石'
  if (raw.includes('技能')) return '精灵技能'
  return raw || '精灵技能'
}

function getCommonSkillConfig(petName = '') {
  const defaultConfig = commonSkillPresets?.default || {}
  const override = commonSkillPresets?.petOverrides?.[petName] || {}
  return {
    minEffectivePower: Number(override.minEffectivePower ?? defaultConfig.minEffectivePower ?? 80),
    maxDisplaySkills: Number(defaultConfig.maxDisplaySkills ?? 8),
    sortBy: Array.isArray(defaultConfig.sortBy) ? defaultConfig.sortBy : ['effectivePower', 'stab', 'consume'],
    preferredSkills: Array.isArray(override.preferredSkills) ? override.preferredSkills : []
  }
}

function sortDamageSkills(skills = [], petAttrs = [], petName = '') {
  const config = getCommonSkillConfig(petName)
  const preferredIndex = new Map(config.preferredSkills.map((name, index) => [repairText(name), index]))
  const normalizedAttrs = normalizeAttrList(petAttrs)
  return (Array.isArray(skills) ? skills : [])
    .map((skill, index) => {
      const normalized = normalizeBattleSkill(skill)
      return {
        ...skill,
        ...normalized,
        key: `${repairText(skill?.name || 'skill')}-${index}`,
        skillTypeLabel: resolveSkillSourceLabel(skill),
        sameType: normalizedAttrs.includes(normalized.attr),
        preferredIndex: preferredIndex.has(normalized.name) ? preferredIndex.get(normalized.name) : Number.POSITIVE_INFINITY
      }
    })
    .filter((skill) => skill.isDamageSkill)
    .sort((a, b) => {
      if (a.preferredIndex !== b.preferredIndex) return a.preferredIndex - b.preferredIndex
      if (b.effectivePower !== a.effectivePower) return b.effectivePower - a.effectivePower
      if (a.sameType !== b.sameType) return a.sameType ? -1 : 1
      if (a.consume !== b.consume) return a.consume - b.consume
      return a.name.localeCompare(b.name, 'zh-Hans-CN')
    })
}

function formatDamageRecord(result = {}) {
  return {
    damage: Number(result.damage || 0),
    hp: Number(result.hp || 0),
    percent: Number(result.percent || 0),
    diff: Number(result.diff || 0)
  }
}

function applyScenarioToPanel(basePanel = {}, scenario = {}, side = 'attacker') {
  const next = {
    hp: Number(basePanel?.hp || 0),
    attack: Number(basePanel?.attack || 0),
    mattack: Number(basePanel?.mattack || 0),
    defense: Number(basePanel?.defense || 0),
    mdefense: Number(basePanel?.mdefense || 0),
    speed: Number(basePanel?.speed || 0)
  }
  if (side === 'attacker') {
    next.attack *= 1 + Number(scenario?.atkBuff || 0) / 100
    next.mattack *= 1 + Number(scenario?.matkBuff || 0) / 100
  } else {
    next.defense *= 1 + Number(scenario?.defBuff || 0) / 100
    next.mdefense *= 1 + Number(scenario?.mdefBuff || 0) / 100
  }
  next.speed *= 1 + Number(scenario?.speedBuff || 0) / 100
  next.speed += Number(scenario?.speedFlat || 0)
  return next
}

function presetNameList(presets = []) {
  return (Array.isArray(presets) ? presets : []).map((preset) => preset.name).filter(Boolean)
}

export default {
  name: 'PvpBreakpointPanel',
  components: { DamageHpCompareBar },
  props: {
    pet: { type: Object, default: () => ({}) },
    targetPets: { type: Array, default: () => [] },
    targetPoolInfo: { type: String, default: '' }
  },
  data() {
    return {
      mode: 'offense',
      selectedBuildKey: '',
      selectedTargetKey: '',
      selectedOffenseSkillKey: '',
      selectedDefenseSkillKey: '',
      selectedOffenseProfileKey: 'standard',
      selectedDefenseProfileKey: 'standard_output',
      defenseSkillMode: 'common',
      enabledOffensePresetIds: [],
      enabledDefensePresetIds: [],
      skillDetailVisible: false,
      detailSkill: null,
      customScenario: {
        atkBuff: '',
        matkBuff: '',
        powerBuffPercent: '',
        speedFlat: '',
        defenseReductionPercent: ''
      }
    }
  },
  computed: {
    fallbackPoolInfo() {
      return '当前使用演示目标池，结果仅用于功能测试'
    },
    modeOptions() { return MODE_OPTIONS },
    petName() { return repairText(this.pet?.fullName || this.pet?.name || '未知精灵') },
    petSkillConfig() { return getCommonSkillConfig(this.petName) },
    targetSkillConfig() { return getCommonSkillConfig(this.selectedTargetLabel) },
    attrText() {
      const attrs = normalizeAttrList(this.pet?.attrs || [])
      return attrs.length ? attrs.join(' / ') : '未知'
    },
    speedRace() {
      const value = this.pet?.race?.speed
      return value === undefined || value === null || value === '' ? '-' : value
    },
    targetOptions() { return (Array.isArray(this.targetPets) ? this.targetPets : []).filter(Boolean) },
    targetLabels() { return this.targetOptions.map((item) => repairText(item.fullName || item.name || '未知目标')) },
    selectedTargetIndex() {
      const index = this.targetOptions.findIndex((item) => item.key === this.selectedTargetKey)
      return index >= 0 ? index : 0
    },
    selectedTarget() { return this.targetOptions[this.selectedTargetIndex] || null },
    selectedTargetLabel() { return repairText(this.selectedTarget?.fullName || this.selectedTarget?.name || '未知目标') },
    selectedDefenseSkillLabel() { return repairText(this.selectedDefenseSkill?.name || '暂无敌方输出技能') },
    buildOptions() { return buildRepresentativeBuilds(this.pet || {}) },
    selectedBuild() { return this.buildOptions.find((item) => item.key === this.selectedBuildKey) || this.buildOptions[0] || null },
    panelSummary() {
      if (!this.selectedBuild) return []
      return PANEL_ITEMS.map((item) => ({ label: item.label, value: this.formatValue(this.selectedBuild.panel[item.key]) }))
    },
    offenseSkills() {
      return sortDamageSkills(this.pet?.skills || [], this.pet?.attrs || [], this.petName)
    },
    defenseAllSkills() {
      return sortDamageSkills(this.selectedTarget?.skills || [], this.selectedTarget?.attrs || [], this.selectedTargetLabel)
    },
    defenseVisibleSkills() {
      const threshold = Number(this.targetSkillConfig.minEffectivePower || 80)
      const list = this.defenseSkillMode === 'all'
        ? this.defenseAllSkills
        : this.defenseAllSkills.filter((skill) => Number(skill.effectivePower || 0) >= threshold)
      const limited = this.defenseSkillMode === 'all' ? list : list.slice(0, Number(this.targetSkillConfig.maxDisplaySkills || 8))
      return limited
    },
    selectedOffenseSkill() {
      return this.offenseSkills.find((item) => item.key === this.selectedOffenseSkillKey) || this.offenseSkills[0] || null
    },
    selectedDefenseSkill() {
      return this.defenseAllSkills.find((item) => item.key === this.selectedDefenseSkillKey) || this.defenseVisibleSkills[0] || this.defenseAllSkills[0] || null
    },
    offenseProfileOptions() { return createOffenseProfiles(this.selectedTarget || {}) },
    selectedOffenseProfile() { return this.offenseProfileOptions.find((item) => item.key === this.selectedOffenseProfileKey) || this.offenseProfileOptions[0] || null },
    defenseProfileOptions() { return createDefenseProfiles(this.pet || {}) },
    selectedDefenseProfile() { return this.defenseProfileOptions.find((item) => item.key === this.selectedDefenseProfileKey) || this.defenseProfileOptions[0] || null },
    offensePresetBundle() {
      return buildAvailableScenarioPresets(this.pet, this.selectedOffenseSkill, 'offense', {
        myPanel: this.selectedBuild ? this.selectedBuild.panel : {},
        enemyPanel: this.selectedOffenseProfile?.panel || {},
        selectedSkill: this.selectedOffenseSkill || {},
        enemySelectedSkill: this.selectedDefenseSkill || {}
      })
    },
    defensePresetBundle() {
      return buildAvailableScenarioPresets(this.pet, this.selectedDefenseSkill, 'defense', {
        myPanel: this.selectedBuild ? this.selectedBuild.panel : {},
        enemyPanel: this.selectedDefenseProfile?.panel || {},
        selectedSkill: this.selectedDefenseSkill || {},
        enemySelectedSkill: this.selectedOffenseSkill || {}
      })
    },
    offensePresetOptions() {
      return [...(this.offensePresetBundle.offensePresets || []), ...(this.offensePresetBundle.speedPresets || [])]
    },
    defensePresetOptions() {
      return [...(this.defensePresetBundle.defensePresets || []), ...(this.defensePresetBundle.speedPresets || [])]
    },
    offenseEnabledPresets() {
      return this.enabledOffensePresetIds.map((id) => this.offensePresetOptions.find((item) => item.id === id)).filter(Boolean)
    },
    defenseEnabledPresets() {
      return this.enabledDefensePresetIds.map((id) => this.defensePresetOptions.find((item) => item.id === id)).filter(Boolean)
    },
    offenseManualScenario() {
      const powerPercent = Number(this.customScenario.powerBuffPercent || 0)
      return {
        atkBuff: this.customScenario.atkBuff,
        matkBuff: this.customScenario.matkBuff,
        powerBuff: powerPercent ? 1 + powerPercent / 100 : '',
        speedFlat: this.customScenario.speedFlat
      }
    },
    defenseManualScenario() {
      const reductionPercent = Number(this.customScenario.defenseReductionPercent || 0)
      return {
        speedFlat: this.customScenario.speedFlat,
        defenseReduction: reductionPercent ? reductionPercent / 100 : ''
      }
    },
    offenseScenario() { return resolveBattleScenario({ enabledPresets: this.offenseEnabledPresets, manualScenario: this.offenseManualScenario }) },
    defenseScenario() { return resolveBattleScenario({ enabledPresets: this.defenseEnabledPresets, manualScenario: this.defenseManualScenario }) },
    offenseScenarioActive() {
      return this.offenseEnabledPresets.length > 0 || Object.values(this.offenseManualScenario).some((value) => value !== '' && value !== null && value !== undefined)
    },
    defenseScenarioActive() {
      return this.defenseEnabledPresets.length > 0 || Object.values(this.defenseManualScenario).some((value) => value !== '' && value !== null && value !== undefined)
    },
    offenseBaseResult() {
      if (!this.selectedBuild || !this.selectedOffenseSkill || !this.selectedTarget || !this.selectedOffenseProfile) return null
      return formatDamageRecord(this.computeOffenseResult(this.selectedBuild.panel, this.selectedOffenseSkill, this.selectedTarget, this.selectedOffenseProfile.panel, null))
    },
    offenseEnhancedResult() {
      if (!this.offenseScenarioActive || !this.selectedBuild || !this.selectedOffenseSkill || !this.selectedTarget || !this.selectedOffenseProfile) return null
      return formatDamageRecord(this.computeOffenseResult(this.selectedBuild.panel, this.selectedOffenseSkill, this.selectedTarget, this.selectedOffenseProfile.panel, this.offenseScenario))
    },
    offenseEnhancedTitle() {
      const names = presetNameList(this.offenseEnabledPresets)
      return names.length ? `启用【${names.join('、')}】后` : '启用条件后'
    },
    defenseResultCards() {
      if (!this.selectedTarget || !this.selectedDefenseProfile) return []
      const myPanel = this.selectedBuild ? this.selectedBuild.panel : {}
      const targetPanel = this.selectedDefenseProfile.panel
      const defenseScenario = this.defenseScenario
      return this.defenseVisibleSkills.map((skill) => {
        const base = this.computeDefenseResult(targetPanel, skill, this.selectedTarget, myPanel, null)
        const enhanced = this.defenseScenarioActive
          ? this.computeDefenseResult(targetPanel, skill, this.selectedTarget, myPanel, defenseScenario)
          : null
        return {
          key: skill.key,
          skill,
          title: skill.name,
          summary: `${skill.name}｜${skill.attr || '无属性'}｜${skill.type}｜威力${this.formatValue(skill.power)}｜有效${this.formatValue(skill.effectivePower)}｜${this.formatValue(skill.consume)}能耗`,
          barTitle: '基础受到伤害',
          damage: base.damage,
          hp: base.hp,
          enhancedResult: enhanced ? {
            damage: enhanced.damage,
            hp: enhanced.hp
          } : null,
          enhancedBarTitle: enhanced ? `启用【${presetNameList(this.defenseEnabledPresets).join('、') || '条件'}】后` : '',
          enhancedText: enhanced ? `启用条件后：${this.formatValue(enhanced.damage)} / ${this.formatValue(enhanced.hp)}，${Math.round(enhanced.percent)}%，${enhanced.diff >= 0 ? `溢出 ${this.formatValue(enhanced.diff)}` : `剩余 ${this.formatValue(Math.abs(enhanced.diff))}`}` : ''
        }
      })
    },
    defenseEnhancedResult() {
      return null
    },
    defenseEnhancedTitle() {
      const names = presetNameList(this.defenseEnabledPresets)
      return names.length ? `启用【${names.join('、')}】后` : '启用条件后'
    },
    offenseSpeedText() {
      if (!this.selectedBuild) return ''
      const baseSpeed = Number(this.selectedBuild.panel.speed || 0)
      const nextSpeed = Number(applyScenarioToPanel(this.selectedBuild.panel, this.offenseScenario, 'attacker').speed || 0)
      if (baseSpeed === nextSpeed) return ''
      return `基础速度 ${this.formatValue(baseSpeed)}，启用后 ${this.formatValue(nextSpeed)}`
    },
    defenseSpeedText() {
      if (!this.selectedBuild) return ''
      const baseSpeed = Number(this.selectedBuild.panel.speed || 0)
      const nextSpeed = Number(applyScenarioToPanel(this.selectedBuild.panel, this.defenseScenario, 'defender').speed || 0)
      if (baseSpeed === nextSpeed) return ''
      return `基础速度 ${this.formatValue(baseSpeed)}，启用后 ${this.formatValue(nextSpeed)}`
    },
    offenseResultHint() {
      if (!this.selectedOffenseSkill || !this.selectedTarget) return ''
      return canActBeforeEnemy({
        myPanel: this.selectedBuild ? applyScenarioToPanel(this.selectedBuild.panel, this.offenseScenario, 'attacker') : {},
        enemyPanel: this.selectedOffenseProfile?.panel || {},
        selectedSkill: this.selectedOffenseSkill,
        enemySelectedSkill: this.selectedDefenseSkill || {}
      }).reason
    },
    defenseResultHint() {
      if (!this.selectedDefenseSkill || !this.selectedTarget) return ''
      return canActBeforeEnemy({
        myPanel: this.selectedBuild ? applyScenarioToPanel(this.selectedBuild.panel, this.defenseScenario, 'defender') : {},
        enemyPanel: this.selectedDefenseProfile?.panel || {},
        selectedSkill: this.selectedDefenseSkill,
        enemySelectedSkill: this.selectedOffenseSkill || {}
      }).reason
    },
    recommendationCards() {
      if (!this.selectedTarget || !this.selectedOffenseSkill || !this.selectedDefenseSkill || !this.selectedOffenseProfile || !this.selectedDefenseProfile) return []
      const baselineBuild = this.selectedBuild
      const baselineTargetPanel = this.selectedOffenseProfile.panel
      const baselineEnemyPanel = this.selectedDefenseProfile.panel
      const baselineSpeed = Number(baselineBuild?.panel?.speed || 0)
      return this.buildOptions.map((build) => {
        const offense = this.computeOffenseResult(build.panel, this.selectedOffenseSkill, this.selectedTarget, baselineTargetPanel, null)
        const defense = this.computeDefenseResult(baselineEnemyPanel, this.selectedDefenseSkill, this.selectedTarget, build.panel, null)
        const offensePercent = Number(offense.percent || 0)
        const defensePercent = Number(defense.percent || 0)
        const speedGap = Number(build.panel.speed || 0) - baselineSpeed
        let note = '当前输出与承伤都处于中间区间。'
        if (offensePercent >= 100) note = `${this.selectedOffenseSkill.name} 可跨过生命线。`
        else if (offensePercent >= 90) note = `${this.selectedOffenseSkill.name} 已接近生命线。`
        if (defensePercent >= 100) note += ` 承受当前敌方技能为 ${this.formatValue(defensePercent)}%，会被击穿。`
        else note += ` 承受当前敌方技能为 ${this.formatValue(defensePercent)}%，剩余 ${this.formatValue(defense.hp - defense.damage)} HP。`
        return {
          key: build.key,
          label: build.label,
          speedText: `${this.formatValue(build.panel.speed)}${speedGap >= 0 ? `（+${this.formatValue(speedGap)}）` : `（-${this.formatValue(Math.abs(speedGap))}）`}`,
          offenseText: `${this.selectedOffenseSkill.name} 对目标造成 ${this.formatValue(offensePercent)}%`,
          defenseText: `承受 ${this.selectedDefenseSkill.name} 为 ${this.formatValue(defensePercent)}%`,
          note: build.key === baselineBuild?.key
            ? `${build.label}：当前选择的基准配置。${note}`
            : `${build.label}：相比当前选择，速度 ${speedGap >= 0 ? `提升 ${this.formatValue(speedGap)} 点` : `降低 ${this.formatValue(Math.abs(speedGap))} 点`}。${note}`
        }
      })
    }
  },
  watch: {
    pet: {
      deep: true,
      immediate: true,
      handler(nextPet) {
        const builds = buildRepresentativeBuilds(nextPet || {})
        this.selectedBuildKey = pickDefaultBuildKey(nextPet || {}, builds)
        const firstSkill = this.offenseSkills[0]
        this.selectedOffenseSkillKey = firstSkill?.key || ''
        this.selectedOffenseProfileKey = 'standard'
        this.enabledOffensePresetIds = []
      }
    },
    targetPets: {
      deep: true,
      immediate: true,
      handler(nextTargets) {
        const firstTarget = (Array.isArray(nextTargets) ? nextTargets : [])[0]
        this.selectedTargetKey = firstTarget?.key || ''
      }
    },
    selectedTarget: {
      deep: true,
      immediate: true,
      handler(nextTarget) {
        const nextSkills = sortDamageSkills(nextTarget?.skills || [], nextTarget?.attrs || [], repairText(nextTarget?.fullName || nextTarget?.name || ''))
        this.selectedDefenseSkillKey = nextSkills[0]?.key || ''
        this.selectedDefenseProfileKey = 'standard_output'
      }
    },
    defenseSkillMode() {
      const current = this.defenseVisibleSkills[0]
      if (current) this.selectedDefenseSkillKey = current.key
    },
    defenseVisibleSkills(nextSkills) {
      const current = nextSkills[0]
      if (current && !nextSkills.some((skill) => skill.key === this.selectedDefenseSkillKey)) {
        this.selectedDefenseSkillKey = current.key
      }
    }
  },
  methods: {
    presetSourceText(preset) {
      const sourceText = preset.sourceType === 'trait'
        ? '来自特性'
        : preset.sourceType === 'skill'
          ? '来自技能'
          : '自定义条件，不一定来自该精灵自身技能'
      if (preset.sourceType === 'trait') return `${sourceText} · ${preset.conditionText || '可触发'}`.trim()
      return sourceText
    },
    isPresetEnabled(mode, presetId) {
      const list = mode === 'offense' ? this.enabledOffensePresetIds : this.enabledDefensePresetIds
      return Array.isArray(list) && list.includes(presetId)
    },
    togglePreset(mode, presetId) {
      const field = mode === 'offense' ? 'enabledOffensePresetIds' : 'enabledDefensePresetIds'
      const list = Array.isArray(this[field]) ? [...this[field]] : []
      const index = list.indexOf(presetId)
      if (index >= 0) list.splice(index, 1)
      else list.push(presetId)
      this[field] = list
    },
    onTargetChange(event) {
      const index = Number(event?.detail?.value || 0)
      this.selectedTargetKey = this.targetOptions[index]?.key || ''
    },
    onSkillSelect(mode, skill) {
      const field = mode === 'offense' ? 'selectedOffenseSkillKey' : 'selectedDefenseSkillKey'
      this[field] = skill.key
      if (mode === 'defense') this.defenseSkillMode = this.defenseSkillMode || 'common'
    },
    openSkillDetail(skill) {
      this.detailSkill = skill
      this.skillDetailVisible = true
    },
    closeSkillDetail() {
      this.skillDetailVisible = false
      this.detailSkill = null
    },
    computeOffenseResult(baseAttackerPanel, skill, targetPet, defenderPanel, scenario) {
      const activeScenario = scenario || resolveBattleScenario({})
      const attackerPanel = applyScenarioToPanel(baseAttackerPanel, activeScenario, 'attacker')
      const result = calculateDamageFull({
        attackerPanel,
        defenderPanel,
        skillPower: activeScenario.skillPowerOverride ?? Number(skill?.power || 0),
        skillType: skill?.type,
        skillAttr: activeScenario.attrOverride || skill?.attr,
        attackerAttrs: this.pet?.attrs || [],
        defenderAttrs: targetPet?.attrs || [],
        powerBuff: activeScenario.powerBuff ?? 1,
        weatherMod: activeScenario.weatherMod ?? 1,
        defenseReduction: activeScenario.defenseReduction ?? 0,
        atkLevel: activeScenario.atkLevel ?? 0,
        defLevel: activeScenario.defLevel ?? 0,
        hits: activeScenario.hitsOverride ?? skill?.baseHits ?? 1
      })
      const hp = Number(defenderPanel?.hp || 0)
      return { damage: result.damage, hp, percent: hp ? (result.damage / hp) * 100 : 0, diff: result.damage - hp }
    },
    computeDefenseResult(attackerPanelBase, skill, attackerPet, myPanelBase, scenario) {
      const activeScenario = scenario || resolveBattleScenario({})
      const myPanel = applyScenarioToPanel(myPanelBase, activeScenario, 'defender')
      const result = calculateDamageFull({
        attackerPanel: attackerPanelBase,
        defenderPanel: myPanel,
        skillPower: activeScenario.skillPowerOverride ?? Number(skill?.power || 0),
        skillType: skill?.type,
        skillAttr: activeScenario.attrOverride || skill?.attr,
        attackerAttrs: attackerPet?.attrs || [],
        defenderAttrs: this.pet?.attrs || [],
        powerBuff: activeScenario.powerBuff ?? 1,
        weatherMod: activeScenario.weatherMod ?? 1,
        defenseReduction: activeScenario.defenseReduction ?? 0,
        atkLevel: activeScenario.atkLevel ?? 0,
        defLevel: activeScenario.defLevel ?? 0,
        hits: activeScenario.hitsOverride ?? skill?.baseHits ?? 1
      })
      const hp = Number(myPanel?.hp || 0)
      return { damage: result.damage, hp, percent: hp ? (result.damage / hp) * 100 : 0, diff: hp - result.damage }
    },
    formatValue(value) {
      return Math.round(Number(value || 0))
    }
  }
}
</script>

<style scoped>
.pvp-panel { display: flex; flex-direction: column; gap: 20rpx; }
.hero-card, .section-card, .profile-card, .skill-card, .preset-card, .manual-card, .result-card, .recommend-card { padding: 24rpx; border-radius: 24rpx; background: #fffdf7; border: 1rpx solid #f0e4d1; }
.hero-title, .section-title, .sub-title, .preset-title, .result-title, .recommend-card-title, .detail-title { display: block; color: #32281d; }
.hero-title { font-size: 30rpx; font-weight: 700; }
.section-title, .sub-title, .preset-title, .result-title, .recommend-card-title, .detail-title { font-size: 28rpx; font-weight: 600; }
.hero-meta, .hero-note, .note-text, .preset-note, .sub-note, .empty-tip, .result-hint, .recommend-line, .detail-line { display: block; margin-top: 10rpx; font-size: 22rpx; line-height: 1.6; color: #7f715b; }
.hero-note { color: #a36a37; }
.tab-row, .build-chip-row, .profile-chip-row, .tag-row { margin-top: 18rpx; display: flex; flex-wrap: wrap; gap: 10rpx; }
.tab-chip, .build-chip, .profile-chip, .tag-chip, .skill-detail-btn { min-height: 56rpx; padding: 10rpx 18rpx; border-radius: 999rpx; background: #f7ebda; color: #7b5c39; display: inline-flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; border: 1rpx solid transparent; box-sizing: border-box; }
.tab-chip.active, .build-chip.active, .profile-chip.active, .preset-row.active, .skill-item.active { background: #fff1de; border-color: #ef9a5a; }
.panel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin-top: 18rpx; }
.panel-item { padding: 16rpx; border-radius: 18rpx; background: #f8f2e7; }
.panel-label { display: block; font-size: 20rpx; color: #7b6f5a; }
.panel-value { display: block; margin-top: 8rpx; font-size: 30rpx; font-weight: 600; color: #2f2a23; }
.picker-stack { margin-top: 16rpx; display: grid; gap: 12rpx; }
.picker-box { min-height: 76rpx; border-radius: 18rpx; background: #f8f2e7; padding: 0 18rpx; display: flex; align-items: center; justify-content: space-between; font-size: 22rpx; color: #334155; }
.skill-list, .preset-list, .recommend-stack, .result-list { display: flex; flex-direction: column; gap: 14rpx; margin-top: 14rpx; }
.skill-item, .preset-row, .result-item { padding: 18rpx; border-radius: 18rpx; background: #f8f2e7; border: 1rpx solid transparent; }
.skill-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 12rpx; }
.skill-main { flex: 1; min-width: 0; }
.skill-head { display: flex; flex-direction: column; gap: 6rpx; }
.skill-name { font-size: 26rpx; font-weight: 700; color: #2f2a23; }
.skill-meta-line, .skill-summary, .preset-row-meta, .preset-row-note { display: block; font-size: 22rpx; line-height: 1.55; color: #705f49; }
.skill-summary { margin-top: 8rpx; }
.skill-actions { flex-shrink: 0; }
.skill-detail-btn { min-height: 48rpx; padding: 0 16rpx; font-size: 20rpx; background: #fff; border-color: #ef9a5a; }
.preset-row { display: flex; flex-direction: column; gap: 6rpx; }
.preset-row-main { display: flex; flex-direction: column; gap: 4rpx; }
.preset-row-name { font-size: 24rpx; font-weight: 700; color: #2f2a23; }
.preset-row-note { color: #8a785f; }
.manual-grid { margin-top: 16rpx; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12rpx; }
.manual-item { padding: 14rpx; border-radius: 18rpx; background: #f8f2e7; }
.manual-label { display: block; font-size: 20rpx; color: #7b6f5a; }
.manual-input { margin-top: 10rpx; height: 64rpx; border-radius: 14rpx; background: #fff; padding: 0 16rpx; font-size: 24rpx; color: #14213d; }
.result-card { margin-top: 16rpx; }
.result-item-head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.result-item-title { font-size: 24rpx; font-weight: 700; color: #2f2a23; }
.recommend-card { margin-top: 16rpx; }
.recommend-line.note { color: #5f4a31; }
.detail-mask { position: fixed; inset: 0; z-index: 1000; background: rgba(18, 24, 40, 0.56); display: flex; align-items: center; justify-content: center; padding: 32rpx; box-sizing: border-box; }
.detail-card { width: 100%; max-width: 640rpx; max-height: 80vh; overflow-y: auto; background: #fffdf7; border-radius: 28rpx; border: 1rpx solid #f0e4d1; padding: 28rpx; box-sizing: border-box; }
.detail-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.detail-close { width: 52rpx; height: 52rpx; border-radius: 999rpx; background: #f7ebda; color: #7b5c39; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 700; flex-shrink: 0; }
</style>
