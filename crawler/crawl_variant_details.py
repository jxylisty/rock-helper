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
    parser = argparse.ArgumentParser(description="Crawl variant detail data from wiki.")
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


def extract_variant_title(image_path: str) -> str:
    name = Path(image_path).name
    if "_" in name:
        name = name.split("_", 1)[1]
    return name[:-4] if name.endswith(".png") else name


def extract_variant_name(image_path: str) -> str:
    title = extract_variant_title(image_path)
    match = re.search(r"（(.+?)）", title)
    return match.group(1) if match else title


def build_title_candidates(title: str) -> list[str]:
    replacements = [
        ("储水时的样子", "储水期的样子"),
        ("储水期的样子", "储水时的样子"),
        ("本来的样子", "平常的样子"),
        ("平常的样子", "本来的样子"),
    ]
    result = [title]
    for old, new in replacements:
        if old in title:
            alt = title.replace(old, new)
            if alt not in result:
                result.append(alt)
    return result


def parse_race_value(text: str) -> int:
    match = re.search(r"(\d+)", text or "")
    return int(match.group(1)) if match else 0


def parse_variant_detail(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    race = {"hp": 0, "attack": 0, "defense": 0, "magicAttack": 0, "magicDefense": 0, "speed": 0, "total": 0}
    race_map = {
        "生命": "hp",
        "物攻": "attack",
        "物防": "defense",
        "魔攻": "magicAttack",
        "魔防": "magicDefense",
        "速度": "speed",
        "总和": "total",
    }
    for row in soup.find_all(["tr", "div"]):
        text = row.get_text(" ", strip=True)
        for zh_name, key in race_map.items():
            if zh_name in text:
                value = parse_race_value(text)
                if value:
                    race[key] = value

    trait = ""
    trait_image_remote = ""
    char_box = soup.find("div", class_="rocom_sprite_info_characteristic_content")
    if char_box:
        trait = char_box.get_text(" ", strip=True)
        img = char_box.find("img")
        if img and img.get("src"):
            trait_image_remote = urljoin(WIKI_BASE, img.get("src"))

    type_list: list[str] = []
    for img in soup.find_all("img"):
        src = img.get("src", "")
        match = re.search(r"属性[_-]([^./]+)\.png", src)
        if match:
            attr = match.group(1)
            if attr not in type_list:
                type_list.append(attr)
    type_list = type_list[:2]

    skills: list[dict[str, str]] = []
    for block in soup.find_all("div", class_="rocom_skill_item"):
        name = block.get_text(" ", strip=True)
        if name:
            skills.append({"name": name})

    return {
        "type": type_list,
        "race": race,
        "trait": trait,
        "traitImageRemote": trait_image_remote,
        "skills": skills,
    }


def download_trait_image(session: requests.Session, remote_url: str, pet_id: int, variant_name: str, trait_dir: Path) -> str:
    trait_dir.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^\w\u4e00-\u9fff-]+", "_", variant_name).strip("_") or "trait"
    local_file = trait_dir / f"{pet_id}_{safe_name}.png"
    response = session.get(remote_url, timeout=20)
    response.raise_for_status()
    local_file.write_bytes(response.content)
    return f"/static/traits/variants/{local_file.name}"


def fetch_variant_page(session: requests.Session, title: str) -> tuple[str | None, str | None]:
    for candidate in build_title_candidates(title):
        try:
            response = session.get(WIKI_BASE + quote(candidate), timeout=20)
            if response.status_code == 200:
                return candidate, response.text
        except requests.RequestException:
            continue
    return None, None


def main() -> None:
    args = parse_args()
    root = resolve_root(args.output_root)
    output_file = root / "data" / "pet_variant_details.js"
    trait_dir = root / "static" / "traits" / "variants"
    failed_file = root / "crawler" / "variant_detail_failures.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    trait_dir.mkdir(parents=True, exist_ok=True)
    failed_file.parent.mkdir(parents=True, exist_ok=True)

    pets = extract_js_literal(source_path(root, "data/pets.js"), "pets")
    variants = extract_js_literal(source_path(root, "data/pet_variants.js"), "petVariants")
    pets_by_id = {int(item["id"]): item for item in pets}

    session = requests.Session()
    session.trust_env = False
    session.headers.update({"User-Agent": "Mozilla/5.0", "Referer": WIKI_BASE, "Accept-Language": "zh-CN,zh;q=0.9"})

    output: dict[str, dict[str, Any]] = {}
    failures: list[dict[str, str]] = []

    def flush() -> None:
        output_file.write_text(
            "export const petVariantDetails = " + json.dumps(output, ensure_ascii=False, indent=2) + ";\n",
            encoding="utf-8",
        )
        failed_file.write_text(json.dumps(failures, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for pet_id_str, images in variants.items():
        pet_id = int(pet_id_str)
        base_pet = pets_by_id.get(pet_id, {})
        output[str(pet_id)] = {}
        for image_path in images:
            title = extract_variant_title(image_path)
            variant_name = extract_variant_name(image_path)
            print(f"[{pet_id}] {title}")
            matched_title, html = fetch_variant_page(session, title)
            if not html:
                failures.append({"petId": str(pet_id), "title": title, "image": image_path})
                continue
            data = parse_variant_detail(html)
            data["fullName"] = matched_title or title
            data["variantName"] = variant_name
            data["img"] = image_path
            data["type"] = data.get("type") or list(base_pet.get("type", []))
            remote_trait = data.pop("traitImageRemote", "")
            if remote_trait:
                try:
                    data["traitImage"] = download_trait_image(session, remote_trait, pet_id, variant_name, trait_dir)
                except Exception:
                    pass
            output[str(pet_id)][image_path] = data
        flush()

    flush()
    print(f"saved {output_file}")
    print(f"saved {failed_file}")


if __name__ == "__main__":
    main()
