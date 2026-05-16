import { normalizeSkill, parseAllSkills, parseSkillMechanics } from './skillTextParser.js'

export function auditSkillMechanics(skillsData) {
  const rawSkills = Array.isArray(skillsData) ? skillsData : Object.values(skillsData || {})
  const parsedSkills = parseAllSkills(rawSkills)
  const emptySkills = []
  const tagCount = {}
  const lowConfidenceSkills = []

  parsedSkills.forEach((parsed, index) => {
    const normalized = normalizeSkill(rawSkills[index])
    if (!normalized.description) emptySkills.push(parsed)
    (parsed.tags || []).forEach((tag) => {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    })
    if (parsed.confidence === 'low') lowConfidenceSkills.push(parsed)
  })

  return {
    total: parsedSkills.length,
    emptySkills,
    tagCount,
    lowConfidenceSkills
  }
}

export function auditParsedSkills(skillsData) {
  return auditSkillMechanics(skillsData)
}

export function logSkillMechanicsAudit(skillsData) {
  const report = auditSkillMechanics(skillsData)
  console.log(report)
  return report
}

export default {
  auditSkillMechanics,
  auditParsedSkills,
  logSkillMechanicsAudit,
  parseSkillMechanics
}
