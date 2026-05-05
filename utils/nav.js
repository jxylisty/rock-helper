export function safeBack(fallbackUrl = '/pages/index/index') {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: fallbackUrl })
  }
}

export function goPage(url, type = 'navigateTo') {
  if (type === 'switchTab') {
    uni.switchTab({ url })
    return
  }
  if (type === 'reLaunch') {
    uni.reLaunch({ url })
    return
  }
  uni.navigateTo({ url })
}

export function readStorage(key, fallback) {
  const value = uni.getStorageSync(key)
  return value === '' || value === null || value === undefined ? fallback : value
}

export function writeStorage(key, value) {
  uni.setStorageSync(key, value)
}

