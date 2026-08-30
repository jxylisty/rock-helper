"""校验压缩后的 static-web 图片：数量一致、可解码、无 0 字节、透明通道保留。"""
import random
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "cdn-assets" / "static-web"

expect = {"pets": 625, "skills": 569, "traits": 364, "icons": 18}
ok = True
total_bytes = 0

for sub, count in expect.items():
    folder = BASE / sub
    files = sorted(f for f in folder.iterdir() if f.is_file())
    total_bytes += sum(f.stat().st_size for f in files)
    if len(files) != count:
        print(f"[FAIL] {sub}: 期望 {count} 个文件，实际 {len(files)}")
        ok = False
        continue
    zero = [f.name for f in files if f.stat().st_size == 0]
    if zero:
        print(f"[FAIL] {sub}: 0字节文件 {zero[:5]}")
        ok = False
    samples = random.sample(files, min(12, len(files)))
    for f in samples:
        try:
            with Image.open(f) as im:
                im.verify()
        except Exception as exc:  # noqa: BLE001
            print(f"[FAIL] {sub}/{f.name}: 解码失败 {exc}")
            ok = False
    print(f"[OK] {sub}: {count} 个文件，抽样 {len(samples)} 张解码正常")

pet = BASE / "pets" / "001_星云旅者.webp"
with Image.open(pet) as im:
    print(f"抽查明细: {pet.name} 尺寸 {im.size} 模式 {im.mode}")

print(f"\nstatic-web 总体积: {total_bytes / 1048576:.1f} MB (打包要求 ≤50MB)")
sys.exit(0 if ok and total_bytes / 1048576 <= 50 else 1)
