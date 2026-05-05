function normalizePath(src = '') {
  const value = String(src || '').trim()
  if (!value) return ''
  if (value.startsWith('/')) return value
  if (value.startsWith('static/')) return '/' + value
  return value
}

export function isLocalStaticAsset(src = '') {
  return normalizePath(src).startsWith('/static/')
}

export function resolveAssetPath(src = '') {
  const value = normalizePath(src)
  if (!value) return ''
  if (isLocalStaticAsset(value)) {
    if (/%[0-9A-Fa-f]{2}/.test(value)) {
      return value
    }
    return encodeURI(value)
  }
  return value
}
