/**
 * 数据热更新通道（2026-09-16）
 *
 * 目标：精灵数据/技能/克制表更新时，无需重新发版审核，小程序启动时静默拉取最新数据。
 *
 * 机制：
 * 1. 服务端托管一个 manifest.json：{ version, files: { name: { url, sha256 } }, updatedAt }
 *    由 crawler_official_api/update_data.py 的 build-hotupdate 命令产出。
 * 2. 启动时拉取 manifest，与本地 storage 的已安装版本号比对。
 * 3. 版本更新 → 后台下载各 JSON → 校验大小 → 存 storage → 记录版本号。
 * 4. 数据读取层通过 getData('petDetail') 等取数：热更版存在则用之，否则用打包内置数据。
 *
 * 安全与约束：
 * - 仅更新数据（种族值/技能/克制表），不注入任何代码——功能更新照常走微信版本审核。
 * - 全部请求失败静默降级到内置数据，绝不阻塞启动。
 * - manifest 地址通过 HOTUPDATE_MANIFEST_URL 配置（需在微信公众平台配置 request 合法域名）。
 */

// ⚙️ 配置位：部署数据托管后，把这里改成你的 manifest 地址（必须 https、已备案域名，且加入小程序 request 合法域名）
export const HOTUPDATE_MANIFEST_URL = ''
// 可选备用源（manifest 拉取失败时依次尝试）
export const HOTUPDATE_FALLBACK_URLS = []

const STORAGE_KEY_VERSION = 'hotupdate_version_v1'
const STORAGE_KEY_DATA = 'hotupdate_data_v1'
const STORAGE_KEY_META = 'hotupdate_meta_v1'
// 单个数据文件大小上限（10MB，防异常超大响应）
const MAX_FILE_BYTES = 10 * 1024 * 1024

const KNOWN_KEYS = ['petIndex', 'petDetail', 'petSkills', 'skillsData', 'skillIcons', 'typeEffectChart', 'petIdMap']

/** 当前已安装的数据热更版本号（无则 0） */
export function getInstalledDataVersion() {
  try {
    const v = uni.getStorageSync(STORAGE_KEY_VERSION)
    return Number(v) || 0
  } catch (e) {
    return 0
  }
}

/** 读取热更数据（覆盖层） */
export function getHotData(key) {
  try {
    const store = uni.getStorageSync(STORAGE_KEY_DATA)
    if (store && typeof store === 'object' && store[key]) return store[key]
  } catch (e) {}
  return null
}

/** 热更元信息（供"关于"页展示数据版本/更新时间） */
export function getHotMeta() {
  try {
    const meta = uni.getStorageSync(STORAGE_KEY_META)
    if (meta && typeof meta === 'object') return meta
  } catch (e) {}
  return null
}

function httpGetText(url) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      timeout: 15000,
      responseType: 'text',
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(typeof res.data === 'string' ? res.data : JSON.stringify(res.data))
        else reject(new Error('HTTP ' + res.statusCode))
      },
      fail: (err) => reject(new Error((err && err.errMsg) || 'request fail'))
    })
  })
}

function safeParse(text) {
  try {
    return JSON.parse(text)
  } catch (e) {
    return null
  }
}

/**
 * 启动时数据热更检查（全静默，任何异常都不抛出）
 */
export async function checkDataUpdate() {
  const urls = [HOTUPDATE_MANIFEST_URL, ...HOTUPDATE_FALLBACK_URLS].filter(Boolean)
  if (!urls.length) return { status: 'disabled' }
  let manifest = null
  for (const url of urls) {
    try {
      manifest = safeParse(await httpGetText(url))
      if (manifest && manifest.version != null) break
      manifest = null
    } catch (e) { /* 下一个源 */ }
  }
  if (!manifest) return { status: 'manifest-unreachable' }

  const remoteVersion = Number(manifest.version) || 0
  const installed = getInstalledDataVersion()
  if (remoteVersion <= installed) return { status: 'up-to-date', version: installed }

  const files = manifest.files && typeof manifest.files === 'object' ? manifest.files : {}
  const downloaded = {}
  let okCount = 0
  // 相对 URL 基于 manifest 地址解析（manifest 里 files[].url 是 ./xxx.json 形态）
  const manifestBase = (() => {
    const base = urls[0] || ''
    const idx = base.lastIndexOf('/')
    return idx > 0 ? base.slice(0, idx + 1) : base
  })()
  const resolveFileUrl = (fileUrl) => {
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl
    return manifestBase + String(fileUrl).replace(/^\.\//, '')
  }
  for (const key of Object.keys(files)) {
    if (!KNOWN_KEYS.includes(key)) continue // 白名单校验，拒绝未知数据键
    const entry = files[key]
    const fileUrl = entry && entry.url
    if (!fileUrl) continue
    try {
      const text = await httpGetText(resolveFileUrl(fileUrl))
      // 大小守卫（Content-Length 不可靠时按字符串长度近似）
      if (text.length > MAX_FILE_BYTES) throw new Error('too large')
      const parsed = safeParse(text)
      if (!parsed) throw new Error('invalid json')
      downloaded[key] = parsed
      okCount += 1
    } catch (e) {
      // 单文件失败：跳过该文件（保留旧数据），不中断整体
      console.warn('[hotupdate] file failed:', key, e.message)
    }
  }
  if (!okCount) return { status: 'download-failed', version: remoteVersion }

  // 原子写入：新数据与已存热更数据合并（新键覆盖旧键）
  const existing = uni.getStorageSync(STORAGE_KEY_DATA) || {}
  const merged = { ...existing, ...downloaded }
  try {
    uni.setStorageSync(STORAGE_KEY_DATA, merged)
    uni.setStorageSync(STORAGE_KEY_VERSION, remoteVersion)
    uni.setStorageSync(STORAGE_KEY_META, {
      version: remoteVersion,
      updatedAt: manifest.updatedAt || '',
      filesUpdated: Object.keys(downloaded)
    })
  } catch (e) {
    return { status: 'storage-failed' }
  }
  return { status: 'updated', version: remoteVersion, files: Object.keys(downloaded) }
}

/**
 * 数据读取统一入口：热更版优先，缺失回退内置。
 * 用法：const petDetail = getData('petDetail', bundledPetDetail)
 */
export function getData(key, bundledFallback) {
  const hot = getHotData(key)
  if (hot && typeof hot === 'object') return hot
  return bundledFallback
}

export default {
  HOTUPDATE_MANIFEST_URL,
  checkDataUpdate,
  getData,
  getHotData,
  getInstalledDataVersion,
  getHotMeta
}
