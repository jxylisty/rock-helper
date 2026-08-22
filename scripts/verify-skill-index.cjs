const fs = require('fs')
const path = require('path')

function loadExport(file, exportName) {
  let src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  src = src.replace(/^export\s+const\s+/gm, 'const ').replace(/^export\s+default\s+/gm, '')
  const mod = { exports: {} }
  const fn = new Function('module', 'exports', src + `\nmodule.exports = ${exportName};`)
  fn(mod, mod.exports)
  return mod.exports
}

const petIndex = loadExport('data/pet/pet_index.js', 'petIndex')
const petDetail = loadExport('data/pet/pet_detail.js', 'petDetail')
const petSkills = loadExport('data/pet/pet_skills.js', 'petSkills')
const skillsData = loadExport('data/skill/skills.js', 'skillsData')

// 复刻 buildBasePetList
const seen = new Set()
const pets = []
for (const [k, v] of Object.entries(petIndex)) {
  if (!seen.has(v.wikiId)) {
    seen.add(v.wikiId)
    pets.push({ id: v.seq, name: v.name, seq: v.seq, wikiId: v.wikiId })
  }
}
pets.sort((a, b) => a.id - b.id)

// 复刻 _petsDetail
const detail = {}
for (const [seq, variants] of Object.entries(petDetail)) {
  if (Array.isArray(variants) && variants.length) {
    detail[seq] = { skills: (petSkills[seq] && petSkills[seq].skills) || [], trait: variants[0].trait || '' }
  }
}

// 复刻反向索引（不做 finalForm 映射，只验证技能命中）
const bySkill = {}
for (const pet of pets) {
  const names = detail[String(pet.id)]?.skills || []
  for (const s of names) {
    if (!s.name) continue
    ;(bySkill[s.name] = bySkill[s.name] || []).push(pet.name)
  }
}

const skills = Object.values(skillsData)
let covered = 0
const samples = []
for (const skill of skills) {
  const list = bySkill[skill.name]
  if (list && list.length) {
    covered++
    if (samples.length < 8) samples.push(`${skill.name}: ${list.length} 只 -> ${list.slice(0, 6).join('、')}`)
  }
}

console.log(`精灵总数: ${pets.length}`)
console.log(`技能总数: ${skills.length}`)
console.log(`能查到精灵的技能: ${covered} (${(covered / skills.length * 100).toFixed(1)}%)`)
console.log('\n样例:')
samples.forEach((s) => console.log('  ' + s))
