"""
压缩 cdn-assets/static-web 图片资源用于 APK 静态打包。
用法: python tools/compress_static_web.py [--max-side 800] [--quality 82] [--dry-run]
仅处理长边超过 max-side 的图片；带透明通道的立绘保持 RGBA。
输出到临时目录，全部成功后原子替换。
"""
import argparse
import shutil
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TARGETS = [
    ("pets", 800),
    ("traits", 200),
    ("skills", 200),
    ("icons", 64),
]


def human(nbytes):
    return f"{nbytes / 1048576:.1f}MB"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-side", type=int, default=800)
    parser.add_argument("--quality", type=int, default=82)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    base = ROOT / "cdn-assets" / "static-web"
    if not base.exists():
        print("cdn-assets/static-web 不存在")
        sys.exit(1)

    total_before = 0
    total_after = 0
    changed = skipped = failed = 0

    for sub, default_side in TARGETS:
        folder = base / sub
        if not folder.exists():
            continue
        max_side = args.max_side if sub == "pets" else min(args.max_side, default_side * 2)
        out_dir = folder.parent / f"_tmp_{sub}"
        if out_dir.exists():
            shutil.rmtree(out_dir)
        if not args.dry_run:
            out_dir.mkdir()

        sub_before = sub_after = 0
        for item in sorted(folder.iterdir()):
            if not item.is_file() or item.suffix.lower() not in (".webp", ".png"):
                continue
            raw = item.read_bytes()
            sub_before += len(raw)

            try:
                with Image.open(item) as im:
                    w, h = im.size
                    scale = max_side / max(w, h)
                    if scale >= 1 and len(raw) < 120 * 1024:
                        out = raw
                        skipped += 1
                    else:
                        img = im
                        if scale < 1:
                            img = img.resize(
                                (max(1, round(w * scale)), max(1, round(h * scale))),
                                Image.LANCZOS,
                            )
                        if img.mode not in ("RGBA", "RGB"):
                            img = img.convert("RGBA" if "A" in img.mode or img.mode == "P" else "RGB")
                        if args.dry_run:
                            out = b""
                        else:
                            import io

                            buf = io.BytesIO()
                            img.save(buf, "WEBP", quality=args.quality, method=4)
                            out = buf.getvalue()
                        changed += 1
                if not args.dry_run:
                    (out_dir / item.name).write_bytes(out)
                sub_after += len(out)
            except Exception as exc:  # noqa: BLE001
                failed += 1
                print(f"  失败 {item.name}: {exc}")
                if not args.dry_run:
                    (out_dir / item.name).write_bytes(raw)
                sub_after += len(raw)

        total_before += sub_before
        total_after += sub_after
        if not args.dry_run and sub_after:
            backup = folder.parent / f"_bak_{sub}"
            if backup.exists():
                shutil.rmtree(backup)
            shutil.move(str(folder), str(backup))
            shutil.move(str(out_dir), str(folder))
            shutil.rmtree(backup, ignore_errors=True)
        print(f"{sub}: {human(sub_before)} -> {human(sub_after)}")

    print(f"\n合计: {human(total_before)} -> {human(total_after)}  压缩 {changed} 张 / 跳过 {skipped} 张 / 失败 {failed} 张")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
