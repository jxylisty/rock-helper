# -*- coding: utf-8 -*-
"""
洛克王国 biligame wiki 游戏内头像爬取脚本（用于实时 PVP 图像识别）

来源: wiki.biligame.com/rocom MediaWiki API
  - 文件名规律: 精灵_头像_{精灵名}.png / 精灵_头像_{精灵名}（{形态}的样子）.png
  - 256x256 PNG, 无需登录

产出 (crawler_official_api/output/avatar/):
  images/          头像图片 (按 wiki 序号命名: {seq3}_{name}.png)
  avatar_map.json  精灵名 -> {seq, wiki_id, file, url}
  avatar_gap.json  缺失报告: 最终形态中无头像的精灵

用法:
  python crawler_official_api/fetch_avatars.py            # 增量下载
  python crawler_official_api/fetch_avatars.py --report   # 只出缺口报告不下载
"""
import json
import re
import sys
import time
from pathlib import Path

import requests

WIKI_API = "https://wiki.biligame.com/rocom/api.php"
PREFIX = "精灵_头像_"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://wiki.biligame.com/rocom/",
}
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUT_DIR = SCRIPT_DIR / "output" / "avatar"
IMG_DIR = OUT_DIR / "images"

MAX_RETRIES = 6
RETRY_SLEEP = 2


def api_get(params):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = requests.get(WIKI_API, params=params, headers=HEADERS, timeout=20)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            print(f"  [retry {attempt}] {e}")
            if attempt == MAX_RETRIES:
                raise
            time.sleep(RETRY_SLEEP)


def list_all_avatars():
    """枚举全部 头像 文件"""
    images = []
    aicontinue = ""
    page = 0
    while True:
        params = {
            "action": "query",
            "list": "allimages",
            "aiprefix": PREFIX,
            "ailimit": "500",
            "format": "json",
        }
        if aicontinue:
            params["aicontinue"] = aicontinue
        j = api_get(params)
        batch = j.get("query", {}).get("allimages", [])
        images.extend(batch)
        page += 1
        cont = j.get("continue", {})
        aicontinue = cont.get("aicontinue", "")
        print(f"  page {page}: +{len(batch)} (total {len(images)})")
        if not aicontinue or not batch:
            break
    return images


def load_pet_detail_titles():
    """解析 data/pet/pet_detail.js -> 620 个变体 (以图鉴 page_title 为权威口径)"""
    src = (PROJECT_ROOT / "data" / "pet" / "pet_detail.js").read_text(encoding="utf-8")
    entries = []
    for m in re.finditer(r"\"(\d+)\":\s*\[", src):
        seq = int(m.group(1))
        start = m.end() - 1
        depth = 0
        end = start
        for i in range(start, len(src)):
            if src[i] == "[":
                depth += 1
            elif src[i] == "]":
                depth -= 1
                if depth == 0:
                    end = i
                    break
        block = src[start:end]
        for vm in re.finditer(r"\{\s*\"page_title\":\s*\"([^\"]+)\"(.*?)\}", block, re.S):
            title = vm.group(1)
            body = vm.group(2)
            img_m = re.search(r"\"img\":\s*\"([^\"]*)\"", body)
            img = img_m.group(1) if img_m else ""
            pet_id_m = re.search(r"/pets/(\d+)/icon\.png", img)
            entries.append({
                "seq": seq,
                "page_title": title,
                "pet_id": pet_id_m.group(1) if pet_id_m else None,
            })
    return entries


def parse_avatar_name(filename):
    """精灵_头像_星光狮（星光能量的样子）.png -> (星光狮, 星光能量的样子)"""
    stem = filename
    for suffix in (".png", ".PNG", ".jpg", ".jpeg", ".webp"):
        if stem.lower().endswith(suffix):
            stem = stem[: -len(suffix)]
            break
    stem = stem[len(PREFIX):] if stem.startswith(PREFIX) else stem
    m = re.match(r"^(.+?)[（(]([^）)]+)[）)]$", stem)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return stem.strip(), None


def split_title(title):
    """page_title -> (基础名, 形态 or None)"""
    m = re.match(r"^(.+?)[（(](.+?)[）)]$", title)
    if m:
        return m.group(1), m.group(2)
    return title, None


PLAIN_FORMS = {"本来的样子"}  # 与 update_data.py 口径一致: 视为本体的形态后缀


def main():
    report_only = "--report" in sys.argv
    IMG_DIR.mkdir(parents=True, exist_ok=True)

    print("[1/4] 枚举 wiki 头像文件 ...")
    cache_file = OUT_DIR / "all_avatars.json"
    if cache_file.exists() and "--refresh" not in sys.argv:
        images = json.loads(cache_file.read_text(encoding="utf-8"))
        print(f"  使用缓存 {len(images)} 个 (加 --refresh 强制重新枚举)")
    else:
        images = list_all_avatars()
        cache_file.write_text(json.dumps(images, ensure_ascii=False), encoding="utf-8")
    print(f"  共 {len(images)} 个头像文件")

    # 名字去重: 同名普通版优先于形态版
    parsed = {}
    for img in images:
        name, form = parse_avatar_name(img["name"])
        if not name:
            continue
        entry = parsed.setdefault(name, {"name": name, "files": []})
        entry["files"].append({"file": img["name"], "url": img["url"], "form": form})
    for entry in parsed.values():
        entry["files"].sort(key=lambda f: (f["form"] is not None, f["file"]))

    print("[2/5] 加载图鉴 page_title (pet_detail.js 权威口径) ...")
    titles = load_pet_detail_titles()
    print(f"  共 {len(titles)} 个图鉴变体")

    # wiki 头像索引: (base, form) -> {file, url}; form=None 为基础版
    wiki = {}
    for img in images:
        base, form = parse_avatar_name(img["name"])
        if not base:
            continue
        wiki[(base, form)] = {"file": img["name"], "url": img["url"], "form": form}

    print("[3/5] 按 page_title 匹配 wiki 头像 ...")
    entries = []
    missing = []
    for t in titles:
        title = t["page_title"]
        base, form = split_title(title)
        hit = None
        if form is None:
            # 无形态后缀: 优先基础版, 退化到"本来的样子", 再退化到任一形态版
            hit = wiki.get((base, None)) or wiki.get((base, "本来的样子"))
            if hit is None:
                any_form = [v for (b, f), v in wiki.items() if b == base]
                if any_form:
                    hit = any_form[0]
        else:
            # 有形态后缀: 精确形态版, 退化到基础版, 再退化到"本来的样子"
            hit = wiki.get((base, form)) or wiki.get((base, None)) or wiki.get((base, "本来的样子"))
            if hit is None and form in PLAIN_FORMS:
                any_form = [v for (b, f), v in wiki.items() if b == base]
                if any_form:
                    hit = any_form[0]
        if hit is None:
            missing.append(title)
            continue
        entries.append({
            "seq": t["seq"],
            "page_title": title,
            "pet_id": t["pet_id"],
            "form": form,
            "wiki_form": hit["form"],
            "url": hit["url"],
        })

    (OUT_DIR / "avatar_map.json").write_text(
        json.dumps(entries, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"  匹配 {len(entries)} / {len(titles)} 个变体")

    report = {
        "total": len(titles),
        "covered": len(entries),
        "missing_total": len(missing),
        "missing": missing,
    }
    (OUT_DIR / "avatar_gap.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"[4/5] 缺口报告: 覆盖 {len(entries)}/{len(titles)}, 缺 {len(missing)} -> avatar_gap.json")
    if missing:
        print("  缺失示例:", "、".join(missing[:8]), "..." if len(missing) > 8 else "")

    if report_only:
        return

    print("[5/5] 下载头像图片 ...")
    ok = fail = skip = 0
    for e in entries:
        stem = f"{e['seq']:03d}_{e['page_title']}"
        target = IMG_DIR / (stem + ".png")
        if target.exists():
            skip += 1
            continue
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                r = requests.get(e["url"], headers=HEADERS, timeout=30)
                r.raise_for_status()
                target.write_bytes(r.content)
                ok += 1
                break
            except Exception as ex:
                if attempt == MAX_RETRIES:
                    fail += 1
                    print(f"  [FAIL] {stem}: {ex}")
                else:
                    time.sleep(RETRY_SLEEP)
        time.sleep(0.15)
    print(f"  下载完成: 成功 {ok}, 跳过 {skip}, 失败 {fail}")
