# 洛克王国：世界 小助手

uni-app / Vue 项目，提供精灵图鉴、PVP分析、阵容编辑等功能。

> 历史更新记录见 [UPDATE_LOG.md](UPDATE_LOG.md)。

## 项目结构

```
luokewangguo/
├── pages/                  # 页面
│   ├── index.vue           # 首页
│   ├── catalog.vue         # 精灵图鉴
│   ├── detail.vue          # 精灵详情
│   ├── pvp-breakpoint.vue  # PVP断点分析
│   ├── team-editor.vue     # 阵容编辑
│   ├── speed-rank.vue      # 速度排名
│   ├── restriction.vue     # 属性克制
│   ├── skill-search.vue    # 技能搜索
│   ├── egg.vue             # 孵蛋
│   └── map.vue             # 地图
│
├── components/             # 公共组件
│   ├── AppHeader/          # 页面头部
│   ├── PetCard/            # 精灵卡片
│   ├── TypeBadge/          # 属性标签
│   ├── StatPanel/          # 面板属性
│   ├── TeamEditSheet/      # 阵容编辑弹窗
│   ├── DamageHpCompareBar/ # 伤害对比条
│   └── TypeGraph/          # 属性克制图
│
├── data/                   # 数据文件
│   ├── pet/                # 精灵数据（BCNF范式）
│   │   ├── pet_index.js    # 联合主键索引 (wikiId, name) → page_title/uiTag
│   │   ├── pet_detail.js   # 精灵详情（含变体、异色、特性图）
│   │   ├── pet_skills.js   # 技能名列表
│   │   └── pet_race_speed.js # 速度排名
│   ├── skill/              # 技能数据
│   │   ├── skills.js       # 技能详情库
│   │   └── skill_icons.js  # 技能图标映射
│   └── config/             # 配置数据
│       ├── game_math.js    # 游戏数学计算
│       ├── asset_config.js # 静态资源配置
│       └── eggData.js      # 孵蛋数据
│
├── static/static-web/      # 静态资源（WebP格式）
│   ├── pets/               # 精灵立绘（含异色）
│   ├── skills/             # 技能图标
│   ├── traits/             # 特性图标
│   └── icons/              # 属性图标
│
├── utils/                  # 工具函数
├── crawler_official_api/   # 官方 API 数据抓取与生成（唯一数据入口）
├── scripts/                # 辅助脚本（悬浮窗构建 / 数据生成 / 测试）
├── static/float/           # 实时伤害悬浮窗页面（独立 HTML + 打包产物）
├── config/                 # 应用配置
```

## 数据架构

采用 BCNF 范式设计，消除数据冗余：

| 文件 | 主键 | 说明 |
|------|------|------|
| `pet_index.js` | `(wikiId, name)` | 索引表：名称→页面标题/UI标签 |
| `pet_detail.js` | `seq` | 详情表：种族值、属性、图片、变体、异色、特性 |
| `pet_skills.js` | `seq` | 技能名表：三种技能类型 |

**关键设计：**
- 变体数据合并在 `pet_detail.js` 中，按 `seq` 分组存储所有形态
- 异色图片和特性图标直接嵌入详情，无需单独文件
- 技能通过名称映射到 `skills.js` 获取完整信息

## 数据更新流程

数据来源为洛克王国：世界官方 API（wegame.shallow.ink），唯一入口是 `crawler_official_api/update_data.py`：

```bash
# 1. 抓取原始数据（增量缓存于 crawler_official_api/output/cache/）
python crawler_official_api/update_data.py fetch

# 2. 生成前端数据与差异报告（输出到 crawler_official_api/output/generated/）
python crawler_official_api/update_data.py build

# 3. 审核 output/generated/diff_report.md 后，覆盖到 data/pet/ 与 data/skill/（旧文件自动备份 .bak）
python crawler_official_api/update_data.py apply

# 4. 下载缺失技能图标转 webp（可选，增量补缺）
python crawler_official_api/update_data.py fetch-skill-icons

# 5. 更新精灵立绘 webp（可选）
python crawler_official_api/update_data.py fetch-pet-images          # 仅补本地缺失
python crawler_official_api/update_data.py fetch-pet-images 150 152  # 指定序号强制覆盖
python crawler_official_api/update_data.py fetch-pet-images --all    # 全量覆盖（图片错乱时一键修复）

# 6. 验证图片完整性（引用缺失/内容重复检测）
python crawler_official_api/verify_pet_images.py

# 7. 更新悬浮窗用的精简数据（static/float/float_data.json）
npm run build:float-data
```

API Key 读取顺序：环境变量 `ROCO_API_KEY` > `crawler_official_api/api_key.local`（已 gitignore）。

旧的 B站Wiki 爬虫（crawler/）与官方 API 试验脚本已废弃删除。

## 开发规范

详见 [AGENTS.md](AGENTS.md)，包含：
- 全局样式规范和 CSS 变量
- 变量命名规范（种族值、个体值、性格等）
- PVP 基础规则和计算公式
- 前端页面开发原则
