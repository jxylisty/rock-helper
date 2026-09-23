import { analyzePetRole } from './pet_role_analyzer.js'
import { inferSkillTags } from '../skill/skill_tag_rules.js'
import { getAttrMultiplier, getBestAttackMatchup, getHighestFormPets, isAttackSkill, normalizeAttr, normalizeTypeList, analyzeTeamTypeCoverage } from './game_math.js'
import { petSkills } from '../pet/pet_skills.js'
import { skillsData } from '../skill/skills.js'

// 技能表索引（模块级构建一次，避免每次调用重建）
const petSkillsBySeq = petSkills || {}
const skillsDataByName = skillsData || {}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function scoreSkill(skill) {
  const power = Math.max(0, Number(skill?.power) || 0)
  const consume = Math.max(0, Number(skill?.consume) || 0)
  const tags = inferSkillTags(skill)
  let score = power * 1.2 - consume * 2
  if (tags.includes('先手')) score += 5
  if (tags.includes('连击')) score += 6
  if (tags.includes('减伤')) score += 4
  if (tags.includes('强化')) score += 4
  return { score, tags }
}

export function recommendSkillsForPet(petDetail, mode = 'general') {
  const skills = safeArray(petDetail?.skills)
  const rankedSkills = skills
    .map((skill) => {
      const result = scoreSkill(skill)
      return {
        name: skill?.name || '',
        type: skill?.type || '',
        attr: skill?.attr || '',
        consume: skill?.consume || 0,
        power: skill?.power || 0,
        tags: result.tags,
        score: result.score
      }
    })
    .sort((a, b) => b.score - a.score)

  return {
    mode,
    confidence: rankedSkills.length ? 0.6 : 0.2,
    reasons: rankedSkills.length ? ['按威力和标签做轻量排序'] : ['暂无技能数据'],
    recommendedSkills: rankedSkills.slice(0, 4),
    rankedSkills
  }
}

export function recommendTeamComplements(team, allPets, allPetDetails, mode = 'general') {
  const coverage = analyzeTeamTypeCoverage(safeArray(team))
  const candidates = getHighestFormPets(allPets || [], allPetDetails || [])
    .filter((pet) => !safeArray(team).some((slot) => String(slot?.petId || '') === String(pet.id || '')))
    .slice(0, 8)

  const items = candidates.map((pet) => ({
    petId: pet.id,
    petName: pet.name || '',
    image: pet.img || '',
    types: normalizeTypeList(pet.type || []),
    score: 50,
    confidence: 0.4,
    reasons: [`补充当前队伍缺口：${coverage.missingCoverage.length}`]
  }))

  return {
    mode,
    confidence: 0.4,
    reasons: ['轻量补位建议'],
    items
  }
}

export function recommendTeamReplacements(team, allPets, allPetDetails, mode = 'general') {
  const members = safeArray(team).map((slot, index) => ({
    slotIndex: index,
    petId: slot?.petId || '',
    petName: slot?.petName || '',
    role: analyzePetRole(slot, allPetDetails?.[slot?.petId] || {})
  }))

  const items = members.slice(0, 3).map((member) => ({
    slotIndex: member.slotIndex,
    current: {
      petId: member.petId,
      petName: member.petName,
      role: member.role,
      score: 10,
      confidence: 0.3
    },
    alternatives: []
  }))

  return {
    mode,
    confidence: 0.3,
    reasons: ['轻量替换建议'],
    items
  }
}

export function analyzeTeamDecision(team, allPets, allPetDetails, mode = 'general') {
  const teamSlots = safeArray(team)
  const summary = analyzeTeamTypeCoverage(teamSlots)
  const members = teamSlots.map((slot, index) => {
    const raw = allPetDetails?.[slot?.petId]
    // detail 修正（2026-09-16 审查）：allPetDetails[seq] 实际是变体数组（petDetail 结构），
    // 原代码直接当对象用导致 detail.race 恒 undefined（bulkScore/speedScore 恒 0）。
    // 取首个变体作为该精灵的图鉴详情。
    const detail = Array.isArray(raw) ? (raw[0] || {}) : (raw || {})
    // 技能源修正（2026-09-16 审查）：pet_detail 图鉴条目无 skills 字段，
    // 优先用槽位已配技能（名字数组），否则回退到 petSkills 等级技能表，
    // 再映射到 skillsData 完整技能对象，保证角色/控制判定有真实数据源。
    const slotSkillNames = safeArray(slot?.skills).filter((s) => typeof s === 'string')
    const levelSkillNames = safeArray(petSkillsBySeq?.[String(slot?.petId)]?.skills).map((s) => s.name).filter(Boolean)
    const skillNames = slotSkillNames.length ? slotSkillNames : levelSkillNames
    const skills = skillNames
      .map((name) => (skillsDataByName && skillsDataByName[name] ? { ...skillsDataByName[name], name } : { name }))
    return {
      petId: slot?.petId || '',
      petName: slot?.petName || '',
      slotIndex: index,
      detail: skills.length ? { ...detail, skills } : detail,
      role: analyzePetRole(skills.length ? { ...slot, skills } : slot, skills.length ? { ...detail, skills } : detail),
      attackAttrs: skills.filter(isAttackSkill).map((skill) => normalizeAttr(skill?.attr)),
      bulkScore: Number(detail?.race?.hp || 0) + Number(detail?.race?.defense || 0) + Number(detail?.race?.mdefense || 0),
      speedScore: Number(detail?.race?.speed || 0)
    }
  })

  // ---- 真实聚合（D1 修真：原先恒为空值，导致 team-editor 结构诊断全部不触发）----
  // 角色计数（2026-09-16 审查重构）：坦克/辅助先按画像判定，剩余有攻击技能的才计输出。
  // 原顺序（有攻击技能→输出）导致坦克分支不可达：有攻击技能的坦克全被算进输出。
  const roleCounts = { 输出: 0, 坦克: 0, 控制: 0, 辅助: 0 }
  members.forEach((m) => {
    const role = m.role || {}
    const main = role.mainAttackType
    const attackSkills = safeArray(m.detail?.skills).filter(isAttackSkill)
    const bulk = m.bulkScore
    const speed = m.speedScore
    const maxAtk = Math.max(Number(m.detail?.race?.attack) || 0, Number(m.detail?.race?.mattack) || 0)
    // 坦克画像优先：耐久厚 + 慢速 + 攻击种族平平（攻击远低于耐久线）
    if (bulk >= 300 && speed < 95 && maxAtk <= bulk * 0.42) {
      roleCounts.坦克 += 1
      return
    }
    // 无攻击技能 → 纯辅助
    if (!attackSkills.length) {
      roleCounts.辅助 += 1
      return
    }
    if (main === 'physical' || main === 'magic' || main === 'mixed') {
      roleCounts.输出 += 1
      return
    }
    roleCounts.辅助 += 1
  })
  // 控制位：技能标签含控制/异常的成员单独计数（可与上述角色叠加，只反映“队伍里有没有控制手段”）
  const controlMembers = members.filter((m) =>
    safeArray(m.detail?.skills).some((skill) => {
      const tags = inferSkillTags(skill)
      return tags.includes('控制') || tags.includes('异常')
    })
  )

  const filled = members.filter((m) => m.petId)
  const memberAvgSpeed = filled.length
    ? Math.round(filled.reduce((sum, m) => sum + m.speedScore, 0) / filled.length)
    : 0
  const memberAvgBulk = filled.length
    ? Math.round(filled.reduce((sum, m) => sum + m.bulkScore, 0) / filled.length)
    : 0

  const strengths = []
  const weaknesses = []
  if (filled.length) {
    // 优势面
    if (roleCounts.输出 >= 3) strengths.push(`输出位充足（${roleCounts.输出} 只）`)
    if (controlMembers.length >= 1) strengths.push(`具备控制手段（${controlMembers.length} 只）`)
    if (memberAvgSpeed >= 95) strengths.push(`整体速度优秀（均值 ${memberAvgSpeed}）`)
    if (memberAvgBulk >= 280) strengths.push(`整体耐久扎实（均值 ${memberAvgBulk}）`)
    if (!summary.missingCoverage.length) strengths.push('打击面覆盖完整')
    // 短板面
    if (roleCounts.输出 === 0) weaknesses.push('缺少输出位')
    if (mode === 'pvp' && controlMembers.length === 0) weaknesses.push('全队无控制手段')
    if (memberAvgSpeed < 85) weaknesses.push(`整体速度偏慢（均值 ${memberAvgSpeed}）`)
    if (memberAvgBulk < 250) weaknesses.push(`整体站场偏薄（均值 ${memberAvgBulk}）`)
    const topThreat = (summary.alerts || [])[0]
    if (topThreat) weaknesses.push(`${topThreat.type}系威胁集中（${topThreat.threatenedCount}/${filled.length} 只被克）`)
    if (summary.missingCoverage.length >= 6) weaknesses.push(`打击面缺口偏多（缺 ${summary.missingCoverage.length} 系）`)
  }

  return {
    mode,
    score: 60,
    confidence: 0.5,
    summary: {
      memberCount: members.length,
      roleCounts,
      controlCount: controlMembers.length,
      attackBalance: {},
      memberAvgSpeed,
      memberAvgBulk,
      strengths,
      weaknesses,
      teamCoverage: summary
    },
    members,
    complements: recommendTeamComplements(team, allPets, allPetDetails, mode).items,
    replacements: recommendTeamReplacements(team, allPets, allPetDetails, mode).items,
    skillRecommendations: members.map((member) => ({
      petId: member.petId,
      petName: member.petName,
      confidence: 0.5,
      reasons: ['轻量技能推荐'],
      recommendedSkills: [],
      rankedSkills: []
    }))
  }
}

export default {
  analyzeTeamDecision,
  recommendTeamComplements,
  recommendTeamReplacements,
  recommendSkillsForPet
}
