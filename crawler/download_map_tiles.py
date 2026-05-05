# -*- coding: utf-8 -*-
"""Scan and download map tiles from the wiki tile server.

Usage examples:
  python crawler/download_map_tiles.py
  python crawler/download_map_tiles.py --zoom-levels 8 7 6
  python crawler/download_map_tiles.py --scan-only --zoom-levels 8

Default behavior keeps compatibility with the current app:
  - zoom level 8 downloads to static/map_tiles_z8_v2/
  - valid_tiles.json is regenerated from zoom 8 scan results

For true in-app free zoom, multiple zoom levels should be downloaded and
the front end should switch tile folders by zoom ratio instead of scaling
one zoom level forever.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import requests


BASE_URL = "https://wiki-dev-patch-oss.oss-cn-hangzhou.aliyuncs.com/res/lkwg/map-3.0"
ROOT_DIR = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download map tiles from wiki tile server.")
    parser.add_argument("--zoom-levels", type=int, nargs="+", default=[8], help="Tile zoom levels to scan.")
    parser.add_argument("--min-x", type=int, default=-24, help="Minimum tile x to scan.")
    parser.add_argument("--max-x", type=int, default=23, help="Maximum tile x to scan.")
    parser.add_argument("--min-y", type=int, default=-17, help="Minimum tile y to scan.")
    parser.add_argument("--max-y", type=int, default=16, help="Maximum tile y to scan.")
    parser.add_argument("--timeout", type=int, default=12, help="Request timeout in seconds.")
    parser.add_argument("--min-bytes", type=int, default=1024, help="Treat tiny responses as invalid tiles.")
    parser.add_argument("--delay", type=float, default=0.03, help="Delay between downloads.")
    parser.add_argument("--scan-only", action="store_true", help="Only scan and regenerate valid_tiles.json.")
    parser.add_argument("--output-root", default="", help="Optional staging root directory.")
    return parser.parse_args()


def tile_url(zoom: int, x: int, y: int) -> str:
    return f"{BASE_URL}/{zoom}/tile-{x}_{y}.png"


def output_root_dir(output_root: str) -> Path:
    return Path(output_root).resolve() if output_root else ROOT_DIR


def output_dir_for_zoom(zoom: int, output_root: str = "") -> Path:
    root = output_root_dir(output_root)
    if zoom == 8:
        return root / "static" / "map_tiles_z8_v2"
    return root / "static" / f"map_tiles_z{zoom}"


def request_tile(session: requests.Session, url: str, timeout: int) -> requests.Response | None:
    try:
        response = session.get(url, timeout=timeout)
        if response.status_code == 200:
            return response
    except requests.RequestException:
        return None
    return None


def scan_zoom(
    session: requests.Session,
    zoom: int,
    min_x: int,
    max_x: int,
    min_y: int,
    max_y: int,
    timeout: int,
    min_bytes: int,
) -> list[list[int]]:
    tiles: list[list[int]] = []
    for x in range(min_x, max_x + 1):
        for y in range(min_y, max_y + 1):
            response = request_tile(session, tile_url(zoom, x, y), timeout)
            if response and len(response.content) >= min_bytes:
                tiles.append([x, y])
    return tiles


def download_tiles(
    session: requests.Session,
    zoom: int,
    tiles: list[list[int]],
    timeout: int,
    delay: float,
    output_root: str,
) -> tuple[int, int]:
    output_dir = output_dir_for_zoom(zoom, output_root)
    output_dir.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    skipped = 0

    for x, y in tiles:
        target = output_dir / f"tile-{x}_{y}.png"
        if target.exists():
            skipped += 1
            continue
        response = request_tile(session, tile_url(zoom, x, y), timeout)
        if not response:
            continue
        target.write_bytes(response.content)
        downloaded += 1
        if delay > 0:
            time.sleep(delay)

    return downloaded, skipped


def write_valid_tiles(tiles: list[list[int]], output_root: str) -> Path:
    valid_tiles_file = output_root_dir(output_root) / "valid_tiles.json"
    valid_tiles_file.write_text(
        json.dumps(sorted(tiles), ensure_ascii=False),
        encoding="utf-8",
    )
    return valid_tiles_file


def main() -> None:
    args = parse_args()
    session = requests.Session()
    session.trust_env = False
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://wiki.biligame.com/rocom/",
        }
    )

    all_results: dict[int, list[list[int]]] = {}

    for zoom in args.zoom_levels:
        print(f"扫描 zoom={zoom}，范围 x[{args.min_x},{args.max_x}] y[{args.min_y},{args.max_y}] ...")
        tiles = scan_zoom(
            session=session,
            zoom=zoom,
            min_x=args.min_x,
            max_x=args.max_x,
            min_y=args.min_y,
            max_y=args.max_y,
            timeout=args.timeout,
            min_bytes=args.min_bytes,
        )
        all_results[zoom] = tiles
        print(f"  找到 {len(tiles)} 个有效瓦片。")

        if zoom == 8:
            valid_tiles_file = write_valid_tiles(tiles, args.output_root)
            print(f"  已更新 {valid_tiles_file}")

        if not args.scan_only:
            downloaded, skipped = download_tiles(
                session=session,
                zoom=zoom,
                tiles=tiles,
                timeout=args.timeout,
                delay=args.delay,
                output_root=args.output_root,
            )
            print(f"  下载完成：新增 {downloaded}，已存在 {skipped}")

    summary = {
        str(zoom): {
            "count": len(tiles),
            "outputDir": str(output_dir_for_zoom(zoom, args.output_root)),
        }
        for zoom, tiles in all_results.items()
    }
    print("完成：")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
