// metaPreview 冒烟测试：用项目同款 ESM→CJS 转译方式加载并跑一次真实预演
// 用法: node scripts/run-meta-preview-test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const root = process.cwd()
const tmpDir = path.join(root, 'scripts', '.meta-test')
fs.mkdirSync(tmpDir, { recursive: true })

function rewriteExt(f) { return f.endsWith('.json') ? f : (f.endsWith('.js') ? f.slice(0, -3) + '.cjs' : f) }

function transpile(src, rel) {
  const resolve = (from) => {
    if (from.startsWith('@/')) from = from.slice(2)
    // 相对于项目根解析（所有 import 都是根相对或同目录相对）
    let target = from.startsWith('.')
      ? path.normalize(path.join(path.dirname(rel), from))
      : from
    // 生成同目录扁平文件名
    return './' + rewriteExt(target).replace(/\\/g, '_').replace(/^\.\//, '')
  }
  let out = src
  // re-export: export { a, b } from './x.js'（跨文件转发导出，必须先于本地 export {} 规则处理）
  out = out.replace(/export\s*\{([^}]*)\}\s*from\s*['\"]([^'\"]+)['\"];?/gs, (m, names, f) => {
    const req = `require(${JSON.stringify(resolve(f))})`
    const assigns = names.split(',').map((s) => s.trim()).filter(Boolean).map((n) => {
      const mm = n.match(/^(\w+)(?:\s+as\s+(\w+))?$/)
      const local = mm ? mm[1] : n
      const exp = mm && mm[2] ? mm[2] : local
      return `module.exports.${exp} = ${req}.${local}`
    }).join('\n')
    return assigns + '\n'
  })
  out = out.replace(/import\s+([\w$]+)\s+from\s*['"]([^'"]+\.json)['"];?/g, (m, n, f) => `const ${n} = require(${JSON.stringify(resolve(f))})`)
  out = out.replace(/import\s+([\w$]+)\s+from\s*['"]([^'\"]+)['"];?/g, (m, n, f) => `const ${n} = require(${JSON.stringify(resolve(f))}).default`)
  out = out.replace(/import\s*\{([^}]*)\}\s*from\s*['\"]([^'\"]+)['\"];?/gs, (m, names, f) => `const {${names}} = require(${JSON.stringify(resolve(f))})`)
  out = out.replace(/import\s+([\w$]+),\s*\{([^}]+)\}\s*from\s*['"]([^'\"]+)['"];?/g, (m, d, names, f) => `const _m = require(${JSON.stringify(resolve(f))}); const ${d} = _m.default; const {${names}} = _m`)
  out = out.replace(/export\s+\{([^}]+)\}\s*;?/g, (m, names) => {
    const assigns = names.split(',').map((s) => s.trim()).filter(Boolean).map((n) => `module.exports.${n} = ${n}`).join('\n')
    return assigns + '\n'
  })
  out = out.replace(/export\s+function\s+(\w+)/g, 'const $1 = module.exports.$1 = function $1')
  out = out.replace(/export\s+const\s+(\w+)\s*=\s*(\{)/g, 'module.exports.$1 = $1 = $2')
  out = out.replace(/export\s+const\s+(\w+)\s*=\s*(?!\{)/g, 'const $1 = ')
  // re-export/导出对象里引用的 const 名需已存在:export const X = ... 变成 const X = ... 后，
  // 需要补 module.exports.X = X。收集 export const 名单单独处理：
  const exportedConsts = [...src.matchAll(/export\s+const\s+(\w+)\s*=/g)].map((m) => m[1])
  if (exportedConsts.length) {
    out += '\n' + exportedConsts.map((n) => `module.exports.${n} = ${n}`).join('\n') + '\n'
  }
  out = out.replace(/export\s+default\s+(\w+)\s*;?/g, 'module.exports.default = $1;\n')
  out = out.replace(/export\s+default\s+\{([\s\S]*?)\}/g, 'module.exports.default = {$1}')
  return out
}

const files = [
  'utils/metaPreview.js',
  'utils/pvpDamageEngine.js',
  'data/pet/pet_detail.js',
  'data/pet/pet_skills.js',
  'data/skill/skills.js',
  'data/skill/skill_tag_rules.js',
  'data/skill/dynamicPowerRules.js',
  'data/config/typeChart.js',
  'data/config/decision_engine.js',
  'data/config/pet_role_analyzer.js',
  'data/config/game_math.js',
  'data/config/final_form_map.json',
  'config/pvpRuleConfig.js',
  'data/pvp/metaTargetPets.json'
]
for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'utf8')
  const flatName = rewriteExt(f).replace(/\\/g, '_').replace(/\//g, '_')
  const outPath = path.join(tmpDir, flatName)
  fs.writeFileSync(outPath, f.endsWith('.json') ? src : transpile(src, f))
}

const mp = require(path.join(tmpDir, 'utils_metaPreview.cjs'))

const slots = [
  { petId: 1, petName: '迪莫', types: ['光'], race: { hp: 90, attack: 60, mattack: 110, defense: 70, mdefense: 80, speed: 100 }, ivs: { hp: 10, mattack: 10, speed: 10 }, level: 60, star: 5, natureUp: '魔攻', skills: ['闪光', '魔法增效'] },
  { petId: 107, petName: '罗隐', types: ['地', '恶'], race: { hp: 100, attack: 115, mattack: 40, defense: 110, mdefense: 75, speed: 70 }, ivs: { hp: 10, attack: 10, speed: 10 }, level: 60, star: 5, natureUp: '物攻', skills: ['蝙蝠', '鸣沙阻碍', '先发制人'] }
]

let passed = 0
let failed = 0
function check(cond, label) {
  if (cond) { passed += 1; console.log('  ok ' + label) } else { failed += 1; console.error('  FAIL ' + label) }
}

console.log('== metaPreview 冒烟 ==')
const r = mp.buildMetaPreview(slots)
check(r.total >= 30, `目标总数 >= 30（实际 ${r.total}）`)
check(r.readyCount >= 0 && r.readiness >= 0 && r.readiness <= 100, `readiness 在 0-100（实际 ${r.readiness}%）`)
const huoshen = r.rows.find((x) => x.target.name === '火神')
check(Boolean(huoshen), '目标清单含火神')
if (huoshen) {
  check(huoshen.best && huoshen.best.myDamage >= 1, `最佳出手伤害 >= 1（${huoshen.best && huoshen.best.bestSkillName} → ${huoshen.best && huoshen.best.myDamage}）`)
  check(huoshen.worst && huoshen.worst.targetDamage >= 1, `目标反击伤害 >= 1（${huoshen.worst && huoshen.worst.targetDamage}）`)
  check(['me', 'target', 'tie'].includes(huoshen.best.firstStrike), `先手判定合法（${huoshen.best.firstStrike}，我速 ${huoshen.best.mySpeed} vs 敌速 ${huoshen.best.targetSpeed}）`)
}
const yinyue = r.rows.find((x) => x.target.name === '银月狼王')
check(Boolean(yinyue), 'S4 观察位银月狼王已入池')
check(mp.getMetaTargetPets().every((t) => t.name !== '_meta'), '_meta 元数据块被自动跳过')

// ---- 第三期专项:矩阵/链分析/人话化建议 ----
console.log('== 第三期专项 ==')
const matrix = mp.buildTypeMatrix(slots)
check(matrix.rows.length === 18, `矩阵 18 行（实际 ${matrix.rows.length}）`)
check(matrix.members.length === 2, '矩阵 2 列成员')
check(matrix.dangerRows.every((r) => r.threatenedCount >= 1), `dangerRows 只含有威胁行（${matrix.dangerRows.length} 行）`)
const chains = mp.buildChainAnalysis(slots)
check(chains.members.length === 2, '链分析覆盖 2 成员')
check(typeof chains.dualCore === 'boolean', '双核判定输出')
check(Array.isArray(chains.controlChain), '控制链为数组')
const deMod = require(path.join(tmpDir, 'data_config_decision_engine.cjs'))
const pdMod = require(path.join(tmpDir, 'data_pet_pet_detail.cjs')).petDetail
const notes = mp.buildActionableNotes(deMod.analyzeTeamDecision(slots, [], pdMod, 'pvp'), 'pvp')
check(Array.isArray(notes) && notes.length <= 4, `人话化建议 ≤4 条（实际 ${notes.length}）`)
notes.forEach((n) => console.log('    · ' + n))
check(r.rows.every((row) => !row.best || row.targetHp > 0), '达标口径含目标 HP')

console.log(`\n结果: ${passed} 通过, ${failed} 失败`)
process.exit(failed ? 1 : 0)
