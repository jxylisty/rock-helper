# -*- coding: utf-8 -*-
"""Generate a full rectangular local map tile pyramid from map_z8_v3.png."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_IMAGE = ROOT_DIR / "static" / "map_z8_v3.png"
DEFAULT_METADATA = ROOT_DIR / "data" / "map_rect_pyramid.json"
BASE_TILE_SIZE = 256
DEFAULT_LEVELS = [8, 7, 6, 5]
MAX_LEVEL = 8

Image.MAX_IMAGE_PIXELS = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate full local map pyramid from a big map image.")
    parser.add_argument("--image", default=str(DEFAULT_IMAGE), help="Source map image path.")
    parser.add_argument("--levels", nargs="+", type=int, default=DEFAULT_LEVELS, help="Levels to generate, e.g. 8 7 6")
    parser.add_argument("--output-root", default="", help="Optional staging root directory.")
    return parser.parse_args()


def resolve_root(output_root: str) -> Path:
    return Path(output_root).resolve() if output_root else ROOT_DIR


def tile_dir_for_level(root: Path, level: int) -> Path:
    return root / "static" / f"map_rect_z{level}"


def save_tile(tile: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tile.save(path, optimize=True)


def main() -> None:
    args = parse_args()
    root = resolve_root(args.output_root)
    image_path = Path(args.image)
    metadata_path = root / "data" / "map_rect_pyramid.json"
    metadata_path.parent.mkdir(parents=True, exist_ok=True)

    image = Image.open(image_path)
    world_width, world_height = image.size

    metadata = {
        "baseTileSize": BASE_TILE_SIZE,
        "worldWidth": world_width,
        "worldHeight": world_height,
        "sourceImage": image_path.name,
        "levels": {},
    }

    for level in sorted(set(args.levels), reverse=True):
        factor = 2 ** (MAX_LEVEL - level)
        scaled_width = math.ceil(world_width / factor)
        scaled_height = math.ceil(world_height / factor)
        scaled = image.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)

        cols = math.ceil(scaled_width / BASE_TILE_SIZE)
        rows = math.ceil(scaled_height / BASE_TILE_SIZE)
        tile_dir = tile_dir_for_level(root, level)
        tile_dir.mkdir(parents=True, exist_ok=True)

        generated = 0
        for row in range(rows):
            for col in range(cols):
                left = col * BASE_TILE_SIZE
                top = row * BASE_TILE_SIZE
                right = min(left + BASE_TILE_SIZE, scaled_width)
                bottom = min(top + BASE_TILE_SIZE, scaled_height)

                tile = scaled.crop((left, top, right, bottom))
                if tile.size != (BASE_TILE_SIZE, BASE_TILE_SIZE):
                    canvas = Image.new("RGBA", (BASE_TILE_SIZE, BASE_TILE_SIZE), (0, 0, 0, 0))
                    canvas.paste(tile, (0, 0))
                    tile = canvas

                save_tile(tile, tile_dir / f"tile-{col}_{row}.png")
                generated += 1

        metadata["levels"][str(level)] = {
            "level": level,
            "factor": factor,
            "tileSize": BASE_TILE_SIZE,
            "worldTileSize": BASE_TILE_SIZE * factor,
            "scaledWidth": scaled_width,
            "scaledHeight": scaled_height,
            "cols": cols,
            "rows": rows,
            "dir": tile_dir.name,
        }
        print(f"z{level}: generated {generated} tiles -> {tile_dir}")

    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
    print(f"saved {metadata_path}")


if __name__ == "__main__":
    main()
