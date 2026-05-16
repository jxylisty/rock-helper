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

  if (typeof plus !== 'undefined') {
    return uniqueUrls([originalValue, encodedWebValue])
  }

  return uniqueUrls([encodedWebValue, originalValue])
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

  return uniqueUrls(
    REMOTE_ASSET_BASES.flatMap((base) => [
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
  // Static images are shipped in static/web, so local packaged assets are the
  // safest first choice everywhere; remote URLs only act as fallback.
  if (typeof plus !== 'undefined') return false
  if (typeof window === 'undefined' || !window.location) return true

  const host = String(window.location.host || '').toLowerCase()
  if (!host) return true
  if (host.includes('localhost') || host.includes('127.0.0.1')) return true
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(host)) return true
  if (host.includes('devtools') || host.includes('hbuilder') || host.includes('local')) return true
  return false
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
