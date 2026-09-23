/**
 * 阵容 vs 热门目标预演（ACDE 扩展·C 方向）
 *
 * 只读复用 pvpDamageEngine 的面板与伤害口径（与 pvp-breakpoint 完全一致，不引入新数值设定）：
 * - 我方成员面板：calculatePetPanel（game_math，与 team-editor 槽位面板同口径）
 * - 目标面板：60级5星、IV 三项10满配（buildSuggestedIvs 规则），性格按输出向固定（固执/保守按物魔择优）
 * - 伤害：calculateDamageFull（威力=成员最高威力攻击技能，自动按本系+克制择优）
 * - 先手判定：速度面板对比（复用引擎速度公式，不考虑速度buff）
 */
import { petDetail } from '../data/pet/pet_detail.js'
import { skillsData } from '../data/skill/skills.js'
import { calculatePanelValue, calculateDamageFull, isDamageSkill, normalizeBattleSkill } from './pvpDamageEngine.js'
import { normalizeAttr, getAttrMultiplier, typeEffectChart } from '../data/config/typeChart.js'
import { inferSkillTags } from '../data/skill/skill_tag_rules.js'
import { normalizeTypeList } from '../data/config/game_math.js'
import { petSkills } from '../data/pet/pet_skills.js'
import metaTargetPetsRaw from '../data/pvp/metaTargetPets.json'

const LEVEL = 60
const STAR = 5

function isPetEntry(x) {
  return x && typeof x === 'object' && !x._meta && x.id != null
}

/** 读取热门目标清单（自动跳过 _meta 元数据块） */
export function getMetaTargetPets() {
  const raw = Array.isArray(metaTargetPetsRaw) ? metaTargetPetsRaw : []
  return raw.filter(isPetEntry)
}

/** 满配目标面板：60级5星、三项10（取对该宠物输出收益最大的三项） */
function buildTargetPanel(race = {}) {
  // 按"对输出/生存贡献"排序取三项满 10：物攻向取 物攻/速度/HP，魔攻向取 魔攻/速度/HP
  const physicalFirst = (Number(race.attack) || 0) >= (Number(race.mattack) || 0)
  const boosted = physicalFirst
    ? { attack: 10, speed: 10, hp: 10 }
    : { mattack: 10, speed: 10, hp: 10 }
  const ivs = { hp: 0, attack: 0, mattack: 0, defense: 0, mdefense: 0, speed: 0, ...boosted }
  const natureUp = physicalFirst ? '物攻' : '魔攻'
  const natureDown = '无'
  const calc = (attrKey) => calculatePanelValue({
    raceValue: race[attrKey],
    inputIv: ivs[attrKey],
    level: LEVEL,
    star: STAR,
    attrKey,
    natureUp,
    natureDown
  })
  return {
    hp: calc('hp'),
    attack: calc('attack'),
    mattack: calc('mattack'),
    defense: calc('defense'),
    mdefense: calc('mdefense'),
    speed: calc('speed')
  }
}

/** 从技能库找成员威力最高的攻击技能（含本系加成后的有效输出） */
function pickBestSkill(attackAttrs = [], memberSkills = [], defenderAttrs = []) {
  const candidates = []
  for (const name of memberSkills || []) {
    const full = skillsData[name]
    if (!full || !isDamageSkill(full)) continue
    const normalized = normalizeBattleSkill({ ...full, name })
    const power = Number(normalized.power) || 0
    if (power <= 0) continue
    const skillAttr = normalizeAttr(normalized.attr)
    const stab = (attackAttrs || []).map(normalizeAttr).includes(skillAttr) ? 1.25 : 1
    const mult = defenderAttrs.length ? getAttrMultiplier(skillAttr, defenderAttrs) : 1
    // 有效威力：威力 × 本系 × 克制（与引擎伤害公式的乘法口径一致）
    candidates.push({
      name,
      skillType: normalized.type,
      skillAttr: normalized.attr,
      power,
      effectivePower: power * stab * mult
    })
  }
  candidates.sort((a, b) => b.effectivePower - a.effectivePower)
  return candidates[0] || null
}

/**
 * 阵容 vs 单个热门目标预演
 * @param {Object} slot team-editor 槽位（petId/race/ivs/level/star/natureUp/natureDown/skills/types）
 * @param {Object} target metaTargetPets 条目
 */
export function previewMemberVsTarget(slot, target) {
  if (!slot?.petId || !target?.id) return null
  const myDetail = petDetail[String(slot.petId)]?.[0] || {}
  const myTypes = normalizeTypeList(slot.types || myDetail.type || [])

  // 我方面板：槽位已算过就用槽位 panel，否则按槽位参数现算（同一公式）
  const panelCalc = (attrKey, raceValue, ivInput, natureUp, natureDown) => calculatePanelValue({
    raceValue,
    inputIv: ivInput,
    level: Number(slot.level) || LEVEL,
    star: Number(slot.star ?? STAR),
    attrKey,
    natureUp: natureUp || '无',
    natureDown: natureDown || '无'
  })
  const ivs = slot.ivs || {}
  const race = slot.race || myDetail.race || {}
  const myPanel = slot.panel && slot.panel.speed != null
    ? slot.panel
    : {
        hp: panelCalc('hp', race.hp, Number(ivs.hp) || 0, slot.natureUp, slot.natureDown),
        attack: panelCalc('attack', race.attack, Number(ivs.attack) || 0, slot.natureUp, slot.natureDown),
        mattack: panelCalc('mattack', race.mattack, Number(ivs.mattack) || 0, slot.natureUp, slot.natureDown),
        defense: panelCalc('defense', race.defense, Number(ivs.defense) || 0, slot.natureUp, slot.natureDown),
        mdefense: panelCalc('mdefense', race.mdefense, Number(ivs.mdefense) || 0, slot.natureUp, slot.natureDown),
        speed: panelCalc('speed', race.speed, Number(ivs.speed) || 0, slot.natureUp, slot.natureDown)
      }

  const targetDetail = petDetail[String(target.id)]?.[0] || {}
  const targetTypes = normalizeTypeList(targetDetail.type || [])
  const targetRace = targetDetail.race || {}
  const targetPanel = buildTargetPanel(targetRace)

    // 我方最优攻击 → 目标承伤
    // 2026-09-16 审查修复：空数组是 truthy，`slot.skills || 回退` 在槽位未配技能时回退失效。
    // 改为长度判断：槽位技能 → 等级技能表（petSkills）双回退。
  const myAttackAttrs = myTypes
  const mySkillNames = (Array.isArray(slot.skills) && slot.skills.length)
    ? slot.skills
    : ((petSkills[String(slot.petId)] || {}).skills || []).map((s) => s.name).filter(Boolean)
  const bestSkill = pickBestSkill(myAttackAttrs, mySkillNames, targetTypes)
  let myDamage = null
  if (bestSkill) {
    const result = calculateDamageFull({
      attackerPanel: myPanel,
      defenderPanel: targetPanel,
      skillPower: bestSkill.power,
      skillType: bestSkill.skillType,
      skillAttr: bestSkill.skillAttr,
      attackerAttrs: myAttackAttrs,
      defenderAttrs: targetTypes
    })
    myDamage = Math.round(result.damage)
  }

  // 目标最优攻击（用其默认输出向面板 + 图鉴技能；图鉴无 skills 字段时回退到 petSkills 等级表）→ 我方承伤
  const targetSkillsFromDetail = (targetDetail.skills || []).map((s) => s.name).filter(Boolean)
  const targetSkills = targetSkillsFromDetail.length
    ? targetSkillsFromDetail
    : (petSkills[String(target.id)] || {}).skills?.map((s) => s.name).filter(Boolean) || []
  const targetBuildPhysical = (targetRace.attack || 0) >= (targetRace.mattack || 0)
  const targetBest = pickBestSkill(targetTypes, targetSkills, myTypes)
  let targetDamage = null
  if (targetBest) {
    const raw = calculateDamageFull({
      attackerPanel: targetPanel,
      defenderPanel: myPanel,
      skillPower: targetBest.power,
      skillType: targetBest.skillType,
      skillAttr: targetBest.skillAttr,
      attackerAttrs: targetTypes,
      defenderAttrs: myTypes
    })
    targetDamage = Math.round(raw.damage)
  }

  // 先手：速度面板直接对比（>5 视为稳先手，±5 内视为胶着）
  const mySpeed = Math.round(myPanel.speed)
  const targetSpeed = Math.round(targetPanel.speed)
  const speedGap = mySpeed - targetSpeed
  const firstStrike = speedGap > 5 ? 'me' : speedGap < -5 ? 'target' : 'tie'

  return {
    targetId: target.id,
    targetName: target.name,
    targetTags: target.targetTags || [],
    targetTypes,
    bestSkillName: bestSkill?.name || '',
    myDamage,
    targetBestSkillName: targetBest?.name || '',
    targetDamage,
    mySpeed,
    targetSpeed,
    firstStrike,
    confidence: target.confidence || ''
  }
}

/**
 * 阵容 vs 全部热门目标批量预演
 * @param {Array} slots 已填充的阵容槽位
 * @returns {{ rows: Array, readyCount: number, total: number, readiness: number }}
 */
export function buildMetaPreview(slots = []) {
  const filled = (slots || []).filter((s) => s && s.petId && (s.race || petDetail[String(s.petId)]?.[0]))
  const targets = getMetaTargetPets().filter((t) => t.asDefender !== false)
  const rows = targets.map((target) => {
    const perMember = filled
      .map((slot) => previewMemberVsTarget(slot, target))
      .filter(Boolean)
    // 我方最佳出手者：伤害最高
    const best = perMember.reduce((acc, cur) => (!acc || (cur.myDamage || 0) > (acc.myDamage || 0) ? cur : acc), null)
    // 我方最脆成员：被目标打得最疼
    const worst = perMember.reduce((acc, cur) => (!acc || (cur.targetDamage || 0) > (acc.targetDamage || 0) ? cur : acc), null)
    const anyFirst = perMember.some((p) => p.firstStrike === 'me')
    // 达标口径（2026-09-16 审查收紧）：先手 + 有伤害 + 伤害能对目标构成实质威胁
    // （≥ 目标满配 HP 的 25%，对位 PVP 常规的 3~4 回合击倒节奏）
    const targetHp = (() => {
      const td = petDetail[String(target.id)]?.[0] || {}
      const race = td.race || {}
      return calculatePanelValue({
        raceValue: race.hp,
        inputIv: 10,
        level: LEVEL,
        star: STAR,
        attrKey: 'hp',
        natureUp: '无',
        natureDown: '无'
      })
    })()
    const damageMeaningful = best && best.myDamage != null && best.myDamage >= targetHp * 0.25
    return {
      target,
      best,
      worst,
      anyFirst,
      targetHp: Math.round(targetHp),
      ready: Boolean(damageMeaningful && anyFirst)
    }
  })
  const readyCount = rows.filter((r) => r.ready).length
  return {
    rows,
    readyCount,
    total: rows.length,
    readiness: rows.length ? Math.round((readyCount / rows.length) * 100) : 0
  }
}

/**
 * 十八系攻防矩阵（A3 方向）
 * 行=18 系来袭属性，列=我方成员；格=该属性打该成员的倍率。
 * 同时输出每行的队伍级结论（被克人数/抵抗人数/最大倍率）。
 */
export function buildTypeMatrix(slots = []) {
  const filled = (slots || []).filter((s) => s && s.petId)
  const allTypes = Object.keys(typeEffectChart)
  const members = filled.map((slot) => ({
    name: slot.petName || '',
    petId: slot.petId,
    types: normalizeTypeList(slot.types || petDetail[String(slot.petId)]?.[0]?.type || [])
  }))
  const rows = allTypes.map((attackType) => {
    const cells = members.map((m) => {
      const multiplier = m.types.length ? getAttrMultiplier(attackType, m.types) : 1
      return {
        petId: m.petId,
        name: m.name,
        multiplier,
        // 语义分类：3=双克制 2=克制 <1=抵抗
        level: multiplier >= 3 ? 'double' : multiplier > 1 ? 'strong' : multiplier < 1 ? 'resist' : 'neutral'
      }
    })
    const threatened = cells.filter((c) => c.multiplier > 1)
    const resisted = cells.filter((c) => c.multiplier < 1)
    return {
      type: attackType,
      cells,
      threatenedCount: threatened.length,
      resistedCount: resisted.length,
      maxMultiplier: threatened.reduce((b, c) => Math.max(b, c.multiplier), 1)
    }
  })
  const dangerRows = rows
    .filter((r) => r.threatenedCount >= Math.ceil(members.length / 2) && members.length >= 2)
    .sort((a, b) => b.maxMultiplier - a.maxMultiplier || b.threatenedCount - a.threatenedCount)
  return { members, rows, dangerRows }
}

/**
 * 控制链 / 回能链 / 双核检测（D2 方向）
 * 基于技能标签（inferSkillTags）+ teamInsights 式输出分画像。
 */
export function buildChainAnalysis(slots = []) {
  const filled = (slots || []).filter((s) => s && s.petId)
  const members = filled.map((slot) => {
    const detail = petDetail[String(slot.petId)]?.[0] || {}
    const slotSkillNames = Array.isArray(slot.skills) && slot.skills.length
      ? slot.skills
      : ((petSkills[String(slot.petId)] || {}).skills || []).map((s) => s.name).filter(Boolean)
    const tags = new Set()
    for (const name of slotSkillNames) {
      const full = skillsData[name]
      if (!full) continue
      normalizeBattleSkill({ ...full, name }).mechanicTags.forEach((t) => tags.add(t))
      inferSkillTags({ ...full, name }).forEach((t) => tags.add(t))
    }
    const race = slot.race || detail.race || {}
    const coreScore = Math.max(Number(race.attack) || 0, Number(race.mattack) || 0)
      + (tags.has('强化') || tags.has('吸血') ? 40 : 0)
    return {
      name: slot.petName || detail.page_title || '',
      petId: slot.petId,
      control: tags.has('控制') || tags.has('异常'),
      energy: tags.has('能量回复') || tags.has('回能'),
      heal: tags.has('回复') || tags.has('吸血'),
      coreScore
    }
  })
  const controlChain = members.filter((m) => m.control)
  const energyChain = members.filter((m) => m.energy)
  const healChain = members.filter((m) => m.heal)
  const sorted = [...members].sort((a, b) => b.coreScore - a.coreScore)
  const dualCore = sorted.length >= 2 && (sorted[0].coreScore - sorted[1].coreScore) < 10
  return {
    members,
    controlChain: controlChain.map((m) => m.name),
    energyChain: energyChain.map((m) => m.name),
    healChain: healChain.map((m) => m.name),
    dualCore,
    hasControl: controlChain.length > 0,
    hasEnergy: energyChain.length > 0,
    hasHeal: healChain.length > 0
  }
}

/**
 * D3 人话化建议：结构诊断 + 链分析 → 带具体精灵建议的 actionable 文案。
 * 建议池从图鉴 uiTag 与 metaTargetPets 高信度名单取，不编造。
 */
export function buildActionableNotes(analysis, mode = 'pvp') {
  if (!analysis) return []
  const notes = []
  const { roleCounts = {}, controlCount = 0, memberAvgSpeed = 0, memberAvgBulk = 0 } = analysis.summary || {}
  const suggest = (names) => names.slice(0, 2).join('、')
  if ((roleCounts['输出'] || 0) === 0) {
    notes.push('全队没有主输出——把攻击种族最高的一只配上满威力攻击技能，或从图鉴引入火神/圣羽翼王级输出核')
  } else if ((roleCounts['输出'] || 0) <= 2 && mode === 'pvp') {
    notes.push(`输出点偏少（${roleCounts['输出']} 只被针对就哑火）——建议补一只副输出位`)
  }
  if (controlCount === 0 && mode === 'pvp') {
    notes.push(`全队无控制手段，先手权易失——建议引入控制位（热门池：绒光优优、雪灵、冰钻布鲁斯）`)
  }
  if ((roleCounts['辅助'] || 0) === 0) {
    notes.push('缺辅助/续航位，久战会崩——建议奇丽花（零耗永动）或翠顶夫人（增益传递）')
  }
  if (memberAvgSpeed > 0 && memberAvgSpeed < 85 && mode === 'pvp') {
    notes.push(`整体速度偏慢（均值 ${memberAvgSpeed}），会被速攻队压先手——给主输出换加速度性格或拉速度个体`)
  }
  if (memberAvgBulk > 0 && memberAvgBulk < 250 && mode !== 'pvp') {
    notes.push(`整体站场偏薄（均值 ${memberAvgBulk}），高难副本站不住——补一只高耐久坦克位（嘟嘟锅/罗隐型）`)
  }
  return notes.slice(0, 4)
}

export default { getMetaTargetPets, previewMemberVsTarget, buildMetaPreview, buildTypeMatrix, buildChainAnalysis, buildActionableNotes }
