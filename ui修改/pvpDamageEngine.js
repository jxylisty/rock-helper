import { PVP_RULES } from '../config/pvpRuleConfig.js'

const TYPE_EFFECT_CHART = {
  普通: { strong: [], resist: ['岩', '钢', '机械'] },
  草: { strong: ['水', '光', '土'], resist: ['火', '龙', '毒', '虫', '飞', '机械'] },
  火: { strong: ['草', '冰', '虫', '机械'], resist: ['水', '土', '龙'] },
  水: { strong: ['火', '土', '机械'], resist: ['草', '电', '龙'] },
  光: { strong: ['暗', '恶'], resist: ['草', '冰'] },
  土: { strong: ['火', '冰', '电', '毒'], resist: ['草', '武'] },
  冰: { strong: ['草', '土', '龙', '飞'], resist: ['火', '冰', '机械'] },
  龙: { strong: ['龙'], resist: ['机械'] },
  电: { strong: ['水', '飞'], resist: ['草', '土', '龙', '电'] },
  毒: { strong: ['草', '萌'], resist: ['土', '毒', '光', '机械'] },
  虫: { strong: ['草', '暗', '光'], resist: ['火', '毒', '武', '飞', '萌', '机械'] },
  武: { strong: ['普通', '土', '冰', '暗', '机械'], resist: ['毒', '虫', '飞', '萌'] },
  飞: { strong: ['草', '虫', '武'], resist: ['土', '龙', '电', '机械'] },
  萌: { strong: ['毒', '虫', '武'], resist: ['飞', '萌', '暗'] },
  暗: { strong: ['虫', '萌'], resist: ['毒', '武', '虫', '暗'] },
  机械: { strong: ['冰', '光', '萌'], resist: ['草', '火', '电', '飞', '暗'] }
}

const ATTR_ALIAS_MAP = {
  普通: '普通',
  火: '火',
  火系: '火',
  水: '水',
  水系: '水',
  草: '草',
  草系: '草',
  电: '电',
  电系: '电',
  冰: '冰',
  冰系: '冰',
  土: '土',
  土系: '土',
  武: '武',
  武系: '武',
  飞: '飞',
  飞系: '飞',
  毒: '毒',
  毒系: '毒',
  虫: '虫',
  虫系: '虫',
  龙: '龙',
  龙系: '龙',
  萌: '萌',
  萌系: '萌',
  暗: '暗',
  暗系: '暗',
  光: '光',
  光系: '光',
  机械: '机械',
  机械系: '机械',
  格斗: '武',
  幽灵: '暗'
}

const DAMAGE_SKILL_TYPES = ['物攻', '魔攻']
const PANEL_BUFF_KEY_MAP = {
  attack: ['atkBuff', 'attackBuff'],
  mattack: ['matkBuff', 'mattackBuff'],
  defense: ['defBuff', 'defenseBuff'],
  mdefense: ['mdefBuff', 'mdefenseBuff'],
  speed: ['speedBuff'],
  hp: ['hpBuff']
}

function countChineseChars(text = '') {
  const matches = String(text).match(/[\u4e00-\u9fff]/g)
  return matches ? matches.length : 0
}

export function repairText(value = '') {
  const source = String(value ?? '')
  if (!source) return ''
  if (countChineseChars(source) > 0) return source
  if (typeof TextDecoder === 'undefined') return source

  try {
    const bytes = new Uint8Array(Array.from(source).map((char) => char.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder('utf-8').decode(bytes)
    return countChineseChars(decoded) >= countChineseChars(source) ? decoded : source
  } catch (error) {
    return source
  }
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseLooseNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = repairText(value ?? '').trim()
  if (!text) return fallback
  const match = text.match(/-?\d+(?:\.\d+)?/)
  if (match) {
    const parsed = Number(match[0])
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return toNumber(text, fallback)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getPercentBuffMultiplier(attrKey, buffs = {}) {
  const keys = PANEL_BUFF_KEY_MAP[attrKey] || []
  const buffPercent = keys.reduce((total, key) => total + toNumber(buffs?.[key], 0), 0)
  return 1 + buffPercent / 100
}

export function normalizeAttr(attr) {
  const text = repairText(attr).trim()
  if (!text) return ''
  if (ATTR_ALIAS_MAP[text]) return ATTR_ALIAS_MAP[text]
  const plain = text.replace(/系$/, '')
  return ATTR_ALIAS_MAP[plain] || plain
}

export function normalizeAttrList(attrs = []) {
  const list = Array.isArray(attrs) ? attrs : [attrs]
  return Array.from(new Set(list.map((item) => normalizeAttr(item)).filter(Boolean)))
}

export function calculatePanelValue({
  raceValue,
  inputIv,
  level = PVP_RULES.level,
  star = PVP_RULES.star,
  attrKey,
  natureUp = null,
  natureDown = null,
  buffs = {}
}) {
  const actualIv = toNumber(inputIv, 0) * (toNumber(star, 0) + 1)
  const race = toNumber(raceValue, 0)
  const baseValue = race * 0.5 + actualIv * 0.25 + 10
  const growth = attrKey === 'hp'
    ? (race + actualIv * 0.5) * 0.02 + 1
    : (race + actualIv * 0.5) * 0.01

  let panel = baseValue + toNumber(level, 0) * growth

  if (natureUp && natureUp === attrKey) panel *= PVP_RULES.nature.up
  if (natureDown && natureDown === attrKey) panel *= PVP_RULES.nature.down

  if (attrKey === 'hp') panel += toNumber(star, 0) * 20
  else panel += toNumber(star, 0) * 10

  panel *= getPercentBuffMultiplier(attrKey, buffs)
  if (attrKey === 'speed') panel += toNumber(buffs?.speedFlat, 0)
  return panel
}

export function calculateAllPanels({
  race = {},
  ivs = {},
  level = PVP_RULES.level,
  star = PVP_RULES.star,
  natureUp = null,
  natureDown = null,
  buffs = {}
}) {
  return {
    hp: calculatePanelValue({ raceValue: race.hp, inputIv: ivs.hp, level, star, attrKey: 'hp', natureUp, natureDown, buffs }),
    attack: calculatePanelValue({ raceValue: race.attack, inputIv: ivs.attack, level, star, attrKey: 'attack', natureUp, natureDown, buffs }),
    mattack: calculatePanelValue({ raceValue: race.mattack, inputIv: ivs.mattack, level, star, attrKey: 'mattack', natureUp, natureDown, buffs }),
    defense: calculatePanelValue({ raceValue: race.defense, inputIv: ivs.defense, level, star, attrKey: 'defense', natureUp, natureDown, buffs }),
    mdefense: calculatePanelValue({ raceValue: race.mdefense, inputIv: ivs.mdefense, level, star, attrKey: 'mdefense', natureUp, natureDown, buffs }),
    speed: calculatePanelValue({ raceValue: race.speed, inputIv: ivs.speed, level, star, attrKey: 'speed', natureUp, natureDown, buffs })
  }
}

export function getAttrMultiplier(attackAttr, defenderAttrs = []) {
  const attackType = normalizeAttr(attackAttr)
  const defenseTypes = normalizeAttrList(defenderAttrs)
  const effect = TYPE_EFFECT_CHART[attackType]
  if (!effect || !defenseTypes.length) return PVP_RULES.damage.strongAndResist

  let strongCount = 0
  let resistCount = 0
  defenseTypes.forEach((defType) => {
    if (effect.strong.includes(defType)) strongCount += 1
    if (effect.resist.includes(defType)) resistCount += 1
  })

  if (strongCount >= 2) return PVP_RULES.damage.doubleStrong
  if (resistCount >= 2 && strongCount === 0) return PVP_RULES.damage.doubleResist
  if (strongCount === 1 && resistCount === 0) return PVP_RULES.damage.singleStrong
  if (resistCount === 1 && strongCount === 0) return PVP_RULES.damage.singleResist
  return PVP_RULES.damage.strongAndResist
}

export function isDamageSkill(skill = {}) {
  const type = repairText(skill?.type || '').trim()
  return DAMAGE_SKILL_TYPES.includes(type) && toNumber(skill?.power, 0) > 0
}

function parseBaseHits(describe = '') {
  const text = repairText(describe || '')
  const match = text.match(/(?:^|[^\d])([1-6]|10)连击/)
  return match ? Math.max(1, Number(match[1] || 1)) : 1
}

const DYNAMIC_POWER_KEYWORDS = [
  '连击', '连续攻击', '2连击', '3连击', '4连击', '5连击', '6连击', '10连击',
  '威力提升', '威力增加', '威力提高',
  '根据', '基于',
  '速度', '双防', '双攻', '攻击', '防御', '魔攻', '魔防',
  '越高', '越低', '越多',
  '追加', '随机', '随机威力',
  '每次', '永久', '叠加', '递增',
  '生命', 'HP', '血量',
  '条件威力', '条件增伤'
]

export function isDynamicPowerSkill(skill = {}) {
  const describe = repairText(skill?.describe || '')
  const powerText = String(skill?.power || '')
  const name = repairText(skill?.name || '')

  if (DYNAMIC_POWER_KEYWORDS.some((kw) => describe.includes(kw))) {
    return true
  }

  if (/(?:^|[^\d])([2-9]|10)连击/.test(describe)) {
    return true
  }

  if (/(?:先于|若|如果|当).*?威力/.test(describe)) {
    return true
  }

  if (/^\d+技能威力/.test(powerText) && !/^\d+$/.test(powerText.replace('技能威力', ''))) {
    return true
  }

  if (name && /(?:扫尾|撕裂|贯穿|暴击)/.test(name)) {
    return true
  }

  return false
}

function parsePriority(describe = '') {
  const text = repairText(describe || '')
  const directMatch = text.match(/(?:先手|先制)\s*([+-]\d+)/)
  if (directMatch) return Number(directMatch[1] || 0)
  const altMatch = text.match(/(?:先手|先制)\s*(\d+)/)
  return altMatch ? Number(altMatch[1] || 0) : 0
}

function parseConditionalEffects(describe = '') {
  const text = repairText(describe || '')
  const effects = []

  const powerRegex = /(?:若|如果|当).*?(?:先于敌方攻击|先手攻击|先于敌方|先手).*?(?:威力|技能威力)\+(\d+)%/g
  let powerMatch = powerRegex.exec(text)
  while (powerMatch) {
    effects.push({
      type: 'powerBuff',
      conditionType: 'acts_before_enemy',
      value: 1 + Number(powerMatch[1] || 0) / 100,
      text: `先于敌方时威力 +${powerMatch[1]}%`
    })
    powerMatch = powerRegex.exec(text)
  }

  const beforeHitsMatch = text.match(/(?:若|如果|当).*?(?:先于敌方攻击|先手攻击|先于敌方|先手).*?(?:改为|变为|变成)?([1-6]|10)连击/)
  if (beforeHitsMatch) {
    effects.push({
      type: 'hitsOverride',
      conditionType: 'acts_before_enemy',
      value: Number(beforeHitsMatch[1] || 1),
      text: `条件连击：改为 ${beforeHitsMatch[1]} 连击`
    })
  }

  const doubleHitsMatch = text.match(/(?:若|如果|当).*?连击数翻倍/)
  if (doubleHitsMatch) {
    effects.push({
      type: 'hitsMultiplier',
      conditionType: 'state',
      value: 2,
      text: '条件连击：本次技能连击数翻倍'
    })
  }

  const hpDeltaMatch = text.match(/(?:若|如果|当).*?生命低于50%.*?连击数\+(\d+)/)
  if (hpDeltaMatch) {
    effects.push({
      type: 'hitsDelta',
      conditionType: 'hp_below_50',
      value: Number(hpDeltaMatch[1] || 0),
      text: `条件连击：生命低于50%时连击数 +${hpDeltaMatch[1]}`
    })
  }

  return effects
}

export function normalizeBattleSkill(skill = {}) {
  const name = repairText(skill?.name || '')
  const type = repairText(skill?.type || '')
  const attr = repairText(skill?.attr || '')
  const power = parseLooseNumber(skill?.power, 0)
  const consume = parseLooseNumber(skill?.consume, 0)
  const describe = repairText(skill?.describe || '')
  const skillType = repairText(skill?.skillType || skill?.skill_type || skill?.skilltype || '')
  const baseHits = parseBaseHits(describe)
  const priority = parsePriority(describe)
  const isQuick = /迅捷/.test(describe)
  const damageSkill = DAMAGE_SKILL_TYPES.includes(type) && power > 0
  const mechanicTags = []
  const isDynamic = isDynamicPowerSkill(skill)

  if (/连击/.test(describe)) mechanicTags.push('连击')
  if (/(?:先手|先制)\s*[+-]?\d+/.test(describe)) mechanicTags.push('先手')
  if (/迅捷/.test(describe)) mechanicTags.push('迅捷')
  if (/威力\+\d+%/.test(describe)) mechanicTags.push('条件威力')
  if (/连击数|多段/.test(describe)) mechanicTags.push('条件连击')
  if (/脱离/.test(describe)) mechanicTags.push('脱离')
  if (/减伤/.test(describe)) mechanicTags.push('减伤')
  if (/增效|强化|提升|增加/.test(describe)) mechanicTags.push('强化')
  if (/吸血|回复.*生命/.test(describe)) mechanicTags.push('吸血')
  if (/应对/.test(describe)) mechanicTags.push('应对')
  if (/传动|啮合传递/.test(describe)) mechanicTags.push('传动')

  return {
    name,
    type,
    attr,
    power,
    consume,
    describe,
    skillType,
    baseHits,
    priority,
    isQuick,
    isDynamic,
    isDamageSkill: damageSkill,
    mechanicTags: Array.from(new Set(mechanicTags)),
    conditionalEffects: parseConditionalEffects(describe)
  }
}

export function canActBeforeEnemy({
  myPanel = {},
  enemyPanel = {},
  selectedSkill = {},
  enemySelectedSkill = {}
}) {
  const myPriority = toNumber(selectedSkill?.priority, 0)
  const enemyPriority = toNumber(enemySelectedSkill?.priority, 0)
  const mySpeed = toNumber(myPanel?.speed, 0)
  const enemySpeed = toNumber(enemyPanel?.speed, 0)

  if (myPriority > enemyPriority) {
    return {
      result: true,
      reason: '我方技能先制值更高',
      compare: { myPriority, enemyPriority, mySpeed, enemySpeed }
    }
  }

  if (myPriority < enemyPriority) {
    return {
      result: false,
      reason: '敌方技能先制值更高',
      compare: { myPriority, enemyPriority, mySpeed, enemySpeed }
    }
  }

  if (mySpeed > enemySpeed) {
    return {
      result: true,
      reason: '双方先制相同，我方速度更高',
      compare: { myPriority, enemyPriority, mySpeed, enemySpeed }
    }
  }

  if (mySpeed < enemySpeed) {
    return {
      result: false,
      reason: '双方先制相同，敌方速度更高',
      compare: { myPriority, enemyPriority, mySpeed, enemySpeed }
    }
  }

  return {
    result: 'tie',
    reason: '双方先制和速度相同，先后手不确定',
    compare: { myPriority, enemyPriority, mySpeed, enemySpeed }
  }
}

export function calculateDamageFull({
  attackerPanel = {},
  defenderPanel = {},
  skillPower = 0,
  skillType = '',
  skillAttr = '',
  attackerAttrs = [],
  defenderAttrs = [],
  powerBuff = PVP_RULES.defaultScenario.powerBuff,
  weatherMod = PVP_RULES.defaultScenario.weatherMod,
  defenseReduction = PVP_RULES.defaultScenario.defenseReduction,
  atkLevel = PVP_RULES.defaultScenario.atkLevel,
  defLevel = PVP_RULES.defaultScenario.defLevel,
  hits = PVP_RULES.defaultScenario.hits
}) {
  const normalizedSkillType = repairText(skillType).trim()
  const isPhysical = normalizedSkillType === '物攻'
  const atkUsed = isPhysical ? toNumber(attackerPanel.attack, 1) : toNumber(attackerPanel.mattack, 1)
  const rawDefense = isPhysical ? toNumber(defenderPanel.defense, 1) : toNumber(defenderPanel.mdefense, 1)
  const defUsed = Math.max(1, rawDefense)
  const normalizedSkillAttr = normalizeAttr(skillAttr)
  const normalizedAttackerAttrs = normalizeAttrList(attackerAttrs)
  const normalizedDefenderAttrs = normalizeAttrList(defenderAttrs)
  const sameTypeBonus = normalizedAttackerAttrs.includes(normalizedSkillAttr) ? PVP_RULES.damage.sameTypeBonus : 1
  const attrMultiplier = getAttrMultiplier(normalizedSkillAttr, normalizedDefenderAttrs)
  const levelMod = 1.0 * (1 + toNumber(atkLevel, 0) / 10.0) * (1 + toNumber(defLevel, 0) / 10.0)
  const hitCount = Math.max(1, toNumber(hits, 1))
  const reductionMultiplier = 1 - clamp(toNumber(defenseReduction, 0), 0, 1)

  const damage = Math.max(
    1,
    (atkUsed / defUsed) * 0.9 * toNumber(skillPower, 0) * toNumber(powerBuff, 1)
      * sameTypeBonus * attrMultiplier * levelMod * toNumber(weatherMod, 1)
  ) * hitCount * reductionMultiplier

  return {
    damage,
    atkUsed,
    defUsed,
    sameTypeBonus,
    attrMultiplier,
    hits: hitCount,
    formulaParts: {
      attackRatio: atkUsed / defUsed,
      baseConstant: 0.9,
      skillPower: toNumber(skillPower, 0),
      powerBuff: toNumber(powerBuff, 1),
      sameTypeBonus,
      attrMultiplier,
      levelMod,
      weatherMod: toNumber(weatherMod, 1),
      hits: hitCount,
      defenseReduction: clamp(toNumber(defenseReduction, 0), 0, 1),
      skillType: normalizedSkillType
    }
  }
}

export default {
  repairText,
  normalizeAttr,
  normalizeAttrList,
  normalizeBattleSkill,
  calculatePanelValue,
  calculateAllPanels,
  getAttrMultiplier,
  isDamageSkill,
  canActBeforeEnemy,
  calculateDamageFull
}
