# -*- coding: utf-8 -*-
"""Cut local big map image into z8 map tiles compatible with current app."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_IMAGE = ROOT_DIR / "static" / "map_z8_v3.png"
DEFAULT_VALID_TILES = ROOT_DIR / "valid_tiles.json"
DEFAULT_OUTPUT_DIR = ROOT_DIR / "static" / "map_tiles_z8_v2"

MIN_X = -24
MAX_X = 23
MIN_Y = -17
MAX_Y = 16
TILE_SIZE = 256


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate z8 tiles from local map image.")
    parser.add_argument("--image", default=str(DEFAULT_IMAGE), help="Source big map image path.")
    parser.add_argument("--valid-tiles", default=str(DEFAULT_VALID_TILES), help="Valid tiles json path.")
    parser.add_argument("--output-root", default="", help="Optional staging root directory.")
    parser.add_argument("--flip-y-for-current-app", action="store_true", help="Pre-flip each tile vertically to match current flipY rendering.")
    return parser.parse_args()


def output_dir_for_root(output_root: str) -> Path:
    if output_root:
        root = Path(output_root).resolve()
        return root / "static" / "map_tiles_z8_v2"
    return DEFAULT_OUTPUT_DIR


def valid_tiles_output_for_root(output_root: str) -> Path:
    if output_root:
        return Path(output_root).resolve() / "valid_tiles.json"
    return DEFAULT_VALID_TILES


def main() -> None:
    args = parse_args()
    image_path = Path(args.image)
    valid_tiles_path = Path(args.valid_tiles)
    output_dir = output_dir_for_root(args.output_root)
    valid_tiles_out = valid_tiles_output_for_root(args.output_root)

    valid_tiles = json.loads(valid_tiles_path.read_text(encoding="utf-8"))
    output_dir.mkdir(parents=True, exist_ok=True)
    valid_tiles_out.parent.mkdir(parents=True, exist_ok=True)

    image = Image.open(image_path)
    expected_size = ((MAX_X - MIN_X + 1) * TILE_SIZE, (MAX_Y - MIN_Y + 1) * TILE_SIZE)
    if image.size != expected_size:
        raise ValueError(f"地图大图尺寸不匹配：实际 {image.size}，预期 {expected_size}")

    generated = 0
    for x, y in valid_tiles:
        left = (x - MIN_X) * TILE_SIZE
        top = (MAX_Y - y) * TILE_SIZE
        tile = image.crop((left, top, left + TILE_SIZE, top + TILE_SIZE))
        if args.flip_y_for_current_app:
            tile = tile.transpose(Image.FLIP_TOP_BOTTOM)
        tile.save(output_dir / f"tile-{x}_{y}.png", optimize=True)
        generated += 1

    valid_tiles_out.write_text(json.dumps(valid_tiles, ensure_ascii=False), encoding="utf-8")
    print(f"已生成 {generated} 个瓦片到 {output_dir}")
    print(f"已写入 {valid_tiles_out}")


if __name__ == "__main__":
    main()
