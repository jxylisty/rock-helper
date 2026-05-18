# 爬虫与数据更新指南

## 概述

本项目使用 Python 爬虫从 BiliBili Wiki 获取《洛克王国：世界》游戏数据。

## 快速开始

### 方式一：统一更新脚本（推荐）

```bash
# 完整更新（爬取 + 转换）
python crawler/update_data.py

# 仅转换已有数据（跳过爬虫）
python crawler/update_data.py --skip-crawl

# 测试模式（不实际执行）
python crawler/update_data.py --dry-run
```

### 方式二：手动运行

```bash
cd crawler

# 1. 爬取精灵详情
python professional_crawler.py

# 2. 转换数据格式
python convert_details.py

# 3. 生成变体列表
python generate_variants.py

# 4. 爬取变体详情
python crawl_variant_details.py

# 5. 返回项目根目录，运行精简版生成
cd ..
node scripts/build_pets_detail_light.js
node scripts/build_pet_variant_details_light.js
node scripts/build_pet_variants_list.js
```

## 环境要求

- Python 3.8+
- Node.js 16+ (仅用于生成精简版)

### Python 依赖

```bash
pip install requests beautifulsoup4
```

## 文件说明

### 爬虫文件 (crawler/)

| 文件 | 作用 |
|------|------|
| `professional_crawler.py` | 主爬虫，爬取精灵详情 |
| `convert_details.py` | 将 JSON 转换为 JS 模块 |
| `generate_variants.py` | 从本地图片生成变体列表 |
| `crawl_variant_details.py` | 爬取变体精灵详情 |
| `update_data.py` | 统一更新脚本 |

### 数据文件 (data/)

| 文件 | 大小 | 说明 |
|------|------|------|
| `pets_detail.js` | ~9MB | 完整精灵详情 |
| `pets_detail_light.js` | ~1.7MB | 精简版精灵详情 |
| `pet_variant_details.js` | ~5MB | 完整变体详情 |
| `pet_variant_details_light.js` | ~1MB | 精简版变体详情 |
| `pet_variants_list.js` | ~800KB | 变体精灵列表 |

### 脚本文件 (scripts/)

| 文件 | 作用 |
|------|------|
| `build_pets_detail_light.js` | 生成精灵精简版 |
| `build_pet_variant_details_light.js` | 生成变体精简版 |
| `build_pet_variants_list.js` | 生成变体精灵列表 |

## 图片更新

### 统一图片更新脚本

```bash
# 下载图片并转换为 WebP（输出到 staging 目录）
python crawler/update_images.py

# 仅下载 PNG，不转换 WebP
python crawler/update_images.py --no-webp

# 指定输出目录
python crawler/update_images.py --staging ./my-images

# 测试模式
python crawler/update_images.py --dry-run
```

### WebP 质量设置

```bash
# 设置 WebP 质量 (1-100，默认 85)
python crawler/update_images.py --quality 90
```

### 图片对比

运行脚本后会自动对比 staging 目录和本地 static 目录的差异。

### Python 依赖（图片）

```bash
pip install requests beautifulsoup4 pillow
```

## 常见问题

### Q: 爬虫失败，提示 cookie 过期

A: 需要更新 `professional_crawler.py` 中的 COOKIE_STR。登录 BiliBili Wiki 后，F12 开发者工具 → Network → 找到任意请求 → Request Headers → Cookie

### Q: 代理无法连接

A: 目前代码使用内置代理池，如需更新，修改 `professional_crawler.py` 中的 PROXY_POOL

### Q: 精简版和完整版有什么区别

A: 精简版移除了部分冗余字段，体积更小，适合移动端加载

## 更新日志

- 2025-05-18: 添加统一更新脚本 update_data.py
