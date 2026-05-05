import requests
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WIKI_BASE = "https://wiki.biligame.com/rocom/"

def extract_js_literal(path, export_name):
    text = path.read_text(encoding="utf-8")
    pattern = rf"export const {re.escape(export_name)}\s*=\s*(.+?);\s*$"
    match = re.search(pattern, text, re.S)
    if not match:
        raise ValueError(f"Unable to find export '{export_name}' in {path}")
    literal = match.group(1)
    literal = re.sub(r"\btrue\b", "True", literal)
    literal = re.sub(r"\bfalse\b", "False", literal)
    literal = re.sub(r"\bnull\b", "None", literal)
    return eval(literal)

def fetch_trait_image_url(html):
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    char_box = soup.find("div", class_="rocom_sprite_info_characteristic_content")
    if not char_box:
        return ""
    img = char_box.find("img")
    if not img or not img.get("src"):
        return ""
    return img["src"] if img["src"].startswith("http") else WIKI_BASE + img["src"]

def main():
    trait_dir = PROJECT_ROOT / "static" / "traits" / "base"
    trait_dir.mkdir(parents=True, exist_ok=True)
    
    pets_file = PROJECT_ROOT / "data" / "pets.js"
    pets = extract_js_literal(pets_file, "pets")
    
    session = requests.Session()
    session.trust_env = False
    session.headers.update({
        "User-Agent": "Mozilla/5.0",
        "Referer": WIKI_BASE,
        "Accept-Language": "zh-CN,zh;q=0.9"
    })
    
    output = {}
    missing = 0
    for pet in pets:
        pet_id = int(pet["id"])
        name = pet["name"]
        local_file = trait_dir / f"{pet_id}.png"
        
        if local_file.exists():
            output[str(pet_id)] = f"/static/traits/base/{pet_id}.png"
            print(f"[{pet_id}] {name} (exists)")
            continue
        
        missing += 1
        print(f"[{pet_id}] {name} downloading...")
        try:
            from urllib.parse import quote
            response = session.get(WIKI_BASE + quote(name), timeout=20)
            if response.status_code != 200:
                print(f"  page error: {response.status_code}")
                continue
            img_url = fetch_trait_image_url(response.text)
            if not img_url:
                print(f"  no trait image")
                continue
            img_resp = session.get(img_url, timeout=20)
            if img_resp.status_code != 200:
                print(f"  image error: {img_resp.status_code}")
                continue
            local_file.write_bytes(img_resp.content)
            output[str(pet_id)] = f"/static/traits/base/{pet_id}.png"
            print(f"  saved")
        except Exception as e:
            print(f"  error: {e}")
    
    output_file = PROJECT_ROOT / "data" / "pet_trait_images.js"
    output_file.write_text("export const petTraitImages = " + json.dumps(output, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    print(f"\nTotal missing: {missing}")
    print(f"Saved {output_file}")

if __name__ == "__main__":
    main()
