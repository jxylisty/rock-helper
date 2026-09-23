/**
 * 阵容速览分析（深度对齐"普通玩家够用、硬核觉得还可以"）
 *
 * 维度口径（按游戏内实际信息校准）：
 * - 速度给【区间】而非单值：对齐游戏"点头像看速度范围"——
 *   min = 速个体0 + 减速性格，max = 速个体10 + 全速性格；区间重叠时先手不确定
 * - 角色画像用可解释启发式标签：强化/吸血→输出核，减伤/回复→联防，先手→控制，回能→辅助
 * - 首发建议：社区共识"前排高耐久试探承伤、主力放末位"——非核心中耐久最高者
 * - 愿力是【血脉上下文参考】：首领血脉/特殊血脉构筑可能不带愿力，标注而非断言
 */
import { calculatePanelValue, normalizeBattleSkill } from './pvpDamageEngine.js'
import { analyzeWishOptions } from './wishPowerAdvisor.js'
import { skillsData } from '../data/skill/skills.js'

const DEFAULT_LEVEL = 60
const DEFAULT_STAR = 5

/** 面板速区间：min = 速0+减速性格，max = 速10+加速性格 */
function speedRange(slot) {
  const race = slot?.race || {}
  const level = Number(slot.level) || DEFAULT_LEVEL
  const star = Number(slot.star ?? DEFAULT_STAR)
  const ivInput = Number(slot.ivs?.speed) || 0
  const base = { race, level, star }
  const max = calculatePanelValue({
    raceValue: race.speed, inputIv: Math.max(ivInput, 10), level, star,
    attrKey: 'speed', natureUp: '速度', natureDown: '无'
  })
  const min = calculatePanelValue({
    raceValue: race.speed, inputIv: Math.min(ivInput, 0), level, star,
    attrKey: 'speed', natureUp: '无', natureDown: '速度'
  })
  void base
  return { min: Math.round(min), max: Math.round(max) }
}

/** 技能机制标签（经完整技能库查描述后解析） */
function skillTags(slot) {
  const tags = new Set()
  for (const name of slot?.skills || []) {
    const full = skillsData[name]
    if (!full) continue
    const normalized = normalizeBattleSkill({ ...full, name })
    normalized.mechanicTags.forEach((tag) => tags.add(tag))
  }
  return tags
}

/** 角色画像（可解释启发式） */
function roleOf(slot, tags) {
  const race = slot?.race || {}
  const attack = Math.max(Number(race.attack) || 0, Number(race.mattack) || 0)
  const defense = Math.max(Number(race.defense) || 0, Number(race.mdefense) || 0)
  const roles = []
  let coreScore = attack

  if (tags.has('强化') || tags.has('吸血')) {
    roles.push('输出核')
    coreScore += 40
  }
  if (tags.has('减伤') || /回复.*生命|吸血/.test((slot?.skills || []).map((n) => skillsData[n]?.describe || '').join(''))) {
    roles.push('联防')
  }
  if (tags.has('先手')) roles.push('先手')
  if (tags.has('传动') || /回复\d+能量|自己回复\d+能量/.test((slot?.skills || []).map((n) => skillsData[n]?.describe || '').join(''))) {
    roles.push('回能辅助')
  }
  if (!roles.length) {
    roles.push(defense >= attack ? '联防' : '输出')
  }
  return { roles, coreScore }
}

/**
 * 构建阵容速览
 * @param {Array} slots 阵容编辑页的槽位（需 race/ivs/level/star/skills/types）
 */
export function buildTeamInsights(slots = []) {
  const filled = slots.filter((slot) => slot && slot.petId && slot.race)
  if (!filled.length) return null

  const members = filled.map((slot) => {
    const tags = skillTags(slot)
    const { roles, coreScore } = roleOf(slot, tags)
    const wishOptions = analyzeWishOptions({ types: slot.types || [] })
    return {
      name: slot.petName || '',
      seq: slot.petId,
      roles,
      coreScore,
      speed: speedRange(slot),
      wish: wishOptions[0] || null,
      wishAlt: wishOptions[1] || null,
      bloodline: slot.bloodline || ''
    }
  })

  // 输出核：核心分最高者
  const core = members.reduce((best, m) => (m.coreScore > best.coreScore ? m : best), members[0])
  const coreSet = new Set([core])
  if (core.coreScore === members[0].coreScore && members.length > 1 && members[1].coreScore === core.coreScore) {
    coreSet.add(members[1]) // 双核并列
  }

  // 首发建议：非核心中"耐久"最高（双防均值），试探承伤位
  const defenders = members.filter((m) => !coreSet.has(m))
  const starter = defenders.length
    ? defenders.reduce((best, m) => {
        const d = (m.speed.min + m.speed.max) / 2
        return d > (best?._d || -1) ? { ...m, _d: d } : best
      }, null)
    : null

  // 速度轴：全体区间合并范围
  const allSpeeds = members.flatMap((m) => [m.speed.min, m.speed.max])
  const axis = { min: Math.min(...allSpeeds), max: Math.max(...allSpeeds) }

  const topAttrs = members.map((m) => (m.wish ? m.wish.attr : ''))
  const wishUniform = topAttrs.length > 1 && topAttrs.every((a) => a === topAttrs[0])

  return {
    members: members.map((m) => ({
      ...m,
      isCore: coreSet.has(m),
      isStarter: starter ? m.name === starter.name && m.seq === starter.seq : false,
      wishNote: m.bloodline && m.bloodline.includes('首领')
        ? '首领血脉：视构筑可不带愿力'
        : (m.wish && m.wish.reasons[0] ? m.wish.reasons[0] : '参考：按属性选愿力')
    })),
    wishUniform,
    wishUniformNote: wishUniform
      ? `全队弱点同源，愿力同向（${topAttrs[0]}）属正常；追求差异化可看各只备选`
      : '',
    axis
  }
}

export default { buildTeamInsights }
