# -*- coding: utf-8 -*-
import os
from pathlib import Path
from PIL import Image

ROOT = Path(r"C:\Users\zzx05\Documents\HBuilderProjects\luokewangguo\static\web")
QUALITY = 85

def convert_png_to_webp(png_path: Path) -> bool:
    try:
        img = Image.open(png_path)
        webp_path = png_path.with_suffix('.webp')
        img.save(webp_path, 'WEBP', quality=QUALITY, optimize=True)
        png_size = png_path.stat().st_size
        webp_size = webp_path.stat().st_size
        print(f"  {png_path.name} -> {webp_path.name} (PNG:{png_size/1024:.1f}KB -> WebP:{webp_size/1024:.1f}KB, 节省 {((png_size-webp_size)/png_size*100):.1f}%)")
        return True
    except Exception as e:
        print(f"  失败: {png_path.name} - {e}")
        return False

def process_dir(dir_path: Path):
    if not dir_path.exists():
        print(f"目录不存在: {dir_path}")
        return
    
    png_files = list(dir_path.glob("*.png"))
    if not png_files:
        print(f"  没有 PNG 文件")
        return
    
    print(f"\n处理 {dir_path.name}/ ({len(png_files)} 个 PNG)")
    
    success = 0
    for png_file in png_files:
        webp_file = png_file.with_suffix('.webp')
        if webp_file.exists():
            print(f"  跳过 (已存在): {webp_file.name}")
            continue
        if convert_png_to_webp(png_file):
            success += 1
    
    print(f"  成功: {success}/{len(png_files)}")

if __name__ == "__main__":
    dirs = [
        ROOT / "pets",
        ROOT / "yise",
        ROOT / "icons",
        ROOT / "traits" / "base",
        ROOT / "traits" / "variants",
        ROOT / "skills",
    ]
    
    print(f"WebP 压缩质量: {QUALITY}")
    print("=" * 50)
    
    for d in dirs:
        process_dir(d)
    
    print("\n" + "=" * 50)
    print("完成!")
