const CACHE_KEY = 'pet_config_cache_v1'

function getPetConfigCache() {
  try {
    const raw = uni.getStorageSync(CACHE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    if (typeof data === 'object' && data !== null) return data
    return {}
  } catch (e) {
    return {}
  }
}

function savePetConfig(petId, config) {
  if (!petId) return
  const cache = getPetConfigCache()
  cache[String(petId)] = {
    ...config,
    cachedAt: Date.now()
  }
  try {
    uni.setStorageSync(CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.warn('savePetConfig failed', e)
  }
}

function loadPetConfig(petId) {
  if (!petId) return null
  const cache = getPetConfigCache()
  return cache[String(petId)] || null
}

function clearPetConfig(petId) {
  if (!petId) return
  const cache = getPetConfigCache()
  delete cache[String(petId)]
  try {
    uni.setStorageSync(CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.warn('clearPetConfig failed', e)
  }
}

function clearAllPetConfig() {
  try {
    uni.removeStorageSync(CACHE_KEY)
  } catch (e) {
    console.warn('clearAllPetConfig failed', e)
  }
}

export {
  savePetConfig,
  loadPetConfig,
  clearPetConfig,
  clearAllPetConfig
}
