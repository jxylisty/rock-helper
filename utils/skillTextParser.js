import { inferSkillTags } from '../data/skill/skill_tag_rules.js'

function toObject(value) {
  return value && typeof value === 'object' ? value : {}
}

function toText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function extractNumber(value) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const num = Number(match[0])
  return Number.isFinite(num) ? num : null
}

export function normalizeSkill(skill) {
  const source = toObject(skill)
  return {
    id: source.id ?? null,
    name: toText(source.name ?? ''),
    type: toText(source.type ?? ''),
    attr: toText(source.attr ?? ''),
    consume: extractNumber(source.consume),
    power: extractNumber(source.power),
    describe: toText(source.describe ?? '')
  }
}

export function parseSkillMechanics(skill) {
  const normalized = normalizeSkill(skill)
  const tags = inferSkillTags(skill)
  return {
    name: normalized.name,
    category: normalized.category,
    attr: normalized.attr,
    consume: normalized.consume,
    power: normalized.power,
    description: normalized.description,
    tags,
    baseEffects: [],
    responseEffects: [],
    conditionalEffects: [],
    confidence: tags.length ? 'medium' : 'low',
    evidence: []
  }
}

export function parseSkillDescription(skill) {
  return parseSkillMechanics(skill)
}

export function parseAllSkills(skills) {
  const list = Array.isArray(skills) ? skills : Object.values(toObject(skills))
  return list.map((skill) => parseSkillMechanics(skill))
}

export function getSkillBattleTags(skillOrParsed, petTypes) {
  const parsed = skillOrParsed && Array.isArray(skillOrParsed.tags) ? skillOrParsed : parseSkillMechanics(skillOrParsed)
  const tags = new Set(Array.isArray(parsed.tags) ? parsed.tags : [])
  const typeList = Array.isArray(petTypes) ? petTypes : [petTypes]
  const normalizedTypes = typeList.map((item) => toText(item)).filter(Boolean)
  const attr = toText(parsed.attr)
  if (attr && normalizedTypes.length) {
    tags.add(normalizedTypes.includes(attr) ? '本系输出' : '补盲')
  }
  return Array.from(tags)
}

export function getSkillTagSummary(parsedSkills) {
  const list = Array.isArray(parsedSkills) ? parsedSkills : []
  const tagCount = {}
  const lowConfidenceSkills = []
  list.forEach((item) => {
    (item.tags || []).forEach((tag) => {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    })
    if (item.confidence === 'low') {
      lowConfidenceSkills.push({
        name: item.name,
        category: item.category,
        attr: item.attr,
        description: item.description
      })
    }
  })
  return { total: list.length, tagCount, lowConfidenceSkills }
}

export default {
  normalizeSkill,
  parseSkillMechanics,
  parseSkillDescription,
  parseAllSkills,
  getSkillBattleTags,
  getSkillTagSummary
}
