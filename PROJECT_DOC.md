# 洛克王国世界 - 项目文档

## 项目概述
- **项目名称**: 洛克王国世界 宠物图鉴助手
- **技术栈**: HBuilderX + Vue.js + uni-app
- **数据来源**: BiliGame Wiki (https://wiki.biligame.com/rocom/)

## 目录结构

```
luokewangguo/
├── data/                          # 数据文件（前端使用）
│   ├── pets.js                     # 宠物列表基础数据
│   ├── pets_detail.js              # 宠物详情数据（种族值、技能等）
│   ├── pet_variants.js             # 多形态宠物映射（如鸭吉吉）
│   ├── pet_yise.js                 # 异色宠物映射
│   ├── skill_icons.js              # 技能图标映射
│   └── skills.js                   # 技能详情数据
│
├── pages/                         # 页面
│   ├── index/                      # 首页（宠物列表）
│   │   └── index.vue
│   ├── detail/                     # 宠物详情页
│   │   └── detail.vue
│   └── egg/                        # 蛋预测页
│       └── egg.vue
│
├── static/                         # 静态资源
│   ├── icons/                      # 属性/系别图标（18种）
│   │   ├── 火.png, 水.png, 草.png, 冰.png, 电.png
│   │   ├── 光.png, 幽.png, 恶.png, 地.png, 翼.png
│   │   ├── 虫.png, 龙.png, 萌.png, 毒.png, 武.png
│   │   ├── 机械.png, 幻.png, 普通.png
│   │   │
│   ├── pets/                       # 宠物图片
│   │   ├── 001_迪莫.png           # 格式: {序号}_{精灵名}.png
│   │   ├── 041_奇丽草_异色.png    # 异色宠物: {序号}_{精灵名}_异色.png
│   │   └── 011_鸭吉吉（蓬松的样子）.png  # 多形态: {序号}_{精灵名}（形态名）.png
│   ├── pets.html                   # Wiki宠物页面HTML（用于解析图片）
│   ├── crawl_skill_icons.py        # 技能图标爬虫
│   ├── crawl_skill_details.py      # 技能详情爬虫
│   ├── download_pet_images.py      # 宠物图片下载脚本
│   └── generate_skills_js.py       # 生成技能JS文件
│
├── *.py                            # Python爬虫脚本
│
└── pets.html                       # Wiki宠物页面HTML
```

## 核心概念

### 1. 宠物分类

| 类型 | 说明 | 数据文件 | 示例 |
|------|------|---------|------|
| 普通宠物 | 只有一个形态 | pets.js | 迪莫、喵喵 |
| 多形态宠物 | 同一宠物有多个形态（如进化、季节） | pet_variants.js | 鸭吉吉（5个形态）、雪绒鸟（4个季节形态） |
| 异色宠物 | 原皮外的颜色变种 | pet_yise.js | 奇丽草_异色、护主犬_异色 |

**区分方式**:
- 多形态: 图片名含"（）"如 `011_鸭吉吉（蓬松的样子）.png`
- 异色: 图片名以"_异色"结尾如 `041_奇丽草_异色.png`

### 2. 属性/系别系统

共18种属性，对应 `static/icons/` 下的图标:
`火, 水, 草, 冰, 电, 光, 幽, 恶, 地, 翼, 虫, 龙, 萌, 毒, 武, 机械, 幻, 普通`

### 3. 技能分类

| 类型 | 说明 |
|------|------|
| 精灵技能 | 宠物天生携带的技能 |
| 血脉技能 | 通过血脉传承的技能 |
| 可学技能石 | 可通过技能石学习的技能 |

## 数据关系图

```
pets.js ──────► pets_detail.js
   │                   │
   │ (通过id关联)       │
   ▼                   ▼
pet_variants.js    skill_icons.js
   │                   │
   │                   ▼
   │              skills.js
   │
   ▼
pet_yise.js
```

## 前端页面说明

### index.vue - 宠物列表页
- 宠物筛选（按属性筛选，支持多选）
- 宠物展示（图片、名称、属性、稀有度）
- 点击进入详情页

### detail.vue - 宠物详情页
- 宠物立绘展示（支持多形态切换）
- 种族值展示（HP、攻击、防御、速度等）
- 技能展示（分三类：精灵技能/血脉技能/可学技能石）
- 每个技能显示: 图标、名称、属性图标、威力、能耗、类型、描述

### egg.vue - 蛋预测页
- 宠物蛋数据展示

## 爬虫脚本说明

### 重要脚本（请勿删除）

| 脚本 | 用途 | 使用方式 |
|------|------|---------|
| `professional_crawler.py` | 爬取宠物详情（种族值+技能+属性） | `python professional_crawler.py` |
| `convert_details.py` | 将pet_details.json转为pets_detail.js | `python convert_details.py` |
| `static/crawl_skill_icons.py` | 爬取技能图标 | `python static/crawl_skill_icons.py` |
| `static/crawl_skill_details.py` | 爬取技能详情 | `python static/crawl_skill_details.py` |

### 辅助脚本（与项目相关）

| 脚本 | 用途 |
|------|------|
| `fix_pets.py` | 修复pets.js数据 |
| `generate_variants.py` | 生成宠物变体数据 |
| `fix_base_img.py` | 修复基础图片路径 |
| `fix_variants.py` | 修复变体数据 |
| `static/regenerate_pets.py` | 从pets.html重新生成pets.js |
| `static/download_pet_images.py` | 下载宠物图片 |
| `static/download_yise_images.py` | 下载异色宠物图片 |
| `static/generate_skills_js.py` | 生成技能JS文件 |

## 数据更新流程

### 1. 更新宠物数据和详情
```bash
# 1. 爬取宠物详情（支持断点续爬）
python professional_crawler.py

# 2. 转换数据格式供前端使用
python convert_details.py
```

### 2. 更新技能数据
```bash
# 1. 爬取技能图标
python static/crawl_skill_icons.py

# 2. 爬取技能详情
python static/crawl_skill_details.py
```

### 3. 更新宠物图片
```bash
# 从pets.html下载宠物图片
python static/download_pet_images.py

# 下载异色宠物图片
python static/download_yise_images.py
```

## 常见问题

### Q: 属性图标不显示？
A: 检查 `static/icons/` 目录下是否有对应属性名的png文件，如"光.png"。

### Q: 技能图标不显示？
A: 检查 `data/skill_icons.js` 是否有该技能名，以及 `static/skills/` 目录下是否有对应图标。

### Q: 多形态/异色图片不显示？
A: 检查 `pet_variants.js` 和 `pet_yise.js` 数据结构是否正确。

### Q: 爬虫失败/被限制？
A: Cookie可能过期，需要从BiliGame Wiki重新获取cookie并更新 `professional_crawler.py` 中的 `COOKIE_STR` 变量。

## 前端关键代码位置

| 功能 | 文件位置 |
|------|---------|
| 宠物列表展示 | `pages/index/index.vue` |
| 宠物详情展示 | `pages/detail/detail.vue` |
| 属性筛选逻辑 | `pages/index/index.vue` 的 `filteredPets` 计算属性 |
| 技能分类展示 | `pages/detail/detail.vue` 的 `filteredSkills` 计算属性 |
| 图片路径获取 | `data/pets.js` 的 `petTypes`, `typeIconMap` |

## 注意事项

1. **Cookie维护**: BiliGame Wiki的Cookie会过期，如爬虫失败请更新Cookie
2. **断点续爬**: 爬虫支持断点续爬，进度保存在 `crawl_progress.json`
3. **数据顺序**: `pet_details.json` 数据顺序可能与 `pets.js` 不同，通过 `id` 字段关联
4. **异色vs多形态**: 区分清楚，异色是颜色变种，多形态是不同形态/阶段
