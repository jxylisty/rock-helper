from __future__ import annotations

import argparse
import ast
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import quote, urljoin

import requests
from bs4 import BeautifulSoup


PROJECT_ROOT = Path(__file__).resolve().parents[1]
WIKI_BASE = "https://wiki.biligame.com/rocom/"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Crawl base trait images from wiki.")
    parser.add_argument("--output-root", default="", help="Optional staging root directory.")
    return parser.parse_args()


def resolve_root(output_root: str) -> Path:
    return Path(output_root).resolve() if output_root else PROJECT_ROOT


def source_path(root: Path, relative: str) -> Path:
    path = root / relative
    return path if path.exists() else PROJECT_ROOT / relative


def extract_js_literal(path: Path, export_name: str) -> Any:
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


def fetch_trait_image_url(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    char_box = soup.find("div", class_="rocom_sprite_info_characteristic_content")
    if not char_box:
        return ""
    img = char_box.find("img")
    if not img or not img.get("src"):
        return ""
    return urljoin(WIKI_BASE, img.get("src"))


def load_existing_output(output_file: Path) -> dict[str, str]:
    if not output_file.exists():
        return {}
    try:
        return extract_js_literal(output_file, "petTraitImages")
    except Exception:
        return {}


def main() -> None:
    args = parse_args()
    root = resolve_root(args.output_root)
    output_file = root / "data" / "pet_trait_images.js"
    trait_dir = root / "static" / "traits" / "base"
    failed_file = root / "crawler" / "trait_image_failures.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    trait_dir.mkdir(parents=True, exist_ok=True)
    failed_file.parent.mkdir(parents=True, exist_ok=True)

    pets = extract_js_literal(source_path(root, "data/pets.js"), "pets")
    session = requests.Session()
    session.trust_env = False
    session.headers.update({"User-Agent": "Mozilla/5.0", "Referer": WIKI_BASE, "Accept-Language": "zh-CN,zh;q=0.9"})

    output = load_existing_output(output_file)
    failures: list[dict[str, str]] = []

    for pet in pets:
        pet_id = int(pet["id"])
        name = str(pet["name"])
        if str(pet_id) in output:
            print(f"[{pet_id}] {name} (skip)")
            continue
        print(f"[{pet_id}] {name}")
        try:
            response = session.get(WIKI_BASE + quote(name), timeout=20)
            if response.status_code != 200:
                failures.append({"petId": str(pet_id), "name": name, "reason": f"page status {response.status_code}"})
                continue
            img_url = fetch_trait_image_url(response.text)
            if not img_url:
                failures.append({"petId": str(pet_id), "name": name, "reason": "no trait image"})
                continue
            img_resp = session.get(img_url, timeout=20)
            if img_resp.status_code != 200:
                failures.append({"petId": str(pet_id), "name": name, "reason": f"image status {img_resp.status_code}"})
                continue
            local_file = trait_dir / f"{pet_id}.png"
            local_file.write_bytes(img_resp.content)
            output[str(pet_id)] = f"/static/traits/base/{local_file.name}"
        except Exception as exc:
            failures.append({"petId": str(pet_id), "name": name, "reason": str(exc)})

    output_file.write_text("export const petTraitImages = " + json.dumps(output, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    failed_file.write_text(json.dumps(failures, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"saved {output_file}")
    print(f"saved {failed_file}")


if __name__ == "__main__":
    main()
