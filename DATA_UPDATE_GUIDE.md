# 数据更新说明

这个项目当前需要长期保留的内容，主要分成两类：

## 1. App 运行时会用到的数据和资源

### 数据文件
- `data/pets.js`
- `data/pets_detail.js`
- `data/skills.js`
- `data/skill_icons.js`
- `data/game_math.js`
- `data/eggData.js`
- `data/pet_variants.js`
- `data/pet_variant_details.js`
- `data/pet_trait_images.js`
- `data/pet_yise.js`
- `data/pet_race_speed.js`
- `data/final_form_map.json`
- `data/map_rect_pyramid.json`

### 静态资源
- `static/pets/`
- `static/skills/`
- `static/icons/`
- `static/traits/`
- `static/map_z8_v3.png`
- `static/map_rect_z8/`
- `static/map_rect_z7/`
- `static/map_rect_z6/`
- `static/map_rect_z5/`

## 2. wiki / 游戏更新后可重新运行的脚本

### 精灵主数据
1. `crawler/generate_pets.py`
   - 从 `static/pets.html` 重新生成 `data/pets.js`

2. `crawler/professional_crawler.py`
   - 从 wiki 抓取精灵详情
   - 产出中间文件 `pet_details.json`

3. `crawler/convert_details.py`
   - 把 `pet_details.json` 转成前端使用的 `data/pets_detail.js`

4. `crawler/generate_pet_race_speed.py`
   - 从 `data/pets_detail.js` 生成 `data/pet_race_speed.js`

### 技能数据
5. `crawler/crawl_skill_details.py`
   - 更新 `data/skills.js`

6. `crawler/crawl_skill_icons.py`
   - 更新 `data/skill_icons.js`
   - 下载技能图标到 `static/skills/`

### 多形态 / 最高形态
7. `crawler/generate_variants.py`
   - 根据本地 `static/pets/` 图片生成 `data/pet_variants.js`

8. `crawler/crawl_variant_details.py`
   - 抓取多形态的独立技能、种族值、属性、trait 等数据
   - 更新 `data/pet_variant_details.js`
   - 下载多形态 trait 图到 `static/traits/variants/`

9. `crawler/final_form_helper.py --output data/final_form_map.json`
   - 按 trait / id 规则生成最高形态映射

### trait 图片
10. `crawler/crawl_trait_images.py`
   - 更新 `data/pet_trait_images.js`
   - 下载普通精灵 trait 图到 `static/traits/base/`

### 图片资源
11. `crawler/download_pet_images.py`
   - 更新 `static/pets/`

12. `crawler/download_yise_images.py`
   - 更新异色图片和 `data/pet_yise.js`

### 地图资源
13. `crawler/generate_map_pyramid.py`
   - 只基于 `static/map_z8_v3.png`
   - 生成纯本地矩形瓦片金字塔
   - 输出：
     - `data/map_rect_pyramid.json`
     - `static/map_rect_z8/`
     - `static/map_rect_z7/`
     - `static/map_rect_z6/`
     - `static/map_rect_z5/`

14. `crawler/download_map_tiles.py`
   - 如果以后要重新研究官方 wiki 瓦片源，可以用它扫描和下载
   - 这条线目前不是 App 地图页的主流程

15. `crawler/generate_map_tiles_from_image.py`
   - 旧的单层 z8 切片脚本
   - 现在不是地图页主流程，但保留作备用工具

## 3. 推荐更新顺序

如果 wiki 更新了，推荐按这个顺序跑：

1. `python crawler/generate_pets.py`
2. `python crawler/professional_crawler.py`
3. `python crawler/convert_details.py`
4. `python crawler/generate_pet_race_speed.py`
5. `python crawler/crawl_skill_details.py`
6. `python crawler/crawl_skill_icons.py`
7. `python crawler/generate_variants.py`
8. `python crawler/crawl_variant_details.py`
9. `python crawler/crawl_trait_images.py`
10. `python crawler/final_form_helper.py --output data/final_form_map.json`
11. 如果有图片缺失，再跑：
    - `python crawler/download_pet_images.py`
    - `python crawler/download_yise_images.py`
12. 如果完整地图有更新，再跑：
    - `python crawler/generate_map_pyramid.py`

## 4. 地图缩放说明

当前前端地图页已经不再依赖旧的 `valid_tiles.json` 和 wiki 稀疏瓦片坐标。

现在主流程是：
- 以 `static/map_z8_v3.png` 作为唯一正确地图源
- 从这张完整大图切出多级矩形瓦片
- 前端根据缩放比例切换：
  - `z8` 看细节
  - `z7` 看中距离
  - `z6` 看大范围
  - `z5` 看全图概览

这样更适合手机自由缩放，也不会再受旧 wiki 坐标系错位影响。

## 5. 独立 staging 输出

下面这些脚本支持 `--output-root`，可以先把结果生成到单独目录，不直接覆盖当前项目：

- `crawler/professional_crawler.py`
- `crawler/convert_details.py`
- `crawler/crawl_skill_details.py`
- `crawler/crawl_skill_icons.py`
- `crawler/crawl_trait_images.py`
- `crawler/crawl_variant_details.py`
- `crawler/download_pet_images.py`
- `crawler/download_yise_images.py`
- `crawler/generate_pets.py`
- `crawler/generate_variants.py`
- `crawler/generate_pet_race_speed.py`
- `crawler/download_map_tiles.py`
- `crawler/generate_map_tiles_from_image.py`
- `crawler/generate_map_pyramid.py`

示例：

- `python crawler/generate_pets.py --output-root staging/update_test`
- `python crawler/generate_variants.py --output-root staging/update_test`
- `python crawler/generate_pet_race_speed.py --output-root staging/update_test`
- `python crawler/generate_map_pyramid.py --output-root staging/map_rect_test`

## 6. 当前地图主流程和备用流程

### 主流程
- `static/map_z8_v3.png`
- `crawler/generate_map_pyramid.py`
- `data/map_rect_pyramid.json`
- `static/map_rect_z8/`
- `static/map_rect_z7/`
- `static/map_rect_z6/`
- `static/map_rect_z5/`

### 备用 / 研究用途
- `crawler/download_map_tiles.py`
- `crawler/generate_map_tiles_from_image.py`

这两条备用路线目前不作为 App 地图页默认依赖。
