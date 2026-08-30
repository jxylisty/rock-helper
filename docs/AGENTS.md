# AGENTS.md

## 项目说明

这是一个 uni-app / Vue 项目，用于制作《洛克王国：世界》小助手。

## 全局样式规范

项目使用统一的全局样式体系，定义在 `App.vue` 中。所有页面应优先使用全局样式类，减少重复定义。

### CSS 变量

在 `:root` 中定义了以下 CSS 变量：

```css
/* 主色-草绿 */
--color-primary-500: #22C55E;
--color-primary-600: #16A34A;

/* 辅助色-天蓝 */
--color-blue-500: #0EA5E9;
--color-blue-600: #0284C7;

/* 功能色 */
--color-success: #10B981;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #0EA5E9;

/* 中性色 */
--color-bg: #FFFFFF;
--color-card-bg: #FFFFFF;
--color-border: #E2E8F0;
--color-divider: #F1F5F9;
--color-text-main: #1E293B;
--color-text-sub: #64748B;

/* 间距 */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 24px;

/* 圆角 */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;

/* 阴影 */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
```

### 通用样式类

| 类别 | 样式类 | 说明 |
|------|--------|------|
| **页面** | `.page` | 页面容器 |
| | `.page-scroll` | 带滚动的页面容器 |
| **区块** | `.section` | 区块容器 |
| | `.section-header` | 区块头部 |
| | `.section-title` | 区块标题 |
| | `.section-action` | 区块操作 |
| **卡片** | `.card` | 卡片容器 |
| **按钮** | `.btn-primary` | 主按钮（草绿色） |
| | `.btn-secondary` | 次按钮 |
| | `.btn-ghost` | 幽灵按钮 |
| | `.btn-sm` | 小按钮 |
| | `.btn-lg` | 大按钮 |
| **表单** | `.input-field` | 输入框 |
| | `.input-sm` | 小输入框 |
| | `.input-lg` | 大输入框 |
| **列表** | `.list` | 列表容器 |
| | `.list-item` | 列表项 |
| **网格** | `.grid` | 网格容器 |
| | `.grid-2` | 2列网格 |
| | `.grid-3` | 3列网格 |
| **标签** | `.tag` | 标签 |
| | `.tag-primary` | 主色标签 |
| | `.tag-info` | 信息标签 |
| | `.tag-warning` | 警告标签 |
| | `.tag-danger` | 危险标签 |
| | `.tag-gray` | 灰色标签 |
| **弹窗** | `.modal-mask` | 弹窗遮罩 |
| | `.modal` | 弹窗面板 |
| | `.modal-header` | 弹窗头部 |
| | `.modal-title` | 弹窗标题 |
| | `.modal-close` | 关闭按钮 |
| | `.modal-body` | 弹窗主体 |
| | `.modal-footer` | 弹窗底部 |
| **工具** | `.text-main` | 主文字色 |
| | `.text-sub` | 次文字色 |
| | `.text-primary` | 主强调色 |
| | `.text-sm` | 小字体 |
| | `.text-lg` | 大字体 |
| | `.text-center` | 居中 |
| | `.font-mono` | 等宽字体 |
| | `.mt-sm/.mt-md/.mt-lg` | 上边距 |
| | `.mb-sm/.mb-md/.mb-lg` | 下边距 |
| | `.gap-sm/.gap-md` | 间距 |
| **其他** | `.divider` | 分割线 |
| | `.empty` | 空状态 |
| | `.touch-active` | 激活态 |

### 使用原则

1. **优先使用全局类** - 定义新样式前，先检查是否已有对应的全局类
2. **保持一致性** - 颜色、间距、圆角等优先使用 CSS 变量
3. **单位统一** - 使用 `px` 作为长度单位，不再使用 `rpx`
4. **局部样式** - 仅在全局类无法满足需求时，才在页面 scoped 样式中定义局部样式

## 变量命名规范

### 种族值 (Race)

**对象名：** `race`

| 键名 | 中文名 | 访问方式 | 说明 |
|-----|-------|---------|------|
| `hp` | 生命 | `race.hp` | 生命值 |
| `attack` | 物攻 | `race.attack` | 物理攻击 |
| `mattack` | 魔攻 | `race.mattack` | 魔法攻击 |
| `defense` | 物防 | `race.defense` | 物理防御 |
| `mdefense` | 魔防 | `race.mdefense` | 魔法防御 |
| `speed` | 速度 | `race.speed` | 速度值 |
| `total` | 总和 | `race.total` | 六项种族值之和 |

**禁止使用：** `atk`, `physicalAttack`, `magicAttack`, `specialAttack`, `physicalDefense`, `magicDefense`, `specialDefense`

### 个体值 (IV)

**对象名：** `iv`

| 键名 | 中文名 | 访问方式 | 输入范围 | 说明 |
|-----|-------|---------|---------|------|
| `hp` | 生命 | `iv.hp` | 0 或 7-10 | 生命个体值 |
| `attack` | 物攻 | `iv.attack` | 0 或 7-10 | 物攻个体值 |
| `mattack` | 魔攻 | `iv.mattack` | 0 或 7-10 | 魔攻个体值 |
| `defense` | 物防 | `iv.defense` | 0 或 7-10 | 物防个体值 |
| `mdefense` | 魔防 | `iv.mdefense` | 0 或 7-10 | 魔防个体值 |
| `speed` | 速度 | `iv.speed` | 0 或 7-10 | 速度个体值 |

**输入规则：**
- 高资质：`7`, `8`, `9`, `10`（通常三项为高资质）
- 低资质：`0`（通常三项为低资质）
- 不允许输入 `1-6`

**实际资质计算：**
```
实际资质 = 输入资质 × (星级 + 1)
```

**禁止使用：** `magicAttack`, `magicDefense` 等驼峰命名

### 性格 (Nature)

**字段名：** `natureUp`, `natureDown`

| 字段 | 说明 | 示例值 |
|-----|------|-------|
| `natureUp` | 性格提升的属性名 | `'attack'`, `'mattack'`, `'无'` |
| `natureDown` | 性格降低的属性名 | `'defense'`, `'mdefense'`, `'无'` |

**禁止使用：** `nature_up`, `nature_down`, `up`, `down` 作为字段名

性格倍率常量：
- 提升倍率：`1.2`
- 降低倍率：`0.9`
- 无影响：`1.0`

### 精灵ID (Pet ID)

| 场景 | 命名 | 说明 |
|-----|------|------|
| 数据文件 | `id` | 精灵对象内的ID字段 |
| 组件属性 | `petId` | Vue组件内的精灵ID变量 |
| URL参数 | `id` | 路由传递的参数 |

**禁止使用：** `pet_id`, `petID`, `pid`

### 技能 (Skill)

| 键名 | 中文名 | 说明 |
|-----|-------|------|
| `name` | 技能名 | 技能名称 |
| `level` | 等级 | 学习等级，字符串类型 |
| `type` | 类型 | `物攻`, `魔攻`, `状态`, `防御` |
| `power` | 威力 | 技能威力数值 |
| `consume` | 能耗 | 技能消耗能量 |
| `describe` | 描述 | 技能效果描述 |
| `attr` | 属性 | 技能属性，如 `火`, `水`, `草` |
| `skill_type` | 来源 | `精灵技能`, `血脉技能`, `可学技能石` |

**禁止使用：** `desc`, `description`, `energy`, `cost`, `mp`, `skillType`

### 星级 (Star)

**字段名：** `star`

| 值 | 说明 |
|---|------|
| `0` | 无星级 |
| `1-5` | 1-5星 |

**禁止使用：** `stars`, `starLevel`, `star_level`

### 属性键名映射

```javascript
const ATTR_KEYS = {
  hp: '生命',
  attack: '物攻',
  mattack: '魔攻',
  defense: '物防',
  mdefense: '魔防',
  speed: '速度'
}
```

### 数据文件规范

所有数据文件必须使用上述标准键名：
- `data/pet/pet_detail.js` - 种族值使用 `hp`, `attack`, `mattack`, `defense`, `mdefense`, `speed`
- 组件中读取数据时直接使用标准键名，不要添加兼容代码

### 禁止的兼容写法

```javascript
// ❌ 禁止
const attackRace = Number(race.attack ?? race.atk ?? race.physicalAttack ?? 0)

// ✅ 正确
const attackRace = Number(race.attack ?? 0)
```

项目目前包含：
- 精灵图鉴
- 精灵详情
- 技能数据
- 属性克制
- 阵容编辑
- PVP断点分析页

开发原则：
1. 不要凭空编造游戏规则。
2. 不要随意改动已有功能。
3. 大功能分阶段做，每轮只完成当前任务。
4. 运行页面看不到变化的任务，必须说明改了哪些入口。
5. 不要一次性重构大量文件。
6. UI 优先移动端体验。
7. 复杂数据不要直接铺满页面，要用折叠、弹窗、切换模式展示。

页面边界：

1. 其他已存在的业务页面，默认也不要动。
2. 新功能一律从新的页面开始做，旧页面只作为数据和逻辑参考，不要拿来直接改造。

## PVP基础规则

PVP默认规则：

- 等级：60
- 星级：5
- 三项资质默认 +10
- 另外三项资质默认 0
- 实际参与面板计算的资质值 = 输入资质 * (星级 + 1)
- 性格提升项倍率：1.2
- 性格降低项倍率：0.9
- 属性一致加成：1.25
- 单克制：2
- 单抵抗：0.5
- 双重克制：3
- 双重抵抗：1/3
- 克制 + 抵抗：1

## 迅捷和先手规则

迅捷不是先手 +1。

迅捷机制：
- 主动切换精灵不会亏回合。
- 会使用技能栏中位置最靠前的、带有“迅捷”词条的技能。
- 迅捷不要参与普通出手顺序 priority 判断。

先手 / 先制判断：
1. 先比较技能先制值。
2. 如果一方技能先手 +1，另一方没有，则先手 +1 的一方先出手。
3. 如果双方先制值相同，再比较速度。
4. 如果双方都使用先发制人，则比较两只精灵速度。
5. 速度相同则标记为不确定，不要强行判断。

## BUFF和条件预设规则

不要自动套用 BUFF。

强化、减伤、天气、连击变化、威力提升、特性触发，必须来自：
- 当前精灵自己的 trait
- 当前精灵自己的技能
- 当前选择的技能
- 用户手动启用的条件
- 用户自定义条件

所有条件预设默认不启用。

没有对应技能或特性的精灵，不能显示对应预设。

例如：
- 没有“力量增效”的精灵，不能显示物攻 +100% 预设。
- 没有“魔法增效”的精灵，不能显示魔攻 +70% 预设。
- 没有“减伤70%”技能的精灵，不能显示减伤70%预设。
- “若先于敌方攻击，威力+50%”只能来自当前精灵自己的 trait 或技能描述。

## 技能展示规则

技能由用户选择。

技能列表默认只显示：
- 技能名
- 属性
- 物攻 / 魔攻
- 威力
- 有效威力
- 能耗

点击技能主体：选择技能并重新计算。

点击“详情”按钮：弹出小窗口显示技能详情，不要在列表里展开。

不要在列表里展开完整描述，避免页面变长。

技能详情小窗口显示：
- 技能名
- 属性
- 类型
- 威力
- 有效威力
- 能耗
- 技能来源
- 完整描述
- 机制标签


有效威力：
- effectivePower = power * baseHits
- baseHits 从“2连击、3连击、5连击”等描述中提取
- 条件连击不要默认套用

## 大块头蛋判定规则

官方 API 无独立的体型分级端点，判定口径来自社区规则并用官方数据校准：

- 判定条件：蛋的身高与体重**同时**达到该精灵蛋范围的 98% 分位，即 `≥ min + 0.98 × (max - min)`，双维度缺一不可
- 校准依据：罗隐蛋官方区间 13.475~19.68kg，社区实测大块头准入 >19.556kg，与公式完全吻合
- 实现位置：`data/config/eggData.js` 的 `judgeBulkEgg(egg, height, weight)`；孵蛋页（pages/egg.vue）展示判定面板与结果徽章
- 蛋尺寸区间数据来自官方 `/pets/{pet_id}/egg` 端点（eggData.js 的 minHeight/maxHeight/minWeight/maxWeight）

## PVP分析展示规则

PVP断点分析不要一次展示所有结果。

优先使用三种模式：
1. 我打谁
2. 谁打我
3. 配置推荐

伤害展示必须以数值和线条为主：
- 伤害 / 生命
- 百分比
- 差多少 / 溢出多少
- 伤害线 vs 生命线

不要用“稳定一击、常规一击、只能秒脆皮”作为主要展示。

## 重要文件

PVP页面：
- pages/pvp-breakpoint.vue

PVP组件：
- components/pvp/PvpBreakpointPanel.vue（当前无引用的旧组件）
- components/pvp/DamageHpCompareBar.vue

克制表（唯一来源，禁止复制）：
- data/config/typeChart.js（pvpDamageEngine / game_math / typeGraph 均复用）

满配与面板：
- utils/buildOpponentFullConfig.js（对方满配：60级5星+三项10+主攻性格）
- utils/buildSuggestedIvs.js

悬浮窗（实时伤害，系统级 UTS 插件 + 应用内兜底）：
- uni_modules/roco-float-window/（本地 UTS 插件：Service + WindowManager + 原生 WebView，
  可覆盖到游戏等其他应用之上；架构照搬开源 xx-uts-floating-popup 改造，详见其 readme.md）
- utils/floatWindow.js（入口：优先 UTS 系统级，不可用自动回退 plus.webview 应用内实现）
- static/float/index.html + scripts/float-src/main.js（悬浮窗页面：
  ?mode=uts-ball 球窗口 / ?mode=uts-panel 面板窗口 / inapp 应用内自管理 / 浏览器预览）
- 交互约定：拖动球移动 / 单击球开合面板 / 长按球 700ms 关闭（面板内不放收起关闭按钮）
- 数据构建时内联进 app.js（不发 fetch，规避 Android 11+ 文件访问限制）
- 构建命令：npm run build:float / npm run build:float-data（数据更新后两者都要跑）
- 真机前提：修改任何 .uts 后必须重新制作自定义调试基座；首次使用引导开启
  "显示在其他应用上层"权限（manifest 与插件 AndroidManifest 均已声明 SYSTEM_ALERT_WINDOW）
- 历史教训：Native.js 方案已废弃——打包运行时 JS 固定在 weex 桥线程，无法在 UI 线程
  构造 WebView，必崩；UTS 插件编译为真 Kotlin，线程问题不存在

PVP配置数据：
- data/pvp/commonSkillPresets.json
- data/pvp/metaTargetPets.json
- data/pvp/pvpPetDisplayRules.json

每次修改这些文件时，必须说明修改内容。

### 静态资源命名（webp）

| 类型 | 路径 | 命名 |
|------|------|------|
| 精灵立绘 | `static/static-web/pets/` | `{seq:03d}_{名字}.webp` |
| 异色立绘 | `static/static-web/pets/` | `{seq:03d}_{名字}_异色.webp` |
| 特性图标 | `static/static-web/traits/` | `{seq:03d}.webp` |
| 技能图标 | `static/static-web/skills/` | `{技能名}.webp` |
| 属性图标 | `static/static-web/icons/` | `{英文}.webp`（普通→normal、火→fire 等，避免 Android 打包中文文件名告警） |

## 数据更新（官方 API）

### 数据入口

唯一入口：`crawler_official_api/update_data.py`（官方 API wegame.shallow.ink）。

**数据流：**
```
官方 API (wegame.shallow.ink)
    │  /pets 列表 + /pets/{id} 详情 + /pets/{id}/profile 种族值
    │  + /pets/{id}/skills 技能 + /pets/{id}/handbook 图鉴规范名 + /pets/{id}/family 进化链
    ▼  fetch（增量缓存 output/cache/）
crawler_official_api/update_data.py
    ▼  build（生成 output/generated/ + diff_report.md 差异报告）
    ▼  apply（人工审核后覆盖 data/pet/，旧文件备份 .bak）
data/pet/ ├── pet_detail.js     (详情+变体+种族值，442 图鉴/620 变体)
           ├── pet_index.js     (索引: wikiId/name/seq/uiTag)
           ├── pet_skills.js    (技能名: 精灵技能/血脉技能/可学技能石)
           ├── pet_race_speed.js(速度表)
           └── leader_forms.js  (首领形态图鉴列表)
```

**使用方法：**
```bash
python crawler_official_api/update_data.py all    # fetch + build
python crawler_official_api/update_data.py apply  # 审核 diff_report.md 后执行
npm run build:float-data                          # 同步悬浮窗精简数据
```

**API Key：** 环境变量 `ROCO_API_KEY` > `crawler_official_api/api_key.local`（gitignored）。

### 重要原则

1. **禁止猜测和假设** - 所有数据必须来自官方 API
2. **差异审核** - apply 前必须查看 `output/generated/diff_report.md`（新增/缺失/种族值变化清单）
3. **首领形态种族值** - 官方对 4xxx 首领形态返回全 0，生成时从同组同名可获取版本继承；无同名版本则剔除并记录
4. **编号体系** - seq = 官方 handbook_no（官方曾在 337 插入新精灵导致 337-375 整体偏移，一切以官方为准）
5. **技能库** - `data/skill/skills.js` 由官方技能聚合生成（官方 547 + 旧库独有保留）；power/consume 为纯数字字符串；官方缺失的旧技能原样保留避免破坏旧引用
6. **技能图标** - `static/static-web/skills/{技能名}.webp`，缺失时用 `fetch-skill-icons` 从官方下载补齐（含 webp 转换）

### 禁止事项

1. **禁止恢复旧爬虫** - B站Wiki 爬虫（crawler/）已废弃删除
2. **禁止手改 data/pet/ 生成物** - 由 update_data.py 生成；发现问题修脚本重新生成
3. **禁止提交 API Key** - 使用环境变量或 api_key.local
