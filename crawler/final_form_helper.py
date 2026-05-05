"""Utilities for resolving final pet forms by shared trait text.

Rule:
- Sort pets by chart id.
- Pets with the same trait description belong to the same species line.
- The last id in that trait group is the final form.

This script can be imported by other Python tools or run directly to emit a
JSON/JS mapping for offline reuse.
"""

from __future__ import annotations

import argparse
import ast
import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple


ROOT = Path(__file__).resolve().parents[1]


def _extract_js_literal(path: Path, export_name: str) -> Any:
    text = path.read_text(encoding="utf-8")
    pattern = rf"export const {re.escape(export_name)}\s*=\s*(.+?);\s*$"
    match = re.search(pattern, text, re.S)
    if not match:
      raise ValueError(f"Unable to find export '{export_name}' in {path}")

    literal = match.group(1)
    literal = re.sub(r"\btrue\b", "True", literal)
    literal = re.sub(r"\bfalse\b", "False", literal)
    literal = re.sub(r"\bnull\b", "None", literal)
    return ast.literal_eval(literal)


def _normalize_trait(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", "", str(value)).strip()


def build_final_form_map(
    pets_path: Path | str | None = None,
    details_path: Path | str | None = None,
) -> Dict[str, int]:
    pets_path = Path(pets_path) if pets_path else ROOT / "data" / "pets.js"
    details_path = Path(details_path) if details_path else ROOT / "data" / "pets_detail.js"

    pets: List[Dict[str, Any]] = _extract_js_literal(pets_path, "pets")
    details: Dict[str, Dict[str, Any]] = _extract_js_literal(details_path, "petsDetail")

    groups: Dict[str, List[int]] = {}
    for pet in pets:
        pet_id = int(pet["id"])
        detail = details.get(str(pet_id), {}) or {}
        trait = _normalize_trait(detail.get("trait") or pet.get("trait") or "")
        if not trait or trait == "特性":
            continue
        groups.setdefault(trait, []).append(pet_id)

    final_map: Dict[str, int] = {}
    for pet in pets:
        pet_id = int(pet["id"])
        detail = details.get(str(pet_id), {}) or {}
        trait = _normalize_trait(detail.get("trait") or pet.get("trait") or "")
        if not trait or trait == "特性":
            final_map[str(pet_id)] = pet_id
            continue
        group = groups.get(trait, [pet_id])
        final_map[str(pet_id)] = max(group)

    return final_map


def resolve_final_form_id(pet_id: int, final_map: Dict[str, int]) -> int:
    return int(final_map.get(str(pet_id), pet_id))


def resolve_final_forms(pets: Iterable[Dict[str, Any]], final_map: Dict[str, int]) -> Dict[int, int]:
    return {int(pet["id"]): resolve_final_form_id(int(pet["id"]), final_map) for pet in pets}


def main() -> None:
    parser = argparse.ArgumentParser(description="Build final-form mapping from pet trait text.")
    parser.add_argument("--pets", type=str, default=str(ROOT / "data" / "pets.js"))
    parser.add_argument("--details", type=str, default=str(ROOT / "data" / "pets_detail.js"))
    parser.add_argument("--output", type=str, default="")
    parser.add_argument("--js", action="store_true", help="Write a JS export instead of JSON.")
    args = parser.parse_args()

    final_map = build_final_form_map(args.pets, args.details)
    payload = json.dumps(final_map, ensure_ascii=False, indent=2)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        if args.js or output_path.suffix.lower() == ".js":
            output_path.write_text(f"export const finalFormMap = {payload};\n", encoding="utf-8")
        else:
            output_path.write_text(payload + "\n", encoding="utf-8")
    else:
        print(payload)


if __name__ == "__main__":
    main()
