# -*- coding: utf-8 -*-
"""LOO 终调: 分层统计(occ) + per-seq聚合方式 + 大画布ORB."""
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(SCRIPT_DIR))

from build_ingame_dataset import imread_unicode  # noqa: E402
import eval_pvp_recognition as E  # noqa: E402

CROP_DIR = SCRIPT_DIR / "output" / "pvp_loo" / "crops"


def load_entries():
    entries = []
    for fp in sorted(CROP_DIR.glob("*.png")):
        m = re.match(r"^(\d+)_(.+?)__(.+)_r(\d+)\.png$", fp.name)
        if not m:
            continue
        img = imread_unicode(fp)
        if img is None:
            continue
        entries.append({"uid": len(entries), "seq": int(m.group(1)),
                        "name": m.group(2), "src": fp.stem, "img": img})
    return entries


def orb_matrix(entries, canvas, fg_h):
    """指定画布大小重算 ORB raw 矩阵."""
    n = len(entries)
    dess = []
    for e in entries:
        # 复刻 preproc_for_match 但改画布尺寸
        bg = E._floodfill_background(e["img"])
        fg = E._largest_foreground_component(~bg)
        pp = E._center_and_scale(fg, e["img"], canvas, fg_h)
        if pp is None:
            dess.append(None)
            continue
        _, des = E.extract_orb_masked(pp["gray"], pp["fg_mask"])
        dess.append(des)
    mat = np.zeros((n, n), dtype=np.float32)
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            mat[i, j] = E.orb_match_score_raw(dess[i], dess[j])
    return mat


def eval_orb_agg(entries, mat, agg="max"):
    """纯ORB + per-seq聚合 + 分层统计."""
    seqs = [e["seq"] for e in entries]
    occ = Counter(seqs)
    n = len(entries)
    hits = Counter()
    n_eval = 0
    by_occ = defaultdict(Counter)
    for i in range(n):
        if occ[seqs[i]] < 2:
            continue
        n_eval += 1
        idxs = [j for j in range(n) if j != i]
        seq_scores = defaultdict(list)
        for j in idxs:
            seq_scores[seqs[j]].append(float(mat[i, j]))
        if agg == "max":
            agg_s = {s: max(v) for s, v in seq_scores.items()}
        elif agg == "mean":
            agg_s = {s: float(np.mean(v)) for s, v in seq_scores.items()}
        else:  # sum
            agg_s = {s: float(np.sum(v)) for s, v in seq_scores.items()}
        top = sorted(agg_s.items(), key=lambda x: -x[1])[:5]
        gt = seqs[i]
        t1 = bool(top and top[0][0] == gt)
        t3 = gt in [s for s, _ in top[:3]]
        t5 = gt in [s for s, _ in top]
        if t1:
            hits["top1"] += 1
        if t3:
            hits["top3"] += 1
        if t5:
            hits["top5"] += 1
        k = min(occ[gt], 5)
        if t1:
            by_occ[k]["top1"] += 1
        by_occ[k]["n"] += 1
    return hits, n_eval, by_occ


def main():
    t0 = time.time()
    entries = load_entries()
    seqs = [e["seq"] for e in entries]
    occ = Counter(seqs)
    print(f"[load] {len(entries)} 实例, 公平测 {sum(c for c in occ.values() if c >= 2)}")

    # 1) 现有64画布矩阵 + 聚合方式对比
    cache = SCRIPT_DIR / "output" / "pvp_loo" / "matrix_cache.npz"
    mat64 = None
    if cache.exists():
        z = np.load(str(cache))
        if z["orb"].shape[0] == len(entries):
            mat64 = z["orb"]
    if mat64 is None:
        print("[cache] 过期/缺失, 重算 64 画布 ORB 矩阵 ...")
        mat64 = orb_matrix(entries, 64, 48)
    print("\n[1] ORB 64画布 + per-seq聚合方式:")
    for agg in ("max", "mean", "sum"):
        h, n, by = eval_orb_agg(entries, mat64, agg)
        print(f"    agg={agg:<5s} Top1={h['top1']}/{n}={100.0 * h['top1'] / n:.1f}%  "
              f"Top3={h['top3']}  Top5={h['top5']}")

    # 2) 大画布
    for canvas, fg_h, tag in ((96, 72, "96"), (128, 96, "128")):
        mat = orb_matrix(entries, canvas, fg_h)
        h, n, by = eval_orb_agg(entries, mat, "max")
        h2, _, _ = eval_orb_agg(entries, mat, "mean")
        print(f"\n[2] ORB {tag}画布: max Top1={h['top1']}/{n}={100.0 * h['top1'] / n:.1f}%  "
              f"mean Top1={h2['top1']}/{n}={100.0 * h2['top1'] / n:.1f}%  ({time.time() - t0:.0f}s)")

    # 3) 分层统计 (64画布, max聚合)
    h, n, by = eval_orb_agg(entries, mat64, "max")
    print("\n[3] 分层命中率 (ORB 64画布 max聚合):")
    for k in sorted(by):
        c = by[k]
        print(f"    occ={k}{'+' if k == 5 else ' '}: Top1={c['top1']:>2}/{c['n']:<2} "
              f"= {100.0 * c['top1'] / c['n']:5.1f}%")

    print(f"\n[done] {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
