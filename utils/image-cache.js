import { resolveAssetPath, isLocalStaticAsset } from '@/utils/asset-path.js'

const IMAGE_CACHE_KEY = 'image_cache_map_v1'

export function isPackagedImage(src = '') {
  return isLocalStaticAsset(src)
}

export function resolveImageSource(src = '', fallback = '') {
  const value = resolveAssetPath(src)
  if (value) return value
  return resolveAssetPath(fallback)
}

export function readImageCacheMap() {
  const cached = uni.getStorageSync(IMAGE_CACHE_KEY)
  return cached && typeof cached === 'object' ? cached : {}
}

export function writeImageCacheMap(map) {
  uni.setStorageSync(IMAGE_CACHE_KEY, map || {})
}

export async function ensureCachedRemoteImage(cacheKey, remoteUrl) {
  const url = String(remoteUrl || '').trim()
  if (!url) return ''
  if (isPackagedImage(url)) return resolveImageSource(url)

  const key = String(cacheKey || url)
  const cacheMap = readImageCacheMap()
  const cachedPath = cacheMap[key]
  if (cachedPath) {
    return cachedPath
  }

  const downloadResult = await new Promise((resolve, reject) => {
    uni.downloadFile({
      url,
      success: resolve,
      fail: reject
    })
  })

  if (!downloadResult || downloadResult.statusCode !== 200 || !downloadResult.tempFilePath) {
    return ''
  }

  const saveResult = await new Promise((resolve, reject) => {
    uni.saveFile({
      tempFilePath: downloadResult.tempFilePath,
      success: resolve,
      fail: reject
    })
  })

  if (!saveResult || !saveResult.savedFilePath) {
    return ''
  }

  cacheMap[key] = saveResult.savedFilePath
  writeImageCacheMap(cacheMap)
  return saveResult.savedFilePath
}

export async function clearCachedRemoteImage(cacheKey) {
  const key = String(cacheKey || '').trim()
  if (!key) return

  const cacheMap = readImageCacheMap()
  const savedFilePath = cacheMap[key]
  if (!savedFilePath) return

  await new Promise((resolve) => {
    uni.removeSavedFile({
      filePath: savedFilePath,
      complete: resolve
    })
  })

  delete cacheMap[key]
  writeImageCacheMap(cacheMap)
}

export async function clearAllCachedRemoteImages() {
  const cacheMap = readImageCacheMap()
  const keys = Object.keys(cacheMap)
  for (const key of keys) {
    await clearCachedRemoteImage(key)
  }
}
