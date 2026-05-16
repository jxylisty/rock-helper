import { analyzePetRole } from './pet_role_analyzer.js'
import { inferSkillTags } from './skill_tag_rules.js'
import { getAttrMultiplier, getBestAttackMatchup, getHighestFormPets, isAttackSkill, normalizeAttr, normalizeTypeList, analyzeTeamTypeCoverage } from './game_math.js'

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
  const summary = analyzeTeamTypeCoverage(safeArray(team))
  const members = safeArray(team).map((slot, index) => {
    const detail = allPetDetails?.[slot?.petId] || {}
    return {
      petId: slot?.petId || '',
      petName: slot?.petName || '',
      slotIndex: index,
      detail,
      role: analyzePetRole(slot, detail),
      attackAttrs: safeArray(detail?.skills).filter(isAttackSkill).map((skill) => normalizeAttr(skill?.attr)),
      bulkScore: Number(detail?.race?.hp || 0) + Number(detail?.race?.defense || 0) + Number(detail?.race?.mdefense || 0),
      speedScore: Number(detail?.race?.speed || 0)
    }
  })

  return {
    mode,
    score: 60,
    confidence: 0.5,
    summary: {
      memberCount: members.length,
      roleCounts: {},
      attackBalance: {},
      memberAvgSpeed: 0,
      memberAvgBulk: 0,
      strengths: [],
      weaknesses: [],
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
