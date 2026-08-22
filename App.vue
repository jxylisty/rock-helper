<script>
export default {
  onLaunch() {
    console.log('洛克王国助手启动')
  },
  onShow() {
    console.log('App Show')
  },
  onHide() {
    console.log('App Hide')
  }
}
</script>

<style>
:root {
  /* 主色-草绿 */
  --color-primary-50: #F0FDF4;
  --color-primary-100: #DCFCE7;
  --color-primary-200: #BBF7D0;
  --color-primary-300: #86EFAC;
  --color-primary-400: #4ADE80;
  --color-primary-500: #22C55E;
  --color-primary-600: #16A34A;
  --color-primary-700: #15803D;
  --color-primary-800: #166534;
  --color-primary-900: #14532D;

  /* 辅助色-天蓝 */
  --color-blue-50: #F0F9FF;
  --color-blue-100: #E0F2FE;
  --color-blue-200: #BAE6FD;
  --color-blue-300: #7DD3FC;
  --color-blue-400: #38BDF8;
  --color-blue-500: #0EA5E9;
  --color-blue-600: #0284C7;
  --color-blue-700: #0369A1;
  --color-blue-800: #075985;
  --color-blue-900: #0C4A6E;

  /* 功能色 */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #0EA5E9;

  /* 中性色-浅色主题 */
  --color-bg: #FFFFFF;
  --color-card-bg: #FFFFFF;
  --color-sidebar-bg: #F8FAFC;
  --color-border: #E2E8F0;
  --color-divider: #F1F5F9;
  --color-text-main: #1E293B;
  --color-text-sub: #64748B;
  --color-text-disabled: #94A3B8;

  /* 语义色 */
  --app-bg: #FFFFFF;
  --card-bg: #FFFFFF;
  --card-soft: #F8FAFC;
  --text-main: #1E293B;
  --text-sub: #64748B;
  --accent: #22C55E;
  --accent-2: #0EA5E9;
  --warn: #EF4444;
  --resist: #0EA5E9;

  /* 间距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 48px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  --radius: 8px;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

  /* 魔法图鉴绘本 · 新增令牌（贴纸风） */
  --paper-bg: #FAF6EC;
  --paper-deep: #F2EBDA;
  --paper-card: #FFFDF7;
  --paper-line: #E3DCC8;
  --ink: #2C3A2F;
  --ink-soft: #6B7A6E;
  --ink-faint: #A3AE9F;
  --brand-green: #2F9E5F;
  --brand-green-deep: #1E7A46;
  --brand-green-mist: #E4F2E8;
  --brand-gold: #C9A14E;
  --brand-gold-deep: #A97F35;
  --brand-gold-mist: #F6EEDB;
  --brand-blue: #4F9CFF;
  --brand-blue-deep: #2C6FD1;
  --brand-blue-mist: #E7F1FE;
  --brand-red: #E0604E;
  --brand-red-deep: #C64B38;
  --brand-red-mist: #FBE9E4;
  --sticker-shadow: 0 3px 0 rgba(44, 58, 47, 0.10);
  --sticker-shadow-lg: 0 5px 0 rgba(44, 58, 47, 0.12);
}

page {
  background: #FFFFFF;
  min-height: 100vh;
  color: #1E293B;
  font-family: Inter, system-ui, -apple-system, sans-serif;
}

view,
text {
  box-sizing: border-box;
}

image {
  display: block;
}

::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.btn-primary {
  background: #22C55E;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.btn-primary:hover {
  background: #16A34A;
  box-shadow: var(--shadow-sm);
}

.btn-primary:active {
  background: #15803D;
}

.btn-secondary {
  background: transparent;
  color: #16A34A;
  border: 1px solid #22C55E;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.btn-secondary:hover {
  background: #F0FDF4;
}

.btn-auxiliary {
  background: #0EA5E9;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.btn-auxiliary:hover {
  background: #0284C7;
}

.btn-ghost {
  background: transparent;
  color: #475569;
  border: 1px solid #CBD5E1;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.btn-ghost:hover {
  background: #F1F5F9;
}

.card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  padding: 24px;
  transition: all 150ms ease-out;
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.input-field {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 14px;
  transition: all 150ms ease-out;
}

.input-field:focus {
  border-color: #22C55E;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
  outline: none;
}

.input-field.error {
  border-color: #EF4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

/* 页面布局 */
.page {
  min-height: 100vh;
  background: var(--app-bg);
}

.page-scroll {
  height: 100vh;
  padding: var(--space-lg);
  box-sizing: border-box;
}

/* 区块 */
.section {
  margin-top: var(--space-lg);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.section-action {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
}

/* 列表 */
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.list-item {
  padding: var(--space-md);
  background: var(--card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all 150ms ease-out;
}

.list-item:active {
  background: var(--color-divider);
}

/* 网格 */
.grid {
  display: grid;
  gap: var(--space-md);
}

.grid-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

/* 标签/徽章 */
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.tag-primary {
  background: rgba(34, 197, 94, 0.12);
  color: #22C55E;
}

.tag-info {
  background: rgba(14, 165, 233, 0.12);
  color: #0EA5E9;
}

.tag-warning {
  background: rgba(245, 158, 11, 0.12);
  color: #F59E0B;
}

.tag-danger {
  background: rgba(239, 68, 68, 0.12);
  color: #EF4444;
}

.tag-gray {
  background: var(--color-divider);
  color: var(--text-sub);
}

/* 表单控件 */
.input-sm {
  height: 32px;
  padding: 0 var(--space-sm);
  background: #FFFFFF;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.input-lg {
  height: 44px;
  padding: 0 var(--space-md);
  background: #FFFFFF;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 15px;
}

/* 按钮尺寸 */
.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-lg {
  padding: 14px 24px;
  font-size: 16px;
}

.btn-block {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* 弹窗组件 */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(30, 41, 59, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  box-sizing: border-box;
}

.modal {
  width: min(100%, 600px);
  max-height: 86vh;
  overflow: hidden;
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  background: #FFFFFF;
  box-shadow: var(--shadow-xl);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

.modal-close {
  min-width: 48px;
  height: 28px;
  padding: 0 var(--space-sm);
  border-radius: var(--radius-sm);
  background: var(--color-divider);
  color: var(--text-sub);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
}

.modal-footer {
  margin-top: var(--space-md);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}

/* 工具文字色 */
.text-main {
  color: var(--text-main);
}

.text-sub {
  color: var(--text-sub);
}

.text-primary {
  color: var(--accent);
}

.text-center {
  text-align: center;
}

.text-sm {
  font-size: 12px;
}

.text-lg {
  font-size: 18px;
}

.font-mono {
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

/* 间距工具 */
.mt-sm { margin-top: var(--space-sm); }
.mt-md { margin-top: var(--space-md); }
.mt-lg { margin-top: var(--space-lg); }
.mb-sm { margin-bottom: var(--space-sm); }
.mb-md { margin-bottom: var(--space-md); }
.mb-lg { margin-bottom: var(--space-lg); }
.gap-sm { gap: var(--space-sm); }
.gap-md { gap: var(--space-md); }

/* 空状态 */
.empty {
  padding: var(--space-2xl);
  text-align: center;
  color: var(--text-sub);
  font-size: 14px;
}

/* 分割线 */
.divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--space-md) 0;
}

/* 激活态 */
.touch-active {
  opacity: 0.8;
  transition: all 0.2s ease;
}

/* 贴纸按压态：配合元素自身的 transition: transform 使用 */
.press-down {
  transform: translateY(2px);
}
</style>
