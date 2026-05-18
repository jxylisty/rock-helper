# Design System: Roco Kingdom Dark Terminal (PVP Companion)

## 1. 核心设计理念 (Design Philosophy)
* **硬核暗黑终端 (Dark Terminal)：** 抛弃原本的羊皮纸与白底（`#f4efe6`, `#fff`），全面采用极深色背景。追求极致的战术沉浸感和数据阅读效率。
* **魔法霓虹光效 (Neon Magic Glow)：** 不使用大面积的色块填充，而是通过极细的边框发光（Glow）、关键文字高亮、以及高饱和属性色来体现“科技魔法”质感。
* **高信息密度 (High Data Density)：** 面向核心 PVP 玩家，排版必须紧凑。通过改变字重、透明度（Opacity）和等宽字体对齐来区分层级，而非单纯加大间距。

---

## 2. 色彩系统 (Color System)
所有颜色设计基于深色模式，要求极高的对比度。

### 2.1 基础层级色 (Backgrounds & Surfaces)
* **应用底色 (App Base)：** `#0B0C10` (极深渊黑，带极弱蓝调)
* **主卡片底色 (Card Base)：** `#13151C` (暗夜深灰)
* **次级面板/列表底色 (Panel/Item Base)：** `#1A1D27` (用于区分卡片内的技能项、属性块)
* **弹窗遮罩 (Modal Overlay)：** `rgba(0, 0, 0, 0.75)`配合背景模糊。
* **通用细边框 (Divider/Border)：** `#2A2D3D` (冷灰线，全局使用 1px，不要用粗边框)

### 2.2 文字与图标色 (Text & Icons)
* **高亮主文本 (Primary/Title)：** `#F8FAFC` (高纯度白，用于大标题、精灵名)
* **常规正文 (Body Text)：** `#CBD5E1` (略灰白，用于技能名、普通数值)
* **次要说明 (Secondary/Muted)：** `#64748B` (冷灰，用于说明文案、属性标签底字)

### 2.3 语义与反馈色 (Semantic & State)
专门用于游戏内的增减益、危险警告状态：
* **性格增益 / 强化提升 (Stat UP)：** `#10B981` (荧光绿，带发光)
* **性格减益 / 弱化降低 (Stat DOWN)：** `#EF4444` (警报红)
* **伤害溢出 / 斩杀警告 (Overkill/Danger)：** `#F59E0B` (警告亮橙)

### 2.4 魔法属性强调色 (Elemental Neon Accents)
用于不同属性的徽章边框、技能图标发光、伤害/生命条。必须搭配 `box-shadow` 制造科技辉光。
* **普通 (Normal):** `#CBD5E1` (纯银)
* **草 (Grass):** `#22C55E` (荧光绿)
* **火 (Fire):** `#FF4D4F` (炽燃红)
* **水 (Water):** `#3B82F6` (深海蓝)
* **冰 (Ice):** `#38BDF8` (极光蓝)
* **光 (Light):** `#FDE047` (耀眼黄)
* **暗 (Dark):** `#8B5CF6` (深渊紫)
* **土 (Earth):** `#D97706` (琥珀橙)
* **电 (Electric):** `#FBBF24` (高压金)
* **毒 (Poison):** `#D946EF` (剧毒品红)
* **虫 (Bug):** `#84CC16` (青柠绿)
* **武 (Fighting):** `#EA580C` (战意赤橙)
* **飞 (Flying):** `#93C5FD` (疾风天蓝)
* **龙 (Dragon):** `#6366F1` (龙息靛蓝)
* **萌 (Psychic):** `#F472B6` (幻梦粉)
* **机械 (Machine):** `#94A3B8` (赛博冷灰)

---

## 3. 字体排版 (Typography)
* **界面主字体 (UI Font)：** 优先使用无衬线体 (`system-ui, -apple-system, sans-serif`)。
* **数据专属字体 (Data/Number Font)：** **强制要求**所有涉及计算的数值（种族值、个体值、等级、威力、伤害结果百分比）使用等宽字体（如 `Monaco, Consolas, 'Courier New', monospace`），确保数字上下对齐，强化终端代码感。
* **字重控制 (Weight)：**
  * 辅助说明 `300` / `400`
  * 关键标题/标签 `600`
  * 核心输出结果（最终伤害数字） `800` 或 `900`

---

## 4. UI 组件与样式规范 (Components & Shapes)
全局摒弃原有圆润可爱的设计（去掉 `24rpx`/`28rpx` 的大圆角和柔和的高斯模糊阴影）。

### 4.1 几何形状 (Shapes)
* **卡片圆角 (Cards)：** `12rpx` (或 `6px`)
* **按钮与输入框 (Buttons/Inputs)：** `8rpx` (或 `4px`)
* **微型徽章/标签 (Badges)：** `4rpx`

### 4.2 表单控件 (Inputs & Pickers)
* **输入框 (Input) 未激活：** 背景 `#13151C`，边框 `1px solid #2A2D3D`，文字 `#F8FAFC`。
* **输入框 (Input) 获焦：** 边框颜色变更为 `#38BDF8` (冰蓝色)，并附带 `box-shadow: 0 0 8px rgba(56, 189, 248, 0.4)`。

### 4.3 技能与条目列表 (List Items)
* **常规状态：** 背景 `#1A1D27`，边框透明。
* **选中状态 (Selected/Active)：** 必须包裹一圈对应的属性魔法色边框（如被选中技能是火系，边框则为 `#FF4D4F`），且背景微微泛出该颜色的极低透明度（如 `rgba(255, 77, 79, 0.05)`）。

### 4.4 数据进度条 (Damage/HP Bars)
* **底层轨道 (Track)：** `#0B0C10` (极黑，凹陷感)。
* **血量条 (HP Fill)：** `#22C55E` 搭配 `box-shadow: 0 0 10px rgba(34, 197, 94, 0.5)`。
* **伤害条 (Damage Fill)：** `#FF4D4F` 搭配 `box-shadow: 0 0 10px rgba(255, 77, 79, 0.5)`。

### 4.5 弹窗与抽屉 (Modals & Bottom Sheets)
* 原代码中的弹窗需要彻底改为暗黑风格。
* 背景为 `#13151C`。
* 必须有一条极细的顶部高光线：`border-top: 1px solid rgba(255,255,255,0.1)` 提升立体感。

---

## 5. 特效与交互 (Effects & Interactions)
* **悬停/点击反馈 (Hover/Touch Active)：**
  * 使用 `transform: translateY(-2rpx)` 或 `scale(0.98)` 表现物理按压。
  * `opacity: 0.8`。
  * 动画过渡 `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);` 保持干脆利落。
* **动态光晕 (Dynamic Glow)：** 对于关键按钮（如“计算伤害”、“应用预设”），使用微弱的呼吸灯效果或内部的线形发光。

---

## 6. AI 重构强制指令 (Strict Directives for AI)
当 AI 接收到此设计规范并被要求重构 uni-app / Vue 组件时，必须严格遵守以下法则：

1. **业务逻辑绝对免疫 (Logic Immunity)：** 严禁修改 `<script>` 中任何关于伤害计算、数据处理、事件触发的核心逻辑。只能修改暴露给模板的 computed 属性以适应新的 UI 显示状态。
2. **重写样式 (Style Rewrite)：** 将 `<style scoped>` 里的代码彻底推翻。清除所有浅色模式下的代码（如 `#fffdf8`, `#f0e4d1`, `#f4f4f1` 等色值）。严格使用本规范第 2 节中的暗黑十六进制色值。
3. **标签替换：** 依然使用 uni-app 原生标签 (`<view>`, `<text>`, `<image>`, `<scroll-view>`)，不要随意换成 HTML5 标签 (`div`, `span`) 以保证编译兼容性。
4. **清理冗余修饰：** 去掉原有的“卡片渐变背景”、“巨大阴影”，使用极简暗黑+单色描边发光策略。
5. **等宽对齐：** 在重构六维属性 (stat-grid)、个体值输入 (iv-grid)、威力/能耗显示区域时，必须强行注入等宽字体 CSS（如 `font-family: monospace;`），并确保排版如终端面板一样对齐。