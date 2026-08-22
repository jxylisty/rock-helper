/**
 * 悬浮窗统一入口（伤害实时计算）
 *
 * 默认实现：自研 Native.js 悬浮窗（免费、无插件）——仅 Android App。
 * 通过 plus.android 创建两个系统级 WebView 窗口覆盖在其他应用之上：
 *   - 悬浮球（56dp，整窗可拖动，单击展开/收起面板）
 *   - 面板（340×480dp，static/float/index.html 计算页面）
 *
 * 使用前提（一次性）：
 *   manifest.json 已声明 SYSTEM_ALERT_WINDOW。标准基座可能未包含该权限，
 *   需先制作自定义调试基座：运行 → 运行到手机或模拟器 → 制作自定义调试基座。
 *
 * 可选替换实现：插件市场「增强版小窗口、悬浮窗」(hans-pip，ID 27324)，
 * 导入插件后取消文末两行注释即可覆盖自研实现。
 */

export const FLOAT_WINDOW_TAG = 'roco-damage-float'
export const FLOAT_WINDOW_ASSET_PATH = '/static/float/index.html'

let nativeImpl = null

/**
 * 注册悬浮窗实现（默认为自研 Native.js；可被外部覆盖）
 * @param {{available: Function, hasOverlayPermission: Function, openPermissionSettings: Function, open: Function, close: Function}} impl
 */
export function setFloatWindowImpl(impl) {
  nativeImpl = impl
}

/** 系统级悬浮窗能力是否可用 */
export function isSystemOverlayAvailable() {
  // #ifdef APP-PLUS
  if (!nativeImpl) {
    nativeImpl = createNativeJsImpl()
  }
  // #endif
  return !!(nativeImpl && typeof nativeImpl.available === 'function' && nativeImpl.available())
}

/** 是否已授予"显示在其他应用上层"权限 */
export function hasOverlayPermission() {
  if (!isSystemOverlayAvailable()) return false
  try {
    return !!nativeImpl.hasOverlayPermission()
  } catch (error) {
    return false
  }
}

/** 跳转系统悬浮窗权限设置页 */
export function openOverlayPermissionSettings() {
  if (!isSystemOverlayAvailable()) return false
  try {
    nativeImpl.openPermissionSettings()
    return true
  } catch (error) {
    return false
  }
}

/**
 * 打开实时伤害悬浮窗（已打开则忽略）
 * @returns {{ok: boolean, reason?: 'unsupported'|'permission'|'error', message?: string}}
 */
export function openDamageFloatWindow() {
  if (!isSystemOverlayAvailable()) {
    return { ok: false, reason: 'unsupported', message: '悬浮窗仅支持 Android App' }
  }
  if (!hasOverlayPermission()) {
    return { ok: false, reason: 'permission', message: '缺少悬浮窗权限' }
  }
  try {
    nativeImpl.open()
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: 'error', message: String((error && error.message) || error) }
  }
}

/** 关闭实时伤害悬浮窗 */
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
 * 自研 Native.js 悬浮窗实现
 * 全部原生调用集中在 createNativeJsImpl 闭包内，出错时抛出并由上层转成提示
 */
function createNativeJsImpl() {
  const BALL_SIZE_DP = 56
  const PANEL_WIDTH_DP = 340
  const PANEL_HEIGHT_DP = 480
  const GAP_DP = 8
  const TAP_SLOP = 12
  const TAP_TIMEOUT = 400

  let initialized = false
  let android = null
  let main = null
  let wm = null
  let density = 1
  let screenW = 0
  let screenH = 0
  let LP = null
  let ballView = null
  let ballParams = null
  let panelView = null
  let panelParams = null
  let panelShown = false

  function dp(value) {
    return Math.round(value * density)
  }

  function init() {
    if (initialized) return
    if (typeof plus === 'undefined' || !plus.android) {
      throw new Error('当前环境不支持 Native.js（需要 Android App）')
    }
    android = plus.android
    main = android.runtimeMainActivity()
    wm = android.invoke(main, 'getSystemService', android.importClass('android.content.Context').WINDOW_SERVICE)
    LP = android.importClass('android.view.WindowManager$LayoutParams')
    const metrics = android.invoke(android.invoke(main, 'getResources'), 'getDisplayMetrics')
    density = android.invoke(metrics, 'density') || 1
    screenW = android.invoke(metrics, 'widthPixels') || 1080
    screenH = android.invoke(metrics, 'heightPixels') || 1920
    initialized = true
  }

  function sdkInt() {
    try {
      return Number(android.invoke(android.importClass('android.os.Build$VERSION'), 'SDK_INT')) || 0
    } catch (error) {
      return 0
    }
  }

  function hasOverlayPermission() {
    const Settings = android.importClass('android.provider.Settings')
    return !!android.invoke(Settings, 'canDrawOverlays', main)
  }

  function openPermissionSettings() {
    const Intent = android.importClass('android.content.Intent')
    const Uri = android.importClass('android.net.Uri')
    const packageName = android.invoke(main, 'getPackageName')
    const uri = android.invoke(Uri, 'parse', 'package:' + packageName)
    const intent = android.newObject(Intent, 'android.settings.action.MANAGE_OVERLAY_PERMISSION', uri)
    android.invoke(main, 'startActivity', intent)
  }

  /** 把 _www 内的相对路径转成 WebView 可加载的 URL */
  function wwwUrl(file) {
    let path = ''
    try {
      path = plus.io.convertLocalFileSystemURL('_www/static/float/' + file) || ''
    } catch (error) {
      path = ''
    }
    if (!path) {
      const appid = (plus.runtime && plus.runtime.appid) || ''
      return `file:///android_asset/apps/${appid}/www/static/float/${file}`
    }
    return /^file:/i.test(path) ? path : 'file://' + path
  }

  function createLayoutParams(widthPx, heightPx, x, y, focusable) {
    const Gravity = android.importClass('android.view.Gravity')
    const PixelFormat = android.importClass('android.graphics.PixelFormat')
    const params = android.newObject(LP)
    params.type = sdkInt() >= 26 ? LP.TYPE_APPLICATION_OVERLAY : LP.TYPE_PHONE
    params.flags = LP.FLAG_NOT_TOUCH_MODAL | (focusable ? 0 : LP.FLAG_NOT_FOCUSABLE)
    params.format = PixelFormat.TRANSLUCENT
    params.gravity = Gravity.TOP | Gravity.LEFT
    params.width = widthPx
    params.height = heightPx
    params.x = x
    params.y = y
    return params
  }

  function createWebView(mode) {
    const WebView = android.importClass('android.webkit.WebView')
    const Color = android.importClass('android.graphics.Color')
    const view = android.newObject(WebView, main)
    const settings = android.invoke(view, 'getSettings')
    android.invoke(settings, 'setJavaScriptEnabled', true)
    android.invoke(settings, 'setAllowFileAccess', true)
    android.invoke(settings, 'setDomStorageEnabled', true)
    android.invoke(view, 'setBackgroundColor', Color.TRANSPARENT)
    const url = wwwUrl('index.html') + (mode === 'ball' ? '?mode=ball' : '')
    android.invoke(view, 'loadUrl', url)
    return view
  }

  function clampPanelPosition() {
    const w = dp(PANEL_WIDTH_DP)
    const h = dp(PANEL_HEIGHT_DP)
    const margin = dp(GAP_DP)
    panelParams.x = Math.max(margin, Math.min(Number(panelParams.x) || 0, screenW - w - margin))
    panelParams.y = Math.max(margin, Math.min(Number(panelParams.y) || 0, screenH - h - margin))
  }

  function ensurePanel() {
    if (panelView) return
    panelView = createWebView('panel')
    panelParams = createLayoutParams(dp(PANEL_WIDTH_DP), dp(PANEL_HEIGHT_DP), dp(GAP_DP), dp(120), true)
  }

  function togglePanel() {
    if (panelShown) {
      try {
        android.invoke(wm, 'removeView', panelView)
      } catch (error) { /* 窗口可能已不存在 */ }
      panelShown = false
      return
    }
    ensurePanel()
    // 面板出现在悬浮球下方，超屏则贴边
    panelParams.x = Number(ballParams.x) || 0
    panelParams.y = (Number(ballParams.y) || 0) + dp(BALL_SIZE_DP) + dp(GAP_DP)
    clampPanelPosition()
    android.invoke(wm, 'addView', panelView, panelParams)
    panelShown = true
  }

  function installBallTouch() {
    let touch = null
    const listener = android.implements('android.view.View$OnTouchListener', {
      onTouch(v, event) {
        try {
          const action = Number(android.invoke(event, 'getAction')) & 0xff
          if (action === 0) {
            touch = {
              rawX: Number(android.invoke(event, 'getRawX')),
              rawY: Number(android.invoke(event, 'getRawY')),
              startX: Number(ballParams.x) || 0,
              startY: Number(ballParams.y) || 0,
              moved: false,
              time: Date.now()
            }
            return true
          }
          if (action === 2 && touch) {
            const dx = Number(android.invoke(event, 'getRawX')) - touch.rawX
            const dy = Number(android.invoke(event, 'getRawY')) - touch.rawY
            if (!touch.moved && (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP)) {
              touch.moved = true
            }
            if (touch.moved) {
              ballParams.x = touch.startX + Math.round(dx)
              ballParams.y = touch.startY + Math.round(dy)
              android.invoke(wm, 'updateViewLayout', ballView, ballParams)
            }
            return true
          }
          if (action === 1 && touch) {
            const quickTap = !touch.moved && Date.now() - touch.time < TAP_TIMEOUT
            touch = null
            if (quickTap) togglePanel()
            return true
          }
        } catch (error) {
          console.error('[floatWindow] 触摸处理异常', error)
        }
        return false
      }
    })
    android.invoke(ballView, 'setOnTouchListener', listener)
  }

  return {
    available() {
      try {
        init()
        return true
      } catch (error) {
        return false
      }
    },

    hasOverlayPermission,

    openPermissionSettings,

    open() {
      init()
      if (ballView) return
      ballView = createWebView('ball')
      ballParams = createLayoutParams(dp(BALL_SIZE_DP), dp(BALL_SIZE_DP), dp(GAP_DP), dp(200), false)
      installBallTouch()
      android.invoke(wm, 'addView', ballView, ballParams)
    },

    close() {
      if (panelShown && panelView) {
        try { android.invoke(wm, 'removeView', panelView) } catch (error) { /* 忽略 */ }
        panelShown = false
      }
      if (ballView) {
        try { android.invoke(wm, 'removeView', ballView) } catch (error) { /* 忽略 */ }
        ballView = null
        ballParams = null
      }
    }
  }
}
// #endif

// ============ 可选：切换为插件市场实现（hans-pip，ID 27324）============
// 1. HBuilderX 导入插件后，取消下面两行注释
// 2. 制作自定义调试基座后运行（自研 Native.js 实现会被覆盖）
//
// import { hansPipFloatImpl } from './floatWindow.hanspip.js'
// setFloatWindowImpl(hansPipFloatImpl)
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
