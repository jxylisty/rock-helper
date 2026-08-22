const fs = require('fs')
const path = require('path')

function loadExports(file) {
  const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  const names = [...src.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1])
  names.push(...[...src.matchAll(/^export\s+const\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]))
  for (const m of src.matchAll(/^export\s*\{([^}]+)\}\s*from/gm)) {
    m[1].split(',').forEach((part) => {
      const name = part.trim().split(/\s+as\s+/).pop().trim()
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.push(name)
    })
  }
  return new Set(names)
}

const gameMath = loadExports('data/config/game_math.js')

const decisionNeeds = ['getAttrMultiplier', 'getBestAttackMatchup', 'getHighestFormPets', 'isAttackSkill', 'normalizeAttr', 'normalizeTypeList', 'analyzeTeamTypeCoverage']
const roleNeeds = ['isAttackSkill', 'normalizeTypeList']

let fail = 0
for (const name of [...decisionNeeds, ...roleNeeds]) {
  if (!gameMath.has(name)) {
    console.log('MISSING in game_math.js: ' + name)
    fail++
  }
}
console.log('game_math.js exports (' + gameMath.size + '): ' + [...gameMath].join(', '))

// 冒烟测试：inferSkillTags + analyzePetRole 端到端
const tagSrc = fs.readFileSync(path.join(__dirname, '..', 'data/skill/skill_tag_rules.js'), 'utf8')
  .replace(/^export\s+function\s+/gm, 'function ')
  .replace(/^export\s+const\s+/gm, 'const ')
  .replace(/^export\s+default.*$/gm, '')
const skill = { name: '造成魔伤，5连击。', type: '魔攻', attr: '火系', describe: '造成魔伤，5连击，先手+1。', consume: '2', power: '50' }
const smoke = new Function(tagSrc + '; return inferSkillTags(' + JSON.stringify(skill) + ')')()
console.log('inferSkillTags 冒烟(期望含 先手/连击): ' + JSON.stringify(smoke))

console.log(fail ? `\n${fail} missing!` : '\nAll imports resolve OK.')
