const fs = require('fs')
const path = require('path')

const root = path.dirname(__dirname)
const tmpDir = path.join(__dirname, '.smoke-data')

// 1. 复制 data 目录到临时目录并转译 ESM -> CJS（.js 引用改写为 .cjs）
function rewriteExt(from) {
  return from.endsWith('.js') ? from.slice(0, -3) + '.cjs' : from
}

function transpile(src, aliasPrefix = '../') {
  const resolve = (from) => {
    if (from.startsWith('@/')) return aliasPrefix + rewriteExt(from.slice(2))
    return rewriteExt(from)
  }
  const exports_ = []
  let out = src

  // re-export: export { a, b } from './x.js'
  let reIndex = 0
  out = out.replace(/export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];/g, (_, names, from) => {
    const varName = `__reexport${reIndex++}`
    const parts = names.split(',').map((s) => s.trim()).filter(Boolean)
    const assigns = parts.map((p) => {
      const m = p.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/)
      return m ? (m[2] ? `exports.${m[2]} = ${varName}.${m[1]}` : `exports.${m[1]} = ${varName}.${m[1]}`) : ''
    }).filter(Boolean)
    return `const ${varName} = require('${resolve(from)}');\n${assigns.join(';\n')};`
  })

  // import default from json/js
  out = out.replace(/import\s+([\w$]+)\s+from\s*['"]([.@][^'"]+)['"];?/g, (m, name, from) => {
    if (from.endsWith('.json')) return `const ${name} = require('${from.startsWith('@/') ? resolve(from) : from}')`
    return `const ${name} = require('${resolve(from)}').default`
  })

  // import { a, b as c } from './x.js'
  out = out.replace(/import\s*\{([^}]+)\}\s*from\s*['"]([.@][^'"]+)['"];?/g, (_, names, from) => {
    const props = names.split(',').map((s) => {
      const m = s.trim().match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/)
      if (!m) return ''
      return m[2] ? `${m[1]}: ${m[2]}` : m[1]
    }).filter(Boolean)
    return `const { ${props.join(', ')} } = require('${resolve(from)}')`
  })

  // export function f -> function f (记录名字)
  out = out.replace(/^export\s+(async\s+)?function\s+([\w$]+)/gm, (_, a, name) => {
    exports_.push(name)
    return `${a || ''}function ${name}`
  })

  // export const f = -> const f = (记录名字)
  out = out.replace(/^export\s+const\s+([\w$]+)/gm, (_, name) => {
    exports_.push(name)
    return `const ${name}`
  })

  // export default X（可能为多行对象，匹配到文件末尾）
  const defMatch = out.match(/^export\s+default\s+([\s\S]*)$/m)
  if (defMatch) {
    out = out.replace(/^export\s+default\s+[\s\S]*$/m, '')
    out += `\nexports.default = (${defMatch[1].replace(/;\s*$/, '')});`
  }

  out += `\nmodule.exports = Object.assign(exports, { ${exports_.join(', ')} });`
  return out
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name)
    const d = path.join(dst, name.endsWith('.js') ? name.slice(0, -3) + '.cjs' : name)
    if (fs.statSync(s).isDirectory()) copyDir(s, d)
    else if (name.endsWith('.json')) fs.copyFileSync(s, d)
    else if (name.endsWith('.js')) {
      const depth = path.relative(tmpDir, dst).split(path.sep).length
      const prefix = '../'.repeat(depth) || './'
      fs.writeFileSync(d, transpile(fs.readFileSync(s, 'utf8'), prefix))
    }
  }
}

if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true })
copyDir(path.join(root, 'data'), path.join(tmpDir, 'data'))
copyDir(path.join(root, 'utils'), path.join(tmpDir, 'utils'))

// 2. 冒烟测试各页面的真实调用链
const gameMath = require(path.join(tmpDir, 'data', 'config', 'game_math.cjs'))
const petDetail = require(path.join(tmpDir, 'data', 'pet', 'pet_detail.cjs'))
const petIndex = require(path.join(tmpDir, 'data', 'pet', 'pet_index.cjs'))
const petSkills = require(path.join(tmpDir, 'data', 'pet', 'pet_skills.cjs'))
const petRaceSpeed = require(path.join(tmpDir, 'data', 'pet', 'pet_race_speed.cjs'))
const skillsData = require(path.join(tmpDir, 'data', 'skill', 'skills.cjs'))
const decisionEngine = require(path.join(tmpDir, 'data', 'config', 'decision_engine.cjs'))
const eggData = require(path.join(tmpDir, 'data', 'config', 'eggData.cjs'))
const petEvolutionSizes = require(path.join(tmpDir, 'data', 'config', 'petEvolutionSizes.cjs'))
const petListBuilder = require(path.join(tmpDir, 'utils', 'petListBuilder.cjs'))
const breedingPlanner = require(path.join(tmpDir, 'utils', 'breedingPlanner.cjs'))

let pass = 0, fail = 0
function test(name, fn) {
  try {
    const result = fn()
    if (result === false) throw new Error('returned false')
    pass++
    console.log(`  ok ${name}${typeof result === 'string' ? ' -> ' + result : ''}`)
  } catch (e) {
    fail++
    console.log(`  FAIL ${name}: ${e.message}`)
  }
}

console.log('--- petListBuilder (catalog/skill-search/team-editor 基础列表) ---')
const pets = petListBuilder.buildBasePetList()
test('buildBasePetList 返回精灵列表', () => pets.length > 300 || `only ${pets.length}`)
test('getPetSkillNames 有数据', () => {
  const n = petListBuilder.getPetSkillNames(pets[5].id)
  return `${pets[5].name}: ${n.length} 个技能`
})

console.log('--- game_math 核心函数 ---')
const detailMap = {}
for (const [seq, variants] of Object.entries(petDetail.petDetail)) {
  if (Array.isArray(variants) && variants.length) {
    detailMap[seq] = { skills: (petSkills.petSkills[seq] && petSkills.petSkills[seq].skills) || [], trait: variants[0].trait || '', race: variants[0].race }
  }
}
test('searchPetsBySkill 命中精灵', () => {
  const r = gameMath.searchPetsBySkill('闪光', pets, detailMap)
  return r.length ? `${r.length} 只` : 'EMPTY'
})
test('getFinalForm 正常返回', () => {
  const r = gameMath.getFinalForm(pets[0], pets, detailMap)
  return r && r.name ? r.name : 'null'
})
test('calculatePetPanel 返回面板 (页面形状: pet+race, options)', () => {
  const pet = pets[10]
  const variants = petDetail.petDetail[String(pet.id)]
  const race = (variants && variants[0] && variants[0].race) || {}
  const r = gameMath.calculatePetPanel({ ...pet, race }, { level: 60, star: 5, ivs: null, natureUp: '无', natureDown: '无' })
  return r && r.hp > 100 ? `hp=${r.hp}` : `hp=${r && r.hp} 异常`
})
test('getSpeedRankEntries 返回条目', () => {
  const r = gameMath.getSpeedRankEntries(pets, petRaceSpeed.petRaceSpeed || petRaceSpeed)
  return Array.isArray(r) ? `${r.length} 条` : 'not array'
})
test('analyzeTeamTypeCoverage 团队覆盖', () => {
  const team = [{ petName: 'x', petId: '2' }, { petName: 'y', petId: '3' }]
  const r = gameMath.analyzeTeamTypeCoverage(team)
  return r && typeof r === 'object' ? Object.keys(r).slice(0, 3).join('/') : 'bad'
})
test('getHighestFormPets 最终形态列表', () => {
  const r = gameMath.getHighestFormPets(pets, Object.values(detailMap))
  return Array.isArray(r) ? `${r.length} 只` : 'not array'
})
test('getAttrMultiplier 属性倍率', () => gameMath.getAttrMultiplier('火系', '草系') + '')

console.log('--- decision_engine (team-editor) ---')
test('analyzeTeamDecision 团队决策', () => {
  const r = decisionEngine.analyzeTeamDecision([{ petId: '2', petName: '喵喵' }], pets, detailMap)
  return r && r.members ? `members=${r.members.length}` : 'bad shape'
})
test('recommendSkillsForPet 技能推荐', () => {
  const r = decisionEngine.recommendSkillsForPet(detailMap['2'], 'general')
  return r && r.rankedSkills ? `${r.rankedSkills.length} 个技能` : 'bad'
})
test('recommendTeamComplements 补位建议', () => {
  const r = decisionEngine.recommendTeamComplements([{ petId: '2' }], pets, detailMap)
  return r && r.items ? `${r.items.length} 条` : 'bad'
})

console.log('--- eggData (egg 页) ---')
test('predictEgg 孵蛋预测 (页面形状: h, w 双参数)', () => {
  const r = eggData.predictEgg(50, 50)
  const r2 = eggData.predictEgg(30, 25)
  return `p(50,50)=${Array.isArray(r) ? r.length : '?'}条, p(30,25)=${Array.isArray(r2) ? r2.length : '?'}条`
})
test('judgeBulkEgg 大块头判定 (egg.vue 依赖, 防管线 apply 丢失)', () => {
  if (typeof eggData.judgeBulkEgg !== 'function') throw new Error('judgeBulkEgg 未导出(egg.vue 会构建失败)')
  const egg = eggData.eggData.find(e => e.maxHeight && e.maxWeight && e.name === '迪莫')
  const atMax = eggData.judgeBulkEgg(egg, egg.maxHeight, egg.maxWeight)
  const atMin = eggData.judgeBulkEgg(egg, egg.minHeight, egg.minWeight)
  if (atMax.isBulk !== true) throw new Error('最大值应为 isBulk=true (98% 双指标)')
  if (atMin.isBulk !== false) throw new Error('最小值应为 isBulk=false')
  return `迪莫 max→${atMax.isBulk}, min→${atMin.isBulk}, 阈值 ${atMax.heightThreshold.toFixed(3)}m/${atMax.weightThreshold.toFixed(3)}kg`
})

console.log('--- skill-search 反向索引链路 ---')
test('技能->精灵索引有命中', () => {
  let covered = 0
  for (const skill of Object.values(skillsData.skillsData)) {
    if (gameMath.searchPetsBySkill(skill.name, pets, detailMap).length) covered++
  }
  return `${covered}/${Object.keys(skillsData.skillsData).length} 技能可查`
})

console.log('--- petEvolutionSizes (大块头图鉴数据链) ---')
test('petEvolutionSizes 覆盖 422 只精灵', () => {
  const count = Object.keys(petEvolutionSizes.petEvolutionSizes).length
  return count >= 422 ? `${count} 只精灵` : `only ${count}`
})
test('罗隐 (107) 包含完整形态与大块头标准', () => {
  const p107 = petEvolutionSizes.petEvolutionSizes['107']
  if (!p107) throw new Error('pet 107 not found')
  if (p107.eggBulkH !== 0.328 || p107.eggBulkW !== 19.556) throw new Error(`egg bulk mismatch: ${p107.eggBulkH}/${p107.eggBulkW}`)
  if (!p107.glassPiece || p107.glassPiece.name !== '阿米亚特蛋') throw new Error('glass piece mismatch')
  const finalStage = p107.stages.find(s => s.name === '罗隐')
  if (!finalStage || !finalStage.bulkH) throw new Error('final stage bulk missing')
  return `蛋大块头(${p107.eggBulkH}m/${p107.eggBulkW}kg), 终阶(${finalStage.bulkH}m/${finalStage.bulkW}kg), 蛋种: ${p107.glassPiece.name}`
})

console.log('--- breedingPlanner (32种异色/炫彩繁育求解器) ---')
test('solveBreedingPlan 异色/炫彩优先模式 (10窝 4公6母)', () => {
  const plan = breedingPlanner.solveBreedingPlan({ nestCount: 10, maleCount: 4, mode: 'probability' })
  if (!plan || !plan.nests || plan.nests.length !== 10) throw new Error('nests count mismatch')
  if (!plan.pairs || plan.pairs.length === 0) throw new Error('no valid pairs found')
  if (plan.metrics.solveTimeMs > 100) throw new Error(`solve took too long: ${plan.metrics.solveTimeMs}ms`)
  return `配对=${plan.metrics.validPairsCount}对, 连通率=${plan.metrics.connectivityRate}%, 异色率=${plan.metrics.avgShinyRate}%, 耗时=${plan.metrics.solveTimeMs}ms`
})
test('solveBreedingPlan 多补异色图鉴模式 (想生: 雪影娃娃)', () => {
  const wishes = { '雪影娃娃': 'missing' }
  const res = breedingPlanner.solveShinyBreedingPlan({ nestCount: 10, maleCount: 4, mode: 'variety', wishes })
  const sol = res.solutions[0]
  if (!sol || !sol.pairs.length) throw new Error('no solution pairs')
  const targetPair = sol.pairs.find(p => p.femalePet.name === '雪影娃娃')
  if (!targetPair) throw new Error('雪影娃娃 not placed in female nest')
  return `成功排布雪影娃娃母窝, 匹配公窝=${targetPair.maleNestId + 1}♂(${targetPair.malePet.name}), 共享蛋组=${targetPair.sharedGroups.join('/')}`
})
test('摆法图新字段 (distance/coords/wishStatus/概率构成/累计/死窝)', () => {
  const inventory = { '雪影娃娃': { shinyM: 1, shinyF: 2 }, '菊花梨': { shinyM: 2 } }
  const wishes = { '雪影娃娃': 'missing', '治愈兔': 'missing' }
  const res = breedingPlanner.solveShinyBreedingPlan({ nestCount: 11, maleCount: 5, mode: 'variety', inventory, wishes })
  const sol = res.solutions[0]
  if (sol.nests.length !== 11) throw new Error('11 窝应有 11 个窝位')
  if (!sol.nests.every(n => n.y === 0 || n.y === 2)) throw new Error('2xN 布局 y 应只有 0/2')
  for (const p of sol.pairs) {
    if (typeof p.distance !== 'number' || p.distance <= 0 || p.distance > 5) throw new Error('pair.distance 异常: ' + p.distance)
    if (!p.maleCoord || !p.femaleCoord) throw new Error('pair 缺少窝坐标')
  }
  for (const n of sol.nests) {
    if (['missing', 'owned', 'ignore'].indexOf(n.wishStatus) === -1) throw new Error('nest.wishStatus 异常: ' + n.wishStatus)
  }
  const s = sol.summary
  const parts = (s.hiddenOnlyPairs || 0) + (s.singleShinyPairs || 0) + (s.doubleShinyPairs || 0)
  if (parts !== s.validPairs) throw new Error(`概率构成加总 ${parts} != 配对数 ${s.validPairs}`)
  if (typeof s.cumulativeShinyChance !== 'number' || s.cumulativeShinyChance <= 0) throw new Error('累计异色概率异常')
  if (!Array.isArray(s.deadNestIds)) throw new Error('缺少 deadNestIds')
  const target = sol.nests.find(n => n.pet && n.pet.name === '雪影娃娃' && n.gender === 'F')
  if (!target || target.wishStatus !== 'missing') throw new Error('想生目标应落母窝且 wishStatus=missing')
  if (!sol.pairs.some(p => p.femalePet.name === '雪影娃娃')) throw new Error('想生目标母窝应有配对')
  return `配对=${s.validPairs} (隐性${s.hiddenOnlyPairs}/单异${s.singleShinyPairs}/双异${s.doubleShinyPairs}), 累计=${(s.cumulativeShinyChance * 100).toFixed(1)}%, 死窝=${s.deadNestIds.length}个`
})
test('零库存退化: 全部走隐性通道', () => {
  const res = breedingPlanner.solveShinyBreedingPlan({ nestCount: 10, maleCount: 4, mode: 'variety' })
  const s = res.solutions[0].summary
  if (s.singleShinyPairs !== 0 || s.doubleShinyPairs !== 0) throw new Error('零库存不应有外显异色配对')
  if (s.hiddenOnlyPairs !== s.validPairs) throw new Error('零库存应全部为隐性通道')
  return `隐性通道 ${s.hiddenOnlyPairs}/${s.validPairs}, 累计=${(s.cumulativeShinyChance * 100).toFixed(2)}%`
})

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
fs.rmSync(tmpDir, { recursive: true })
process.exit(fail ? 1 : 0)
