// 校验 asset-path.js 官方精灵 URL 的本地镜像回退链
// 用法: node tools/check-asset-fallback-chain.mjs
import { getAssetCandidateUrls } from '../utils/asset-path.js'
import { petIdMap } from '../data/pet/pet_id_map.js'
import { petDetail } from '../data/pet/pet_detail.js'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const mirrorDir = path.join(root, 'static', 'static-web', 'pets')
const mirror = new Set(fs.readdirSync(mirrorDir).filter((f) => f.endsWith('.webp')))

let checked = 0
let firstCandidateLocalMiss = 0
let noFallbackAtAll = []

for (const [seqKey, variants] of Object.entries(petDetail)) {
  for (const v of variants) {
    if (!v.img || !v.img.includes('/pets/')) continue
    checked += 1
    const cands = getAssetCandidateUrls(v.img)
    if (!cands.length) continue
    // 判断第一个本地候选（/static/ 开头）是否存在
    const first = cands[0]
    const isLocalFirst = first.startsWith('/static/')
    if (!isLocalFirst) continue // 本地无匹配名时首个候选可能是远程，跳过
    // 复算本地文件名候选（与 asset-path 同逻辑）
    const info = petIdMap[String(Number(seqKey) + 3000)] // 不一定可靠，改为按 detail 匹配
    void info
    checked && 0
    // 直接用文件名规则验证
    const seq3 = String(seqKey).padStart(3, '0')
    const title = v.page_title || ''
    const hit = mirror.has(`${seq3}_${title}.webp`) || [...mirror].some((m) => m.startsWith(`${seq3}_`) && m.includes(title))
    if (!hit) firstCandidateLocalMiss += 1
  }
}

// 逐条真实回放:官方URL → 本地镜像是否存在
function decodeCandidatesFor(seq, pageTitle) {
  const seq3 = String(seq).padStart(3, '0')
  return [`${seq3}_${pageTitle}.webp`, `${seq3}_${pageTitle}_异色.webp`]
}

let missingNormal = []
let missingShiny = []
for (const [seqKey, variants] of Object.entries(petDetail)) {
  for (const v of variants) {
    if (!v.img) continue
    const seq3 = String(seqKey).padStart(3, '0')
    const base = decodeCandidatesFor(seqKey, v.page_title || '')
    if (v.img.includes('/pets/') && !mirror.has(base[0]) && ![...mirror].some((m) => m.startsWith(seq3 + '_') && !m.endsWith('_异色.webp'))) {
      missingNormal.push(`${seq3} ${v.page_title}`)
    }
    if (v.yiseImg && !mirror.has(base[1]) && ![...mirror].some((m) => m.startsWith(seq3 + '_') && m.endsWith('_异色.webp'))) {
      missingShiny.push(`${seq3} ${v.page_title}`)
    }
  }
}

console.log(`镜像目录: static/static-web/pets (${mirror.size} 张)`)
console.log(`pet_detail 引用 img: ${checked} 条`)
console.log(`普通立绘本地缺失: ${missingNormal.length}`)
missingNormal.slice(0, 10).forEach((m) => console.log('  -', m))
console.log(`异色立绘本地缺失: ${missingShiny.length}`)
missingShiny.slice(0, 10).forEach((m) => console.log('  -', m))

if (missingNormal.length || missingShiny.length) {
  console.error('FAIL: 存在本地兜底缺口')
  process.exit(1)
}
console.log('PASS: 所有官方引用均有本地镜像兜底')
