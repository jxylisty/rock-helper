# 更新日志 2026-08-22

本轮更新涵盖三大方面：**精灵立绘修复与图片更新体系**、**UI 全面改版（魔法图鉴绘本风格）**、**数据管线与质量工具链完善**。

---

## 一、精灵立绘修复与图片更新体系（重点）

### 1.1 问题背景

用户发现"圣羽翼王"的立绘与初级形态"里奥"相同。经排查：

- **官方 API 正常**：wegame.shallow.ink 的 icon 接口为每个形态提供独立立绘（如里奥家族 3395/3396/3397 三张互不相同）
- **本地文件损坏**：历史收集图片时存在复制错误，`150_里奥.webp` 与 `152_圣羽翼王.webp` MD5 完全相同
- **波及范围**：全库共 **17 组不同精灵共用同一张图**（37 个文件），另有 53 组变体形态与本体共用图

### 1.2 修复结果

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 被引用立绘总数 | 573 张 | 573 张 |
| 跨精灵内容重复组 | 17 组 | **0 组** |
| 变体形态共用图 | 53 组 | 已按 API 独立立绘刷新 |
| 引用但文件缺失 | 0 | 0 |

典型修复案例：白发懒人 / 动力猿 / 瞌睡王（原三只同图，现各有独立立绘）、小草虫家族、雪娃娃家族、可爱猿家族等。

### 1.3 新增图片更新命令

`crawler_official_api/update_data.py` 新增 `fetch-pet-images` 子命令：

```bash
python crawler_official_api/update_data.py fetch-pet-images          # 仅补本地缺失
python crawler_official_api/update_data.py fetch-pet-images 150 152  # 指定序号强制覆盖
python crawler_official_api/update_data.py fetch-pet-images --all    # 全量覆盖（图片错乱时一键修复）
```

**实现要点：**

- 文件名保持 `{seq}_{page_title}.webp` 不变，`pet_detail.js` 引用零改动
- **双层匹配**：精确匹配 → NFKC 归一化兜底
  - 自动处理 `Ⅴ/V`、`Ⅱ/II` 全半角罗马数字差异（如 `146_权杖-Ⅴ`）
  - 零宽字符由 `sanitize()` 统一剥离（如 `370_霹雳迪迪`）
- 变体形态按 profile 缓存的 `form` 字段精确对应（如 `雪绒鸟（夏天的样子）`）
- "本来的样子" 映射回本体文件名（沿用 `PLAIN_FORMS` 规则）
- 异色图自动跳过（官方 icon 接口未提供异色资源）
- 与 `fetch-skill-icons` 同规格：RGBA webp q90、请求节流、进度输出、失败重跑补齐

**从此以后图片错乱不再是问题：一条 `fetch-pet-images --all` 即可全部自愈。**

### 1.4 图片验证工具

新增 `crawler_official_api/verify_pet_images.py`，更新图片后运行可检测：

- `pet_detail.js` 引用的立绘是否存在（引用缺失）
- 被引用立绘中是否有内容完全相同的文件（MD5 重复）

### 1.5 已知遗留（不影响显示）

- 64 张本地文件在 API 中无精确对应条目（如丢丢家族 API 只有"草地/火山/沙地/雪山附近的样子"四种形态条目），其中 13 张被 `pet_detail.js` 引用但当前图片正确，仅无法通过脚本刷新；其余为孤儿文件不参与显示
- 远程兜底站 `rock-helper.pages.dev` 已失效（任何路径都返回 SPA index.html），本地图片为唯一可靠来源

---

## 二、UI 全面改版：魔法图鉴绘本风格

### 2.1 设计语言

- **基调**：羊皮纸米白底、翠绿主色、描金点缀
- **卡片**：剪纸贴纸效果（实色描边、下坠硬阴影、大圆角）
- **图标**：自研 `AppIcon` 组件，三层双色填充图标体系（主体层实心 + 92% 白高光叠层 + 主色 35% 透明次级层），34 枚图标，无文字符号
- **页面主题色**：绿（资料库）/ 金（培养工具）/ 蓝（探索）/ 红（战斗）
- **详情页**：头栏底色跟随精灵主属性动态渐变

### 2.2 改版页面清单（10/10 全部完成）

| 页面 | 主题 | 核心改造 |
|------|------|----------|
| 首页 index | 绿 | 图标化导航 + 贴纸卡片 |
| 图鉴 catalog | 绿 | 贴纸搜索 + **属性筛选可展开面板**（解决属性过多显示不全） |
| 详情 detail | 属性色动态 | custom 导航 + 六维格子 + 技能胶囊 |
| 阵容编辑 team-editor | 金 | AI 诊断卡 + 操作图标化 |
| 属性克制 restriction | 红 | 四色结果卡 |
| 技能查询 skill-search | 金 | 技能行胶囊 + 反向索引重构 |
| 速度排行 speed-rank | 蓝 | 速档金银铜印章 |
| 伤害计算 pvp-breakpoint | 红 | 攻绿守蓝 VS 对战布局 + 弹层贴纸化 |
| 孵蛋 egg | 金 | 描金领奖台（金银铜名次） |
| 地图 map | 蓝 | 图标工具条（缩放/居中） |

组件层升级：`AppHeader`（多主题 + 动态渐变）、`TypeBadge`（印记化）、`PetCard`（贴纸化）、`SideDrawer`、`StatPanel`、`TeamEditSheet`、`TeamSlotCard`、`TypeGraph`、`DamageHpCompareBar` 等。

设计文档：[frontend-redesign-proposal.html](frontend-redesign-proposal.html)（第一阶段方案）、[frontend-redesign-phase2.html](frontend-redesign-phase2.html)（第二阶段方案与进度）。

---

## 三、功能修复

| 问题 | 根因 | 修复 |
|------|------|------|
| 详情页白屏 `_ctx.shade is not a function` | 模板直接调用模块级工具函数，Vue2 模板只能访问实例成员 | 新增 computed `backFabStyle` 包装 |
| 技能查询查不到任何精灵 | detailMap 构造时 `skills` 全部为空数组 | 从 `pet_skills.js` 读取真实技能表，索引改为一次遍历反向索引 |
| 阵容编辑页无法加载 | `decision_engine.js`/`pet_role_analyzer.js` 的 `skill_tag_rules.js` 导入路径写成同目录 | 修正为 `../skill/skill_tag_rules.js` |
| 图鉴属性筛选显示不全 | 18 个属性横向滚动放不下 | 改为可展开面板（收起一行/展开全网格） |

---

## 四、项目结构迁移

- **数据管线**：废弃 B站Wiki 爬虫（`crawler/`），`crawler_official_api/` 成为唯一数据入口（官方 API）
- **页面扁平化**：`pages/xxx/xxx.vue` → `pages/xxx.vue`
- **文档集中**：根目录 `AGENTS.md`/`DESIGN.md`/`PROJECT_DOC.md`/`DATA_UPDATE_GUIDE.md` 归并至 `docs/`
- **静态资源**：`static/static-web/`（webp 交付物）入库；`static/static-png/`（PNG 源材料，可由 API 重新生成）加入 gitignore 不入库

---

## 五、质量工具链（scripts/）

| 脚本 | 用途 |
|------|------|
| `check-vue-syntax.cjs` | 24 个 vue 文件模板/脚本/样式三层语法校验 |
| `check-tpl-fn-refs.cjs` | 模板调用了未暴露的模块级函数检测 |
| `check-import-paths.cjs` | 全项目相对路径 / `@/` 别名 import 断链扫描 |
| `check-icon-refs.cjs` | AppIcon 图标名引用完整性 |
| `check-component-regs.cjs` | 组件注册完整性（easycom / 手动注册） |
| `check-instance-refs.cjs` | `this.xxx` 引用 vs 实例定义（含 props/data/computed/methods） |
| `smoke-data-chains.cjs` | 数据链路运行时冒烟测试（14 项，ESM→CJS 转译加载真实数据） |
| `verify-config-imports.cjs` | config 模块依赖导出核对 |
| `verify-skill-index.cjs` | 技能反向索引验证 |

**全量体检结论**：6 项静态检查 + 14 项运行时冒烟全部通过，无遗留问题。
