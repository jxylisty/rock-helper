# -*- coding: utf-8 -*-
"""
PVP 图像识别 留一法 (Leave-One-Out) 评估
==========================================
验证方案: "OCR 识别名字当答案(GT), 图像识别不看答案独立认精灵"

流程:
  1. OCR 全部 PVP 截图 → 每只精灵名字(=GT) + 裁切头像
  2. 预计算全部头像特征 (pHash/dHash, ORB, 模板/Sobel, HOG/HSV/LAB)
  3. 留一法: 查询 Q 的模板库 = 除 Q 自己外的所有头像
     → 同一精灵在其他截图出现过 → 库里就有它的 PVP 真头像模板
     → 完全模拟真实改名场景: 改名精灵 vs 之前积累的 PVP 头像库
  4. 场景A: 纯 PVP 同域库 (核心验证)
     场景B: PVP库 + ingame/wiki 391 干扰项 (生产环境模拟)

公平测口径: 只统计"出现≥2次"的实例 (库里必有同精灵真模板)
全量口径  : 含"仅出现1次"的实例 (库里无模板, 必漏, 模拟冷启动)

输出: output/pvp_loo/report.txt + result.json + crops/
"""
import json
import sys
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(SCRIPT_DIR))

from build_ingame_dataset import (  # noqa: E402
    imread_unicode, init_ocr, run_ocr, best_match, load_titles,
)
from eval_pvp_recognition import (  # noqa: E402
    pair_pvp_rows, crop_pvp_avatar,
    preproc_for_match, compute_phash_dhash_from_gray64, extract_orb_masked,
    topn_hash, topn_orb, topn_masked_template_sobel, topn_hists, fusion_topn,
    check_hit, imwrite_unicode, FeatureLibrary,
)

PVP_DIR = PROJECT_ROOT / "pvp素材"
OUT_DIR = SCRIPT_DIR / "output" / "pvp_loo"
CROP_DIR = OUT_DIR / "crops"
OUT_DIR.mkdir(parents=True, exist_ok=True)
CROP_DIR.mkdir(parents=True, exist_ok=True)

ALGOS = ("phash", "orb", "tmpl", "hists", "fusion")

# 已知炫彩/异色精灵 (训练素材标注) — 用于报告高亮
FANCY_NAMES = {"帕帕斯卡", "燃薪虫", "白金独角兽", "椰浆布丁", "恶魔狼", "胡桃王子"}


# ----------------------------------------------------------
# 1) 收集全部实例: OCR → GT + 头像裁切
# ----------------------------------------------------------
def collect_instances():
    ocr = init_ocr()
    titles = load_titles()
    files = sorted(PVP_DIR.glob("*.png"))
    print(f"[scan] PVP 截图 {len(files)} 张 @ {PVP_DIR}")
    instances = []
    t0 = time.time()
    for idx, fp in enumerate(files):
        img = imread_unicode(fp)
        if img is None:
            print(f"  [{fp.name}] 读取失败, 跳过")
            continue
        lines = run_ocr(ocr, fp)
        rows = pair_pvp_rows(lines)
        for ri, pr in enumerate(rows):
            m = best_match(pr["name_txt"], titles)
            crop, av_box = crop_pvp_avatar(img, pr)
            instances.append({
                "src": fp.name, "row": ri,
                "ocr_raw": pr["name_txt"],
                "ocr_conf": round(float(pr["name_score"]), 3),
                "gt_seq": int(m[1]) if m else None,
                "gt_name": str(m[0]) if m else "",
                "ocr_dist": int(m[3]) if m else None,
                "crop": crop, "avatar_box": [int(v) for v in av_box],
            })
        print(f"  [{idx + 1}/{len(files)}] {fp.name}: {len(rows)} 行 "
              f"(累计 {len(instances)})  {time.time() - t0:.0f}s")
    return instances


# ----------------------------------------------------------
# 2) 特征预计算
# ----------------------------------------------------------
def make_entry(inst, uid):
    pp = preproc_for_match(inst["crop"])
    if pp is None:
        return None
    ph, dh = compute_phash_dhash_from_gray64(pp["gray"])
    _, des = extract_orb_masked(pp["gray"], pp["fg_mask"])
    return {
        "uid": uid,
        "seq": inst["gt_seq"], "name": inst["gt_name"], "src": inst["src"],
        "phash": ph, "dhash": dh, "orb_des": des, "pp": pp,
    }


def match_one(q, lib):
    th = topn_hash(q["phash"], q["dhash"], lib, n=5)
    to = topn_orb(q["orb_des"], lib, n=5)
    tt = topn_masked_template_sobel(q["pp"], lib, n=5)
    tht = topn_hists(q["pp"], lib, n=5)
    fu = fusion_topn(th, to, tt, tht, n=5)
    return {"phash": th, "orb": to, "tmpl": tt, "hists": tht, "fusion": fu}


def eval_rows(queries, base_lib, tag):
    """每个查询: 库 = base_lib 减去自己(uid). 返回逐行命中明细."""
    rows = []
    t0 = time.time()
    for qi, q in enumerate(queries):
        lib = [e for e in base_lib if e["uid"] != q["uid"]]
        res = match_one(q, lib)
        row = {
            "src": q["src"], "name": q["name"], "gt_seq": q["seq"],
            "hits": {}, "top": {},
        }
        for k, lst in res.items():
            t1, t3, t5 = check_hit(lst, q["seq"])
            row["hits"][k] = {"top1": t1, "top3": t3, "top5": t5}
            row["top"][k] = [
                {"seq": t["seq"], "name": t["name"],
                 "s": round(float(t.get("fusion_score", t.get("norm_score", 0.0))), 3)}
                for t in lst[:3]
            ]
        rows.append(row)
        if (qi + 1) % 20 == 0 or qi + 1 == len(queries):
            print(f"    [{tag}] {qi + 1}/{len(queries)}  {time.time() - t0:.0f}s")
    return rows


# ----------------------------------------------------------
# 3) 报告
# ----------------------------------------------------------
def _pct(h, n):
    return f"{h:>3}/{n} = {100.0 * h / n:5.1f}%" if n else "   -    "


def agg_stats(rows, cond):
    sub = [r for r in rows if cond(r)]
    stats = {k: [0, 0, 0] for k in ALGOS}
    for r in sub:
        for k in ALGOS:
            h = r["hits"][k]
            stats[k][0] += h["top1"]
            stats[k][1] += h["top3"]
            stats[k][2] += h["top5"]
    return stats, len(sub)


def section(lines, title, rows, cond):
    stats, n = agg_stats(rows, cond)
    lines.append(f"  {title} (n={n})")
    if not n:
        lines.append("    (无样本)")
        return
    for k in ALGOS:
        t1, t3, t5 = stats[k]
        lines.append(f"    [{k:>6}] Top1={_pct(t1, n)}  Top3={_pct(t3, n)}  Top5={_pct(t5, n)}")


def main():
    t00 = time.time()

    # ---- 1. OCR 收集 ----
    instances = collect_instances()
    n_total = len(instances)
    n_nogt = sum(1 for i in instances if i["gt_seq"] is None)
    print(f"\n[collect] 实例 {n_total}, OCR匹配失败 {n_nogt}")

    # ---- 2. 特征预计算 + 存裁切图 ----
    pvp_entries = []
    uid = 0
    for inst in instances:
        if inst["crop"] is None or inst["gt_seq"] is None:
            continue
        e = make_entry(inst, uid)
        if e is None:
            continue
        pvp_entries.append(e)
        uid += 1
        stem = Path(inst["src"]).stem
        cname = f"{inst['gt_seq']:03d}_{inst['gt_name']}__{stem}_r{inst['row']}.png"
        imwrite_unicode(str(CROP_DIR / cname), inst["crop"])
        inst["avatar_file"] = f"crops/{cname}"
    print(f"[feat] PVP 特征条目 {len(pvp_entries)}")

    seq_counter = Counter(e["seq"] for e in pvp_entries)
    name_of = {e["seq"]: e["name"] for e in pvp_entries}
    n_multi_pet = sum(1 for c in seq_counter.values() if c >= 2)
    n_single_pet = sum(1 for c in seq_counter.values() if c == 1)
    n_multi_inst = sum(c for c in seq_counter.values() if c >= 2)

    # OCR 质量分布
    dist_counter = Counter(i["ocr_dist"] for i in instances if i["gt_seq"] is not None)

    # ---- 3. 场景A: 纯 PVP 同域 LOO ----
    print("\n[场景A] 纯PVP同域LOO库 ...")
    rowsA = eval_rows(pvp_entries, pvp_entries, "A")

    # ---- 4. 场景B: PVP LOO + ingame/wiki 干扰 (上次已验证对Top1无影响, 默认跳过省时) ----
    import os
    if os.environ.get("RUN_B", "0") == "1":
        print("\n[场景B] 加载 ingame/wiki 391 干扰库 ...")
        fl = FeatureLibrary(ingame_only=False)
        wiki_lib = fl.build()
        for i, e in enumerate(wiki_lib):
            e["uid"] = 100000 + i
        baseB = pvp_entries + wiki_lib
        rowsB = eval_rows(pvp_entries, baseB, "B")
    else:
        print("\n[场景B] 跳过 (设 RUN_B=1 启用)")
        rowsB = None

    # ---- 5. 报告 ----
    lines = []
    ap = lines.append
    ap("=" * 72)
    ap("PVP 图像识别 LOO 评估 — OCR当答案, 图像当考生")
    ap("=" * 72)
    ap(f"生成时间 : {datetime.now():%Y-%m-%d %H:%M:%S}   总耗时 {time.time() - t00:.0f}s")
    ap(f"截图 {len(sorted(PVP_DIR.glob('*.png')))} 张 → 精灵实例 {n_total} 只 "
       f"(OCR匹配 {n_total - n_nogt}, 失败 {n_nogt})")
    ap(f"唯一精灵 {len(seq_counter)} 只: 出现≥2次 {n_multi_pet} 只(共{n_multi_inst}实例), "
       f"仅1次 {n_single_pet} 只")
    dist_txt = ", ".join(f"T{d}={c}" for d, c in sorted(dist_counter.items()))
    ap(f"OCR质量: {dist_txt}")
    ap("")
    ap("说明: 公平测=只统计出现≥2次的实例(LOO库里必有同精灵PVP真模板);")
    ap("      全量 =含仅出现1次的实例(库里无模板必漏, 模拟冷启动新精灵)。")

    ap("")
    ap("━" * 36 + " 场景A: 纯PVP同域LOO库 " + "━" * 12)
    section(lines, "[公平测|出现≥2次]", rowsA, lambda r: seq_counter[r["gt_seq"]] >= 2)
    section(lines, "[全量  |含必漏singleton]", rowsA, lambda r: True)

    ap("")
    if rowsB is not None:
        ap("━" * 36 + " 场景B: PVP库+ingame/wiki391干扰 " + "━" * 4)
        section(lines, "[公平测|出现≥2次]", rowsB, lambda r: seq_counter[r["gt_seq"]] >= 2)
        section(lines, "[全量  |含必漏singleton]", rowsB, lambda r: True)
    else:
        ap("━" * 36 + " 场景B: 本次跳过 " + "━" * 20)

    # ---- 重复精灵明细 (场景A, 用户最关心炫彩/异色) ----
    ap("")
    ap("━" * 36 + " 重复精灵明细 (场景A·公平测) " + "━" * 10)
    fancy_stats = []
    for seq, cnt in sorted(seq_counter.items(), key=lambda x: -x[1]):
        if cnt < 2:
            continue
        rws = [r for r in rowsA if r["gt_seq"] == seq]
        marks = "".join("✔" if r["hits"]["fusion"]["top1"] else "✘" for r in rws)
        n_hit = sum(1 for r in rws if r["hits"]["fusion"]["top1"])
        wrong = next((r for r in rws if not r["hits"]["fusion"]["top1"]), None)
        extra = ""
        if wrong:
            t1 = wrong["top"]["fusion"][0] if wrong["top"]["fusion"] else None
            extra = f"  ✘误认→{t1['name']}" if t1 else "  ✘"
        tag = " ✦炫彩/异色" if name_of[seq] in FANCY_NAMES else ""
        ap(f"  {name_of[seq]:<16s} ×{cnt}  [{marks}]{extra}{tag}")
        if name_of[seq] in FANCY_NAMES:
            fancy_stats.append((name_of[seq], n_hit, cnt))

    if fancy_stats:
        ap("")
        ap("━" * 36 + " 炫彩/异色精灵专项 (场景A) " + "━" * 12)
        th = sum(h for _, h, _ in fancy_stats)
        tn = sum(c for _, _, c in fancy_stats)
        for nm, h, c in fancy_stats:
            ap(f"  {nm:<16s} {h}/{c}")
        ap(f"  合计: {th}/{tn} = {100.0 * th / tn:.1f}%" if tn else "  无样本")

    # ---- 未命中案例 ----
    ap("")
    ap("━" * 36 + " 场景A 公平测未命中案例 " + "━" * 12)
    miss = [r for r in rowsA
            if seq_counter[r["gt_seq"]] >= 2 and not r["hits"]["fusion"]["top1"]]
    if not miss:
        ap("  (全部命中!)")
    for r in miss:
        t1 = r["top"]["fusion"][0] if r["top"]["fusion"] else None
        ap(f"  {r['src']} GT={r['name']}  误认→{t1['name'] if t1 else '-'}")
        for k in ALGOS:
            ap(f"      {k:>6}: " + " | ".join(
                f"{t['name']}({t['s']})" for t in r["top"][k]))

    report = "\n".join(lines)
    (OUT_DIR / "report.txt").write_text(report, encoding="utf-8")
    print("\n" + report)

    # ---- 6. JSON ----
    def rows_json(rows):
        out = []
        for r in rows:
            d = dict(r)
            d["occ"] = seq_counter[r["gt_seq"]]
            out.append(d)
        return out

    (OUT_DIR / "result.json").write_text(json.dumps({
        "n_instances": n_total, "n_ocr_fail": n_nogt,
        "n_entries": len(pvp_entries), "n_unique": len(seq_counter),
        "occurrence": {str(s): c for s, c in seq_counter.items()},
        "scenarioA": rows_json(rowsA),
        "scenarioB": rows_json(rowsB) if rowsB is not None else None,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n[done] {time.time() - t00:.0f}s → {OUT_DIR}")


if __name__ == "__main__":
    main()
