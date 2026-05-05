# -*- coding: utf-8 -*-
"""Convert pet_details.json into data/pets_detail.js."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert pet_details.json to data/pets_detail.js")
    parser.add_argument("--output-root", default="", help="Optional staging root directory.")
    return parser.parse_args()


def resolve_root(output_root: str) -> Path:
    return Path(output_root).resolve() if output_root else PROJECT_ROOT


def load_existing_details(detail_file: Path) -> dict:
    if not detail_file.exists():
        return {}
    try:
        content = detail_file.read_text(encoding="utf-8")
        match = re.search(r"export const petsDetail = (\{.*\});", content, re.DOTALL)
        if not match:
            return {}
        return json.loads(match.group(1))
    except Exception:
        return {}


def main() -> None:
    args = parse_args()
    root = resolve_root(args.output_root)
    pet_details_file = root / "pet_details.json"
    output_file = root / "data" / "pets_detail.js"
    output_file.parent.mkdir(parents=True, exist_ok=True)

    new_details = json.loads(pet_details_file.read_text(encoding="utf-8"))
    pets_detail = {int(pet["id"]): pet for pet in new_details}

    old_data = load_existing_details(output_file)
    for pid, old_pet in old_data.items():
        pid_int = int(pid)
        if pid_int not in pets_detail:
            pets_detail[pid_int] = old_pet
        else:
            if not pets_detail[pid_int].get("trait") and old_pet.get("trait"):
                pets_detail[pid_int]["trait"] = old_pet["trait"]

    output = "export const petsDetail = " + json.dumps(
        pets_detail,
        ensure_ascii=False,
        indent=2,
    ) + ";\n"
    output_file.write_text(output, encoding="utf-8")
    print(f"已生成 {output_file}")
    print(f"共 {len(pets_detail)} 条精灵详情")


if __name__ == "__main__":
    main()
