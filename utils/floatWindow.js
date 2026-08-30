/**
 * 实时伤害悬浮窗（优先系统级，应用内兜底）
 *
 * 实现一【默认，系统级】：本地 UTS 插件 uni_modules/roco-float-window
 *   Service + WindowManager + 原生 WebView，可覆盖到其他应用（如游戏）之上。
 *   交互：拖动球移动 / 单击球开合面板 / 长按球 700ms 关闭。
 *   需要：自定义调试基座（UTS 插件必须）；首次使用引导开启"显示在其他应用上层"权限。
 *   源码参考开源项目 xx-uts-floating-popup（github.com/lwxgit/Xx-uts-floating-popup）改造。
 *
 * 实现二【兜底，应用内】：plus.webview 子窗口，免权限、标准基座可用，
 *   但只覆盖本 App 页面。UTS 不可用或调用失败时自动回退到该实现。
 */
// #ifdef APP-PLUS
import {
  startFloat,
  closeFloat,
  isOverlayPermissionGranted,
  openOverlayPermissionSetting
} from '@/uni_modules/roco-float-window'
// #endif

export const FLOAT_WINDOW_TAG = 'roco-damage-float'
export const FLOAT_WINDOW_ASSET_PATH = '/static/float/index.html'

const SCREEN_KEY = 'roco_float_screen'
const BALL_SIZE = 56
const EDGE_GAP = 8

let nativeImpl = null
let topmostHooked = false

/**
 * 注册悬浮窗实现（默认为 plus.webview 应用内实现；可被外部覆盖）
 * @param {{available: Function, hasOverlayPermission: Function, openPermissionSettings: Function, open: Function, close: Function}} impl
 */
export function setFloatWindowImpl(impl) {
  nativeImpl = impl
}

/** 悬浮能力是否可用（优先 UTS 系统级，否则应用内） */
export function isSystemOverlayAvailable() {
  // #ifdef APP-PLUS
  if (!nativeImpl) {
    const uts = createUtsFloatImpl()
    nativeImpl = (uts && uts.available()) ? uts : createPlusWebviewImpl()
    if (nativeImpl === uts) {
      console.log('[floatWindow] 使用 UTS 系统级悬浮窗')
    } else {
      console.log('[floatWindow] UTS 不可用，回退应用内悬浮窗')
    }
  }
  // #endif
  return !!(nativeImpl && typeof nativeImpl.available === 'function' && nativeImpl.available())
}

/** 是否已授予悬浮窗权限（UTS 系统级查系统权限；应用内恒为已授权） */
export function hasOverlayPermission() {
  if (!isSystemOverlayAvailable()) return false
  try {
    return !!nativeImpl.hasOverlayPermission()
  } catch (error) {
    return false
  }
}

/** 跳转系统悬浮窗权限设置页（应用内实现为占位） */
export function openOverlayPermissionSettings() {
  if (!isSystemOverlayAvailable()) return false
  try {
    return nativeImpl.openPermissionSettings() !== false
  } catch (error) {
    return false
  }
}

/**
 * 打开实时伤害悬浮面板（已打开则置顶）
 * @returns {{ok: boolean, reason?: 'unsupported'|'error', message?: string}}
 */
export function openDamageFloatWindow() {
  if (!isSystemOverlayAvailable()) {
    return { ok: false, reason: 'unsupported', message: '悬浮面板仅支持 App 端' }
  }
  try {
    nativeImpl.open()
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: 'error', message: String((error && error.message) || error) }
  }
}

/** 关闭实时伤害悬浮面板 */
export function closeDamageFloatWindow() {
  if (!nativeImpl || typeof nativeImpl.close !== 'function') return false
  try {
    nativeImpl.close()
    return true
  } catch (error) {
    return false
  }
}

// #ifdef APP-PLUS
/**
 * UTS 插件实现（系统级悬浮窗，可覆盖到其他应用之上）
 * uni_modules/roco-float-window：Service + WindowManager + 原生 WebView
 */
function createUtsFloatImpl() {
  function hasUts() {
    return typeof startFloat === 'function'
  }

  /** 悬浮窗页面地址：优先运行时真实资源路径，回退 android_asset */
  function pageUrl(query) {
    try {
      const path = plus.io.convertLocalFileSystemURL('_www/static/float/index.html')
      if (path && !/^_www/.test(path)) {
        return 'file://' + path + query
      }
    } catch (error) { /* 回退 android_asset */ }
    let appId = ''
    try {
      appId = (plus.runtime && plus.runtime.appid) || ''
    } catch (error) {
      appId = ''
    }
    return `file:///android_asset/apps/${appId}/www/static/float/index.html${query}`
  }

  return {
    available() {
      return hasUts() && typeof plus !== 'undefined'
    },

    hasOverlayPermission() {
      return !!isOverlayPermissionGranted()
    },

    openPermissionSettings() {
      openOverlayPermissionSetting()
      return true
    },

    open() {
      if (!hasUts()) throw new Error('UTS 悬浮窗插件不可用（需自定义调试基座）')
      const ballUrl = pageUrl('#mode=uts-ball')
      console.log('[floatWindow] ballUrl =', ballUrl)
      startFloat({
        ballUrl,
        panelUrl: pageUrl('#mode=uts-panel')
      }, (res) => {
        if (res && Number(res.code) !== 0) {
          console.error('[floatWindow] UTS startFloat 失败:', res.message)
        } else {
          console.log('[floatWindow] UTS startFloat ok')
        }
      })
    },

    close() {
      if (!hasUts()) return
      closeFloat()
    }
  }
}

/**
 * plus.webview 应用内悬浮实现。
 * 全部调用集中在 createPlusWebviewImpl 闭包内，出错时抛出并由上层转成提示。
 */
function createPlusWebviewImpl() {
  function getWv() {
    try {
      return plus.webview.getWebviewById(FLOAT_WINDOW_TAG)
    } catch (error) {
      return null
    }
  }

  /** 失败原因直接提示到界面（避免静默失败，用户看不到 console） */
  function toast(message) {
    console.error('[floatWindow]', message)
    try {
      if (typeof uni !== 'undefined' && uni.showToast) {
        uni.showToast({ title: String(message).slice(0, 40), icon: 'none' })
      }
    } catch (error) { /* 非 uniapp 环境忽略 */ }
  }

  function bringToFront() {
    const wv = getWv()
    if (wv) {
      try {
        wv.show('none')
      } catch (error) { /* 窗口可能已关闭 */ }
    }
  }

  /** 页面切换后把悬浮球重新置顶（新页面 webview 会盖住它，切页动画约 300ms） */
  function hookPageNavigation() {
    if (topmostHooked) return
    topmostHooked = true
    const apis = ['navigateTo', 'redirectTo', 'switchTab', 'navigateBack', 'reLaunch']
    apis.forEach((api) => {
      try {
        uni.addInterceptor(api, { success: () => setTimeout(bringToFront, 350) })
      } catch (error) { /* 拦截器注册失败不影响悬浮窗本身 */ }
    })
  }

  return {
    available() {
      return typeof plus !== 'undefined' && !!(plus.webview && plus.webview.create)
    },

    hasOverlayPermission() {
      return true
    },

    openPermissionSettings() {
      return true
    },

    open() {
      if (!this.available()) throw new Error('plus.webview 不可用')
      // 已打开：仅置顶（用户可能从面板内关闭后球位置由页面自持久化）
      if (getWv()) {
        bringToFront()
        return
      }
      const info = uni.getSystemInfoSync()
      const w = Number(info.windowWidth) || 360
      const h = Number(info.windowHeight) || 640
      // 屏幕尺寸预写入，页面窗口仅 56px 无法自行测得屏幕大小
      try {
        plus.storage.setItem(SCREEN_KEY, JSON.stringify({ w, h }))
      } catch (error) { /* 页面会回退到 plus.screen 分辨率估算 */ }
      const wv = plus.webview.create(FLOAT_WINDOW_ASSET_PATH, FLOAT_WINDOW_TAG, {
        left: (w - BALL_SIZE - EDGE_GAP) + 'px',
        top: Math.round(h * 0.4) + 'px',
        width: BALL_SIZE + 'px',
        height: BALL_SIZE + 'px',
        background: 'transparent',
        bounce: 'none',
        scrollIndicator: 'none'
      })
      wv.show('none')
      hookPageNavigation()
    },

    close() {
      const wv = getWv()
      if (wv) {
        try {
          wv.close()
        } catch (error) {
          toast('悬浮面板关闭失败：' + ((error && error.message) || error))
        }
      }
    }
  }
}
// #endif

// ============ 说明 ============
// 系统级悬浮窗由本地 UTS 插件 uni_modules/roco-float-window 提供（源码可改，
// 改动 .uts 后需重新制作自定义调试基座）。UTS 不可用时自动回退应用内实现。
// 若某天要换插件市场的付费插件（hans-pip，ID 27324）：
//   导入插件后用 setFloatWindowImpl(你的适配实现) 覆盖默认选择即可。
// ====================================================================

export default {
  FLOAT_WINDOW_TAG,
  FLOAT_WINDOW_ASSET_PATH,
  setFloatWindowImpl,
  isSystemOverlayAvailable,
  hasOverlayPermission,
  openOverlayPermissionSettings,
  openDamageFloatWindow,
  closeDamageFloatWindow
}
