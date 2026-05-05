# -*- coding: utf-8 -*-
"""Generate data/pets.js from static/pets.html."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import unquote

from bs4 import BeautifulSoup


ROOT_DIR = Path(__file__).resolve().parents[1]
HTML_FILE = ROOT_DIR / "static" / "pets.html"
PETS_DIR = ROOT_DIR / "static" / "pets"

PET_TYPES = [
    {"key": "火", "label": "火", "color": "#F08030"},
    {"key": "水", "label": "水", "color": "#6890F0"},
    {"key": "草", "label": "草", "color": "#78C850"},
    {"key": "电", "label": "电", "color": "#F8D030"},
    {"key": "冰", "label": "冰", "color": "#98D8D8"},
    {"key": "虫", "label": "虫", "color": "#A8B820"},
    {"key": "翼", "label": "翼", "color": "#A890F0"},
    {"key": "地", "label": "地", "color": "#E0C068"},
    {"key": "萌", "label": "萌", "color": "#FF6699"},
    {"key": "武", "label": "武", "color": "#C03028"},
    {"key": "毒", "label": "毒", "color": "#A040A0"},
    {"key": "龙", "label": "龙", "color": "#7038F8"},
    {"key": "幽", "label": "幽", "color": "#705898"},
    {"key": "恶", "label": "恶", "color": "#705848"},
    {"key": "光", "label": "光", "color": "#F8D030"},
    {"key": "翼", "label": "翼", "color": "#A890F0"},
    {"key": "普通", "label": "普通", "color": "#A8A878"},
    {"key": "机械", "label": "机械", "color": "#A0A0A0"},
]

RARITY_COLORS = {
    "普通": "#A8A878",
    "稀有": "#A8A8A8",
    "史诗": "#A040F0",
    "传说": "#F8C030",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate pets.js from static/pets.html.")
    parser.add_argument("--output-root", default="", help="Optional staging root directory.")
    return parser.parse_args()


def output_file_for_root(output_root: str) -> Path:
    base = Path(output_root).resolve() if output_root else ROOT_DIR
    target = base / "data" / "pets.js"
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def get_img_url(img) -> str:
    srcset = img.get("srcset", "")
    if srcset:
        urls = [part.strip().split()[0] for part in srcset.split(",") if part.strip()]
        if urls:
            return urls[-1]
    return img.get("src", "")


def strip_variant_suffix(name: str) -> str:
    return re.sub(r"（.*?）", "", name).strip()


def build_header() -> str:
    return (
        "export const petTypes = " + json.dumps(PET_TYPES, ensure_ascii=False, indent=2) + ";\n\n"
        + "export const rarityColors = " + json.dumps(RARITY_COLORS, ensure_ascii=False, indent=2) + ";\n\n"
        + "export const typeRestriction = {};\n\n"
        + "export const typeIconMap = {};\n\n"
    )


def main() -> None:
    args = parse_args()
    soup = BeautifulSoup(HTML_FILE.read_text(encoding="utf-8"), "html.parser")
    divs = soup.find_all("div", class_="divsort")
    seen_pets: dict[str, dict] = {}

    for div in divs:
        name_p = div.find("p", class_="rocom_prop_name")
        if not name_p:
            continue
        link = name_p.find("a")
        if not link:
            continue

        href = link.get("href", "")
        match = re.search(r"/rocom/([^/]+)", href)
        if not match:
            continue

        encoded_name = match.group(1)
        pet_name = unquote(encoded_name)
        pet_name_clean = strip_variant_suffix(pet_name)

        no_p = div.find("span", string=re.compile(r"NO\.\d+"))
        pet_id = None
        if no_p:
            no_match = re.search(r"NO\.(\d+)", no_p.get_text())
            pet_id = no_match.group(1).zfill(3) if no_match else None
        if not pet_id:
            continue

        param2 = div.get("data-param2", "")
        types = [item.strip() for item in param2.split(",") if item.strip()]
        prop_relative = div.find("div", style=re.compile("position:relative"))
        if not prop_relative:
            continue

        imgs = prop_relative.find_all("img", class_="rocom_prop_icon")
        if not imgs:
            continue

        first_img = imgs[0]
        if "异色" in first_img.get("alt", ""):
            continue

        current_img = f"/static/pets/{pet_id}_{pet_name}.png"
        base_img = PETS_DIR / f"{pet_id}_{pet_name_clean}.png"

        seen_pets.setdefault(
            pet_id,
            {
                "id": int(pet_id),
                "name": pet_name_clean,
                "type": types,
                "rarity": "普通",
                "has_variant": False,
                "url": f"https://wiki.biligame.com/rocom/{encoded_name}",
                "img": current_img if base_img.exists() else current_img,
                "_fallback_img": current_img,
            },
        )

        if pet_name != pet_name_clean or len(imgs) > 1:
            seen_pets[pet_id]["has_variant"] = True

    pets = [seen_pets[key] for key in sorted(seen_pets.keys(), key=int)]
    for pet in pets:
        pet.pop("_fallback_img", None)

    output_file = output_file_for_root(args.output_root)
    output_file.write_text(
        build_header() + "export const pets = " + json.dumps(pets, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"已生成 {output_file}，共 {len(pets)} 条精灵主数据。")


if __name__ == "__main__":
    main()
