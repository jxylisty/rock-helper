// 将调研得到的热门精灵名单映射到项目图鉴 seq
// 用法: node tools/map-meta-pets.mjs <候选名单json路径> <输出json路径>
// 候选名单格式: [{ name, reason, role, skills, category, source, confidence }]
// 输出: 映射成功(唯一seq) / 歧义(多变体) / 未收录 三类清单
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = 'C:/Users/zzx05/Documents/HBuilderProjects/luokewangguo'
const require = createRequire(import.meta.url)

// 从 .mjs 数据文件提取（项目 data 是 ESM，Node 直读）
async function loadEsm(file, exportName) {
  const mod = await import('file:///' + path.resolve(root, file).replace(/\\/g, '/') + '?t=' + Date.now())
  return mod[exportName]
}

function normName(s) {
  return String(s || '').replace(/[\s·・]/g, '').replace(/[（(].*?[)）]/g, '').trim()
}

async function main() {
  const [,, inPath, outPath] = process.argv
  const candidates = JSON.parse(fs.readFileSync(inPath, 'utf8'))
  const petIndex = await loadEsm('data/pet/pet_index.js', 'petIndex')
  const petDetail = await loadEsm('data/pet/pet_detail.js', 'petDetail')

  // name -> [{seq, form-title, uiTag}]（含变体）
  const byName = {}
  for (const v of Object.values(petIndex)) {
    const key = normName(v.name)
    ;(byName[key] = byName[key] || []).push({ seq: v.seq, name: v.name, uiTag: v.uiTag })
  }

  const mapped = []
  const ambiguous = []
  const missing = []
  const seen = new Set()

  for (const c of candidates) {
    const key = normName(c.name)
    if (seen.has(key)) continue
    seen.add(key)
    const hits = byName[key]
    if (!hits || hits.length === 0) {
      missing.push({ name: c.name, note: '项目图鉴未收录（可能是页游专属或名字不一致）' })
      continue
    }
    if (hits.length > 1) {
      // 多条同名（不同 seq 变体）：取 seq 最小且 detail 存在的作为默认，记录全部
      const withDetail = hits.filter((h) => Array.isArray(petDetail[String(h.seq)]))
      const best = (withDetail[0] || hits[0])
      ambiguous.push({ name: c.name, chosenSeq: best.seq, all: hits })
      mapped.push(finishEntry(c, best.seq, 'ambiguous:' + hits.length))
      continue
    }
    mapped.push(finishEntry(c, hits[0].seq, 'exact'))
  }

  function finishEntry(c, seq, how) {
    const variants = petDetail[String(seq)]
    const first = Array.isArray(variants) ? variants[0] : null
    return {
      id: String(seq),
      key: 'pet:' + seq,
      name: c.name,
      matchedSeq: seq,
      matchHow: how,
      role: c.role || [],
      commonSkills: Array.isArray(c.skills) ? c.skills : [],
      defaultBuild: c.defaultBuild || (c.role || []).join('').includes('物攻') ? '物攻' : '魔攻',
      asAttacker: true,
      asDefender: true,
      targetTags: c.tags || [c.category || '热门'],
      note: c.reason || '',
      source: c.source || '',
      confidence: c.confidence || '中'
    }
  }

  fs.writeFileSync(outPath, JSON.stringify({ mapped, ambiguous, missing, stats: { total: candidates.length, mapped: mapped.length, ambiguous: ambiguous.length, missing: missing.length } }, null, 2), 'utf8')
  console.log(`mapped=${mapped.length} ambiguous=${ambiguous.length} missing=${missing.length}`)
  if (missing.length) missing.forEach((m) => console.log('  MISS:', m.name, '—', m.note))
  if (ambiguous.length) ambiguous.forEach((m) => console.log('  AMBI:', m.name, '-> seq', m.chosenSeq, `(${m.all.length} 条同名)`))
}

main().catch((e) => { console.error(e); process.exit(1) })
