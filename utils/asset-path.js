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

function shouldPreferLocalStatic() {
  if (typeof window === 'undefined' || !window.location) return false
  const host = String(window.location.host || '').toLowerCase()
  return host.includes('localhost') || host.includes('127.0.0.1')
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
    const webBase = getWebAssetBase() || REMOTE_ASSET_BASES[0]
    if (webBase) {
      const relative = value.replace(/^\//, '')
      if (/%[0-9A-Fa-f]{2}/.test(relative)) {
        return webBase + relative
      }
      return webBase + encodeURI(relative)
    }
    if (/%[0-9A-Fa-f]{2}/.test(value)) {
      return value
    }
    return encodeURI(value)
  }
  return value
}

export function getAssetCandidateUrls(src = '') {
  const value = normalizePath(src)
  if (!value) return []
  if (!isLocalStaticAsset(value)) return [value]

  const relative = value.replace(/^\//, '')
  const encoded = /%[0-9A-Fa-f]{2}/.test(relative) ? relative : encodeURI(relative)
  const remoteCandidates = REMOTE_ASSET_BASES.map((base) => base + encoded)
  return shouldPreferLocalStatic() ? [value, ...remoteCandidates] : [...remoteCandidates, value]
}
