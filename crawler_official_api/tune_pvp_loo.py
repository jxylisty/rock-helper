# -*- coding: utf-8 -*-
"""
PVP LOO 融合策略调优 — 基于 output/pvp_loo/crops 已验证GT头像
==============================================================
背景: LOO 评估显示 同域(纯PVP库)下 ORB单项Top1=85.2% 反超 原版fusion=69.3%
      原版权重(hists=0.55主导)是为跨域设计的, hists的Hub精灵(火焰猿等)
      在同域场景拖后腿.

方法: 一次性算完 119x119 相似度矩阵, 之后任意融合策略都是纯numpy秒级评估.
策略空间:
  S0 基线复刻 (原版权重+rank bonus)   → 应≈ 61/88
  S1 权重网格搜索 (orb/hists/tmpl/phash)
  S2 网格 + bonus变体 (无/平权/orb双倍)
  S3 hists IDF 降Hub
  S4 ORB margin 硬决策 + fusion兜底
"""
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
from eval_pvp_recognition import (  # noqa: E402
    preproc_for_match, compute_phash_dhash_from_gray64, extract_orb_masked,
    orb_match_score_raw, hamming_sum, masked_template_sobel_score, hist_similarity,
)

CROP_DIR = SCRIPT_DIR / "output" / "pvp_loo" / "crops"


# ----------------------------------------------------------
# 1) 加载 + 特征
# ----------------------------------------------------------
def load_entries():
    entries = []
    for fp in sorted(CROP_DIR.glob("*.png")):
        m = re.match(r"^(\d+)_(.+?)__(.+)_r(\d+)\.png$", fp.name)
        if not m:
            continue
        img = imread_unicode(fp)
        if img is None:
            continue
        pp = preproc_for_match(img)
        if pp is None:
            continue
        ph, dh = compute_phash_dhash_from_gray64(pp["gray"])
        _, des = extract_orb_masked(pp["gray"], pp["fg_mask"])
        entries.append({"uid": len(entries), "seq": int(m.group(1)),
                        "name": m.group(2), "src": fp.stem,
                        "phash": ph, "dhash": dh, "orb_des": des, "pp": pp})
    return entries


def build_matrix(entries):
    """返回 orb_raw / tmpl_comb / (hog,hsv,lab) / phash_dist 四组 n×n 矩阵."""
    n = len(entries)
    orb = np.zeros((n, n), dtype=np.float32)
    tmpl = np.zeros((n, n), dtype=np.float32)
    hog = np.zeros((n, n), dtype=np.float32)
    hsv = np.zeros((n, n), dtype=np.float32)
    lab = np.zeros((n, n), dtype=np.float32)
    phd = np.zeros((n, n), dtype=np.float32)
    t0 = time.time()
    for i in range(n):
        a = entries[i]
        for j in range(n):
            if i == j:
                continue
            b = entries[j]
            if j > i:  # 对称部分只算一次
                phd[i, j] = phd[j, i] = hamming_sum(
                    a["phash"], a["dhash"], b["phash"], b["dhash"])
                g, s = masked_template_sobel_score(a["pp"], b["pp"])
                t = 0.30 * g + 0.70 * s
                tmpl[i, j] = tmpl[j, i] = t
                hg, hs, hl, _ = hist_similarity(a["pp"], b["pp"])
                hog[i, j] = hog[j, i] = hg
                hsv[i, j] = hsv[j, i] = hs
                lab[i, j] = lab[j, i] = hl
            orb[i, j] = orb_match_score_raw(a["orb_des"], b["orb_des"])  # 不对称
        if (i + 1) % 30 == 0:
            print(f"    matrix {i + 1}/{n}  {time.time() - t0:.0f}s")
    return orb, tmpl, (hog, hsv, lab), phd


# ----------------------------------------------------------
# 2) 融合评估器 (在矩阵上复刻/扩展原版 fusion)
# ----------------------------------------------------------
def norm_mats(mats):
    orb, tmpl, (hog, hsv, lab), phd = mats
    return {
        "phash": np.clip(1.0 - phd / 128.0, 0.0, 1.0),
        "orb": np.clip(orb / 30.0, 0.0, 1.0),       # 原版: 同域饱和(30+全=1.0)
        "orb60": np.clip(orb / 60.0, 0.0, 1.0),     # 拉开 30~60 区间
        "orb100": np.clip(orb / 100.0, 0.0, 1.0),   # 完全不饱和
        "tmpl": np.clip((tmpl + 1.0) / 2.0, 0.0, 1.0),
        "hists": 0.50 * hog + 0.28 * hsv + 0.22 * lab,
        "orb_raw": orb,
    }


def fusion_eval(entries, nm, W, bonus_mult=None, n_top=5, fair_only=True):
    """复刻 fusion_topn: 各算法top5 → (norm*w + rank_bonus) → 按seq聚合."""
    seqs = [e["seq"] for e in entries]
    occ = Counter(seqs)
    n = len(entries)
    bonus_mult = bonus_mult or {}
    tw = sum(W.values())
    hits = Counter()
    n_eval = 0
    for i in range(n):
        if fair_only and occ[seqs[i]] < 2:
            continue
        n_eval += 1
        idxs = np.array([j for j in range(n) if j != i])
        agg = defaultdict(float)
        for k, w in W.items():
            if w <= 0 or k not in nm:
                continue
            row = nm[k][i, idxs]
            order = np.argsort(-row)[:n_top]
            for rank, ji in enumerate(order):
                bonus = max(0.0, n_top - rank) * 0.05 * bonus_mult.get(k, 1.0)
                agg[seqs[idxs[ji]]] += float(row[ji]) * (w / tw) + bonus
        top = [s for s, _ in sorted(agg.items(), key=lambda x: -x[1])][:n_top]
        gt = seqs[i]
        if top and top[0] == gt:
            hits["top1"] += 1
        if gt in top[:3]:
            hits["top3"] += 1
        if gt in top:
            hits["top5"] += 1
    return hits, n_eval


def orb_margin_eval(entries, nm, W, raw_min=25.0, margin=0.12,
                    bonus_mult=None, n_top=5):
    """两阶段: ORB聚合分足够高且领先明显→直接采纳; 否则fusion."""
    bonus_mult = bonus_mult or {}
    seqs = [e["seq"] for e in entries]
    occ = Counter(seqs)
    n = len(entries)
    hits = Counter()
    n_eval = 0
    n_direct = 0
    for i in range(n):
        if occ[seqs[i]] < 2:
            continue
        n_eval += 1
        idxs = np.array([j for j in range(n) if j != i])
        raw = nm["orb_raw"][i, idxs]
        # 按 seq 聚合取 max
        seq_best = defaultdict(float)
        for ji, j in enumerate(idxs):
            s = seqs[j]
            if raw[ji] > seq_best[s]:
                seq_best[s] = float(raw[ji])
        ranked = sorted(seq_best.items(), key=lambda x: -x[1])
        gt = seqs[i]
        top5 = [s for s, _ in ranked[:n_top]]
        adopt = None
        if len(ranked) >= 2:
            s1, v1 = ranked[0]
            v2 = max(v for s, v in ranked if s != s1)
            if v1 >= raw_min and (v1 - v2) / max(v1, 1e-6) >= margin:
                adopt = s1
                n_direct += 1
        if adopt is None:
            # fallback fusion
            agg = defaultdict(float)
            tw = sum(W.values())
            for k, w in W.items():
                if w <= 0 or k not in nm:
                    continue
                row = nm[k][i, idxs]
                order = np.argsort(-row)[:n_top]
                for rank, ji in enumerate(order):
                    bonus = max(0.0, n_top - rank) * 0.05 * bonus_mult.get(k, 1.0)
                    agg[seqs[idxs[ji]]] += float(row[ji]) * (w / tw) + bonus
            top5 = [s for s, _ in sorted(agg.items(), key=lambda x: -x[1])][:n_top]
        if top5 and top5[0] == gt:
            hits["top1"] += 1
        if gt in top5[:3]:
            hits["top3"] += 1
        if gt in top5:
            hits["top5"] += 1
    return hits, n_eval, n_direct


def single_eval(entries, nm, k, n_top=5):
    """单项算法按自身分值排序 (orb 用 raw 排序, 复刻 topn_orb)."""
    seqs = [e["seq"] for e in entries]
    occ = Counter(seqs)
    n = len(entries)
    hits = Counter()
    n_eval = 0
    for i in range(n):
        if occ[seqs[i]] < 2:
            continue
        n_eval += 1
        idxs = np.array([j for j in range(n) if j != i])
        row = nm[k][i, idxs]
        order = np.argsort(-row)[:n_top]
        top = [seqs[idxs[j]] for j in order]
        gt = seqs[i]
        if top and top[0] == gt:
            hits["top1"] += 1
        if gt in top[:3]:
            hits["top3"] += 1
        if gt in top:
            hits["top5"] += 1
    return hits, n_eval


def borda_eval(entries, nm, W, n_top=15, agg_mode="max"):
    """Borda 排名融合: 每算法给前 n_top 名排名分 (n_top-rank), 按权重累加.
    完全规避分数量纲/饱和问题. agg: 同seq多模板 max 或 sum."""
    seqs = [e["seq"] for e in entries]
    occ = Counter(seqs)
    n = len(entries)
    hits = Counter()
    n_eval = 0
    for i in range(n):
        if occ[seqs[i]] < 2:
            continue
        n_eval += 1
        idxs = np.array([j for j in range(n) if j != i])
        agg = defaultdict(float)
        for k, w in W.items():
            if w <= 0 or k not in nm:
                continue
            row = nm[k][i, idxs]
            order = np.argsort(-row)[:n_top]
            for rank, ji in enumerate(order):
                pts = float(n_top - rank) * w
                s = seqs[idxs[ji]]
                if agg_mode == "max":
                    agg[s] = max(agg[s], pts)
                else:
                    agg[s] += pts
        top = [s for s, _ in sorted(agg.items(), key=lambda x: -x[1])][:5]
        gt = seqs[i]
        if top and top[0] == gt:
            hits["top1"] += 1
        if gt in top[:3]:
            hits["top3"] += 1
        if gt in top:
            hits["top5"] += 1
    return hits, n_eval


def fmt(h, n):
    return f"Top1={h['top1']:>3}/{n}={100.0 * h['top1'] / n:5.1f}%  " \
           f"Top3={h['top3']:>3}/{n}={100.0 * h['top3'] / n:5.1f}%  " \
           f"Top5={h['top5']:>3}/{n}={100.0 * h['top5'] / n:5.1f}%"


def main():
    t00 = time.time()
    entries = load_entries()
    seqs = [e["seq"] for e in entries]
    occ = Counter(seqs)
    print(f"[load] {len(entries)} 实例, 唯一精灵 {len(occ)}, "
          f"公平测样本(occ≥2) {sum(c for c in occ.values() if c >= 2)}")

    # 矩阵缓存 (npz), 二次运行秒级加载
    cache = SCRIPT_DIR / "output" / "pvp_loo" / "matrix_cache.npz"
    if cache.exists():
        z = np.load(str(cache))
        orb, tmpl = z["orb"], z["tmpl"]
        hog, hsv, lab, phd = z["hog"], z["hsv"], z["lab"], z["phd"]
        if orb.shape[0] == len(entries):
            mats = (orb, tmpl, (hog, hsv, lab), phd)
            print(f"[matrix] 从缓存加载 {time.time() - t00:.0f}s")
        else:
            mats = None
    else:
        mats = None
    if mats is None:
        mats = build_matrix(entries)
        orb, tmpl, (hog, hsv, lab), phd = mats
        np.savez_compressed(str(cache), orb=orb, tmpl=tmpl,
                            hog=hog, hsv=hsv, lab=lab, phd=phd)
    nm = norm_mats(mats)

    # ---- S0 基线复刻 + 单项算法 ----
    W0 = {"phash": 0.05, "orb": 0.15, "tmpl": 0.15, "hists": 0.55}
    h0, n0 = fusion_eval(entries, nm, W0, bonus_mult={"hists": 2.0})
    print(f"\n[S0 基线复刻(原版)] n={n0}  {fmt(h0, n0)}")
    print("[S0] 单项算法 (公平测, 按自身分值排序):")
    for k, label in (("phash", "phash"), ("orb_raw", "orb(raw排序,=原版topn_orb)"),
                     ("tmpl", "tmpl"), ("hists", "hists")):
        h, n = single_eval(entries, nm, k)
        print(f"    {label:<28s} {fmt(h, n)}")

    # ---- S1 权重网格 (含 orb 归一化变体) ----
    print("\n[S1] 权重网格搜索 (orb/orb60/orb100 三种归一化) ...")
    grid = []
    for orb_key in ("orb", "orb60", "orb100"):
        for w_orb in (0.2, 0.35, 0.5, 0.65, 0.8, 1.0):
            for w_hist in (0.0, 0.05, 0.15, 0.25, 0.35):
                for w_tmpl in (0.0, 0.05, 0.15):
                    for w_ph in (0.0, 0.05):
                        if w_orb + w_hist + w_tmpl + w_ph == 0:
                            continue
                        W = {"phash": w_ph, orb_key: w_orb,
                             "tmpl": w_tmpl, "hists": w_hist}
                        h, n = fusion_eval(entries, nm, W)
                        grid.append((h["top1"], h["top3"], orb_key,
                                     w_orb, w_hist, w_tmpl, w_ph, dict(W)))
    grid.sort(key=lambda x: (-x[0], -x[1]))
    print("  Top10 权重组合 (公平测):")
    for t1, t3, ok, wo, wh, wt, wp, W in grid[:10]:
        print(f"    Top1={t1:3d} Top3={t3:3d}  {ok}={wo} hists={wh} tmpl={wt} phash={wp}")
    best_W = grid[0][7]
    print(f"  [S1 最优] {fmt(fusion_eval(entries, nm, best_W)[0], 88)}")

    # ---- S2 Borda 排名融合 ----
    print("\n[S2] Borda 排名融合 (规避分数量纲/饱和):")
    bgrid = []
    for orb_key in ("orb", "orb60", "orb100"):
        for w_orb in (0.35, 0.5, 0.65, 0.8, 1.0):
            for w_hist in (0.0, 0.1, 0.2, 0.3):
                for w_tmpl in (0.0, 0.1, 0.2):
                    W = {orb_key: w_orb, "hists": w_hist, "tmpl": w_tmpl}
                    if sum(W.values()) == 0:
                        continue
                    for mode in ("max", "sum"):
                        h, n = borda_eval(entries, nm, W, agg_mode=mode)
                        bgrid.append((h["top1"], h["top3"], mode, dict(W)))
    bgrid.sort(key=lambda x: (-x[0], -x[1]))
    print("  Top10 Borda 组合:")
    for t1, t3, mode, W in bgrid[:10]:
        print(f"    Top1={t1:3d} Top3={t3:3d}  agg={mode:<4s} {W}")
    bW, bmode = bgrid[0][3], bgrid[0][2]
    h2, n2 = borda_eval(entries, nm, bW, agg_mode=bmode)
    print(f"  [S2 最优] {fmt(h2, n2)}")

    # ---- S3 ORB margin 两阶段 (fusion/borda 兜底) ----
    print("\n[S3] ORB margin 硬决策 + 兜底:")
    for raw_min, margin in ((20.0, 0.10), (25.0, 0.12), (25.0, 0.20),
                            (28.0, 0.10), (30.0, 0.05)):
        h, nn, nd = orb_margin_eval(entries, nm, best_W,
                                    raw_min=raw_min, margin=margin)
        print(f"    fusion兜底 raw≥{raw_min} margin≥{margin:.2f}  {fmt(h, nn)}  "
              f"(硬决策 {nd}/{nn})")

    print(f"\n[done] {time.time() - t00:.0f}s")


if __name__ == "__main__":
    main()
