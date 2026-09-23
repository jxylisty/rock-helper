/**
 * 洛克王国：世界 异色/炫彩补图鉴繁育规划器 —— 核心引擎
 *
 * 专注于 32 种具有异色/炫彩产出且构成跨蛋组遗传连通网的权威物种。
 * 100% 纯本地离线计算，无任何外部网络依赖。
 *
 * 概率模型（官方实测 + 权威数值）：
 *  - 异色通道：父系外显 0.72% / 母系外显 0.72% / 隐性基础 1.00%
 *    双非 1.00% / 单亲 1.72% / 双亲 2.44%
 *  - 炫彩通道：父系外显 0.36% / 母系外显 0.36% / 无隐性通道（双非 0%）
 *    双非 0% / 单亲 0.36% / 双亲 0.72%
 *  - 子代物种严格随母本！
 */
import {
  SHINY_BREEDING_SPECIES,
  EGG_GROUP_ORDER,
  DEMO_PRESET,
  getShinySpeciesList,
  getShinySpeciesByName
} from '@/data/config/shinyBreedingData.js'

export const SHINY_SPECIES = SHINY_BREEDING_SPECIES
export const GROUP_ORDER = EGG_GROUP_ORDER
export const PRESET_DEMO = DEMO_PRESET

/* ================================================================
 * 一、权威概率常数
 * ================================================================ */
export const BREEDING_PROB_RULES = {
  shiny: {
    paternalVisible: 0.0072, // 父系外显异色 0.72%
    maternalVisible: 0.0072, // 母系外显异色 0.72%
    hidden: 0.0100, // 隐性基础通道 1.00%（双非异色依然有 1%）
  },
  radiant: {
    paternalVisible: 0.0036, // 父系外显炫彩 0.36%
    maternalVisible: 0.0036, // 母系外显炫彩 0.36%
    hidden: 0.0, // 无隐性通道：双非炫彩时绝对为 0%
  },
  bloodlineInherit: 0.70, // 血脉继承 70%
  nature: { paternal: 0.30, maternal: 0.30, random: 0.40 }, // 性格
  stat: { notInherit: 0.10, inherit: 0.90, float: 0.30 }, // 资质
}

/* ================================================================
 * 二、预设 2xN 小窝拓扑网格（曼哈顿距离 <= 5 视为连通通道）
 * ================================================================ */
export const NEST_LAYOUT_PRESETS = {
  6: [
    { id: 0, x: 0, y: 0 }, { id: 1, x: 2, y: 0 }, { id: 2, x: 4, y: 0 },
    { id: 3, x: 0, y: 2 }, { id: 4, x: 2, y: 2 }, { id: 5, x: 4, y: 2 },
  ],
  8: [
    { id: 0, x: 0, y: 0 }, { id: 1, x: 2, y: 0 }, { id: 2, x: 4, y: 0 }, { id: 3, x: 6, y: 0 },
    { id: 4, x: 0, y: 2 }, { id: 5, x: 2, y: 2 }, { id: 6, x: 4, y: 2 }, { id: 7, x: 6, y: 2 },
  ],
  10: [
    { id: 0, x: 0, y: 0 }, { id: 1, x: 2, y: 0 }, { id: 2, x: 4, y: 0 }, { id: 3, x: 6, y: 0 }, { id: 4, x: 8, y: 0 },
    { id: 5, x: 0, y: 2 }, { id: 6, x: 2, y: 2 }, { id: 7, x: 4, y: 2 }, { id: 8, x: 6, y: 2 }, { id: 9, x: 8, y: 2 },
  ],
  12: [
    { id: 0, x: 0, y: 0 }, { id: 1, x: 2, y: 0 }, { id: 2, x: 4, y: 0 }, { id: 3, x: 6, y: 0 },
    { id: 4, x: 0, y: 2 }, { id: 5, x: 2, y: 2 }, { id: 6, x: 4, y: 2 }, { id: 7, x: 6, y: 2 },
    { id: 8, x: 0, y: 4 }, { id: 9, x: 2, y: 4 }, { id: 10, x: 4, y: 4 }, { id: 11, x: 6, y: 4 },
  ],
}

export function buildLayout2xN(nestCount = 10) {
  const rows = 2
  const cols = Math.ceil(nestCount / rows)
  const layout = []
  for (let i = 0; i < nestCount; i++) {
    const r = Math.floor(i / cols)
    const c = i % cols
    layout.push({ id: i, x: c * 2, y: r * 2 })
  }
  return layout
}

export function getManhattanDist(p1, p2) {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y)
}

export const NEST_ADJACENT_THRESHOLD = 5

export function buildAdjacency(nests) {
  const n = nests.length
  const adj = Array.from({ length: n }, () => [])
  const edges = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = getManhattanDist(nests[i], nests[j])
      if (dist <= NEST_ADJACENT_THRESHOLD) {
        adj[i].push(j)
        adj[j].push(i)
        edges.push({ u: i, v: j, dist })
      }
    }
  }
  return { adj, edges }
}

function getCombinations(arr, k) {
  const result = []
  const n = arr.length
  if (k <= 0 || k > n) return result
  const idx = Array.from({ length: k }, (_, i) => i)
  while (true) {
    result.push(idx.map((i) => arr[i]))
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) break
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
  }
  return result
}

/* ================================================================
 * 三、公母最大割划分（Bipartite Maximum Cut）
 * ================================================================ */
export function solveMaxCut(layout, edges, mCount, fixed = {}) {
  const n = layout.length
  const indices = Array.from({ length: n }, (_, i) => i)

  let bestMaleIndices = null
  let maxCut = -1

  const combos = getCombinations(indices, mCount)
  for (let ci = 0; ci < combos.length; ci++) {
    const maleSet = new Set(combos[ci])
    let conflict = false
    for (const id in fixed) {
      const g = fixed[id]
      if (g === 'M' && !maleSet.has(Number(id))) { conflict = true; break }
      if (g === 'F' && maleSet.has(Number(id))) { conflict = true; break }
    }
    if (conflict) continue

    let cuts = 0
    for (const e of edges) {
      if (maleSet.has(e.u) !== maleSet.has(e.v)) cuts++
    }
    if (cuts > maxCut) {
      maxCut = cuts
      bestMaleIndices = maleSet
    }
  }

  const genders = {}
  if (!bestMaleIndices) {
    for (let i = 0; i < n; i++) genders[i] = i % 2 === 0 ? 'M' : 'F'
    return { genders, cutCount: -1 }
  }
  for (let i = 0; i < n; i++) genders[i] = bestMaleIndices.has(i) ? 'M' : 'F'
  return { genders, cutCount: maxCut }
}

/* ================================================================
 * 四、单对概率与遗传计算
 * ================================================================ */
const g = BREEDING_PROB_RULES

export function calcPairProbabilities(malePet, femalePet) {
  const maleShiny = !!(malePet && malePet.isShiny)
  const femaleShiny = !!(femalePet && femalePet.isShiny)
  const maleRadiant = !!(malePet && malePet.isRadiant)
  const femaleRadiant = !!(femalePet && femalePet.isRadiant)

  const shinyChance =
    g.shiny.hidden +
    (maleShiny ? g.shiny.paternalVisible : 0) +
    (femaleShiny ? g.shiny.maternalVisible : 0)

  const radiantChance =
    g.radiant.hidden +
    (maleRadiant ? g.radiant.paternalVisible : 0) +
    (femaleRadiant ? g.radiant.maternalVisible : 0)

  const doubleFullChance = shinyChance * radiantChance
  const bloodlineChance = g.bloodlineInherit

  const maleGroups = (malePet && (malePet.eggGroups || malePet.groups)) || []
  const femaleGroups = (femalePet && (femalePet.eggGroups || femalePet.groups)) || []
  const sharedGroups = femaleGroups.filter((x) => maleGroups.includes(x)).filter((x) => x !== '未发现')
  const isCompatible = sharedGroups.length > 0

  return {
    shinyChance: round6(shinyChance),
    radiantChance: round6(radiantChance),
    doubleFullChance: round6(doubleFullChance),
    bloodlineChance,
    natureInherit: { paternal: g.nature.paternal, maternal: g.nature.maternal, random: g.nature.random },
    statRule: { notInherit: g.stat.notInherit, float: g.stat.float },
    isCompatible,
    sharedGroups,
    targetChildSpecies: femalePet
      ? { petId: femalePet.petId, name: femalePet.name, eggGroups: femaleGroups, icon: femalePet.icon }
      : null,
    parentShiny: { male: maleShiny, female: femaleShiny },
    parentRadiant: { male: maleRadiant, female: femaleRadiant },
  }
}

function round6(x) {
  return Math.round(x * 1e6) / 1e6
}

/* ================================================================
 * 五、物种池与库存模型
 * ================================================================ */

export function getBreedablePetPool() {
  return SHINY_BREEDING_SPECIES.map((s) => ({
    petId: s.petId,
    name: s.name,
    label: s.label,
    aliases: s.aliases,
    eggGroups: s.groups,
    icon: s.icon,
    glassName: s.glassName,
    hasShiny: true,
    isShiny: false,
    isRadiant: false,
  }))
}

export function getShinyTargetPool() {
  return getBreedablePetPool()
}

/** 兼容导出常用母种 */
export const COMMON_BREEDING_MOTHERS = [
  '治愈兔', '雪影娃娃', '幽影树', '恶魔叮', '奇丽草', '粉粉星',
  '菊花梨', '公平鸽', '小夜', '小丑豆豆', '格兰种子', '利灯鱼',
]

function buildInventory(basePool, inventory = {}, wishes = {}) {
  const byId = {}
  const maleCandidates = []
  const femaleCandidates = []
  const wishMap = {}

  for (const p of basePool) {
    const inv = inventory[p.petId] || inventory[p.name] || {}
    const wish = wishes[p.petId] || wishes[p.name] || 'owned'
    wishMap[p.petId] = wish
    wishMap[p.name] = wish
    byId[p.petId] = p

    // 雄性个体添加
    if (inv.radiantM > 0 && inv.shinyM > 0) {
      maleCandidates.push({ ...p, isShiny: true, isRadiant: true, tag: '双满♂' })
    }
    if (inv.radiantM > 0) {
      maleCandidates.push({ ...p, isShiny: false, isRadiant: true, tag: '炫彩♂' })
    }
    if (inv.shinyM > 0) {
      maleCandidates.push({ ...p, isShiny: true, isRadiant: false, tag: '异色♂' })
    }
    if (inv.normalM > 0 || (!inv.shinyM && !inv.radiantM)) {
      maleCandidates.push({ ...p, isShiny: false, isRadiant: false, tag: '普通♂' })
    }

    // 雌性个体添加（母本决定产出子代种族）
    if (inv.radiantF > 0 && inv.shinyF > 0) {
      femaleCandidates.push({ ...p, isShiny: true, isRadiant: true, tag: '双满♀' })
    }
    if (inv.radiantF > 0) {
      femaleCandidates.push({ ...p, isShiny: false, isRadiant: true, tag: '炫彩♀' })
    }
    if (inv.shinyF > 0) {
      femaleCandidates.push({ ...p, isShiny: true, isRadiant: false, tag: '异色♀' })
    }
    if (inv.normalF > 0 || (!inv.shinyF && !inv.radiantF)) {
      femaleCandidates.push({ ...p, isShiny: false, isRadiant: false, tag: '普通♀' })
    }
  }

  return { byId, maleCandidates, femaleCandidates, wishMap }
}

function compatScore(pet, targetPool) {
  let score = 0
  for (const t of targetPool) {
    if (!pet || !t) continue
    const shared = pet.eggGroups.filter((x) => t.eggGroups.includes(x))
    if (shared.length) score += Math.pow(2, shared.length)
  }
  return score
}

/* ================================================================
 * 六、多目标智能摆窝求解
 * ================================================================ */

/**
 * 求解异色/炫彩繁育方案
 *
 * @param {Object} options
 * @param {number} [options.nestCount=10] 小窝总数
 * @param {number} [options.maleCount=4] 雄性窝数
 * @param {'variety'|'wanted'|'probability'} [options.mode='variety'] 模式
 * @param {Object} [options.inventory={}] 用户填写的库存
 * @param {Object} [options.wishes={}] 用户填写的意愿
 * @param {Object} [options.pinnedGenders={}] 固定公母位
 * @param {Function} [options.onFrame] 分帧进度回调
 */
export function solveShinyBreedingPlan(options = {}) {
  const nestCount = Math.max(2, Math.min(16, Number(options.nestCount) || 10))
  const maleCountRaw =
    options.maleCount === 'auto' ? Math.round(nestCount / 2) : Number(options.maleCount) || Math.round(nestCount / 2)
  const maleCount = Math.max(0, Math.min(maleCountRaw, nestCount - 1))
  const mode = options.mode || 'variety'
  const inventory = options.inventory || {}
  const wishes = options.wishes || {}
  const pinnedGenders = options.pinnedGenders || {}
  const onFrame = typeof options.onFrame === 'function' ? options.onFrame : null

  const layout = buildLayout2xN(nestCount)
  const { adj, edges } = buildAdjacency(layout)

  const { genders, cutCount } = solveMaxCut(layout, edges, maleCount, pinnedGenders)
  const femaleNests = layout.filter((n) => genders[n.id] === 'F')
  const maleNests = layout.filter((n) => genders[n.id] === 'M')

  const basePool = getBreedablePetPool()
  const inv = buildInventory(basePool, inventory, wishes)

  let maleCandidates = inv.maleCandidates
  let femaleCandidates = inv.femaleCandidates

  const emitFrame = (p) => { if (onFrame) onFrame(p) }
  emitFrame(0.15)

  function wishMapIsMissing(pet) {
    if (!pet) return false
    return (wishes[pet.petId] || wishes[pet.name] || 'owned') === 'missing'
  }

  const scoreVarietyFitness = (pet) => {
    let s = 0
    if (wishMapIsMissing(pet)) s += 120
    if (pet.isShiny) s += 40
    if (pet.isRadiant) s += 30
    s += pet.eggGroups.length * 15
    return s
  }

  const scoreWantedFitness = (pet) => {
    let s = 0
    if (wishMapIsMissing(pet)) s += 80
    if (pet.isShiny) s += 50
    if (pet.isRadiant) s += 40
    s += pet.eggGroups.length * 20
    return s
  }

  const scoreProbFitness = (pet) => {
    let s = 0
    if (pet.isShiny) s += 80
    if (pet.isRadiant) s += 70
    if (wishMapIsMissing(pet)) s += 30
    return s
  }

  const planForMode = (maleList, femaleList, modeName = mode) => {
    const sortFn =
      modeName === 'variety'
        ? (a, b) => scoreVarietyFitness(b) - scoreVarietyFitness(a)
        : modeName === 'wanted'
          ? (a, b) => scoreWantedFitness(b) - scoreWantedFitness(a)
          : (a, b) => scoreProbFitness(b) - scoreProbFitness(a)

    const sortedFemales = [...femaleList].sort(sortFn)

    // 母窝排布：尽量保证多样性与想生优先
    const femaleAssign = {}
    const usedFemaleSpecies = new Set()
    femaleNests.forEach((nest, idx) => {
      // 优先挑未选过的想生母本
      let pick = sortedFemales.find((f) => !usedFemaleSpecies.has(f.name) && wishMapIsMissing(f))
      if (!pick) {
        pick = sortedFemales.find((f) => !usedFemaleSpecies.has(f.name))
      }
      if (!pick) {
        pick = sortedFemales[idx % Math.max(1, sortedFemales.length)] || femaleList[0]
      }
      femaleAssign[nest.id] = pick
      usedFemaleSpecies.add(pick.name)
    })

    // 公窝排布：能覆盖相邻母窝蛋组，且优先有异色/炫彩加成的种公
    const maleAssign = {}
    const usedMale = new Set()
    maleNests.forEach((mn) => {
      const neighborFemales = adj[mn.id]
        .filter((nid) => genders[nid] === 'F')
        .map((nid) => femaleAssign[nid])
        .filter(Boolean)

      let best = null
      let bestScore = -100

      for (const cand of maleList) {
        let s = 0
        let connectedCount = 0
        for (const f of neighborFemales) {
          const sh = cand.eggGroups.filter((x) => f.eggGroups.includes(x))
          if (sh.length) {
            connectedCount++
            s += 30 + sh.length * 10
            s += compatScore(cand, [f]) * 2
          }
        }
        if (connectedCount === 0) s -= 50
        if (cand.isShiny) s += 45
        if (cand.isRadiant) s += 35
        if (usedMale.has(cand.name + cand.tag)) s -= 12

        if (s > bestScore) {
          bestScore = s
          best = cand
        }
      }
      if (best) usedMale.add(best.name + best.tag)
      maleAssign[mn.id] = best || maleList[0]
    })

    // 生成邻接配对
    const pairs = []
    const seen = new Set()
    for (const e of edges) {
      const u = genders[e.u]
      const v = genders[e.v]
      if (u === v) continue
      const maleId = u === 'M' ? e.u : e.v
      const femaleId = u === 'F' ? e.u : e.v
      const mp = maleAssign[maleId]
      const fp = femaleAssign[femaleId]
      if (!mp || !fp) continue
      const prob = calcPairProbabilities(mp, fp)
      if (!prob.isCompatible) continue
      const key = femaleId + '-' + maleId
      if (seen.has(key)) continue
      seen.add(key)

      const maleNestPos = layout[maleId] || {}
      const femaleNestPos = layout[femaleId] || {}
      pairs.push({
        femaleNestId: femaleId,
        maleNestId: maleId,
        malePet: mp,
        femalePet: fp,
        sharedGroups: prob.sharedGroups,
        targetChild: prob.targetChildSpecies,
        shinyChance: prob.shinyChance,
        radiantChance: prob.radiantChance,
        doubleFullChance: prob.doubleFullChance,
        isNewUnlock: wishMapIsMissing(fp),
        distance: e.dist,
        maleCoord: { x: maleNestPos.x, y: maleNestPos.y },
        femaleCoord: { x: femaleNestPos.x, y: femaleNestPos.y },
      })
    }

    return { maleAssign, femaleAssign, pairs }
  }

  emitFrame(0.5)

  // Top 3 推荐方案
  const plans = []
  plans.push({ ...planForMode(maleCandidates, femaleCandidates, mode), label: '主推荐方案' })

  // 备选 1：高概率偏好（尽量上异色/炫彩个体）
  const maleByShiny = [...maleCandidates].sort((a, b) => (b.isShiny ? 2 : 0) + (b.isRadiant ? 1 : 0) - ((a.isShiny ? 2 : 0) + (a.isRadiant ? 1 : 0)))
  const femaleByShiny = [...femaleCandidates].sort((a, b) => (b.isShiny ? 2 : 0) + (b.isRadiant ? 1 : 0) - ((a.isShiny ? 2 : 0) + (a.isRadiant ? 1 : 0)))
  plans.push({ ...planForMode(maleByShiny, femaleByShiny, 'probability'), label: '高概率优选' })

  // 备选 2：广覆盖偏好（最大化覆盖不同蛋组）
  plans.push({ ...planForMode(maleCandidates, femaleCandidates, 'wanted'), label: '高连通均衡' })

  emitFrame(0.85)

  const solutions = plans.map((pl, idx) => {
    const nests = layout.map((n) => {
      const isFemale = genders[n.id] === 'F'
      const pet = isFemale ? pl.femaleAssign[n.id] : pl.maleAssign[n.id]
      const conn = pl.pairs.filter((p) => p.femaleNestId === n.id || p.maleNestId === n.id)
      return {
        id: n.id,
        x: n.x,
        y: n.y,
        gender: genders[n.id],
        pet: pet ? { ...pet, gender: isFemale ? 'F' : 'M' } : null,
        wishStatus: pet ? wishes[pet.petId] || wishes[pet.name] || 'owned' : 'owned',
        active: conn.length > 0,
        connectionCount: conn.length,
      }
    })

    const coveredNew = new Set()
    let expectedEggs = 0
    let totalShinyRate = 0
    let totalRadiantRate = 0
    let singleShinyPairs = 0
    let doubleShinyPairs = 0
    let hiddenOnlyPairs = 0
    let missShinyAll = 1

    for (const p of pl.pairs) {
      expectedEggs += 1
      const isNew = wishMapIsMissing(p.femalePet)
      p.isNewUnlock = isNew
      if (isNew && p.targetChild) {
        coveredNew.add(p.targetChild.name)
      }
      totalShinyRate += p.shinyChance
      totalRadiantRate += p.radiantChance

      const mShiny = !!(p.malePet && p.malePet.isShiny)
      const fShiny = !!(p.femalePet && p.femalePet.isShiny)
      if (mShiny && fShiny) doubleShinyPairs++
      else if (mShiny || fShiny) singleShinyPairs++
      else hiddenOnlyPairs++
      missShinyAll *= 1 - p.shinyChance
    }

    const avgShiny = pl.pairs.length ? totalShinyRate / pl.pairs.length : 0.0172
    const avgRadiant = pl.pairs.length ? totalRadiantRate / pl.pairs.length : 0

    return {
      solutionId: idx + 1,
      title: pl.label,
      pairs: pl.pairs,
      nests,
      summary: {
        newShinySpecies: coveredNew.size,
        expectedEggCount: expectedEggs,
        avgShinyRate: round6(avgShiny),
        avgRadiantRate: round6(avgRadiant),
        validPairs: pl.pairs.length,
        activeNests: pl.pairs.reduce((s, p) => s + 2, 0),
        totalNests: nestCount,
        cutCount: cutCount,
        mode,
        singleShinyPairs,
        doubleShinyPairs,
        hiddenOnlyPairs,
        cumulativeShinyChance: pl.pairs.length ? round6(1 - missShinyAll) : 0,
        deadNestIds: nests.filter((n) => n.pet && n.connectionCount === 0).map((n) => n.id),
      },
    }
  })

  emitFrame(1)

  const result = {
    solutions,
    input: { nestCount, maleCount, mode, adjacentThreshold: NEST_ADJACENT_THRESHOLD },
    alternatives: solutions.map((s) => s.solutionId),
  }

  if (options.async) {
    return Promise.resolve(result)
  }
  return result
}

export function solveShinyBreedingPlanAsync(options = {}, progressCb) {
  return new Promise((resolve) => {
    const run = () => {
      const result = solveShinyBreedingPlan({ ...options, onFrame: progressCb, async: true })
      resolve(result)
    }
    if (typeof setTimeout !== 'undefined') setTimeout(run, 16)
    else run()
  })
}

/**
 * 历史兼容易用入口
 */
export function solveBreedingPlan(options = {}) {
  const t0 = Date.now()
  const nestCount = Number(options.nestCount) || 10
  const maleCount = options.maleCount != null ? Number(options.maleCount) : 4
  const mode = options.mode || 'variety'

  const res = solveShinyBreedingPlan({
    nestCount,
    maleCount,
    mode: mode === 'target' ? 'variety' : mode,
    inventory: options.inventory || {},
    wishes: options.wishes || {},
  })

  const best = (res.solutions && res.solutions[0]) || { nests: [], pairs: [], summary: {} }
  const validPairsCount = (best.pairs || []).length
  const cutCount = (best.summary && best.summary.cutCount) || validPairsCount
  const connectivityRate = Math.min(100, Math.round((cutCount / Math.max(1, nestCount)) * 100))
  const solveTimeMs = Math.max(1, Date.now() - t0)

  return {
    nests: best.nests || [],
    pairs: best.pairs || [],
    metrics: {
      solveTimeMs,
      validPairsCount,
      connectivityRate,
      avgShinyRate: ((best.summary && best.summary.avgShinyRate) || 0.0172) * 100,
    },
    summary: best.summary || {},
  }
}