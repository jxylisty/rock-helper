import { typeEffectChart, normalizeAttr, getAttrMultiplier } from '@/data/game_math.js'

function uniq(list) {
  return Array.from(new Set(list))
}

function normalizeTypeEntry(type) {
  if (!type) return null
  if (typeof type === 'string') {
    const key = normalizeAttr(type)
    return key ? { key, label: key, color: '' } : null
  }
  const key = normalizeAttr(type.key || type.type || type.label)
  if (!key) return null
  return {
    key,
    label: type.label || key,
    color: type.color || ''
  }
}

function getLabelForMultiplier(value) {
  if (value === 3) return '3x'
  if (value === 2) return '2x'
  if (value === 1 / 2) return '1/2x'
  if (value === 1 / 3) return '1/3x'
  return `${value}x`
}

function getLineWidthForMultiplier(value) {
  if (value === 3 || value === 1 / 3) return 7
  if (value === 2 || value === 1 / 2) return 5
  return 4
}

export function getTypeList(relationTable = typeEffectChart) {
  return Object.keys(relationTable || {})
    .map((key) => normalizeAttr(key))
    .filter(Boolean)
}

export function calculateDefenseMultiplier(attackType, defenseType1, defenseType2 = '', relationTable = typeEffectChart) {
  const attack = normalizeAttr(attackType)
  if (!attack) return 1
  const defenseAttrs = [defenseType1, defenseType2].map(normalizeAttr).filter(Boolean)
  if (!defenseAttrs.length) return 1
  return getAttrMultiplier(attack, defenseAttrs)
}

export function getSingleTypeEdges(type, relationTable = typeEffectChart) {
  const activeType = normalizeAttr(type)
  const typeList = getTypeList(relationTable)
  if (!activeType) return []

  const edges = []

  typeList.forEach((other) => {
    if (other === activeType) return

    const forward = getAttrMultiplier(activeType, [other])
    const backward = getAttrMultiplier(other, [activeType])
    const forwardColor = forward > 1 ? 'strong' : forward < 1 ? 'weak' : ''
    const backwardColor = backward > 1 ? 'strong' : backward < 1 ? 'weak' : ''

    if (forwardColor && backwardColor) {
      if (forwardColor === backwardColor) {
        const merged = forwardColor === 'strong' ? Math.max(forward, backward) : Math.min(forward, backward)
        if (merged !== 1) {
          edges.push({
            from: activeType,
            to: other,
            direction: 'double',
            colorType: forwardColor,
            multiplier: merged,
            label: forwardColor === 'strong' ? getLabelForMultiplier(merged) : getLabelForMultiplier(merged),
            lineWidth: getLineWidthForMultiplier(merged)
          })
        }
      }
      return
    }

    if (forwardColor) {
      edges.push({
        from: activeType,
        to: other,
        direction: 'out',
        colorType: forwardColor,
        multiplier: forward,
        label: getLabelForMultiplier(forward),
        lineWidth: getLineWidthForMultiplier(forward)
      })
      return
    }

    if (backwardColor) {
      edges.push({
        from: other,
        to: activeType,
        direction: 'in',
        colorType: backwardColor,
        multiplier: backward,
        label: getLabelForMultiplier(backward),
        lineWidth: getLineWidthForMultiplier(backward)
      })
    }
  })

  return edges.sort((a, b) => {
    const score = (edge) => (edge.colorType === 'strong' ? 100 : 50) + edge.lineWidth
    return score(b) - score(a)
  })
}

export function getMutualEdges(relationTable = typeEffectChart) {
  const typeList = getTypeList(relationTable)
  const pairs = []
  const seen = new Set()

  typeList.forEach((left, leftIndex) => {
    typeList.slice(leftIndex + 1).forEach((right) => {
      const key = [left, right].sort().join('|')
      if (seen.has(key)) return
      seen.add(key)

      const forward = getAttrMultiplier(left, [right])
      const backward = getAttrMultiplier(right, [left])
      if (forward === 1 || backward === 1) return

      const sameSide = (forward > 1 && backward > 1) || (forward < 1 && backward < 1)
      if (!sameSide) return

      const colorType = forward > 1 ? 'strong' : 'weak'
      const merged = forward > 1 ? Math.max(forward, backward) : Math.min(forward, backward)

      pairs.push({
        left,
        right,
        direction: colorType === 'strong' ? 'double-strong' : 'double-weak',
        colorType,
        multiplier: merged,
        label: getLabelForMultiplier(merged),
        lineWidth: getLineWidthForMultiplier(merged)
      })
    })
  })

  return pairs
}

export function getDefenseGraphEdges(defenseType1, defenseType2 = '', relationTable = typeEffectChart) {
  const defenseA = normalizeAttr(defenseType1)
  const defenseB = normalizeAttr(defenseType2)
  const typeList = getTypeList(relationTable)
  const edges = []

  typeList.forEach((attackType) => {
    const multiplier = calculateDefenseMultiplier(attackType, defenseA, defenseB, relationTable)
    if (multiplier === 1) return

    edges.push({
      from: attackType,
      to: 'center',
      direction: 'to-center',
      colorType: multiplier > 1 ? 'strong' : 'weak',
      multiplier,
      label: getLabelForMultiplier(multiplier),
      lineWidth: getLineWidthForMultiplier(multiplier)
    })
  })

  return edges.sort((a, b) => {
    const score = (edge) => (edge.colorType === 'strong' ? 100 : 50) + edge.lineWidth
    return score(b) - score(a)
  })
}

export function getCircularLayout(typeList, width, height) {
  const items = (typeList || [])
    .map(normalizeTypeEntry)
    .filter(Boolean)

  const safeWidth = Number(width) || 320
  const safeHeight = Number(height) || 320
  const centerX = safeWidth / 2
  const centerY = safeHeight / 2
  const nodeSize = Math.max(60, Math.min(84, Math.floor(Math.min(safeWidth, safeHeight) / 5.4)))
  const outerRadius = Math.max(78, Math.min(safeWidth, safeHeight) / 2 - nodeSize * 1.05)
  const ringCount = items.length <= 7 ? 1 : items.length <= 13 ? 2 : 3
  const ringGap = ringCount === 1 ? 0 : (outerRadius - 18) / ringCount
  const counts = Array.from({ length: ringCount }, (_, index) => {
    const base = Math.floor(items.length / ringCount)
    return base + (index < items.length % ringCount ? 1 : 0)
  })

  const nodes = []
  let cursor = 0

  counts.forEach((count, ringIndex) => {
    if (!count) return
    const radius = Math.max(38, outerRadius - ringIndex * ringGap)
    const angleOffset = -Math.PI / 2 + (ringIndex % 2 === 1 ? Math.PI / count : 0)
    for (let i = 0; i < count; i += 1) {
      const item = items[cursor++]
      if (!item) continue
      const angle = angleOffset + (Math.PI * 2 * i) / count
      nodes.push({
        ...item,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        radius: nodeSize / 2,
        ringIndex
      })
    }
  })

  return {
    nodes,
    center: { x: centerX, y: centerY },
    nodeSize,
    radius: outerRadius
  }
}

export function getDefenseLayout(typeList, centerNode, width, height) {
  const items = (typeList || [])
    .map(normalizeTypeEntry)
    .filter(Boolean)

  const safeWidth = Number(width) || 320
  const safeHeight = Number(height) || 320
  const centerX = safeWidth / 2
  const centerY = safeHeight / 2
  const center = centerNode || {
    key: 'center',
    label: '合成节点',
    x: centerX,
    y: centerY,
    radius: 44
  }
  const nodeSize = Math.max(60, Math.min(82, Math.floor(Math.min(safeWidth, safeHeight) / 5.8)))
  const outerRadius = Math.max(76, Math.min(safeWidth, safeHeight) / 2 - nodeSize * 1.2)
  const ringCount = items.length <= 7 ? 1 : items.length <= 13 ? 2 : 3
  const ringGap = ringCount === 1 ? 0 : (outerRadius - 18) / ringCount
  const counts = Array.from({ length: ringCount }, (_, index) => {
    const base = Math.floor(items.length / ringCount)
    return base + (index < items.length % ringCount ? 1 : 0)
  })

  const nodes = []
  let cursor = 0

  counts.forEach((count, ringIndex) => {
    if (!count) return
    const radius = Math.max(42, outerRadius - ringIndex * ringGap)
    const angleOffset = -Math.PI / 2 + (ringIndex % 2 === 1 ? Math.PI / count : 0)
    for (let i = 0; i < count; i += 1) {
      const item = items[cursor++]
      if (!item) continue
      const angle = angleOffset + (Math.PI * 2 * i) / count
      nodes.push({
        ...item,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        radius: nodeSize / 2,
        ringIndex
      })
    }
  })

  return {
    nodes,
    center: {
      ...center,
      x: centerX,
      y: centerY,
      radius: Math.max(center.radius || 42, 46)
    },
    nodeSize,
    radius: outerRadius
  }
}

