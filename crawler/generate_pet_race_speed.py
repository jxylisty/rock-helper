# -*- coding: utf-8 -*-
"""Generate a lightweight race-speed map from data/pets_detail.js."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DETAIL_FILE = ROOT_DIR / "data" / "pets_detail.js"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate pet_race_speed.js from pets_detail.js.")
    parser.add_argument("--output-root", default="", help="Optional staging root directory.")
    return parser.parse_args()


def output_file_for_root(output_root: str) -> Path:
    base = Path(output_root).resolve() if output_root else ROOT_DIR
    target = base / "data" / "pet_race_speed.js"
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def load_details() -> dict:
    content = DETAIL_FILE.read_text(encoding="utf-8")
    match = re.search(r"export const petsDetail = (\{.*\});\s*$", content, re.DOTALL)
    if not match:
        raise ValueError("未能从 pets_detail.js 中解析 petsDetail 数据。")
    return json.loads(match.group(1))


def build_speed_map(details: dict) -> dict[str, int]:
    result: dict[str, int] = {}
    for pet_id, detail in details.items():
        race = detail.get("race") or {}
        speed = int(race.get("speed") or 0)
        result[str(int(pet_id))] = speed
    return dict(sorted(result.items(), key=lambda item: int(item[0])))


def write_js(speed_map: dict[str, int], output_file: Path) -> None:
    content = "export const petRaceSpeed = " + json.dumps(
        speed_map,
        ensure_ascii=False,
        indent=2,
    ) + ";\n"
    output_file.write_text(content, encoding="utf-8")


def main() -> None:
    args = parse_args()
    details = load_details()
    speed_map = build_speed_map(details)
    output_file = output_file_for_root(args.output_root)
    write_js(speed_map, output_file)
    print(f"已生成 {output_file}，共 {len(speed_map)} 条速度种族值。")


if __name__ == "__main__":
    main()
