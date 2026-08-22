/**
 * hans-pip 原生悬浮窗适配（「增强版小窗口、悬浮窗」插件，DCloud 插件 ID 27324）
 *
 * 本文件默认不被引用：需要先在 HBuilderX 中导入插件，再到 utils/floatWindow.js
 * 顶部取消对应 import 注释并重新制作自定义基座。
 *
 * API 对照（插件文档）：
 * - getFloatingWindowManager()
 * - manager.canDrawOverlaysSync() -> boolean
 * - manager.openOverlayPermissionSettings()
 * - manager.open({ tag, mode:'android-overlay-window', contentType:'webview', frame, appearance, behavior, webview:{ assetPath, jsBridgeEnabled } })
 * - manager.close({ tag })
 * - manager.callJS({ tag, script })
 */
import { getFloatingWindowManager } from '@/uni_modules/hans-pip'
import { FLOAT_WINDOW_TAG, FLOAT_WINDOW_ASSET_PATH } from './floatWindow.js'

function getManager() {
  try {
    return getFloatingWindowManager()
  } catch (error) {
    return null
  }
}

export const hansPipFloatImpl = {
  available() {
    return !!getManager()
  },

  hasOverlayPermission() {
    const manager = getManager()
    if (!manager) return false
    try {
      return !!manager.canDrawOverlaysSync()
    } catch (error) {
      return false
    }
  },

  openPermissionSettings() {
    const manager = getManager()
    if (!manager) return
    try {
      manager.openOverlayPermissionSettings()
    } catch (error) {
      console.error('[floatWindow] 打开权限设置失败', error)
    }
  },

  open(options = {}) {
    const manager = getManager()
    if (!manager) throw new Error('悬浮窗插件未初始化')
    manager.open({
      tag: options.tag || FLOAT_WINDOW_TAG,
      mode: 'android-overlay-window',
      contentType: 'webview',
      frame: { x: 40, y: 150, width: 330, height: 470 },
      appearance: {
        cornerRadius: 16,
        showTitleBar: true,
        title: '实时伤害'
      },
      behavior: { canDrag: true },
      webview: {
        assetPath: options.assetPath || FLOAT_WINDOW_ASSET_PATH,
        jsBridgeEnabled: true
      }
    })
  },

  close(options = {}) {
    const manager = getManager()
    if (!manager) return
    manager.close({ tag: options.tag || FLOAT_WINDOW_TAG })
  },

  callJS(script) {
    const manager = getManager()
    if (!manager) return
    manager.callJS({ tag: FLOAT_WINDOW_TAG, script })
  }
}

export default hansPipFloatImpl
