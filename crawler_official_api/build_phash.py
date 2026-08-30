# -*- coding: utf-8 -*-
"""
生成混合指纹库（pHash + dHash, 用于实时 PVP 图像识别）

输入: crawler_official_api/output/avatar/images/*.png
输出: crawler_official_api/output/avatar/phash_index.json
      data/config/avatar_phash.js  (App 内置指纹库)

算法:
  pHash: 32x32 灰度 -> 严格正交 2D DCT-II -> 左上 8x8 低频块(去DC) -> 63bit vs 中位数
  dHash: 9x8 灰度 -> 水平相邻比较 -> 64bit
  总指纹 128bit = pHash(64) + dHash(64)
  识别时汉明距离 = dist_p + dist_d, 阈值建议 <= 20
"""
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
AVATAR_DIR = SCRIPT_DIR / "output" / "avatar"
IMG_DIR = AVATAR_DIR / "images"

N, K = 32, 8


def dct_matrix(n):
    k = np.arange(n).reshape(-1, 1)
    m = np.arange(n).reshape(1, -1)
    C = np.cos(np.pi * (2 * m + 1) * k / (2 * n))
    C[0, :] *= np.sqrt(1.0 / n)
    C[1:, :] *= np.sqrt(2.0 / n)
    return C


C = dct_matrix(N)


def compute_phash(gray32):
    dct = C @ gray32 @ C.T
    coeffs = dct[:K, :K].flatten()[1:]
    med = np.median(coeffs)
    bits = "".join("1" if v > med else "0" for v in coeffs) + "0"
    return format(int(bits, 2), "016x")


def compute_dhash(gray_img):
    g = gray_img.resize((9, 8), Image.LANCZOS)
    a = np.asarray(g, dtype=np.float64)
    bits = ""
    for row in a:
        for x in range(8):
            bits += "1" if row[x] > row[x + 1] else "0"
    return format(int(bits, 2), "016x")


def load_gray32(path):
    img = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    composed = Image.alpha_composite(bg, img).convert("RGB")
    return composed.convert("L").resize((N, N), Image.LANCZOS)


def main():
    amap = json.loads((AVATAR_DIR / "avatar_map.json").read_text(encoding="utf-8"))
    entries = []
    for e in amap:
        stem = f"{e['seq']:03d}_{e['page_title']}"
        p = IMG_DIR / (stem + ".png")
        if not p.exists():
            print(f"  [skip] missing file: {stem}.png")
            continue
        try:
            g32 = load_gray32(p)
            gray_arr = np.asarray(g32, dtype=np.float64)
            ph = compute_phash(gray_arr)
            dh = compute_dhash(g32)
        except Exception as ex:
            print(f"  [fail] {stem}: {ex}")
            continue
        entries.append({
            "seq": e["seq"],
            "pet_id": e["pet_id"],
            "name": e["page_title"],
            "phash": ph,
            "dhash": dh,
            "file": p.name,
        })

    # 区分度统计
    def nn_stats():
        dists = []
        for i, e1 in enumerate(entries):
            p1, d1 = int(e1["phash"], 16), int(e1["dhash"], 16)
            best = 200
            for j, e2 in enumerate(entries):
                if i == j:
                    continue
                d = bin(p1 ^ int(e2["phash"], 16)).count("1") + bin(d1 ^ int(e2["dhash"], 16)).count("1")
                if d < best:
                    best = d
            dists.append(best)
        return sorted(dists)

    nn = nn_stats()
    print(f"entries: {len(entries)}")
    print(f"库内混合指纹最近邻: min={nn[0]} p25={nn[len(nn)//4]} median={nn[len(nn)//2]} max={nn[-1]}")
    tight = []
    for i, e1 in enumerate(entries):
        p1, d1 = int(e1["phash"], 16), int(e1["dhash"], 16)
        for j, e2 in enumerate(entries):
            if j <= i:
                continue
            d = bin(p1 ^ int(e2["phash"], 16)).count("1") + bin(d1 ^ int(e2["dhash"], 16)).count("1")
            if d <= 16:
                tight.append((e1["name"], e2["name"], d))
    if tight:
        print("距离偏近(<=16)的对, 识别时注意:")
        for a, b, d in sorted(tight, key=lambda x: x[2])[:15]:
            print(f"    {a} <-> {b}: {d}bit")

    out = {"algo": "phash_dct8x8+dhash9x8", "count": len(entries), "entries": entries}
    (AVATAR_DIR / "phash_index.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"-> {AVATAR_DIR / 'phash_index.json'}")

    compact = [
        {"s": e["seq"], "n": e["name"], "p": e["phash"], "d": e["dhash"]}
        for e in entries
    ]
    js = (
        "// 实时PVP识别用 混合指纹库 (pHash 64bit + dHash 64bit)\n"
        "// 匹配: dist = popcount(a.p^b.p) + popcount(a.d^b.d), 阈值建议 <= 20\n"
        "export const avatarPhash = " + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + "\n"
    )
    target = PROJECT_ROOT / "data" / "config" / "avatar_phash.js"
    target.write_text(js, encoding="utf-8")
    print(f"-> {target}")


if __name__ == "__main__":
    main()
