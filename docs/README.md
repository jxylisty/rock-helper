# 洛克王国：世界 小助手

uni-app / Vue 项目，提供精灵图鉴、孵蛋摆窝、PVP 属性值计算、阵容分析与编辑等功能。

> 历史更新记录见 [UPDATE_LOG.md](UPDATE_LOG.md)，开发规范见 [AGENTS.md](AGENTS.md)。

## 项目结构

```
luokewangguo/
├── pages/                  # 页面（均在 pages.json 注册）
│   ├── index.vue           # 首页
│   ├── catalog.vue         # 精灵图鉴
│   ├── detail.vue          # 精灵详情
│   ├── egg.vue             # 蛋壳预测
│   ├── breeding-planner.vue# 孵蛋摆窝
│   ├── pvp-breakpoint.vue  # 属性值计算（断点分析）
│   ├── team-editor.vue     # 阵容编辑（含天梯适配度预演）
│   ├── team-report.vue     # 阵容报告
│   ├── speed-rank.vue      # 速度排行
│   ├── restriction.vue     # 属性克制
│   └── skill-search.vue    # 技能查询
│
├── components/             # 公共组件（easycom 自动注册 + 部分手动注册）
├── config/                 # 应用规则配置（pvpRuleConfig.js）
├── data/                   # 数据文件
│   ├── pet/                # 精灵数据（BCNF 范式，见下文）
│   ├── skill/              # 技能数据
│   ├── config/             # 数学公式 / 属性克制表 / 孵蛋数据 / 满级模板等
│   └── pvp/                # 天梯目标、通用技能预设、展示规则
│
├── utils/                  # 工具函数（伤害引擎、阵容分析、热更新、分享码等）
├── crawler_official_api/   # 官方 API 数据抓取与生成（唯一数据入口）
├── scripts/                # 辅助脚本（悬浮窗构建 / 数据生成 / 冒烟与回归测试）
├── tools/                  # 运维工具（素材压缩校验 / 天梯映射 / 异色图补齐）
├── server/share-code-proxy/# 阵容码解析转发服务（Cloudflare Worker，见其 README）
├── static/float/           # 实时伤害悬浮窗页面（独立 HTML + 打包产物）
└── uni_modules/            # UTS 插件（Android 悬浮窗）
```

## 数据架构

采用 BCNF 范式设计，消除数据冗余：

| 文件 | 主键 | 说明 |
|------|------|------|
| `data/pet/pet_index.js` | `(wikiId, name)` | 索引表：名称→页面标题/UI标签 |
| `data/pet/pet_detail.js` | `seq` | 详情表：种族值、属性、图片、变体、异色、特性 |
| `data/pet/pet_skills.js` | `seq` | 技能名表：三种技能类型 |

**关键设计：**
- 变体数据合并在 `pet_detail.js` 中，按 `seq` 分组存储所有形态
- 异色图片和特性图标直接嵌入详情，无需单独文件
- 技能通过名称映射到 `data/skill/skills.js` 获取完整信息

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

# 5. 更新孵蛋数据（官方 /pets/{pid}/egg 端点；抓取+生成+应用 eggData.js 一条命令）
python crawler_official_api/update_data.py egg

# 6. 更新精灵立绘 webp（可选）
python crawler_official_api/update_data.py fetch-pet-images          # 仅补本地缺失
python crawler_official_api/update_data.py fetch-pet-images 150 152  # 指定序号强制覆盖
python crawler_official_api/update_data.py fetch-pet-images --all    # 全量覆盖（图片错乱时一键修复）

# 7. 验证图片完整性（引用缺失/内容重复检测）
python crawler_official_api/verify_pet_images.py

# 8. 更新悬浮窗用的精简数据（static/float/float_data.json）
npm run build:float-data
```

API Key 读取顺序：环境变量 `ROCO_API_KEY` > `crawler_official_api/api_key.local`（已 gitignore）。

旧的 B站Wiki 爬虫（crawler/）与官方 API 试验脚本已废弃删除。

## 静态素材说明（不入库）

以下素材目录已加入 `.gitignore`，**克隆仓库后不包含**，需按下述方式生成/获取：

| 目录 | 内容 | 获取方式 |
|------|------|----------|
| `static/static-web/pets/` | 精灵立绘 webp | `python crawler_official_api/update_data.py fetch-pet-images --all` |
| `static/static-web/skills/` | 技能图标 webp | `python crawler_official_api/update_data.py fetch-skill-icons` |
| `static/static-web/traits/` `icons/` | 特性/属性图标 | 官方 API 手动获取 |
| `static/web/` | 地图瓦片（z5~z8 金字塔切片） | 由原始大图切片生成；地图页已下线，当前无消费方 |

素材生成完成后，可运行 `python crawler_official_api/verify_pet_images.py` 校验立绘完整性。
异色图缺失时可用 `python tools/fetch_missing_shiny_images.py` 补齐本地镜像。

## APK 打包说明

HBuilderX **云打包对工程体积有限制**，static 资源过大时图片不会打进 APK（表现为 APK 体积很小、安装后图片全部不显示）。

- `static/static-web/`（立绘+图标）随 APK 打包，离线可用
- 立绘保持压缩态：长边 ≤800px、webp q82。若重新执行 `fetch-pet-images` 全量覆盖后，须再跑压缩：

```bash
python tools/compress_static_web.py            # 压缩到打包态（800px q82，小图自动跳过）
python tools/compress_static_web.py --dry-run  # 仅预估体积
```

- 打包前自查：`python tools/verify_static_web.py`，要求输出总体积 ≤50MB 且全部 [OK]，超出则说明立绘未压缩

## 测试与校验

```bash
npm run test:pvp        # PVP 断点回归（43 用例）
npm run test:meta       # 天梯适配度预演冒烟
npm run test:hotupdate  # 数据热更新端到端
node scripts/smoke-data-chains.cjs          # 数据链路运行时冒烟
node scripts/verify-config-imports.cjs      # config 模块依赖导出核对
node scripts/verify-skill-index.cjs         # 技能反向索引验证
node scripts/check-import-paths.cjs         # import 断链扫描
node scripts/check-vue-syntax.cjs           # vue 文件三层语法校验
node tools/check-asset-fallback-chain.mjs   # 资产回退链校验
node tools/map-meta-pets.mjs <候选名单> <输出>  # 天梯目标映射（禁止手填 seq）
```

> `scripts/.meta-test/` 与 `scripts/.hotupdate-test.cjs` 是测试运行时自动生成的转译产物，已加入 `.gitignore`，无需手工维护。
