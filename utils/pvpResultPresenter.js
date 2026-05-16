function formatNumber(value) {
  return Math.round(Number(value || 0))
}

export function formatDamageLine({ damage = 0, hp = 0, reverseDiff = false } = {}) {
  const percent = hp ? Math.round((Number(damage) / Number(hp)) * 100) : 0
  const diff = reverseDiff ? Number(hp) - Number(damage) : Number(damage) - Number(hp)
  const tail = reverseDiff
    ? diff >= 0
      ? `剩余 ${formatNumber(diff)}`
      : `溢出 ${formatNumber(Math.abs(diff))}`
    : diff >= 0
      ? `溢出 ${formatNumber(diff)}`
      : `差 ${formatNumber(Math.abs(diff))}`
  return `${formatNumber(damage)} / ${formatNumber(hp)}，${percent}% ，${tail}`
}

export function presentDamageRecord(record = {}) {
  return {
    ...record,
    damageText: formatDamageLine(record)
  }
}

export default {
  formatDamageLine,
  presentDamageRecord
}
