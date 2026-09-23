export function safeBack(fallbackUrl = '/pages/index') {
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

// 详情页节流导航：连点卡片会触发 "Navigation cancelled" 竞争，600ms 内只放行一次
let _detailNavLockUntil = 0

export function goDetailPage(id) {
  const now = Date.now()
  if (now < _detailNavLockUntil) return
  _detailNavLockUntil = now + 600
  uni.navigateTo({ url: '/pages/detail?id=' + id })
}

export function readStorage(key, fallback) {
  const value = uni.getStorageSync(key)
  return value === '' || value === null || value === undefined ? fallback : value
}

export function writeStorage(key, value) {
  uni.setStorageSync(key, value)
}

