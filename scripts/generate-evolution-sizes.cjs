const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const cacheDir = path.join(rootDir, 'crawler_official_api', 'output', 'cache')
const dataConfigDir = path.join(rootDir, 'data', 'config')

// 读取 eggData
const eggDataPath = path.join(dataConfigDir, 'eggData.js')
const eggDataContent = fs.readFileSync(eggDataPath, 'utf8')
const match = eggDataContent.match(/export const eggData = (\[[\s\S]*?\])\s*export function/)
if (!match) {
  console.error('无法解析 eggData.js')
  process.exit(1)
}

const eggData = JSON.parse(match[1])
console.log(`读取到 ${eggData.length} 只精灵的蛋数据`)

const BULK_RATIO = 0.98

const evolutionData = {}
let stagesFound = 0
let glassPieceCount = 0

for (const egg of eggData) {
  const hbStr = String(egg.petId).padStart(3, '0')
  const famPath = path.join(cacheDir, 'family', `${hbStr}.json`)
  const eggJsonPath = path.join(cacheDir, 'egg', `${hbStr}.json`)

  // 蛋大块头门槛
  const rangeH = egg.maxHeight - egg.minHeight
  const rangeW = egg.maxWeight - egg.minWeight
  const eggBulkH = Math.round((egg.minHeight + rangeH * BULK_RATIO) * 1000) / 1000
  const eggBulkW = Math.round((egg.minWeight + rangeW * BULK_RATIO) * 1000) / 1000

  // 炫彩拼图与官方概率
  let glassPiece = null
  let miracleGlassPercent = egg.shinyMiraclePercent || null
  let homeGlassPercent = egg.shinyPercent || null
  if (fs.existsSync(eggJsonPath)) {
    try {
      const ej = JSON.parse(fs.readFileSync(eggJsonPath, 'utf8'))
      if (ej.custom_glass_piece && ej.custom_glass_piece.name) {
        const cleanEggName = ej.custom_glass_piece.name.replace(/^炫彩/, '').replace(/拼图$/, '') + '蛋'
        glassPiece = {
          id: ej.custom_glass_piece.id,
          name: cleanEggName,
          originalName: ej.custom_glass_piece.name,
          icon: ej.custom_glass_piece.icon || ''
        }
        glassPieceCount++
      }
      if (ej.probabilities) {
        if (ej.probabilities.miracle_exchange && ej.probabilities.miracle_exchange.glass) {
          miracleGlassPercent = ej.probabilities.miracle_exchange.glass.total_with_contact_percent || ej.probabilities.miracle_exchange.glass.base_percent
        }
        if (ej.probabilities.home && ej.probabilities.home.glass) {
          homeGlassPercent = ej.probabilities.home.glass.total_with_contact_percent || ej.probabilities.home.glass.base_percent
        }
      }
    } catch (e) {}
  }

  // 进化形态
  let members = []
  if (fs.existsSync(famPath)) {
    try {
      const fam = JSON.parse(fs.readFileSync(famPath, 'utf8'))
      members = fam.members || []
    } catch (e) {}
  }

  const stages = []
  const seenPids = new Set()

  for (const m of members) {
    if (!m.pet_id || seenPids.has(m.pet_id)) continue
    // 过滤领地试炼或内部测试形态
    if (m.form === '领地试炼用' || m.pet_id >= 10000000) continue
    seenPids.add(m.pet_id)

    const profPath = path.join(cacheDir, 'profile', `${m.pet_id}.json`)
    if (!fs.existsSync(profPath)) continue

    try {
      const p = JSON.parse(fs.readFileSync(profPath, 'utf8'))
      const bs = p.body_size
      if (!bs || !bs.height || !bs.weight || bs.height.min_m == null || bs.weight.min_kg == null) {
        continue
      }

      const minH = Number(bs.height.min_m)
      const maxH = Number(bs.height.max_m)
      const minW = Number(bs.weight.min_kg)
      const maxW = Number(bs.weight.max_kg)
      const bulkH = Math.round((minH + (maxH - minH) * BULK_RATIO) * 1000) / 1000
      const bulkW = Math.round((minW + (maxW - minW) * BULK_RATIO) * 1000) / 1000

      stages.push({
        id: m.pet_id,
        name: m.name || p.name,
        stage: m.stage || 1,
        condition: m.condition_summary || (m.display_order === 1 ? '初始形态' : ''),
        icon: m.icon || p.icon || '',
        types: (p.types || []).map(t => t.name),
        minH,
        maxH,
        bulkH,
        minW,
        maxW,
        bulkW
      })
    } catch (e) {}
  }

  if (stages.length > 0) {
    stagesFound++
  }

  evolutionData[egg.petId] = {
    petId: egg.petId,
    name: egg.name,
    minHeight: egg.minHeight,
    maxHeight: egg.maxHeight,
    minWeight: egg.minWeight,
    maxWeight: egg.maxWeight,
    eggBulkH,
    eggBulkW,
    eggType: egg.eggType || '普通',
    hatchLabel: egg.hatchLabel || '',
    eggGroups: egg.eggGroups || [],
    malePercent: egg.malePercent != null ? egg.malePercent : 50,
    shinyPercent: homeGlassPercent,
    shinyMiraclePercent: miracleGlassPercent,
    glassPiece,
    stages
  }
}

console.log(`共处理 ${Object.keys(evolutionData).length} 只精灵：${stagesFound} 只含进化形态，${glassPieceCount} 只有炫彩拼图`)

const compact = {}
for (const [k, v] of Object.entries(evolutionData)) {
  const compactStages = (v.stages || []).map((s) => [
    s.id, s.name, s.stage, s.condition, s.types, s.minH, s.maxH, s.bulkH, s.minW, s.maxW, s.bulkW
  ])
  compact[k] = [
    v.petId, v.name, v.minHeight, v.maxHeight, v.minWeight, v.maxWeight,
    v.eggBulkH, v.eggBulkW, v.eggType, v.hatchLabel, v.eggGroups,
    v.malePercent, v.shinyPercent, v.shinyMiraclePercent, v.glassPiece,
    compactStages
  ]
}

const outPath = path.join(dataConfigDir, 'petEvolutionSizes.js')
const outContent = `// 由 scripts/generate-evolution-sizes.cjs 生成（数据源: 官方 cache/family + profile + egg）
const EVOLUTION_SIZES_RAW = ${JSON.stringify(compact)};

function decodeStage([id, name, stage, condition, types, minH, maxH, bulkH, minW, maxW, bulkW]) {
  return {
    id,
    name,
    stage,
    condition,
    icon: 'https://wegame.shallow.ink/api/v1/resources/wiki/assets/pets/' + id + '/icon.png',
    types,
    minH,
    maxH,
    bulkH,
    minW,
    maxW,
    bulkW
  };
}

function decodePet(raw) {
  if (!raw) return null;
  const [
    petId, name, minHeight, maxHeight, minWeight, maxWeight,
    eggBulkH, eggBulkW, eggType, hatchLabel, eggGroups,
    malePercent, shinyPercent, shinyMiraclePercent, glassPiece,
    stages
  ] = raw;
  return {
    petId,
    name,
    minHeight,
    maxHeight,
    minWeight,
    maxWeight,
    eggBulkH,
    eggBulkW,
    eggType,
    hatchLabel,
    eggGroups,
    malePercent,
    shinyPercent,
    shinyMiraclePercent,
    glassPiece,
    stages: (stages || []).map(decodeStage)
  };
}

const cache = {};
export const petEvolutionSizes = new Proxy(EVOLUTION_SIZES_RAW, {
  get(target, prop) {
    if (typeof prop !== 'string' && typeof prop !== 'number') return target[prop];
    const key = String(prop);
    if (key in cache) return cache[key];
    if (key in target) {
      const entry = decodePet(target[key]);
      cache[key] = entry;
      return entry;
    }
    return target[prop];
  },
  has(target, prop) {
    return String(prop) in target;
  },
  ownKeys(target) {
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target, prop) {
    const key = String(prop);
    if (key in target) {
      return {
        configurable: true,
        enumerable: true,
        value: this.get(target, key),
        writable: false
      };
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
  }
});
`

fs.writeFileSync(outPath, outContent, 'utf8')
console.log(`✅ 已生成 ${outPath}（体积压缩至 ${Buffer.byteLength(outContent, 'utf8')} 字节）`)

