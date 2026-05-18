# -*- coding: utf-8 -*-
"""
图片数据更新脚本
================
用途：爬取并下载所有图片资源

使用方法：
    python update_images.py                 # 下载图片并转换为 WebP
    python update_images.py --no-webp      # 仅下载 PNG，不转换
    python update_images.py --staging ./staging  # 输出到指定目录
    python update_images.py --dry-run      # 测试模式

注意：
    - WebP 转换需要安装 Pillow: pip install pillow
    - 输出的图片默认保存到 staging 目录，不替换本地文件
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
CRAWLER_DIR = PROJECT_ROOT / "crawler"


class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'


def log_step(msg: str, status: str = "info"):
    prefix = {
        "info": f"{Colors.BLUE}[步骤]{Colors.END}",
        "ok": f"{Colors.GREEN}[✓]{Colors.END}",
        "warn": f"{Colors.YELLOW}[!]{Colors.END}",
        "error": f"{Colors.RED}[✗]{Colors.END}",
    }.get(status, "[ ]")
    print(f"{prefix} {msg}")


def run_command(cmd: list[str], cwd: Path = None) -> tuple[bool, str]:
    """运行命令"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=3600,
        )
        return result.returncode == 0, result.stderr or result.stdout
    except Exception as e:
        return False, str(e)


def check_pillow() -> bool:
    """检查 Pillow 是否安装"""
    try:
        from PIL import Image
        return True
    except ImportError:
        return False


def convert_to_webp(png_path: Path, webp_path: Path, quality: int = 85) -> bool:
    """将 PNG 转换为 WebP"""
    try:
        from PIL import Image
        img = Image.open(png_path)
        if img.mode == 'RGBA':
            img.save(webp_path, 'WEBP', quality=quality, optimize=True)
        else:
            img.save(webp_path, 'WEBP', quality=quality, optimize=True)
        return True
    except Exception as e:
        print(f"转换失败: {png_path} - {e}")
        return False


def convert_directory_to_webp(source_dir: Path, target_dir: Path, quality: int = 85) -> tuple[int, int]:
    """批量转换目录中的 PNG 为 WebP"""
    source_dir.mkdir(parents=True, exist_ok=True)
    
    png_files = list(source_dir.glob("*.png"))
    success = 0
    failed = 0
    
    for png_file in png_files:
        webp_file = target_dir / (png_file.stem + ".webp")
        if convert_to_webp(png_file, webp_path=webp_file, quality=quality):
            success += 1
        else:
            failed += 1
    
    return success, failed


def main() -> None:
    parser = argparse.ArgumentParser(description="图片数据更新脚本")
    parser.add_argument(
        "--staging",
        type=str,
        default="./staging",
        help="输出目录，默认 ./staging"
    )
    parser.add_argument(
        "--no-webp",
        action="store_true",
        help="不转换为 WebP，仅保留 PNG"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="测试模式，不实际执行"
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=85,
        help="WebP 质量 (1-100)，默认 85"
    )
    args = parser.parse_args()

    staging_dir = (PROJECT_ROOT / args.staging).resolve()

    print(f"{Colors.BLUE}{'='*50}{Colors.END}")
    print(f"{Colors.BLUE}图片数据更新脚本{Colors.END}")
    print(f"{Colors.BLUE}开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
    print(f"{Colors.BLUE}输出目录: {staging_dir}{Colors.END}")
    print(f"{Colors.BLUE}{'='*50}{Colors.END}")
    print()

    if args.dry_run:
        log_step("测试模式，不会实际执行任何操作", "warn")

    # 创建输出目录结构
    output_dirs = {
        "pets": staging_dir / "static" / "pets",
        "yise": staging_dir / "static" / "yise",
        "skills": staging_dir / "static" / "skills",
        "traits": staging_dir / "static" / "traits",
        "maps": staging_dir / "static" / "maps",
    }

    if not args.dry_run:
        for dir_path in output_dirs.values():
            dir_path.mkdir(parents=True, exist_ok=True)

    # 检查 Pillow
    has_pillow = check_pillow()
    if not args.no_webp and not has_pillow:
        log_step("Pillow 未安装，WebP 转换将被跳过", "warn")
        log_step("安装命令: pip install pillow", "info")
        args.no_webp = True

    # 下载脚本列表
    download_scripts = [
        ("下载精灵图片", CRAWLER_DIR / "download_pet_images.py", output_dirs["pets"]),
        ("下载异色图片", CRAWLER_DIR / "download_yise_images.py", output_dirs["yise"]),
        ("下载技能图标", CRAWLER_DIR / "crawl_skill_icons.py", output_dirs["skills"]),
        ("下载特性图片", CRAWLER_DIR / "crawl_trait_images.py", output_dirs["traits"]),
    ]

    errors = []
    results = {}

    # 执行下载
    for i, (name, script_path, output_dir) in enumerate(download_scripts, 1):
        log_step(f"[{i}/{len(download_scripts)}] {name}...", "info")
        
        if args.dry_run:
            log_step(f"  (模拟: {script_path.name} -> {output_dir})", "warn")
            results[name] = True
            continue

        if not script_path.exists():
            log_step(f"脚本不存在: {script_path}", "error")
            results[name] = False
            errors.append(name)
            continue

        success, output = run_command(
            [sys.executable, str(script_path), "--output-root", str(staging_dir)],
            cwd=CRAWLER_DIR
        )

        if success:
            log_step(f"{name} 完成", "ok")
            results[name] = True
        else:
            log_step(f"{name} 失败: {output[:100]}", "error")
            results[name] = False
            errors.append(name)

    # 转换为 WebP
    if not args.no_webp and has_pillow:
        log_step("转换 PNG 为 WebP...", "info")
        
        if not args.dry_run:
            for dir_name, dir_path in output_dirs.items():
                if dir_path.exists() and list(dir_path.glob("*.png")):
                    log_step(f"  转换 {dir_name}/ ...", "info")
                    success, failed = convert_directory_to_webp(dir_path, dir_path, args.quality)
                    log_step(f"    成功: {success}, 失败: {failed}", "ok" if failed == 0 else "warn")

    # 总结
    print()
    print(f"{Colors.BLUE}{'='*50}{Colors.END}")
    print(f"{Colors.BLUE}更新完成 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
    print(f"{Colors.BLUE}{'='*50}{Colors.END}")
    print()

    success_count = sum(1 for v in results.values() if v)
    log_step(f"下载成功: {success_count}/{len(results)}", "ok" if len(errors) == 0 else "warn")

    if errors:
        log_step(f"失败: {len(errors)}/{len(results)}", "error")
        for name in errors:
            print(f"  - {name}")

    # 显示输出目录文件统计
    print()
    log_step("输出目录文件统计:", "info")
    
    for dir_name, dir_path in output_dirs.items():
        if dir_path.exists():
            png_count = len(list(dir_path.glob("*.png")))
            webp_count = len(list(dir_path.glob("*.webp")))
            total = png_count + webp_count
            print(f"  {dir_name}/: PNG={png_count}, WebP={webp_count}, 总计={total}")
        else:
            print(f"  {dir_name}/: {Colors.YELLOW}不存在{Colors.END}")

    print()
    log_step(f"所有图片已保存到: {staging_dir}", "ok")
    log_step("对比检查本地和 staging 目录的差异", "info")

    # 对比本地 static/web 目录
    local_static = PROJECT_ROOT / "static" / "web"
    
    print()
    log_step("本地 vs staging 目录对比:", "info")
    
    for dir_name in output_dirs.keys():
        local_dir = local_static / dir_name
        staging_dir_rel = staging_dir / "static" / dir_name
        
        local_count = len(list(local_dir.glob("*.*"))) if local_dir.exists() else 0
        staging_count = len(list(staging_dir_rel.glob("*.*"))) if staging_dir_rel.exists() else 0
        
        diff = staging_count - local_count
        diff_str = f"+{diff}" if diff > 0 else str(diff)
        
        status = "ok" if diff == 0 else "warn"
        log_step(f"  {dir_name}/: 本地={local_count}, staging={staging_count}, 差异={diff_str}", status)

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
