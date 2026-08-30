# roco-float-window（本地 UTS 插件）

Android 系统级悬浮窗：`runOnUiThread` 调度 + WindowManager + 原生 WebView，承载《实时伤害计算》悬浮球与面板。
初期架构参考开源项目 [xx-uts-floating-popup](https://github.com/lwxgit/Xx-uts-floating-popup)（插件市场 ID 12425），
后为排除 Service 注册静默失败问题，去掉 Service 依赖，改为 UI 线程任务直接操作窗口。

## 文件

- `utssdk/app-android/index.uts` — JS 侧入口：startFloat / closeFloat / isOverlayPermissionGranted / openOverlayPermissionSetting；内含 ShowBallTask / CloseTask（Runnable 子类，把窗口操作调度到 UI 线程）
- `utssdk/app-android/managers/FloatWindowManager.uts` — 双窗口管理：悬浮球 56dp + 面板 340×480dp
- `utssdk/app-android/touch/BallTouchListener.uts` — 拖动 / 单击切换面板 / 长按 700ms 关闭
- `utssdk/app-android/AndroidManifest.xml` — SYSTEM_ALERT_WINDOW 权限

## 页面地址

由 JS 侧传入（优先 plus.io 真实资源路径，回退 android_asset），模式标记用 **#fragment** 传递
（file:// URL 带 ?query 在部分 WebView 会破坏文件解析）：

- `#mode=uts-ball` 只渲染悬浮球（scripts/float-src/main.js）
- `#mode=uts-panel` 只渲染面板（收起/关闭按钮隐藏，交互走原生：点球收起、长按球关闭）

## 注意

- 修改任何 .uts 文件后必须重新制作自定义调试基座
- 面板与悬浮球的数据/状态经 localStorage 共享（同源 file://）
- FloatWindowManager 里球的底色当前为 GREEN（诊断标记），确认真机显示正常后应改回 Color.TRANSPARENT
