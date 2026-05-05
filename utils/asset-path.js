function normalizePath(src = '') {
  const value = String(src || '').trim()
  if (!value) return ''
  if (value.startsWith('/')) return value
  if (value.startsWith('static/')) return '/' + value
  return value
}

export const REMOTE_ASSET_BASES = [
  'https://rock-helper.pages.dev/',
  'https://jxylisty.github.io/rock-helper/',
  'https://raw.githubusercontent.com/jxylisty/rock-helper/clean-main/'
]

const LOCAL_WEB_STATIC_PREFIX = '/static/web/'

function shouldPreferLocalStatic() {
  // Desktop/browser dev preview should use local web-only assets first.
  // APP-PLUS runtime should prefer remote hosted assets first.
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
    if (shouldPreferLocalStatic()) {
      const relative = value.replace(/^\/static\//, '')
      return encodeURI(`${LOCAL_WEB_STATIC_PREFIX}${relative}`)
    }

    const webBase = getWebAssetBase() || REMOTE_ASSET_BASES[0]
    if (webBase) {
      const relative = value.replace(/^\//, '')
      if (/%[0-9A-Fa-f]{2}/.test(relative)) {
        return webBase + relative
      }
      return webBase + encodeURI(relative)
    }
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

    const localValue = encodeURI(`${LOCAL_WEB_STATIC_PREFIX}${relative.replace(/^static\//, '')}`)
    const remoteCandidates = REMOTE_ASSET_BASES.map((base) => base + relative)
    return shouldPreferLocalStatic() ? [localValue, ...remoteCandidates] : [...remoteCandidates, localValue]
  }

  const relative = value.replace(/^\//, '')
  const encoded = /%[0-9A-Fa-f]{2}/.test(relative) ? relative : encodeURI(relative)
  const remoteCandidates = REMOTE_ASSET_BASES.map((base) => base + encoded)
  const localValue = encodeURI(`${LOCAL_WEB_STATIC_PREFIX}${relative.replace(/^static\//, '')}`)
  return shouldPreferLocalStatic() ? [localValue, ...remoteCandidates] : [...remoteCandidates, localValue]
}
