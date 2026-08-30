# -*- coding: utf-8 -*-
"""炫彩/异色精灵专项验证: 96画布 ORB + max聚合 (LOO)."""
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
from tune_pvp_loo2 import load_entries, orb_matrix, eval_orb_agg  # noqa: E402

CROP_DIR = SCRIPT_DIR / "output" / "pvp_loo" / "crops"

# 已知炫彩/异色 (训练素材标注)
FANCY = {"帕帕斯卡", "燃薪虫", "白金独角兽", "椰浆布丁", "恶魔狼", "胡桃王子"}


def main():
    t0 = time.time()
    entries = load_entries()
    seqs = [e["seq"] for e in entries]
    occ = Counter(seqs)
    print(f"[load] {len(entries)} 实例 (耗时{time.time() - t0:.0f}s)")

    # 96画布 ORB 矩阵 (LOO 评估的最优画布)
    mat = orb_matrix(entries, 96, 72)
    print(f"[matrix] 96画布完成 {time.time() - t0:.0f}s")

    # LOO + per-seq max 聚合 → 每实例 Top5
    n = len(entries)
    seq_name = {e["seq"]: e["name"] for e in entries}
    fancy_rows = []
    overall = Counter()
    n_fair = 0
    for i in range(n):
        if occ[seqs[i]] < 2:
            continue
        n_fair += 1
        idxs = [j for j in range(n) if j != i]
        seq_scores = defaultdict(list)
        for j in idxs:
            seq_scores[seqs[j]].append(float(mat[i, j]))
        agg_s = {s: max(v) for s, v in seq_scores.items()}
        top = sorted(agg_s.items(), key=lambda x: -x[1])[:5]
        gt = seqs[i]
        t1 = bool(top and top[0][0] == gt)
        t3 = gt in [s for s, _ in top[:3]]
        if t1:
            overall["top1"] += 1
        if t3:
            overall["top3"] += 1
        if seq_name[gt] in FANCY:
            t5 = gt in [s for s, _ in top]
            wrong = next((s for s, _ in top if s != gt), None)
            fancy_rows.append((seq_name[gt], entries[i]["src"], t1, t3, t5,
                               seq_name.get(wrong, "-") if wrong else "-"))

    print(f"\n[总体] 96画布ORB+max: Top1={overall['top1']}/{n_fair}"
          f"={100.0 * overall['top1'] / n_fair:.1f}%  Top3={overall['top3']}/{n_fair}")

    print("\n[炫彩/异色专项] (96画布ORB+max, LOO):")
    fh = sum(1 for r in fancy_rows if r[2])
    fn = len(fancy_rows)
    for nm, src, t1, t3, t5, wrong in fancy_rows:
        mark = "✔" if t1 else ("◷Top3" if t3 else "✘")
        print(f"  {nm:<10s} {mark:<5s}  ({src})" + (f"  误认→{wrong}" if not t1 else ""))
    if fn:
        print(f"  合计: {fh}/{fn} = {100.0 * fh / fn:.1f}%")
    print(f"\n[done] {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
