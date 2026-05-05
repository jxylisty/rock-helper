from __future__ import annotations

import argparse
import ast
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urljoin

import requests
from bs4 import BeautifulSoup

from professional_crawler import PetCrawler


PROJECT_ROOT = Path(__file__).resolve().parents[1]
WIKI_BASE = "https://wiki.biligame.com/rocom/"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Crawl variant detail data from wiki.")
    parser.add_argument("--output-root", default="", help="Optional staging root directory.")
    parser.add_argument(
        "--pet-ids",
        default="",
        help="Optional comma-separated pet ids. Example: 4,7,10",
    )
    parser.add_argument(
        "--only-missing",
        action="store_true",
        help="Only fetch entries that are currently missing in data/pet_variant_details.js.",
    )
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
    if name.endswith(".png"):
        name = name[:-4]
    return name.strip()


def extract_variant_name(image_path: str, base_pet_name: str) -> str:
    title = extract_variant_title(image_path)
    match = re.search(r"（(.+?)）", title)
    if match:
        return match.group(1).strip()
    if title == base_pet_name:
        return "默认"
    return title


def build_title_candidates(title: str) -> list[str]:
    result = [title]
    replacements = [
        ("储水时的样子", "储水期的样子"),
        ("储水期的样子", "储水时的样子"),
        ("本来的样子", "平常的样子"),
        ("平常的样子", "本来的样子"),
    ]
    for old, new in replacements:
        if old in title:
            alt = title.replace(old, new)
            if alt not in result:
                result.append(alt)
    return result


def parse_pet_ids(raw: str) -> set[int]:
    values = set()
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        values.add(int(part))
    return values


def parse_pet_type_list(soup: BeautifulSoup) -> list[str]:
    type_list: list[str] = []
    alt_pattern = re.compile(r"图标\s*宠物\s*属性\s*([^\s.]+)\.png")
    src_pattern = re.compile(r"属性[_\s-]?([^./]+)\.png")

    containers = soup.select(".rocom_sprite_layout_1, .rocom_sprite_layout_2")
    for container in containers:
        for img in container.find_all("img"):
            alt = (img.get("alt") or "").strip()
            match = alt_pattern.search(alt)
            if match:
                pet_type = match.group(1).strip()
                if pet_type and pet_type not in type_list:
                    type_list.append(pet_type)
                continue

            src = unquote(img.get("src", ""))
            match = src_pattern.search(src)
            if match:
                pet_type = match.group(1).strip()
                if pet_type and pet_type not in type_list:
                    type_list.append(pet_type)

        if type_list:
            break

    return type_list[:2]


def parse_trait_image_remote(soup: BeautifulSoup) -> str:
    char_box = soup.find("div", class_="rocom_sprite_info_characteristic_content")
    if not char_box:
        return ""
    img = char_box.find("img")
    if not img or not img.get("src"):
        return ""
    return urljoin(WIKI_BASE, img.get("src"))


def sanitize_detail(data: dict[str, Any]) -> dict[str, Any]:
    race = data.get("race") or {}
    race_keys = ["hp", "attack", "mattack", "defense", "mdefense", "speed", "total"]
    cleaned_race = {}
    for key in race_keys:
        cleaned_race[key] = int(race.get(key, 0) or 0)
    if not cleaned_race["total"]:
        cleaned_race["total"] = sum(cleaned_race[key] for key in race_keys if key != "total")
    data["race"] = cleaned_race

    data["skills"] = data.get("skills") or []
    data["skill_types"] = data.get("skill_types") or {}
    data["trait"] = str(data.get("trait") or "").strip()
    return data


def parse_variant_detail(html: str, parser: PetCrawler) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    data = sanitize_detail(parser.parse_pet_detail(html))
    data["type"] = parse_pet_type_list(soup)
    data["traitImageRemote"] = parse_trait_image_remote(soup)
    return data


def download_trait_image(
    session: requests.Session,
    remote_url: str,
    pet_id: int,
    variant_name: str,
    trait_dir: Path,
) -> str:
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
    selected_pet_ids = parse_pet_ids(args.pet_ids) if args.pet_ids else set()

    output_file = root / "data" / "pet_variant_details.js"
    trait_dir = root / "static" / "traits" / "variants"
    failed_file = root / "crawler" / "variant_detail_failures.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    trait_dir.mkdir(parents=True, exist_ok=True)
    failed_file.parent.mkdir(parents=True, exist_ok=True)

    pets = extract_js_literal(source_path(root, "data/pets.js"), "pets")
    variants = extract_js_literal(source_path(root, "data/pet_variants.js"), "petVariants")
    if output_file.exists():
        output = extract_js_literal(output_file, "petVariantDetails")
    else:
        output = {}
    failures: list[dict[str, str]] = []

    pets_by_id = {int(item["id"]): item for item in pets}
    parser = PetCrawler(args.output_root)
    session = requests.Session()
    session.trust_env = False
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0",
            "Referer": WIKI_BASE,
            "Accept-Language": "zh-CN,zh;q=0.9",
        }
    )

    def flush() -> None:
        output_file.write_text(
            "export const petVariantDetails = " + json.dumps(output, ensure_ascii=False, indent=2) + ";\n",
            encoding="utf-8",
        )
        failed_file.write_text(json.dumps(failures, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for pet_id_str, images in variants.items():
        pet_id = int(pet_id_str)
        if selected_pet_ids and pet_id not in selected_pet_ids:
            continue

        base_pet = pets_by_id.get(pet_id, {})
        base_pet_name = str(base_pet.get("name") or "").strip()
        output.setdefault(str(pet_id), {})

        for image_path in images:
            if args.only_missing and output[str(pet_id)].get(image_path):
                continue

            title = extract_variant_title(image_path)
            variant_name = extract_variant_name(image_path, base_pet_name)
            print(f"[{pet_id}] {title}")

            matched_title, html = fetch_variant_page(session, title)
            if not html:
                failures.append({"petId": str(pet_id), "title": title, "image": image_path})
                continue

            try:
                data = parse_variant_detail(html, parser)
            except Exception as exc:
                failures.append(
                    {
                        "petId": str(pet_id),
                        "title": title,
                        "image": image_path,
                        "error": f"parse: {exc}",
                    }
                )
                continue

            data["fullName"] = matched_title or title
            data["variantName"] = variant_name
            data["img"] = image_path
            if not data.get("type"):
                data["type"] = list(base_pet.get("type", []))

            remote_trait = data.pop("traitImageRemote", "")
            if remote_trait:
                try:
                    data["traitImage"] = download_trait_image(session, remote_trait, pet_id, variant_name, trait_dir)
                except Exception as exc:
                    failures.append(
                        {
                            "petId": str(pet_id),
                            "title": title,
                            "image": image_path,
                            "error": f"trait-image: {exc}",
                        }
                    )

            output[str(pet_id)][image_path] = data
            flush()

    flush()
    print(f"saved {output_file}")
    print(f"saved {failed_file}")


if __name__ == "__main__":
    main()
