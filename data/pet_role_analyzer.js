import { isAttackSkill, normalizeTypeList } from './game_math.js'
import { inferSkillTags } from './skill_tag_rules.js'

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function estimateBulkLevel(race = {}) {
  const hp = toNumber(race.hp)
  const defense = toNumber(race.defense)
  const mdefense = toNumber(race.mdefense)
  const bulkScore = hp + defense + mdefense
  if (bulkScore >= 320) return { level: 'high', score: bulkScore }
  if (bulkScore >= 250) return { level: 'medium', score: bulkScore }
  return { level: 'low', score: bulkScore }
}

function estimateSpeedLevel(race = {}) {
  const speed = toNumber(race.speed)
  if (speed >= 120) return { level: 'fast', score: speed }
  if (speed >= 85) return { level: 'medium', score: speed }
  return { level: 'slow', score: speed }
}

export function analyzePetRole(pet, petDetail) {
  const race = petDetail?.race || pet?.race || {}
  const types = normalizeTypeList(pet?.type || pet?.types || petDetail?.type || petDetail?.types || [])
  const skills = Array.isArray(petDetail?.skills) ? petDetail.skills : []
  const attackSkills = skills.filter((skill) => isAttackSkill(skill))

  const physicalAttack = attackSkills.filter((skill) => String(skill?.type || '').includes('物攻')).length
  const magicAttack = attackSkills.filter((skill) => String(skill?.type || '').includes('魔攻')).length
  const supportCount = skills.length - attackSkills.length
  const speedInfo = estimateSpeedLevel(race)
  const bulkInfo = estimateBulkLevel(race)

  let mainAttackType = 'support'
  if (attackSkills.length > 0) {
    if (physicalAttack > magicAttack) mainAttackType = 'physical'
    else if (magicAttack > physicalAttack) mainAttackType = 'magic'
    else if (physicalAttack > 0 && magicAttack > 0) mainAttackType = 'mixed'
    else mainAttackType = physicalAttack >= magicAttack ? 'physical' : 'magic'
  }

  const reasons = []
  if (types.length) reasons.push(`属性：${types.join(' / ')}`)
  reasons.push(`速度${speedInfo.score}`)
  reasons.push(`生存${bulkInfo.score}`)
  if (attackSkills.length) reasons.push(`输出技能${attackSkills.length}个`)
  if (supportCount > 0) reasons.push(`辅助技能${supportCount}个`)
  if (inferSkillTags(attackSkills[0] || {}).includes('连击')) reasons.push('存在连击技能')

  return {
    roles: [mainAttackType],
    mainAttackType,
    speedLevel: speedInfo.level,
    bulkLevel: bulkInfo.level,
    reasons
  }
}

export default analyzePetRole
