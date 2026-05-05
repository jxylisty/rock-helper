# -*- coding: utf-8 -*-
"""Generate data/pet_variants.js from local static/pets images."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
PETS_DIR = ROOT_DIR / "static" / "pets"

FILENAME_RE = re.compile(r"^(?P<id>\d+)_(?P<name>.+)\.png$")


def sort_key(image_path: str) -> tuple[int, str]:
    name = Path(image_path).stem
    if "本来的样子" in name:
        return (0, name)
    if "平常的样子" in name:
        return (1, name)
    return (2, name)


def build_variant_map() -> dict[str, list[str]]:
    variants: dict[str, list[str]] = {}

    for file in sorted(PETS_DIR.glob("*.png")):
        match = FILENAME_RE.match(file.name)
        if not match:
            continue
        if "异色" in file.name:
            continue

        pet_id = str(int(match.group("id")))
        relative_path = f"/static/pets/{file.name}"
        variants.setdefault(pet_id, [])
        if relative_path not in variants[pet_id]:
            variants[pet_id].append(relative_path)

    # Only keep pets that actually have multiple local form images.
    variants = {pet_id: paths for pet_id, paths in variants.items() if len(paths) > 1}

    for pet_id, paths in variants.items():
        paths.sort(key=sort_key)

    return dict(sorted(variants.items(), key=lambda item: int(item[0])))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate pet_variants.js from static/pets.")
    parser.add_argument("--output-root", default="", help="Optional staging root directory.")
    return parser.parse_args()


def output_file_for_root(output_root: str) -> Path:
    base = Path(output_root).resolve() if output_root else ROOT_DIR
    target = base / "data" / "pet_variants.js"
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def write_js(variants: dict[str, list[str]], output_file: Path) -> None:
    content = "export const petVariants = " + json.dumps(
        variants,
        ensure_ascii=False,
        indent=2,
    ) + ";\n"
    output_file.write_text(content, encoding="utf-8")


def main() -> None:
    args = parse_args()
    if not PETS_DIR.exists():
        raise FileNotFoundError(f"Pets directory not found: {PETS_DIR}")

    variants = build_variant_map()
    output_file = output_file_for_root(args.output_root)
    write_js(variants, output_file)
    print(f"已生成 {output_file}，共 {len(variants)} 只精灵拥有多形态图片。")


if __name__ == "__main__":
    main()
