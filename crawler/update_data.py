# -*- coding: utf-8 -*-
"""
统一数据更新脚本
================
用途：运行所有爬虫和转换脚本，一键更新数据

使用方法：
    python update_data.py              # 完整更新
    python update_data.py --skip-crawl # 仅转换已有数据
    python update_data.py --dry-run    # 测试模式，不实际执行

更新流程：
    1. 爬取精灵详情 (professional_crawler.py)
    2. 转换精灵详情 (convert_details.py)
    3. 生成变体列表 (generate_variants.py)
    4. 爬取变体详情 (crawl_variant_details.py)
    5. 生成精简版数据 (Node 脚本)
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime


PROJECT_ROOT = Path(__file__).resolve().parent.parent
CRAWLER_DIR = PROJECT_ROOT / "crawler"
SCRIPTS_DIR = PROJECT_ROOT / "scripts"


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


def run_command(cmd: list[str], cwd: Path = None, skip_on_error: bool = True) -> tuple[bool, str]:
    """运行命令，返回 (是否成功, 错误信息)"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=3600,
        )
        if result.returncode == 0:
            return True, ""
        else:
            error_msg = result.stderr or result.stdout
            return False, error_msg
    except subprocess.TimeoutExpired:
        return False, "命令执行超时"
    except FileNotFoundError:
        return False, f"命令不存在: {cmd[0]}"
    except Exception as e:
        return False, str(e)


def run_python_script(script_path: Path, args: list[str] = None) -> bool:
    """运行 Python 脚本"""
    cmd = [sys.executable, str(script_path)]
    if args:
        cmd.extend(args)
    
    success, error = run_command(cmd, cwd=script_path.parent)
    if success:
        log_step(f"{script_path.name} 完成", "ok")
    else:
        log_step(f"{script_path.name} 失败: {error[:200]}", "error")
    return success


def run_node_script(script_path: Path) -> bool:
    """运行 Node 脚本"""
    # 从项目根目录运行，使用相对路径
    rel_path = script_path.relative_to(PROJECT_ROOT).as_posix()
    cmd = ["node", rel_path]
    
    success, error = run_command(cmd, cwd=PROJECT_ROOT)
    if success:
        log_step(f"{script_path.name} 完成", "ok")
    else:
        log_step(f"{script_path.name} 失败: {error[:200]}", "error")
    return success


def main() -> None:
    parser = argparse.ArgumentParser(description="统一数据更新脚本")
    parser.add_argument(
        "--skip-crawl",
        action="store_true",
        help="跳过爬虫步骤，仅转换数据"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="测试模式，不实际执行"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="显示详细输出"
    )
    args = parser.parse_args()

    print(f"{Colors.BLUE}{'='*50}{Colors.END}")
    print(f"{Colors.BLUE}洛克王国数据更新脚本{Colors.END}")
    print(f"{Colors.BLUE}开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
    print(f"{Colors.BLUE}{'='*50}{Colors.END}")
    print()

    if args.dry_run:
        log_step("测试模式，不会实际执行任何操作", "warn")

    errors = []
    results = {}

    # 步骤列表
    steps = []

    if not args.skip_crawl:
        steps.extend([
            ("爬取精灵详情", lambda: run_python_script(CRAWLER_DIR / "professional_crawler.py")),
            ("转换精灵详情", lambda: run_python_script(CRAWLER_DIR / "convert_details.py")),
            ("生成变体列表", lambda: run_python_script(CRAWLER_DIR / "generate_variants.py")),
            ("爬取变体详情", lambda: run_python_script(CRAWLER_DIR / "crawl_variant_details.py")),
        ])

    steps.extend([
        ("生成精灵精简版", lambda: run_node_script(SCRIPTS_DIR / "build_pets_detail_light.js")),
        ("生成变体精简版", lambda: run_node_script(SCRIPTS_DIR / "build_pet_variant_details_light.js")),
        ("生成变体精灵列表", lambda: run_node_script(SCRIPTS_DIR / "build_pet_variants_list.js")),
    ])

    # 执行步骤
    for i, (name, func) in enumerate(steps, 1):
        log_step(f"[{i}/{len(steps)}] {name}...", "info")
        
        if args.dry_run:
            log_step(f"  (模拟执行: {name})", "warn")
            results[name] = True
            continue

        try:
            success = func()
            results[name] = success
            if not success:
                errors.append(name)
        except Exception as e:
            log_step(f"异常: {str(e)[:100]}", "error")
            results[name] = False
            errors.append(name)

    # 总结
    print()
    print(f"{Colors.BLUE}{'='*50}{Colors.END}")
    print(f"{Colors.BLUE}更新完成 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
    print(f"{Colors.BLUE}{'='*50}{Colors.END}")
    print()

    success_count = sum(1 for v in results.values() if v)
    fail_count = len(results) - success_count

    log_step(f"成功: {success_count}/{len(results)}", "ok" if fail_count == 0 else "warn")

    if errors:
        log_step(f"失败: {fail_count}/{len(results)}", "error")
        print(f"{Colors.RED}失败的步骤:{Colors.END}")
        for name in errors:
            print(f"  - {name}")
    else:
        log_step("所有步骤完成！", "ok")

    # 显示数据文件大小
    print()
    log_step("数据文件状态:", "info")
    
    data_files = [
        "data/pets_detail.js",
        "data/pets_detail_light.js",
        "data/pet_variant_details.js",
        "data/pet_variant_details_light.js",
        "data/pet_variants_list.js",
    ]
    
    for file_path in data_files:
        full_path = PROJECT_ROOT / file_path
        if full_path.exists():
            size_kb = full_path.stat().st_size / 1024
            if size_kb > 1024:
                size_str = f"{size_kb/1024:.1f}MB"
            else:
                size_str = f"{size_kb:.1f}KB"
            print(f"  {file_path}: {size_str}")
        else:
            print(f"  {file_path}: {Colors.YELLOW}不存在{Colors.END}")

    print()
    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
