import { PRIMARY_ASSET_BASE, FALLBACK_ASSET_BASES } from '@/data/asset_config.js'

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
  if (value.startsWith('/static/web/')) return value
  return value.replace(/^\/static\//, '/static/web/')
}

function uniqueUrls(list = []) {
  return Array.from(new Set(list.filter(Boolean)))
}

function buildLocalStaticCandidates(src = '') {
  const value = normalizePath(src)
  if (!value || !value.startsWith('/static/')) return []

  const originalValue = /%[0-9A-Fa-f]{2}/.test(value) ? value : encodeURI(value)
  const webValue = normalizeWebStaticPath(value)
  const encodedWebValue = /%[0-9A-Fa-f]{2}/.test(webValue) ? webValue : encodeURI(webValue)

  const webpValue = encodedWebValue.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp')
  const webpOriginal = originalValue.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp')

  if (typeof plus !== 'undefined') {
    return uniqueUrls([webpValue, webpOriginal, encodedWebValue, originalValue])
  }

  return uniqueUrls([webpValue, webpOriginal, encodedWebValue, originalValue])
}

function buildRemoteStaticCandidates(relativePath = '') {
  const relative = String(relativePath || '').replace(/^\/+/, '')
  if (!relative) return []

  const webRelative = relative.startsWith('static/web/')
    ? relative
    : relative.replace(/^static\//, 'static/web/')
  const originalRelative = relative.startsWith('static/web/')
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

export const REMOTE_ASSET_BASES = [
  PRIMARY_ASSET_BASE,
  ...FALLBACK_ASSET_BASES
]

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

export function getAssetCandidateUrls(src = '') {
  const value = normalizePath(src)
  if (!value) return []

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
