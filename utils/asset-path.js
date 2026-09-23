import { PRIMARY_ASSET_BASE, FALLBACK_ASSET_BASES } from '../data/config/asset_config.js'
import petIdMap from '../data/pet/pet_id_map.js'

function normalizePath(src = '') {
  const value = String(src || '').trim()
  if (!value) return ''
  if (value.startsWith('/')) return value
  if (value.startsWith('static/')) return '/' + value
  return value
}

function normalizeWebStaticPath(src = '') {
  const value = normalizePath(src)
  if (!value) return ''
  if (!value.startsWith('/static/')) return value
  if (value.startsWith('/static/static-web/')) return value
  return value.replace(/^\/static\//, '/static/static-web/')
}

function uniqueUrls(list = []) {
  return Array.from(new Set(list.filter(Boolean)))
}

function buildLocalStaticCandidates(src = '') {
  const value = normalizePath(src)
  if (!value || !value.startsWith('/static/')) return []

  const originalValue = /%[0-9A-Fa-f]{2}/.test(value) ? value : encodeURI(value)
  const decodedValue = decodeURI(value)
  const webValue = normalizeWebStaticPath(value)
  const encodedWebValue = /%[0-9A-Fa-f]{2}/.test(webValue) ? webValue : encodeURI(webValue)
  const decodedWebValue = decodeURI(webValue)

  const webpValue = encodedWebValue.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp')
  const webpOriginal = originalValue.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp')
  const webpDecoded = decodedWebValue.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp')
  const webpOrigDecoded = decodedValue.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp')

  return uniqueUrls([
    webpValue,
    webpOriginal,
    webpDecoded,
    webpOrigDecoded,
    encodedWebValue,
    originalValue,
    decodedWebValue,
    decodedValue
  ])
}

function buildRemoteStaticCandidates(relativePath = '') {
  const relative = String(relativePath || '').replace(/^\/+/, '')
  if (!relative) return []

  const webRelative = relative.startsWith('static/static-web/')
    ? relative
    : relative.replace(/^static\//, 'static/static-web/')
  const originalRelative = relative.startsWith('static/static-web/')
    ? relative.replace(/^static\/web\//, 'static/')
    : relative

  const webpRelative = webRelative.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp')
  const webpOriginal = originalRelative.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp')

  return uniqueUrls(
    REMOTE_ASSET_BASES.flatMap((base) => [
      base + webpRelative,
      base + webpOriginal,
      base + webRelative,
      base + originalRelative
    ])
  )
}

export const REMOTE_ASSET_BASES = [PRIMARY_ASSET_BASE, ...FALLBACK_ASSET_BASES].filter(Boolean)

function shouldPreferLocalStatic() {
  return true
}

function getWebAssetBase() {
  if (shouldPreferLocalStatic()) return ''
  return REMOTE_ASSET_BASES[0]
}

export function isLocalStaticAsset(src = '') {
  return normalizePath(src).startsWith('/static/')
}

export function resolveAssetPath(src = '') {
  const value = normalizePath(src)
  if (!value) return ''

  if (isLocalStaticAsset(value)) {
    return buildLocalStaticCandidates(value)[0] || ''
  }

  return value
}

// 从官方 API 路径中提取精灵信息，生成多层级备选地址（Biligame CDN + 本地 WebP 静态镜像）
function getOfficialPetCandidates(url = '') {
  const petMatch = url.match(/\/pets\/(\d+)\/(icon|shiny)\.png/i)
  if (!petMatch) return []
  const petId = petMatch[1]
  const isShiny = petMatch[2].toLowerCase() === 'shiny'
  const info = petIdMap && petIdMap[petId]
  if (!info) return []

  const paddedSeq = String(info.seq).padStart(3, '0')
  const name = info.name || ''
  const form = info.form || ''
  const formSuffix = form ? `（${form}）` : ''
  const shinySuffix = isShiny ? '_异色' : ''

  const candidates = []

  // 1. 本地 static/static-web/pets 全量镜像（离线可用、webp 体积小，优先命中）
  if (name) {
    const filenameWithForm = `${paddedSeq}_${name}${formSuffix}${shinySuffix}.webp`
    const filenameSimple = `${paddedSeq}_${name}${shinySuffix}.webp`

    candidates.push(
      ...buildLocalStaticCandidates(`/static/static-web/pets/${filenameWithForm}`),
      ...buildLocalStaticCandidates(`/static/static-web/pets/${filenameSimple}`)
    )
  }

  // 2. Biligame 镜像 CDN（本地缺图时的远程兑底）
  if (!isShiny && info.biliUrl) {
    candidates.push(info.biliUrl)
  }

  // 3. 历史 static/pets 微镜像（仅 116/117，保留兼容）
  if (name) {
    const filenameWithForm2 = `${paddedSeq}_${name}${formSuffix}${shinySuffix}.webp`
    const filenameSimple2 = `${paddedSeq}_${name}${shinySuffix}.webp`

    candidates.push(
      ...buildLocalStaticCandidates(`/static/pets/${filenameWithForm2}`),
      ...buildLocalStaticCandidates(`/static/pets/${filenameSimple2}`)
    )
  }

  return uniqueUrls(candidates)
}

export function getAssetCandidateUrls(src = '') {
  const value = normalizePath(src)
  if (!value) return []

  // 针对官方精灵资源 URL，本地镜像优先，再依次回退 CDN 与原始 URL
  if (value.includes('/pets/') && value.endsWith('.png')) {
    const petFallbacks = getOfficialPetCandidates(value)
    return uniqueUrls([...petFallbacks, value])
  }

  if (!isLocalStaticAsset(value)) {
    const matchedBase = REMOTE_ASSET_BASES.find((base) => value.startsWith(base))
    if (!matchedBase) return [value]

    const relative = value.slice(matchedBase.length)
    if (!relative.startsWith('static/')) return [value]
    const localCandidates = buildLocalStaticCandidates('/' + relative)
    const remoteCandidates = buildRemoteStaticCandidates(relative)
    return uniqueUrls([...localCandidates, ...remoteCandidates])
  }

  const localCandidates = buildLocalStaticCandidates(value)
  const remoteCandidates = buildRemoteStaticCandidates(value.replace(/^\//, ''))
  return uniqueUrls([...localCandidates, ...remoteCandidates])
}
