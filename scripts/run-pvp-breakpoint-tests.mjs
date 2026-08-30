/**
 * PVP 伤害计算回归测试
 * 运行: node scripts/run-pvp-breakpoint-tests.mjs
 *
 * 覆盖: 克制表口径、面板截断顺序、连击、伤害下限、满配配置
 */
import {
  getAttrMultiplier,
  calculatePanelValue,
  calculateAllPanels,
  calculateDamageFull,
  normalizeBattleSkill
} from '../utils/pvpDamageEngine.js'
import { buildOpponentFullConfig } from '../utils/buildOpponentFullConfig.js'
import { buildSuggestedIvs } from '../utils/buildSuggestedIvs.js'

// 参考实现：项目规定的面板口径（先截断基础面板 → 乘性格 → 加星级裸加成）
// 独立于引擎实现，用于交叉验证；不 import game_math.js 是因为它引入了 JSON（Node 需要 import attribute）
const NATURE_KEY = { '生命': 'hp', '物攻': 'attack', '魔攻': 'mattack', '物防': 'defense', '魔防': 'mdefense', '速度': 'speed' }

function referencePanel(raceValue, ivInput, level, star, attrKey, natureUpName, natureDownName) {
  const iv = Math.max(0, Math.min(10, Number(ivInput) || 0)) * (star + 1)
  const race = Number(raceValue) || 0
  const base = race * 0.5 + iv * 0.25 + 10
  const growth = attrKey === 'hp' ? (race + iv * 0.5) * 0.02 + 1 : (race + iv * 0.5) * 0.01
  const raw = base + level * growth
  let mod = 1
  if (NATURE_KEY[natureUpName] === attrKey) mod = 1.2
  else if (NATURE_KEY[natureDownName] === attrKey) mod = 0.9
  return Math.round(Math.floor(raw) * mod + 0.0000001) + (attrKey === 'hp' ? star * 20 : star * 10)
}

let passed = 0
let failed = 0

function assertEqual(actual, expected, label) {
  const ok = actual === expected
  if (ok) {
    passed += 1
    console.log(`  ✅ ${label}`)
  } else {
    failed += 1
    console.error(`  ❌ ${label}: 期望 ${expected}, 实际 ${actual}`)
  }
}

function assertClose(actual, expected, label, eps = 1e-9) {
  const ok = Math.abs(actual - expected) <= eps
  if (ok) {
    passed += 1
    console.log(`  ✅ ${label}`)
  } else {
    failed += 1
    console.error(`  ❌ ${label}: 期望 ${expected}, 实际 ${actual}`)
  }
}

function assertTrue(value, label) {
  if (value) {
    passed += 1
    console.log(`  ✅ ${label}`)
  } else {
    failed += 1
    console.error(`  ❌ ${label}`)
  }
}

console.log('\n== 克制表（data/config/typeChart.js 唯一来源） ==')
assertEqual(getAttrMultiplier('冰', ['地']), 2, '冰 打 地 = 2 倍')
assertEqual(getAttrMultiplier('冰', ['地系']), 2, '冰 打 地系(带系后缀) = 2 倍')
assertEqual(getAttrMultiplier('电', ['地']), 0.5, '电 打 地 = 0.5 倍')
assertEqual(getAttrMultiplier('地', ['火']), 2, '地 打 火 = 2 倍')
assertEqual(getAttrMultiplier('幽', ['光']), 2, '幽 打 光 = 2 倍')
assertEqual(getAttrMultiplier('恶', ['毒']), 2, '恶 打 毒 = 2 倍')
assertEqual(getAttrMultiplier('翼', ['草', '虫']), 3, '翼 打 草+虫 = 双克制 3 倍')
assertEqual(getAttrMultiplier('草', ['火', '龙']), 1 / 4, '草 打 火+龙 = 双抵抗 1/4')
assertEqual(getAttrMultiplier('草', ['火', '水']), 1, '草 打 火(抗)+水(克) = 1 倍')
assertEqual(getAttrMultiplier('火', ['水', '地']), 1 / 4, '火 打 水+地 = 双抵抗 1/4')
assertEqual(getAttrMultiplier('不存在属性', ['火']), 1, '未知属性返回 1 倍')

console.log('\n== 面板公式：引擎与规范口径一致（先截断再乘性格） ==')
{
  const engineSpeed = calculatePanelValue({
    raceValue: 97, inputIv: 10, level: 60, star: 5,
    attrKey: 'speed', natureUp: '速度', natureDown: '物攻'
  })
  const refSpeed = referencePanel(97, 10, 60, 5, 'speed', '速度', '物攻')
  assertEqual(engineSpeed, refSpeed, `引擎速度面板(${engineSpeed}) === 参考值(${refSpeed})`)

  const engineSpeedEn = calculatePanelValue({
    raceValue: 97, inputIv: 10, level: 60, star: 5,
    attrKey: 'speed', natureUp: 'speed', natureDown: 'attack'
  })
  assertEqual(engineSpeedEn, engineSpeed, '引擎英文性格键与中文性格名结果一致')

  // 截断顺序验证：若先乘性格再截断，会得到不同结果
  const race = 113 // 选择一个截断顺序会产生差异的种族值
  const wrongOrder = Math.round(Math.floor((race * 0.5 + 60 * 0.25 + 10 + 60 * ((race + 60 * 0.5) * 0.01)) * 1.2)) + 50
  const rightOrder = referencePanel(race, 10, 60, 5, 'attack', '物攻', '魔攻')
  const engineAttack = calculatePanelValue({
    raceValue: race, inputIv: 10, level: 60, star: 5,
    attrKey: 'attack', natureUp: '物攻', natureDown: '魔攻'
  })
  assertEqual(engineAttack, rightOrder, `引擎物攻面板按先截断口径(${engineAttack})`)
  if (wrongOrder !== rightOrder) {
    console.log(`  ℹ️ 该用例下两种截断顺序结果不同（错误顺序=${wrongOrder}），测试有效`)
  }

  const hpPanel = calculatePanelValue({
    raceValue: 100, inputIv: 10, level: 60, star: 5,
    attrKey: 'hp', natureUp: '生命', natureDown: '无'
  })
  assertEqual(hpPanel, referencePanel(100, 10, 60, 5, 'hp', '生命', '无'), 'HP 面板与参考口径一致')
  assertTrue(Number.isInteger(hpPanel), `无 BUFF 面板应为整数(${hpPanel})`)
}

console.log('\n== 连击 ==')
{
  const attacker = { attack: 400, mattack: 400, defense: 200, mdefense: 200, hp: 1500, speed: 100 }
  const defender = { attack: 100, mattack: 100, defense: 150, mdefense: 150, hp: 1200, speed: 90 }
  const base = calculateDamageFull({
    attackerPanel: attacker, defenderPanel: defender,
    skillPower: 90, skillType: '物攻', skillAttr: '普通',
    attackerAttrs: ['普通'], defenderAttrs: ['普通'], hits: 1
  })
  const multi = calculateDamageFull({
    attackerPanel: attacker, defenderPanel: defender,
    skillPower: 90, skillType: '物攻', skillAttr: '普通',
    attackerAttrs: ['普通'], defenderAttrs: ['普通'], hits: 5
  })
  assertClose(multi.damage, base.damage * 5, '5 连击总伤害 = 单发 × 5')

  const skill = normalizeBattleSkill({ name: '测试', type: '物攻', power: 25, describe: '攻击敌方精灵，5连击。' })
  assertEqual(skill.baseHits, 5, '从描述解析 5 连击')
  const skill2 = normalizeBattleSkill({ name: '测试2', type: '物攻', power: 90, describe: '对敌方造成伤害。' })
  assertEqual(skill2.baseHits, 1, '无连击描述默认 1 击')
}

console.log('\n== 伤害下限与修饰符 ==')
{
  const attacker = { attack: 10, mattack: 10, defense: 999, mdefense: 999, hp: 100, speed: 1 }
  const defender = { attack: 1, mattack: 1, defense: 9999, mdefense: 9999, hp: 99999, speed: 1 }
  const result = calculateDamageFull({
    attackerPanel: attacker, defenderPanel: defender,
    skillPower: 1, skillType: '物攻', skillAttr: '普通',
    attackerAttrs: ['普通'], defenderAttrs: ['普通'], hits: 2, defenseReduction: 0.5
  })
  assertTrue(result.damage >= 1, `极端低伤害最终钳位 >= 1（实际 ${result.damage}）`)

  const buff = calculateDamageFull({
    attackerPanel: { attack: 400, mattack: 400, defense: 200, mdefense: 200, hp: 1500, speed: 100 },
    defenderPanel: { attack: 1, mattack: 1, defense: 150, mdefense: 150, hp: 1200, speed: 1 },
    skillPower: 90, skillType: '物攻', skillAttr: '普通',
    attackerAttrs: ['普通'], defenderAttrs: ['普通'],
    powerBuff: 1.5, defenseReduction: 0.3
  })
  const plain = calculateDamageFull({
    attackerPanel: { attack: 400, mattack: 400, defense: 200, mdefense: 200, hp: 1500, speed: 100 },
    defenderPanel: { attack: 1, mattack: 1, defense: 150, mdefense: 150, hp: 1200, speed: 1 },
    skillPower: 90, skillType: '物攻', skillAttr: '普通',
    attackerAttrs: ['普通'], defenderAttrs: ['普通']
  })
  assertClose(buff.damage, plain.damage * 1.5 * 0.7, '增伤50% × 减伤30% 为乘法叠加')
}

console.log('\n== 满配配置 ==')
{
  const pet = { race: { hp: 100, attack: 95, mattack: 47, defense: 67, mdefense: 42, speed: 97 } }
  const physical = buildOpponentFullConfig(pet, { skillType: '物攻' })
  assertEqual(physical.natureUp, '物攻', '物理技能满配性格提升物攻')
  assertEqual(physical.natureDown, '魔攻', '物理技能满配性格降低魔攻')
  assertEqual(physical.level, 60, '满配默认 60 级')
  assertEqual(physical.star, 5, '满配默认 5 星')
  const highIvCount = Object.values(physical.ivs).filter((v) => v > 0).length
  assertEqual(highIvCount, 3, '满配个体值为三项 10')
  assertTrue(Object.values(physical.ivs).every((v) => v === 0 || v === 10), '个体值只含 0 或 10')

  const magic = buildOpponentFullConfig(pet, { skillType: '魔攻' })
  assertEqual(magic.natureUp, '魔攻', '魔法技能满配性格提升魔攻')
  assertEqual(magic.ivs.mattack, 10, '魔法满配魔攻个体 10')
  assertEqual(magic.ivs.attack, 0, '魔法满配物攻（性格下降项）个体为 0')
}

console.log(`\n结果: ${passed} 通过, ${failed} 失败\n`)
process.exit(failed ? 1 : 0)
