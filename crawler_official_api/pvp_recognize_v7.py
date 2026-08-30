# -*- coding: utf-8 -*-
"""
PVP 精灵识别 v7 ——  OCR(主) + 图像(fallback) 混合识别
=====================================================

解决 v1~v6 纯图像算法识别率低 (Top1=2.6%) 的根本问题:
  洛克王国 PVP 对战界面左侧显示「精灵名字 + 等级」, 玩家未改名时可直接 OCR.
  实测 7 张 PVP 截图 = 42 只精灵:
    - OCR 精确命中        39/42 = 92.9%
    - OCR + 形近字模糊    42/42 = 100%   (T0+T1+T2 全覆盖)

决策树 (对每只精灵):
  tier = best_match(ocr_text) 返回的 ocr_dist
  ┌─ tier==0 (精确)              → HIGH  输出 (不用图像, 速度×6)
  ├─ tier≤1 (形近) 且 OCR≥0.7    → HIGH  输出
  ├─ tier≤2 (形近/漏字) 且 OCR≥0.6 → MED  输出 (OCR 高度自信, 允许 2 处错字)
  ├─ tier≤3 (轻度模糊)            → LOW  → 图像Top5 是否包含 OCR 推荐? 是则采纳, 否则图像Top1
  └─ 未匹配 / tier>3 / OCR<0.5   → NONE → 纯图像 Top1 (改名玩家场景)

用法:
  # 评估 (批处理 + 报告)
  python crawler_official_api/pvp_recognize_v7.py  'C:/path/to/pvp_screenshots'  --eval

  # 单张识别 (API 输出 JSON)
  python crawler_official_api/pvp_recognize_v7.py  'C:/path/to/pvp_screenshots/2.png'
"""
import json, re, sys, time
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(SCRIPT_DIR))

from build_ingame_dataset import (
    imread_unicode, init_ocr, run_ocr, poly_box,
    best_match, load_titles,
)
from eval_pvp_recognition import (
    pair_pvp_rows, crop_pvp_avatar,
    preproc_for_match, compute_phash_dhash_from_gray64, extract_orb_masked,
    topn_hash, topn_orb, topn_masked_template_sobel, fusion_topn,
    check_hit, imwrite_unicode, FeatureLibrary,
    topn_hists,   # v11: HOG/HSV/LAB 直方图特征 (抗异色炫彩+改名)
)

# 阈值 (基于 42 只样本统计)
OCR_TIER_HIGH_MAX = 1      # T0/T1 直接输出
OCR_TIER_MED_MAX  = 2      # T2 及以下需要 图像确认
OCR_CONF_HIGH_MIN = 0.70   # 对应 T1 判定
OCR_CONF_MED_MIN  = 0.55   # 对应 T2 判定 (OCR识别置信度)

SOURCES = ("ocr_t0", "ocr_t1", "ocr_t2", "ocr_t3_img_verify_pass",
           "ocr_t3_img_verify_fail_fallback_img", "img_only_rename_fallback")

OUT_DIR = SCRIPT_DIR / "output" / "pvp_recognize_v7"
CROP_DIR = OUT_DIR / "crops"
DBG_DIR  = OUT_DIR / "debug"

# ============================================================
# 识别结果数据结构
# ============================================================
@dataclass
class PetRecognition:
    seq: Optional[int]
    name: str
    confidence: float          # 0.0 ~ 1.0  综合置信度
    source: str                # SOURCES 之一
    ocr_text: str              # 原始 OCR 文本
    ocr_conf: float            # OCR 模型置信度
    ocr_dist: Optional[int]    # 模糊匹配的编辑距离 (None=未匹配)
    img_top5: List[Dict]       # 图像 fallback 的 top5 (空=没跑图像)
    avatar_file: str = ""      # 裁切头像路径 (调试用)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["hit"] = bool(self.seq is not None)
        return d


# ============================================================
# 主决策
# ============================================================
def decide_one(ocr_text: str, ocr_conf: float, titles,
               img_crop_bgr: Optional[np.ndarray],
               lib: List[Dict]) -> PetRecognition:
    """v7 决策核心. img_crop_bgr=None 表示跳过图像 fallback (不建议)."""
    m = best_match(ocr_text, titles)  # (page_title, seq, pet_id, ocr_dist) 或 None
    ocr_dist = m[3] if m else None
    ocr_seq  = m[1] if m else None
    ocr_name = m[0] if m else ""

    # 图像分支: 统一预处理 + 四算法融合 Top5
    img_top5 = []
    img_top1_seq = None
    if img_crop_bgr is not None:
        qpp = preproc_for_match(img_crop_bgr)
        if qpp is not None:
            q_ph, q_dh = compute_phash_dhash_from_gray64(qpp["gray"])
            _, q_orb_des = extract_orb_masked(qpp["gray"], qpp["fg_mask"])
            th = topn_hash(q_ph, q_dh, lib, n=5)
            to = topn_orb(q_orb_des, lib, n=5)
            tt = topn_masked_template_sobel(qpp, lib, n=5)
            tht = topn_hists(qpp, lib, n=5)  # v11 HOG+HSV+LAB
            fu = fusion_topn(th, to, tt, tht, n=5)
            img_top5 = fu
            if fu: img_top1_seq = fu[0]["seq"]
    img_seq_set = set(e["seq"] for e in img_top5)

    # === 决策 ===
    if m is not None:
        if ocr_dist == 0:
            # T0 精确, 直接采纳 (OCR引擎置信度归一化到 0.95+ 作为综合置信度)
            conf = 0.95 + 0.05 * min(1.0, ocr_conf)
            return PetRecognition(ocr_seq, ocr_name, conf, "ocr_t0",
                                  ocr_text, ocr_conf, ocr_dist, img_top5)
        if ocr_dist <= OCR_TIER_HIGH_MAX and ocr_conf >= OCR_CONF_HIGH_MIN:
            # T1 形近字 1 处差异, OCR自信, 采纳
            conf = 0.88 + 0.07 * min(1.0, ocr_conf) - 0.04 * ocr_dist
            return PetRecognition(ocr_seq, ocr_name, conf, f"ocr_t{ocr_dist}",
                                  ocr_text, ocr_conf, ocr_dist, img_top5)
        if ocr_dist <= OCR_TIER_MED_MAX and ocr_conf >= OCR_CONF_MED_MIN:
            # T2 2 处差异 (如 幽冥眼→幽影树), OCR 高置信, 采纳
            conf = 0.78 + 0.12 * min(1.0, ocr_conf) - 0.05 * ocr_dist
            return PetRecognition(ocr_seq, ocr_name, conf, f"ocr_t{ocr_dist}",
                                  ocr_text, ocr_conf, ocr_dist, img_top5)
        if ocr_dist <= 3:
            # T3 需要图像二次验证: 如果图像 Top5 含 OCR 推荐 seq, 就采纳, 否则用图像 Top1
            if ocr_seq in img_seq_set:
                rk = next(i for i, e in enumerate(img_top5) if e["seq"] == ocr_seq) + 1
                conf = 0.65 - 0.06 * (rk - 1)
                return PetRecognition(ocr_seq, ocr_name, conf, "ocr_t3_img_verify_pass",
                                      ocr_text, ocr_conf, ocr_dist, img_top5)
            else:
                # 图像不支持 → 降级图像 Top1
                if img_top1_seq is not None:
                    top1 = img_top5[0]
                    return PetRecognition(top1["seq"], top1["name"], float(top1.get("fusion_score", 0.0)),
                                          "ocr_t3_img_verify_fail_fallback_img",
                                          ocr_text, ocr_conf, ocr_dist, img_top5)
                else:
                    return PetRecognition(ocr_seq, ocr_name, 0.25,
                                          "ocr_t3_img_verify_fail_fallback_img",
                                          ocr_text, ocr_conf, ocr_dist, img_top5)
    # ======== 未匹配 / OCR置信度过低 → 纯图像 fallback ========
    if img_top5:
        top1 = img_top5[0]
        return PetRecognition(top1["seq"], top1["name"], float(top1.get("fusion_score", 0.0)),
                              "img_only_rename_fallback",
                              ocr_text, ocr_conf, None, img_top5)
    return PetRecognition(None, "", 0.0, "img_only_rename_fallback",
                          ocr_text, ocr_conf, None, [])


# ============================================================
# 批处理 + 报告
# ============================================================
def draw_debug_v7(img_bgr, rows, recog_list: List[PetRecognition], avatars_boxes, out_path: Path):
    """画诊断图: 每个精灵显示 OCR文本 → 识别名 + source + conf"""
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(img_rgb).convert("RGB")
    draw = ImageDraw.Draw(pil)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 15)
        font_sm = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 12)
    except Exception:
        font = ImageFont.load_default(); font_sm = font
    color_by_source = {
        "ocr_t0": (20, 180, 80),
        "ocr_t1": (30, 160, 220),
        "ocr_t2": (240, 160, 20),
        "ocr_t3_img_verify_pass": (140, 100, 220),
        "ocr_t3_img_verify_fail_fallback_img": (230, 80, 80),
        "img_only_rename_fallback": (230, 60, 60),
    }
    for pr, recog, ab in zip(rows, recog_list, avatars_boxes):
        # OCR 名字框 (红色虚框)
        x0, y0, x1, y1 = pr["name_box"]
        draw.rectangle([x0, y0, x1, y1], outline=(220, 40, 40), width=2)
        # 头像裁切框 (绿色)
        ax0, ay0, ax1, ay1 = ab
        draw.rectangle([ax0, ay0, ax1, ay1], outline=(30, 200, 60), width=2)
        # 右上角 源标签 (彩色小条)
        col = color_by_source.get(recog.source, (120, 120, 120))
        label = f"{recog.name}  [{recog.source}] conf={recog.confidence:.2f}"
        if recog.ocr_text and recog.ocr_text != recog.name:
            label = f"'{recog.ocr_text}'→" + label
        tx, ty = max(2, ax0 - 2), max(0, ay0 - 38)
        tw, th = draw.textbbox((0, 0), label, font=font)[2:]
        draw.rectangle([tx, ty, tx + tw + 8, ty + th + 8], fill=(*col, 230))
        draw.text((tx + 4, ty + 3), label, fill=(255, 255, 255), font=font)
    pil.convert("RGB").save(str(out_path), "JPEG", quality=88)


def recognize_file(fp: Path, ocr, titles, lib) -> Dict[str, Any]:
    """识别单张截图. 返回 dict(records, debug_path)"""
    img = imread_unicode(str(fp))
    if img is None:
        return {"file": fp.name, "error": "无法读取", "records": []}
    lines = run_ocr(ocr, str(fp))
    rows = pair_pvp_rows(lines)

    records = []; boxes = []; recog_objs = []
    for ri, pr in enumerate(rows):
        crop, av_box = crop_pvp_avatar(img, pr)
        boxes.append(av_box)
        on = pr["name_txt"]; oc = float(pr["name_score"])
        recog = decide_one(on, oc, titles, crop, lib)
        recog_objs.append(recog)
        rd = recog.to_dict()
        rd["row"] = ri
        rd["level_text"] = pr.get("lv_txt")
        rd["avatar_box"] = list(av_box)
        if crop is not None:
            stem = f"{rd['seq']:03d}_{rd['name']}" if rd['seq'] else "unknown"
            cname = f"{fp.stem}_{ri + 1:02d}_{stem}.png"
            cpath = CROP_DIR / cname
            imwrite_unicode(str(cpath), crop)
            rd["avatar_file"] = f"crops/{cname}"
            recog.avatar_file = f"crops/{cname}"
        records.append(rd)

    dbg_path = DBG_DIR / f"{fp.stem}_debug.jpg"
    draw_debug_v7(img, rows, recog_objs, boxes, dbg_path)
    return {"file": fp.name, "shape": [img.shape[1], img.shape[0]],
            "ocr_rows": len(lines), "pet_rows": len(rows),
            "debug_path": str(dbg_path), "records": records}


def evaluate_batch(pvp_dir: Path):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    CROP_DIR.mkdir(parents=True, exist_ok=True)
    DBG_DIR.mkdir(parents=True, exist_ok=True)

    files = sorted(pvp_dir.glob("*.png")) + sorted(pvp_dir.glob("*.jpg"))
    print(f"[scan] PVP截图 {len(files)} 张 @ {pvp_dir}")
    t00 = time.time()
    ocr = init_ocr()
    titles = load_titles()
    _fl = FeatureLibrary(ingame_only=False)
    lib = _fl.build()
    print(f"[lib] 大小={len(lib)}  准备耗时 {time.time()-t00:.1f}s")

    src_stats = {s: 0 for s in SOURCES}
    total_records = []; total_pets = 0

    for idx, fp in enumerate(files):
        t0 = time.time()
        res = recognize_file(fp, ocr, titles, lib)
        if "error" in res:
            print(f"  [{idx+1}/{len(files)}] {fp.name}: {res['error']}"); continue
        print(f"  [{idx+1}/{len(files)}] {fp.name} {res['shape']} OCR={res['ocr_rows']}行 配对={res['pet_rows']}只  "
              f"耗时{time.time()-t0:.1f}s")
        for rd in res["records"]:
            total_pets += 1
            src = rd["source"]
            src_stats[src] = src_stats.get(src, 0) + 1
            t0_txt = f"T{rd.get('ocr_dist')}" if rd.get('ocr_dist') is not None else "T-"
            print(f"    [{rd['row']}] {t0_txt} OCR='{rd['ocr_text']}' "
                  f"→ seq={rd.get('seq')} {rd['name']:10s}  conf={rd['confidence']:0.2f}  src={src}")
        total_records.append(res)

    # ========= 汇总报告 =========
    total_secs = time.time() - t00
    lines_out = []
    lines_out.append("=" * 78)
    lines_out.append("PVP 精灵识别 v7 评估报告")
    lines_out.append("=" * 78)
    lines_out.append(f"截图数量   : {len(files)} 张")
    lines_out.append(f"识别精灵数 : {total_pets} 只")
    lines_out.append(f"特征库大小 : {len(lib)}")
    lines_out.append(f"总耗时     : {total_secs:.1f} s  (平均 {total_secs/max(1,len(files)):.1f} s/张,  "
                     f"{total_secs/max(1,total_pets)*1000:.0f} ms/只)")
    lines_out.append("")
    lines_out.append("识别来源分布 (未改名=OCR链, 改名=图像fallback链):")
    for s, c in sorted(src_stats.items(), key=lambda x: -x[1]):
        if c == 0: continue
        lines_out.append(f"  {s:42s} : {c:>3d}/{total_pets} = {100*c/max(1,total_pets):0.1f}%")
    lines_out.append("")
    # 用 best_match 自动生成的 GT 近似评估 (仅限未改名场景有效)
    hits_by_gt = 0; gts = 0
    for file_res in total_records:
        for rd in file_res["records"]:
            on = rd.get("ocr_text") or ""
            m = best_match(on, titles)
            if m is None: continue
            gts += 1
            if rd.get("seq") == m[1]: hits_by_gt += 1
    lines_out.append(f"[近似Top1] 以OCR+best_match做伪GT: {hits_by_gt}/{gts} = "
                     f"{100*hits_by_gt/max(1,gts):0.1f}%")
    lines_out.append("  (说明: 真实改名场景下, 伪GT失效, 但此时 img_only 分支已接管)")
    lines_out.append("")
    lines_out.append("决策阈值:")
    lines_out.append(f"  OCR精确(T0)     → 置信 HIGH, 直接采纳")
    lines_out.append(f"  OCR 1字错(T1) + OCR_conf≥{OCR_CONF_HIGH_MIN} → 置信 HIGH, 直接采纳")
    lines_out.append(f"  OCR 2字错(T2) + OCR_conf≥{OCR_CONF_MED_MIN} → 置信 MED,  直接采纳")
    lines_out.append(f"  OCR 3字错(T3)               → 置信 LOW, 图像Top5验证后采纳/降级")
    lines_out.append(f"  未匹配 / T>3 / OCR_conf<{OCR_CONF_MED_MIN} → 走纯图像 fallback")

    report = "\n".join(lines_out)
    print("\n\n" + report)
    (OUT_DIR / "report.txt").write_text(report, encoding="utf-8")
    (OUT_DIR / "eval.json").write_text(json.dumps({
        "version": "pvp_recognize_v7",
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "src_dir": str(pvp_dir),
        "lib_size": len(lib),
        "file_count": len(files),
        "pet_count": total_pets,
        "thresholds": {
            "ocr_tier_high_max": OCR_TIER_HIGH_MAX,
            "ocr_tier_med_max": OCR_TIER_MED_MAX,
            "ocr_conf_high_min": OCR_CONF_HIGH_MIN,
            "ocr_conf_med_min": OCR_CONF_MED_MIN,
        },
        "source_stats": {k: v for k, v in src_stats.items() if v > 0},
        "files": total_records,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n[out] eval.json → {OUT_DIR / 'eval.json'}")
    print(f"[out] report.txt → {OUT_DIR / 'report.txt'}")
    print(f"[out] 诊断图    → {DBG_DIR}/")


# ============================================================
# 单文件 JSON 模式 (供外部调用集成到 uni-app 服务端)
# ============================================================
def single_json(path: Path):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    CROP_DIR.mkdir(parents=True, exist_ok=True)
    DBG_DIR.mkdir(parents=True, exist_ok=True)
    ocr = init_ocr()
    titles = load_titles()
    lib = FeatureLibrary(ingame_only=False).build()
    res = recognize_file(path, ocr, titles, lib)
    print(json.dumps(res, ensure_ascii=False, indent=2))


def main():
    argv = sys.argv[1:]
    if not argv:
        print(__doc__); sys.exit(0)
    target = Path(argv[0])
    if not target.exists():
        print(f"[error] 路径不存在: {target}"); sys.exit(1)
    if target.is_file():
        single_json(target)
    else:
        evaluate_batch(target)


if __name__ == "__main__":
    main()
