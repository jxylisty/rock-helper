import { PVP_RULES } from '../config/pvpRuleConfig.js'
import { canActBeforeEnemy, normalizeBattleSkill, repairText } from './pvpDamageEngine.js'

function uniqBy(items, getKey) {
  const seen = new Set()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function emptyEffects() {
  return {
    powerBuff: null,
    atkBuff: null,
    matkBuff: null,
    defBuff: null,
    mdefBuff: null,
    speedBuff: null,
    speedFlat: null,
    defenseReduction: null,
    hits: null,
    hitsOverride: null,
    weatherMod: null,
    skillPowerOverride: null,
    attrOverride: null
  }
}

function createPreset(payload) {
  return {
    ...payload,
    effects: {
      ...emptyEffects(),
      ...(payload.effects || {})
    }
  }
}

function buildSkillText(skill = {}) {
  return `${repairText(skill?.name || '')} ${repairText(skill?.describe || '')}`.trim()
}

function hasPattern(text = '', patterns = []) {
  const source = repairText(text || '')
  return patterns.some((pattern) => pattern.test(source))
}

function extractCurrentSkill(skill = {}) {
  return normalizeBattleSkill(skill)
}

function buildSkillPresetStatus(preset, matchup = null) {
  if (!preset?.canAutoEvaluate || !matchup) return preset.conditionText || ''
  const result = canActBeforeEnemy(matchup)
  if (result.result === true) {
    if (result.reason.includes('先制值更高')) return '按先制判断，可先于敌方，条件可触发。'
    if (result.reason.includes('速度更高')) return '双方先制相同，按速度判断可先于敌方，条件可触发。'
    return '按当前配置可先于敌方，条件可触发。'
  }
  if (result.result === false) {
    if (result.reason.includes('先制值更高')) return '敌方先制更高，通常无法触发。'
    if (result.reason.includes('速度更高')) return '双方先制相同，但当前速度低于敌方，通常无法触发。'
    return '当前配置通常不易触发。'
  }
  return '速度相同，先后手不确定。'
}

function parseSkillPresets(skills = []) {
  const list = Array.isArray(skills) ? skills : []
  const presets = []

  list.forEach((skill) => {
    const name = repairText(skill?.name || '')
    const text = buildSkillText(skill)

    if (hasPattern(text, [/力量增效/, /自己获得物攻\+100%/])) {
      presets.push(createPreset({
        id: 'skill_atk_100',
        name: '力量增效：物攻 +100%',
        sourceType: 'skill',
        sourceName: '力量增效',
        effects: { atkBuff: 100 },
        defaultEnabled: false,
        conditionText: '需要先使用力量增效'
      }))
    }

    if (hasPattern(text, [/魔法增效/, /自己获得魔攻\+70%/])) {
      presets.push(createPreset({
        id: 'skill_matk_70',
        name: '魔法增效：魔攻 +70%',
        sourceType: 'skill',
        sourceName: '魔法增效',
        effects: { matkBuff: 70 },
        defaultEnabled: false,
        conditionText: '需要先使用魔法增效'
      }))
    }

    if (hasPattern(text, [/啮合传递/, /速度\+80/])) {
      presets.push(createPreset({
        id: 'skill_speed_80',
        name: '啮合传递：速度 +80',
        sourceType: 'skill',
        sourceName: '啮合传递',
        effects: { speedFlat: 80 },
        defaultEnabled: false,
        conditionText: '需要先使用啮合传递'
      }))
    }

    if (hasPattern(text, [/啮合传递/, /物攻\+60%/])) {
      presets.push(createPreset({
        id: 'skill_atk_60',
        name: '啮合传递：物攻 +60%',
        sourceType: 'skill',
        sourceName: '啮合传递',
        effects: { atkBuff: 60 },
        defaultEnabled: false,
        conditionText: '需要先使用啮合传递'
      }))
    }

    const reductionMatches = text.match(/减伤\s*(50|60|70|80|90|100)%/g) || []
    reductionMatches.forEach((match) => {
      const percent = Number((match.match(/(\d+)/) || [0, 0])[1] || 0)
      if (!percent) return
      presets.push(createPreset({
        id: `skill_reduction_${percent}`,
        name: `防御技能：减伤 ${percent}%`,
        sourceType: 'skill',
        sourceName: name || '防御',
        effects: { defenseReduction: percent / 100 },
        defaultEnabled: false,
        conditionText: '需要处于应对攻击或防御技能生效状态'
      }))
    })
  })

  return uniqBy(presets, (item) => item.id)
}

function parseTraitPresets(traitText = '', matchup = null) {
  const text = repairText(traitText || '')
  if (!text) return []

  const presets = []
  const powerMatch = text.match(/若先于敌方攻击.*?威力\+(\d+)%/)
    || text.match(/若先于敌方.*?本次技能威力\+(\d+)%/)
    || text.match(/若先手攻击.*?本次技能威力\+(\d+)%/)

  if (powerMatch) {
    const percent = Number(powerMatch[1] || 0)
    const basePreset = createPreset({
      id: 'trait_act_before_power_buff',
      name: `先于敌方时威力 +${percent}%`,
      sourceType: 'trait',
      sourceName: '特性',
      conditionType: 'acts_before_enemy',
      effects: {
        powerBuff: 1 + percent / 100
      },
      defaultEnabled: false,
      canAutoEvaluate: true,
      conditionText: '需要本次行动先于敌方',
      evidence: text
    })
    basePreset.conditionText = buildSkillPresetStatus(basePreset, matchup) || basePreset.conditionText
    presets.push(basePreset)
  }

  return uniqBy(presets, (item) => item.id)
}

function parseCurrentPetPresets(pet = {}, selectedSkill = null, mode = 'offense', matchup = null) {
  const skills = Array.isArray(pet?.skills) ? pet.skills : []
  const selectedSkillName = repairText(selectedSkill?.name || '')
  const normalizedSelectedSkill = selectedSkill ? extractCurrentSkill(selectedSkill) : null
  const skillPresets = parseSkillPresets(skills)
  const traitPresets = parseTraitPresets(pet?.trait || '', matchup)

  const offensePresets = uniqBy(
    [
      ...skillPresets.filter((item) => item.effects.atkBuff !== null || item.effects.matkBuff !== null || item.effects.powerBuff !== null),
      ...traitPresets
    ],
    (item) => item.id
  )

  const defensePresets = uniqBy(
    skillPresets.filter((item) => item.effects.defenseReduction !== null),
    (item) => item.id
  )

  const speedPresets = uniqBy(
    skillPresets.filter((item) => item.effects.speedFlat !== null || item.effects.speedBuff !== null),
    (item) => item.id
  )

  const customPresets = [
    createPreset({
      id: `manual_custom_${mode}_${selectedSkillName || 'none'}`,
      name: '自定义条件',
      sourceType: 'manual',
      sourceName: '用户自定义',
      defaultEnabled: false,
      conditionText: '自定义条件不一定来自该精灵自身技能，仅用于手动测试。',
      effects: {}
    })
  ]

  return {
    offensePresets,
    defensePresets,
    speedPresets,
    customPresets,
    selectedSkillName,
    selectedSkill: normalizedSelectedSkill,
    traitText: String(pet?.trait || '')
  }
}

export function buildAvailableScenarioPresets(pet, selectedSkill = null, mode = 'offense', matchup = null) {
  const bundle = parseCurrentPetPresets(pet, selectedSkill, mode, matchup)
  return {
    offensePresets: bundle.offensePresets,
    defensePresets: bundle.defensePresets,
    speedPresets: bundle.speedPresets,
    customPresets: bundle.customPresets,
    selectedSkillName: bundle.selectedSkillName,
    selectedSkill: bundle.selectedSkill,
    traitText: bundle.traitText
  }
}

export function resolveBattleScenario({ baseScenario = PVP_RULES.defaultScenario, enabledPresets = [], manualScenario = {} }) {
  const scenario = {
    ...PVP_RULES.defaultScenario,
    ...baseScenario,
    atkBuff: 0,
    matkBuff: 0,
    defBuff: 0,
    mdefBuff: 0,
    speedBuff: 0,
    speedFlat: 0,
    skillPowerOverride: null,
    attrOverride: null,
    hitsOverride: null,
    enabledSources: []
  }

  ;(Array.isArray(enabledPresets) ? enabledPresets : []).forEach((preset) => {
    const effects = preset.effects || {}
    ;['atkBuff', 'matkBuff', 'defBuff', 'mdefBuff', 'speedBuff', 'speedFlat'].forEach((field) => {
      if (effects[field] !== null && effects[field] !== undefined) {
        scenario[field] += Number(effects[field] || 0)
      }
    })

    ;['powerBuff', 'weatherMod', 'defenseReduction', 'hits', 'hitsOverride', 'skillPowerOverride', 'attrOverride'].forEach((field) => {
      if (effects[field] !== null && effects[field] !== undefined) {
        scenario[field] = effects[field]
      }
    })

    scenario.enabledSources.push({
      sourceType: preset.sourceType,
      sourceName: preset.sourceName,
      effect: preset.name
    })
  })

  Object.entries(manualScenario || {}).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return
    const parsed = Number(value)
    scenario[key] = Number.isFinite(parsed) ? parsed : value
  })

  if (Object.values(manualScenario || {}).some((value) => value !== '' && value !== null && value !== undefined)) {
    scenario.enabledSources.push({
      sourceType: 'manual',
      sourceName: '用户自定义',
      effect: '手动场景参数'
    })
  }

  return scenario
}

export default {
  buildAvailableScenarioPresets,
  resolveBattleScenario
}
