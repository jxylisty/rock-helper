# -*- coding: utf-8 -*-
"""按 pet_detail.js 的 yiseImg 引用，补齐本地异色图镜像。

下载官方 shiny.png → RGBA webp q90 → cdn-assets/static-web/pets/{seq3}_{page_title}_异色.webp
并同步到 static/static-web/pets/（运行时兜底目录）。
"""
import io
import re
import sys
import time
from pathlib import Path

import requests
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DETAIL_PATH = PROJECT_ROOT / "data" / "pet" / "pet_detail.js"
MIRROR_DIR = PROJECT_ROOT / "static" / "static-web" / "pets"
CDN_DIR = PROJECT_ROOT / "cdn-assets" / "static-web" / "pets"


def extract_yise():
    text = DETAIL_PATH.read_text(encoding="utf-8")
    out = []
    for m in re.finditer(r'"(\d+)":\s*\[', text):
        seq = int(m.group(1))
        tail = text[m.end():]
        block = tail[: tail.find("\n  ]")] if "\n  ]" in tail else tail
        pm = re.search(r'"page_title":\s*"([^"]+)"', block)
        yise = re.search(r'"yiseImg":\s*"(https://[^"]+)"', block)
        if pm and yise:
            out.append((seq, pm.group(1), yise.group(1)))
    return out


def main():
    CDN_DIR.mkdir(parents=True, exist_ok=True)
    MIRROR_DIR.mkdir(parents=True, exist_ok=True)
    items = extract_yise()
    session = requests.Session()
    done, skipped, failed = 0, 0, 0
    for seq, title, url in items:
        seq3 = str(seq).zfill(3)
        fname = f"{seq3}_{title}_异色.webp"
        dst_cdn = CDN_DIR / fname
        dst_mirror = MIRROR_DIR / fname
        if dst_cdn.exists() and dst_mirror.exists():
            skipped += 1
            continue
        try:
            r = session.get(url, timeout=20)
            r.raise_for_status()
            img = Image.open(io.BytesIO(r.content)).convert("RGBA")
            img.save(dst_cdn, "WEBP", quality=90)
            dst_mirror.write_bytes(dst_cdn.read_bytes())
            done += 1
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"  [fail] {fname}: {e}")
        time.sleep(0.12)
    print(f"yise refs: {len(items)}, downloaded: {done}, already-ok: {skipped}, failed: {failed}")


if __name__ == "__main__":
    sys.exit(main())
