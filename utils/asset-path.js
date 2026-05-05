function normalizePath(src = '') {
  const value = String(src || '').trim()
  if (!value) return ''
  if (value.startsWith('/')) return value
  if (value.startsWith('static/')) return '/' + value
  return value
}

const REMOTE_ASSET_BASE = 'https://jxylisty.github.io/rock-helper/'

function getWebAssetBase() {
  return REMOTE_ASSET_BASE
}

export function isLocalStaticAsset(src = '') {
  return normalizePath(src).startsWith('/static/')
}

export function resolveAssetPath(src = '') {
  const value = normalizePath(src)
  if (!value) return ''
  if (isLocalStaticAsset(value)) {
    const webBase = getWebAssetBase() || REMOTE_ASSET_BASE
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
