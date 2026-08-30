# PVP 精灵识别系统（生产版）

> **一句话**：给一张洛克王国 PVP 对战截图（左侧 6 只精灵列表），返回每只精灵的图鉴编号和名字。
> 未改名精灵走 OCR（~100%），改名精灵走图像识别（85%+，随模板积累上升）。

最后更新：2026-08-25 ｜ 代码入口：`crawler_official_api/pvp_lib.py`

---

## 1. 当前成绩（实测）

| 场景 | 准确率 | 说明 |
|---|---|---|
| 未改名精灵（OCR 链） | **~100%** | 210 实例测试：T0 精确 91% + T1/T2 形近字修正补齐 |
| 改名精灵（图像链，LOO 公平测） | **85.1%** | Top3=89.3%，Top5=92.3%（168 实例） |
| 其中：库内出现≥3 次的精灵 | **88.9%** | 出现≥4 次 100%，≥5 次 88.5% |
| 炫彩/异色精灵 | **100%**（12/12） | ORB 灰度特征对异色免疫、对炫彩粒子鲁棒 |

**核心结论**（为什么这么设计）：wiki/图鉴头像对 PVP 截图的图像识别 Top1=0%（渲染域差异致命），
**必须用 PVP 自己的截图当模板**。所以本系统 = OCR 验名自动建库 + 同域模板匹配。

---

## 2. 快速开始

```bash
cd C:\Users\zzx05\Documents\HBuilderProjects\luokewangguo

# ① 把对战截图（PNG，含左侧精灵列表）丢进一个目录，然后入库（增量、可反复跑）
python crawler_official_api/pvp_lib.py ingest "pvp素材"

# ② 识别一张截图 → JSON 打到 stdout
python crawler_official_api/pvp_lib.py recognize "pvp素材/某张截图.png"

# ③ 批量识别整个目录 → 写 JSON 文件
python crawler_official_api/pvp_lib.py recognize "pvp素材" --out result.json

# ④ 查看库规模
python crawler_official_api/pvp_lib.py status

# ⑤ 库质量自测（留一法，越准说明库越健康）
python crawler_official_api/pvp_lib.py eval
```

---

## 3. 系统架构

```
PVP 截图 (1920×xxx, 左侧: 精灵名+等级 6 行)
   │
   ├─ OCR (PaddleOCR PP-OCRv5) ──► 行配对 (名字行+等级行 → 精灵行)
   │        │
   │        ▼
   │   模糊匹配 620 图鉴名 (编辑距离+形近字+前后缀包含)
   │        │
   │   ┌────┴─────────────────────────┐
   │   │ T0 精确命中                   │ → 直接输出, 置信 ~1.0   【链路1: OCR】
   │   │ T1 1字错 & conf≥0.70          │ → 输出, 置信 0.85
   │   │ T2 2字错 & conf≥0.55          │ → 输出, 置信 0.70
   │   │ 未匹配/改名精灵/OCR噪声        │ ↓
   │   └──────────────────────────────┘
   │
   └─ 裁切头像 (名字行右侧方形区域)
            │
            ▼
      图像识别 【链路2: fallback】
        ① 抠图: K=4 聚类+边界触碰判定背景 (v10, 兼容深蓝渐变/贴边精灵)
        ② 标准化: 前景居中缩放贴 96×96 白底画布
        ③ ORB 特征 (1500 关键点, 前景 mask 限制)
        ④ 对模板库逐条 ORB 匹配 → 按精灵取 max 分聚合 → Top5
        ⑤ 置信度: raw≥20 且领先≥10% → high / raw≥12 → medium / 否则 low

【入库 ingest】= 链路1 的 OCR 答案当"验证人" → 裁头像存为模板 → 持续喂养链路2
```

**阈值表**（都在 `pvp_lib.py` 顶部常量，可调）：

| 常量 | 值 | 含义 |
|---|---|---|
| `CANVAS / FG_HEIGHT` | 96 / 72 | 标准化画布（210 实例网格搜索最优） |
| `OCR_CONF_HIGH_MIN` | 0.70 | T1（1 字错）采纳门槛 |
| `OCR_CONF_MED_MIN` | 0.55 | T2（2 字错）采纳门槛 |
| `IMG_RAW_HIGH` | 20.0 | 图像链 high 置信的 raw 分门槛 |
| `IMG_MARGIN_HIGH` | 0.10 | 图像链 high 置信的领先率门槛 |
| `IMG_RAW_MED` | 12.0 | 图像链 medium 置信门槛 |

---

## 4. 命令行参考

### 4.1 `ingest` — 增量入库（持续学习）

```bash
python crawler_official_api/pvp_lib.py ingest <目录或单张图>
```

- **机制**：OCR 读名字 → 模糊匹配图鉴（= 验证答案）→ 匹配成功才裁头像入库；
  匹配失败（改名精灵/OCR 失败）的行**不入库**（防止错误标签污染模板库）。
- **去重**：按源图 MD5 记录已入库截图；同一目录反复执行只处理新图（实测 34 张重跑 14 秒全跳过）。
- **产物**：`output/pvp_lib/images/` 模板头像 + `library.json` 元数据 + `features.pkl` ORB 特征缓存。
- OCR 对 CPU 较慢（~38 秒/张），批量首次入库需要等待；特征重建很快（202 条 10 秒）。

### 4.2 `recognize` — 识别

```bash
python crawler_official_api/pvp_lib.py recognize <目录或单张图> [--out x.json] [--force-image]
```

- 单张不指定 `--out` 时 **JSON 打到 stdout**（进度信息走 stderr，可直接管道解析）；
  目录模式必须 `--out`。
- `--force-image`：跳过 OCR 链强制全部走图像识别（**模拟改名精灵**，测试用）。

**输出 JSON Schema**（单张 = 一个对象；目录 = 对象数组）：

```jsonc
{
  "file": "xxx.png",
  "n_pets": 6,
  "pets": [
    {
      "index": 0,              // 行号
      "ocr_text": "音速犬",      // OCR 原始文本
      "ocr_conf": 0.998,        // OCR 引擎置信度
      "source": "ocr",          // "ocr" | "image" | "none"(两条链都失败)
      "seq": 138,               // 图鉴编号 (pet_detail.js 的 key)
      "name": "音速犬",           // 图鉴名
      "confidence": 0.999,      // 综合置信度 0~1
      "ocr_dist": 0,            // OCR 模糊匹配编辑距离 (null=未匹配)
      "image_top5": null        // 走图像链时的 Top5 (含 raw/margin/confidence)
    }
  ],
  "library": { "n_templates": 202 },
  "elapsed_sec": 45.5
}
```

**confidence 语义**：`ocr` 链 T0≈0.95-1.0 / T1=0.85 / T2=0.70；
`image` 链 high=0.85 / medium=0.60 / low=0.35。调用方可按阈值过滤（建议 ≥0.6 采纳）。

### 4.3 `status` / `eval`

- `status`：模板数、覆盖精灵数、出现≥3 次的精灵数（识别率主力）。
- `eval`：留一法自测（每条模板用其余模板识别），输出总体+分层命中率到
  `output/pvp_lib/loo_report.txt`。**每次大批量入库后建议跑一次**。

---

## 5. 目录结构与文件清单

```
crawler_official_api/
├── pvp_lib.py                    # ★ 本系统唯一入口 (CLI + 全部逻辑)
├── build_ingame_dataset.py       # 依赖: OCR初始化/推理, 图鉴名加载, 模糊匹配
├── eval_pvp_recognition.py       # 依赖: 行配对/头像裁切/v10抠图/96画布标准化/ORB
├── PVP_RECOGNITION.md            # 本文档
└── output/
    ├── pvp_lib/                  # ★ 模板库 (可整体拷贝迁移)
    │   ├── images/               #   模板头像 PNG: {seq:03d}_{名}__{源md5前8}_r{行}.png
    │   ├── library.json          #   条目元数据 + 已入库截图 md5 登记
    │   ├── features.pkl          #   ORB 描述子缓存 (库变更自动重建)
    │   └── loo_report.txt        #   eval 报告
    └── pvp_recognize/            # recognize 的调试产物
        ├── debug_*.jpg           #   原图+框+预测标签 (红=OCR框 绿=头像区 蓝=结果)
        └── crops/                #   每行裁切头像 (文件名含预测名)

data/pet/pet_detail.js            # 620 精灵名字典 (模糊匹配的答案源)
```

**Python 依赖**：`paddleocr`（PP-OCRv5 mobile）、`opencv-python`、`numpy`、`pillow`；
`scikit-learn` 可选（缺失时抠图自动退回 cv2.kmeans）。运行环境即当前 anaconda。

---

## 6. 日常更新流程（对战助手集成后）

对战截图项目自动落图到某个目录（如 `battle_shots/`）后，只需定期（或每场战后）：

```bash
python crawler_official_api/pvp_lib.py ingest battle_shots/   # 新图自动入库, 旧图秒跳过
python crawler_official_api/pvp_lib.py eval                   # 可选: 体检
```

- **未改名**的对手精灵 → 自动成为新模板 → 下次遇到（哪怕他改名）就能认出。
- 改名精灵的截图**不会污染库**（OCR 验名失败直接跳过）。
- 单只精灵模板越多越准：2 次≈74%，3 次≈89%，4 次以上≈90-100%。

---

## 7. 交接清单：给下一个项目（对战截图）的 Agent

**需要拷贝的文件**（保持相对目录结构）：

| 文件 | 作用 |
|---|---|
| `crawler_official_api/pvp_lib.py` | 识别服务入口（CLI 即 API） |
| `crawler_official_api/build_ingame_dataset.py` | OCR + 名字模糊匹配依赖 |
| `crawler_official_api/eval_pvp_recognition.py` | 裁切/抠图/ORB 依赖 |
| `crawler_official_api/PVP_RECOGNITION.md` | 本文档 |
| `data/pet/pet_detail.js` | 620 精灵名字典 |
| `crawler_official_api/output/pvp_lib/` | 现成模板库（202 模板/84 精灵，可继续增长） |

**调用方式**（推荐 CLI，语言无关）：

```bash
# 识别（返回 JSON, stderr 无关内容）
python <项目根>/crawler_official_api/pvp_lib.py recognize "<截图路径>"
# stdout → JSON (schema 见 4.2), 取 pets[].name / seq / confidence

# 学习新模板
python <项目根>/crawler_official_api/pvp_lib.py ingest "<截图目录>"
```

**⚠️ 路径硬编码注意**：`build_ingame_dataset.py` 顶部
`PROJECT = Path(r"C:\Users\zzx05\Documents\HBuilderProjects\luokewangguo")` 为硬编码。
若整体迁移目录，需改这一行为新项目根路径（其余文件全部相对定位，无需改动）。
模板库目录也可用环境变量 `PVP_LIB_DIR` 重定向。

**作为 Python 模块调用**（同进程，省 OCR 初始化开销）：

```python
import sys; sys.path.insert(0, "crawler_official_api")
from pvp_lib import PvpTemplateLibrary, recognize_image
from build_ingame_dataset import init_ocr, load_titles

lib = PvpTemplateLibrary().load()
ocr = init_ocr()          # ~10s, 全局一次
titles = load_titles()
result = recognize_image("截图.png", lib, ocr, titles)   # → dict (见 4.2)
```

---

## 8. 已知限制

1. **冷启动**：库里只出现过 1 次的精灵，图像链认不出（无模板可对）——34/84 只处于此状态，
   靠持续 ingest 解决；OCR 链不受影响（未改名仍 ~100%）。
2. **模板标签继承 OCR 准确率**：入库用 OCR 答案当标签，若 OCR 模糊匹配错误（T2 极少数场景）
   会产生错标模板。当前 210 实例伪 GT 验证 100% 正确，风险极低但非零。
3. **易混淆精灵**：长相接近的精灵（冰钻布鲁斯↔卡洛儿、音速犬系犬科互认）占误判主体，
   模板增多后自然缓解。
4. **性能**：CPU 上 OCR ~20-40 秒/张（识别和入库都是）；图像链 ~3 秒/只。
   若需实时，考虑 GPU 版 PaddleOCR 或只在赛后批量处理。
5. **截图格式**：当前适配 1920 宽、左侧"名字+等级"列表布局；分辨率/布局大改需重新验证
   行配对与裁切参数（`pair_pvp_rows` / `crop_pvp_avatar`）。

---

## 9. 设计依据（实验数据存档）

- LOO 评估：`crawler_official_api/output/pvp_loo/report.txt`（210 实例完整报告）
- 策略调优：`crawler_official_api/tune_pvp_loo.py` / `tune_pvp_loo2.py`
  （96 画布 + max 聚合为 210 实例网格搜索最优；跨域融合权重在同域被 Hub 精灵拖累，故弃用）
- 历史 OCR 方案：`crawler_official_api/pvp_recognize_v7.py`（评估用，生产已由 pvp_lib 取代）
- 炫彩/异色专项：`crawler_official_api/check_fancy.py`（12/12=100%）
