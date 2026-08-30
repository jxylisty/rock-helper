# -*- coding: utf-8 -*-
"""
洛克王国：世界 官方 API 数据更新脚本（唯一数据入口）

数据流:
  wegame.shallow.ink 官方 API
      │  fetch   (增量缓存到 output/cache/)
      ▼
  build   → output/generated/ (pet_detail.js / pet_index.js / pet_skills.js /
            pet_race_speed.js / leader_forms.js + diff_report.md)
      │  apply   (人工审核 diff_report.md 后覆盖 data/)
      ▼
  data/pet/

用法:
  python crawler_official_api/update_data.py fetch    # 抓取/增量更新原始数据
  python crawler_official_api/update_data.py build    # 从缓存生成前端数据与差异报告
  python crawler_official_api/update_data.py apply    # 将生成物覆盖到 data/（先看 diff_report.md）
  python crawler_official_api/update_data.py all      # fetch + build
  python crawler_official_api/update_data.py fetch-egg        # 抓取孵蛋配置（/pets/{pid}/egg）
  python crawler_official_api/update_data.py egg              # fetch-egg + 生成并应用 eggData.js
  python crawler_official_api/update_data.py fetch-skill-icons  # 下载缺失技能图标转 webp
  python crawler_official_api/update_data.py fetch-pet-images   # 下载缺失精灵立绘转 webp
  python crawler_official_api/update_data.py fetch-pet-images 150 152  # 指定序号强制覆盖立绘
  python crawler_official_api/update_data.py fetch-pet-images --all    # 全量覆盖立绘（图片错乱时一键修复）

API Key 读取顺序: 环境变量 ROCO_API_KEY > crawler_official_api/api_key.local
"""

import json
import os
import re
import shutil
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

# ==================== 配置 ====================
BASE_URL = "https://wegame.shallow.ink/api/v1/games/rocom/wiki"
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CACHE_DIR = SCRIPT_DIR / "output" / "cache"
GENERATED_DIR = SCRIPT_DIR / "output" / "generated"
DATA_PET_DIR = PROJECT_ROOT / "data" / "pet"
DATA_SKILL_DIR = PROJECT_ROOT / "data" / "skill"
DATA_CONFIG_DIR = PROJECT_ROOT / "data" / "config"
STATIC_PETS_DIR = PROJECT_ROOT / "cdn-assets" / "static-web" / "pets"
STATIC_TRAITS_DIR = PROJECT_ROOT / "cdn-assets" / "static-web" / "traits"
STATIC_SKILLS_DIR = PROJECT_ROOT / "cdn-assets" / "static-web" / "skills"

MAX_WORKERS = 4
REQUEST_INTERVAL = 0.12  # 每个工作线程请求间隔（秒）

# 视为"本体"的形态后缀（生成 page_title 时去掉）
PLAIN_FORMS = {"本来的样子"}
# 不进入图鉴变体的特殊形态
EXCLUDED_FORMS = {"领地试炼用"}

# eggData.js 沿用的属性英文键（中文 → 英文）
EGG_TYPE_EN = {
    "火": "fire", "水": "water", "草": "grass", "电": "electric", "冰": "ice",
    "虫": "insect", "翼": "wing", "地": "ground", "萌": "cute", "武": "martial",
    "毒": "poison", "龙": "dragon", "幽": "ghost", "恶": "evil", "光": "light",
    "普通": "normal", "机械": "mechanic", "幻": "illusion",
}

# 现行 pet_detail.js 中的静态导出（与抓取数据无关，原样保留；幻为官方新增属性）
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
    {"key": "普通", "label": "普通", "color": "#A8A878"},
    {"key": "机械", "label": "机械", "color": "#A0A0A0"},
    {"key": "幻", "label": "幻", "color": "#B8A0F0"},
]
RARITY_COLORS = {
    "普通": "#A8A878",
    "稀有": "#A8A8A8",
    "史诗": "#A040F0",
    "传说": "#F8C030",
}


def load_api_key():
    key = os.environ.get("ROCO_API_KEY", "").strip()
    if key:
        return key
    local = SCRIPT_DIR / "api_key.local"
    if local.exists():
        return local.read_text(encoding="utf-8").strip()
    print("❌ 未找到 API Key：请设置环境变量 ROCO_API_KEY，")
    print("   或创建 crawler_official_api/api_key.local（内容为 Key，已 gitignore）")
    sys.exit(1)


class ApiClient:
    """带缓存、限速、重试的官方 API 客户端"""

    def __init__(self):
        self.key = load_api_key()
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-Key": self.key,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        })
        self._last_request = {}  # thread-id -> timestamp
        self._lock = threading.Lock()

    def _throttle(self):
        tid = threading.get_ident()
        now = time.time()
        with self._lock:
            last = self._last_request.get(tid, 0)
            wait = REQUEST_INTERVAL - (now - last)
            if wait > 0:
                time.sleep(wait)
            self._last_request[tid] = time.time()

    def get_json(self, path, params=None, max_retries=3):
        url = f"{BASE_URL}{path}"
        for attempt in range(1, max_retries + 1):
            self._throttle()
            try:
                resp = self.session.get(url, params=params, timeout=15)
                if resp.status_code in (429, 567):
                    wait = 15 * attempt
                    print(f"    ⏳ 限流({resp.status_code})，等待 {wait}s 后重试: {path}")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                return resp.json().get("data")
            except Exception as e:
                if attempt < max_retries:
                    time.sleep(2 * attempt)
                else:
                    print(f"    ❌ 请求失败 {path}: {e}")
                    return None
        return None

    def cached_get(self, cache_path, path, params=None):
        """缓存优先读取；缓存不存在则请求并写入"""
        if cache_path.exists():
            try:
                return json.loads(cache_path.read_text(encoding="utf-8"))
            except Exception:
                pass
        data = self.get_json(path, params=params)
        if data is not None:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        return data


# ==================== 工具函数 ====================
def sanitize(text):
    """去掉零宽字符与首尾空白"""
    return re.sub(r"[\u200b\ufeff\u200e\u200f]", "", str(text or "")).strip()


def page_title_of(pet):
    name = sanitize(pet.get("name"))
    form = sanitize(pet.get("form"))
    if form and form not in PLAIN_FORMS and form not in EXCLUDED_FORMS:
        return f"{name}（{form}）"
    return name


def write_js(path, exports):
    """exports: [(导出名, 数据对象)]"""
    parts = []
    for name, obj in exports:
        parts.append(f"export const {name} = {json.dumps(obj, ensure_ascii=False, indent=2)};")
    path.write_text("\n\n".join(parts) + "\n", encoding="utf-8")


def load_cache_json(path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


# ==================== fetch ====================
def fetch_all():
    print("=" * 60)
    print("📥 第一步：抓取官方 API 数据（增量，缓存于 output/cache/）")
    print("=" * 60)
    client = ApiClient()

    # 1. 精灵列表（分页接口，缓存的是合并后的数组）
    list_cache = CACHE_DIR / "list.json"
    if list_cache.exists():
        pets = json.loads(list_cache.read_text(encoding="utf-8"))
        if not isinstance(pets, list):
            pets = None
    else:
        pets = None
    if pets is None:
        pets = []
        page_no, page_size = 1, 100
        while True:
            print(f"  [列表] 第 {page_no} 页...")
            data = client.get_json("/pets", {"page_no": page_no, "page_size": page_size})
            if not data:
                break
            pets.extend(data.get("items", []))
            if not data.get("has_more"):
                break
            page_no += 1
        if pets:
            list_cache.parent.mkdir(parents=True, exist_ok=True)
            list_cache.write_text(json.dumps(pets, ensure_ascii=False), encoding="utf-8")
    print(f"  ✅ 精灵列表: {len(pets)} 只")

    handbooks = {}
    for p in pets:
        hb = sanitize(p.get("handbook_no"))
        handbooks.setdefault(hb, []).append(p)
    print(f"  ✅ 图鉴分组: {len(handbooks)} 组")

    tasks = []
    # 每只精灵: overview(特性/异色) + profile(种族值) + skills(技能)
    for p in pets:
        pid = p["pet_id"]
        tasks.append((CACHE_DIR / "overview" / f"{pid}.json", f"/pets/{pid}"))
        tasks.append((CACHE_DIR / "profile" / f"{pid}.json", f"/pets/{pid}/profile"))
        tasks.append((CACHE_DIR / "skills" / f"{pid}.json", f"/pets/{pid}/skills"))
    # 每个图鉴号: handbook(规范名/变体顺序) + family(进化链)
    for hb, group in handbooks.items():
        base_pid = min(g["pet_id"] for g in group)
        tasks.append((CACHE_DIR / "handbook" / f"{hb}.json", f"/pets/{base_pid}/handbook"))
        tasks.append((CACHE_DIR / "family" / f"{hb}.json", f"/pets/{base_pid}/family"))

    todo = [(c, u) for c, u in tasks if not c.exists()]
    print(f"  待抓取: {len(todo)} / {len(tasks)} 个请求（已有缓存跳过）")

    done, failed = 0, 0

    def run(task):
        cache_path, path = task
        return client.cached_get(cache_path, path) is not None

    if todo:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = {pool.submit(run, t): t for t in todo}
            for fut in as_completed(futures):
                done += 1
                if not fut.result():
                    failed += 1
                if done % 100 == 0 or done == len(todo):
                    print(f"  进度 {done}/{len(todo)}（失败 {failed}）")

    if failed:
        print(f"  ⚠️ {failed} 个请求失败（重跑本脚本可补抓）")
    print("✅ 抓取完成\n")
    return pets, handbooks


# ==================== fetch-egg ====================
def fetch_egg():
    """抓取每个图鉴初始形态的孵蛋配置 → output/cache/egg/{hb}.json

    官方端点 /pets/{pid}/egg 仅普通初始形态有配置（首领形态等 404），
    404 也写入缓存标记，避免重复请求。
    """
    list_cache = CACHE_DIR / "list.json"
    if not list_cache.exists():
        print("❌ 无精灵列表缓存，请先运行 fetch")
        sys.exit(1)
    pets = json.loads(list_cache.read_text(encoding="utf-8"))
    handbooks = {}
    for p in pets:
        handbooks.setdefault(sanitize(p.get("handbook_no")), []).append(p)

    client = ApiClient()
    egg_dir = CACHE_DIR / "egg"
    egg_dir.mkdir(parents=True, exist_ok=True)

    todo = []
    for hb in handbooks:
        if (egg_dir / f"{hb}.json").exists():
            continue
        hb_cache = load_cache_json(CACHE_DIR / "handbook" / f"{hb}.json") or {}
        order_ids = [p["pet_id"] for p in hb_cache.get("pets") or []]
        group_ids = sorted(g["pet_id"] for g in handbooks[hb])
        if not order_ids:
            order_ids = group_ids
        # 候选：官方规范顺序第一形态 + 组内最小 id + 组内 3xxx 普通形态最小 id（去重）
        normal_ids = [i for i in group_ids if i < 4000000]
        candidates = [order_ids[0]] + group_ids[:1] + normal_ids[:1]
        seen, uniq = set(), []
        for pid in candidates:
            if pid not in seen:
                seen.add(pid)
                uniq.append(pid)
        todo.append((hb, uniq))

    print(f"  待抓取: {len(todo)} 个图鉴的孵蛋配置（已有缓存跳过）")
    if not todo:
        print("✅ 孵蛋缓存已是最新\n")
        return

    found, missing = 0, 0
    ordered = sorted(todo, key=lambda x: int(x[0]))
    for idx, (hb, candidates) in enumerate(ordered, 1):
        data = None
        for pid in candidates:
            client._throttle()
            try:
                resp = client.session.get(f"{BASE_URL}/pets/{pid}/egg", timeout=15)
            except Exception:
                continue
            if resp.status_code == 200:
                payload = resp.json().get("data")
                if payload and payload.get("egg_size"):
                    data = payload
                    break
            elif resp.status_code in (429, 567):
                print(f"    ⏳ 限流({resp.status_code})，等待 15s: 图鉴 {hb}")
                time.sleep(15)
        if data:
            (egg_dir / f"{hb}.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            found += 1
        else:
            (egg_dir / f"{hb}.json").write_text('{"not_found": true}', encoding="utf-8")
            missing += 1
        if idx % 50 == 0 or idx == len(ordered):
            print(f"  进度 {idx}/{len(ordered)}（有蛋 {found} / 无蛋 {missing}）")
    print(f"  ✅ 有孵蛋配置: {found} 只，无配置: {missing} 只\n")


# ==================== build-egg ====================
# eggData.js 的预测/配色函数（生成数据时原样保留）
EGG_FUNCS_TEMPLATE = '''
export function predictEgg(height, weight) {
	const predictions = []

	eggData.forEach(egg => {
		let score = 0
		let heightMatch = false
		let weightMatch = false

		if (height >= egg.minHeight && height <= egg.maxHeight) {
			heightMatch = true
			const centerH = (egg.minHeight + egg.maxHeight) / 2
			const rangeH = egg.maxHeight - egg.minHeight || 0.01
			const diffH = Math.abs(height - centerH) / rangeH
			score += (1 - Math.min(diffH, 1)) * 50
		}

		if (weight >= egg.minWeight && weight <= egg.maxWeight) {
			weightMatch = true
			const centerW = (egg.minWeight + egg.maxWeight) / 2
			const rangeW = egg.maxWeight - egg.minWeight || 0.01
			const diffW = Math.abs(weight - centerW) / rangeW
			score += (1 - Math.min(diffW, 1)) * 50
		}

		if (heightMatch || weightMatch) {
			predictions.push({
				...egg,
				score: Math.round(score),
				heightMatch,
				weightMatch,
				matchType: heightMatch && weightMatch ? 'full' : (heightMatch ? 'height' : 'weight')
			})
		}
	})

	return predictions.sort((a, b) => b.score - a.score).slice(0, 10)
}

export function getEggColor(types) {
	const typeColors = {
		fire: '#FF6B35',
		water: '#4A90D9',
		grass: '#7CB342',
		ice: '#81D4FA',
		dragon: '#7C4DFF',
		light: '#FFD54F',
		ghost: '#7E57C2',
		poison: '#9C27B0',
		insect: '#8BC34A',
		wing: '#64B5F6',
		evil: '#424242',
		electric: '#FFEB3B',
		illusion: '#E91E63',
		normal: '#9E9E9E',
		ground: '#8D6E63',
		martial: '#FF5722',
		cute: '#F48FB1',
		mechanic: '#607D8B'
	}

	if (types.length === 1) {
		return typeColors[types[0]] || '#666'
	}

	return `linear-gradient(135deg, ${typeColors[types[0]] || '#666'} 50%, ${typeColors[types[1]] || '#666'} 50%)`
}
'''


def build_egg_data(handbooks):
    """从 cache/egg/*.json 生成 eggData 数组（官方蛋体型，替代旧搜集数据）"""
    egg_dir = CACHE_DIR / "egg"
    if not egg_dir.exists():
        return None
    pets = json.loads((CACHE_DIR / "list.json").read_text(encoding="utf-8"))
    type_names_by_pid = {
        p["pet_id"]: [sanitize(t) for t in (p.get("type_names") or [])] for p in pets
    }

    items = []
    for hb in sorted(handbooks, key=lambda x: int(x)):
        data = load_cache_json(egg_dir / f"{hb}.json")
        if not data or data.get("not_found"):
            continue
        size = data.get("egg_size") or {}
        h, w = size.get("height") or {}, size.get("weight") or {}
        if h.get("min_m") is None or w.get("min_kg") is None:
            continue
        pet = data.get("pet") or {}
        types = type_names_by_pid.get(pet.get("pet_id")) or []
        if not types:
            types = next((g.get("type_names") for g in handbooks[hb] if g.get("type_names")), []) or []
        probs = data.get("probabilities") or {}
        default_shiny = ((probs.get("none") or {}).get("glass") or {}).get("base_percent")
        miracle_shiny = ((probs.get("miracle_exchange") or {}).get("glass") or {}).get("base_percent")
        gender = pet.get("gender_ratio") or {}
        items.append({
            "petId": int(hb),
            "name": sanitize(pet.get("name")) or sanitize(handbooks[hb][0].get("name")),
            "minHeight": h.get("min_m"),
            "maxHeight": h.get("max_m"),
            "minWeight": w.get("min_kg"),
            "maxWeight": w.get("max_kg"),
            "type": [EGG_TYPE_EN.get(t, t) for t in types if t],
            "hatchLabel": sanitize(data.get("hatch_label")),
            "eggType": sanitize((data.get("egg_type") or {}).get("name")),
            "eggGroups": [sanitize(g.get("name")) for g in (pet.get("egg_groups") or []) if g.get("name")],
            "malePercent": gender.get("male_percent"),
            "shinyPercent": default_shiny,
            "shinyMiraclePercent": miracle_shiny,
        })
    return items


def write_egg_data_js(items):
    """生成 eggData.js（数组 + 预测函数）到 GENERATED_DIR，返回路径"""
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    path = GENERATED_DIR / "eggData.js"
    body = (f"// 由 crawler_official_api/update_data.py 生成（数据源: 官方 /pets/{{pid}}/egg）\n"
            f"export const eggData = {json.dumps(items, ensure_ascii=False, indent=2)}\n"
            f"{EGG_FUNCS_TEMPLATE}")
    path.write_text(body, encoding="utf-8")
    return path


def run_egg():
    """子命令入口: egg = fetch-egg + 生成 + 直接应用 eggData.js（不碰其他数据文件）"""
    fetch_egg()
    list_cache = CACHE_DIR / "list.json"
    pets = json.loads(list_cache.read_text(encoding="utf-8"))
    handbooks = {}
    for p in pets:
        handbooks.setdefault(sanitize(p.get("handbook_no")), []).append(p)
    items = build_egg_data(handbooks)
    if not items:
        print("❌ 未生成任何孵蛋数据")
        sys.exit(1)
    path = write_egg_data_js(items)
    DATA_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    dst = DATA_CONFIG_DIR / "eggData.js"
    if dst.exists():
        dst.replace(DATA_CONFIG_DIR / "eggData.js.bak")
    shutil.copy2(path, dst)
    print(f"  ✅ eggData.js 已更新: {len(items)} 条（旧文件备份为 eggData.js.bak）")


# ==================== build ====================
def build_local_image_index():
    """seq(3位) -> 该前缀下的本地立绘文件名列表（不含异色）"""
    index = {}
    if not STATIC_PETS_DIR.exists():
        return index
    for fname in os.listdir(STATIC_PETS_DIR):
        if not fname.endswith(".webp") or fname.endswith("_异色.webp"):
            continue
        if "_" not in fname:
            continue
        seq3 = fname.split("_", 1)[0]
        index.setdefault(seq3, []).append(fname)
    return index


def match_local_image(img_index, seq3, page_title, name):
    """按 精确标题 → 名字 → 唯一候选 匹配本地立绘"""
    if seq3 not in img_index:
        return None
    files = img_index[seq3]
    exact = f"{seq3}_{page_title}.webp"
    if exact in files:
        return f"/cdn-assets/static-web/pets/{exact}"
    by_name = f"{seq3}_{name}.webp"
    if by_name in files:
        return f"/cdn-assets/static-web/pets/{by_name}"
    if len(files) == 1:
        return f"/cdn-assets/static-web/pets/{files[0]}"
    return None


def match_local_yise(seq3, page_title, name):
    for candidate in (f"{seq3}_{page_title}_异色.webp", f"{seq3}_{name}_异色.webp"):
        if (STATIC_PETS_DIR / candidate).exists():
            return f"/cdn-assets/static-web/pets/{candidate}"
    return None


def race_from_profile(profile):
    """官方 /profile 的 attributes → 前端 race 键名（AGENTS.md 标准）"""
    attrs = (profile or {}).get("attributes") or {}
    key_map = {
        "hp": "hp",
        "attack": "physical_attack",
        "mattack": "magic_attack",
        "defense": "physical_defense",
        "mdefense": "magic_defense",
        "speed": "speed",
    }
    race = {key: int(attrs.get(source, 0) or 0) for key, source in key_map.items()}
    race["total"] = int(attrs.get("sum", 0) or 0)
    return race


def trait_from_overview(overview):
    feature = (overview or {}).get("feature") or {}
    name = sanitize(feature.get("name"))
    desc = sanitize(feature.get("desc"))
    if name and desc:
        return f"{name} {desc}"
    return name or desc or ""


def skills_from_cache(skills_cache):
    """官方 skills 端点 → 现行 pet_skills 格式"""
    result = []
    if not skills_cache:
        return result
    for key, skill_type in (("level", "精灵技能"), ("blood", "血脉技能"), ("machine", "可学技能石")):
        for s in skills_cache.get(key) or []:
            name = sanitize(s.get("name"))
            if not name:
                continue
            level = s.get("level")
            result.append({
                "name": name,
                "level": str(level) if level is not None else "",
                "skill_type": skill_type,
            })
    seen, unique = set(), []
    for s in result:
        k = (s["name"], s["skill_type"])
        if k in seen:
            continue
        seen.add(k)
        unique.append(s)
    return unique


def ui_tag_from_family(family, pet_to_handbook, handbook_no):
    """按进化链中图鉴号的位置推导 uiTag"""
    if not family:
        return "其他"
    members = sorted(family.get("members") or [], key=lambda m: m.get("display_order") or 0)
    chain = []
    for m in members:
        hb = pet_to_handbook.get(m.get("pet_id"))
        if hb and hb not in chain:
            chain.append(hb)
    if handbook_no not in chain:
        return "其他"
    pos = chain.index(handbook_no)
    if pos == len(chain) - 1:
        return "最终形态"
    return {0: "I阶", 1: "II阶"}.get(pos, "其他")


def parse_current_data():
    """读取现行 data/pet 文件，供差异对比"""
    current = {"detail": {}, "index": {}, "known_skills": set()}
    detail_path = DATA_PET_DIR / "pet_detail.js"
    if detail_path.exists():
        src = detail_path.read_text(encoding="utf-8")
        m = re.search(r"export const petDetail = ", src)
        if m:
            start = src.find("{", m.end())
            depth, end = 0, start
            for idx in range(start, len(src)):
                if src[idx] == "{":
                    depth += 1
                elif src[idx] == "}":
                    depth -= 1
                    if depth == 0:
                        end = idx + 1
                        break
            try:
                current["detail"] = json.loads(src[start:end])
            except Exception:
                pass
    index_path = DATA_PET_DIR / "pet_index.js"
    if index_path.exists():
        src = index_path.read_text(encoding="utf-8")
        for mm in re.finditer(
                r'"(\d{3})_([^"]+)":\s*\{[^}]*?"seq":\s*(\d+),\s*"name":\s*"([^"]+)"[^}]*?"uiTag":\s*"([^"]+)"',
                src):
            current["index"][int(mm.group(3))] = {
                "name": mm.group(4), "uiTag": mm.group(5)}
    skill_lib = PROJECT_ROOT / "data" / "skill" / "skills.js"
    if skill_lib.exists():
        current["known_skills"] = set(
            re.findall(r'"([^"]+)":\s*\{', skill_lib.read_text(encoding="utf-8")))
    return current


# ==================== 技能库生成 ====================
def parse_js_object(path, export_name):
    """从 data/*.js 中解析 `export const xxx = {...}` 的对象体"""
    if not path.exists():
        return {}
    src = path.read_text(encoding="utf-8")
    marker = f"export const {export_name} = "
    i = src.find(marker)
    if i < 0:
        return {}
    start = src.find("{", i)
    depth, end = 0, start
    for idx in range(start, len(src)):
        if src[idx] == "{":
            depth += 1
        elif src[idx] == "}":
            depth -= 1
            if depth == 0:
                end = idx + 1
                break
    try:
        return json.loads(src[start:end])
    except Exception:
        return {}


def aggregate_official_skills():
    """从 cache/skills/*.json 聚合官方技能（按名称去重，取首次出现）"""
    official = {}
    skills_dir = CACHE_DIR / "skills"
    if not skills_dir.exists():
        return official
    for f in sorted(skills_dir.glob("*.json")):
        data = load_cache_json(f)
        if not data:
            continue
        for bucket in ("level", "blood", "machine"):
            for s in data.get(bucket) or []:
                name = sanitize(s.get("name"))
                if name and name not in official:
                    official[name] = s
    return official


def official_skill_to_entry(raw):
    """官方技能条目 → 现行 skills.js 条目格式（power/consume 用纯数字串）"""
    skill_type = ((raw.get("skill_type") or {}).get("name")) or "状态"
    element = ((raw.get("element_type") or {}).get("name")) or ""
    attr = f"{sanitize(element)}系" if element else ""
    power = sanitize(raw.get("power"))
    cost = sanitize(raw.get("cost"))
    return {
        "name": sanitize(raw.get("name")),
        "type": sanitize(skill_type),
        "attr": attr,
        "consume": cost or "0",
        "power": power or "0",
        "describe": sanitize(raw.get("desc")),
    }


def build_skill_library(official_skills):
    """
    生成 data/skill/skills.js：
    - 官方技能为准（547 个，含 61 个新技能）
    - 官方缺失的旧 B站Wiki 技能（如已改名/下架）原样保留，避免破坏旧引用
    """
    current = parse_js_object(DATA_SKILL_DIR / "skills.js", "skillsData")
    merged = {}
    for name, raw in official_skills.items():
        merged[name] = official_skill_to_entry(raw)
    kept_old = 0
    for name, entry in current.items():
        if name and name not in merged:
            merged[name] = entry
            kept_old += 1

    # 保持名称排序稳定，方便 diff 审阅
    ordered = {name: merged[name] for name in sorted(merged, key=lambda x: (len(x), x))}
    return ordered, kept_old


def build_skill_icon_map(skill_library, official_skills):
    """
    生成 data/skill/skill_icons.js：
    - 本地已有 webp → 本地路径
    - 官方有 icon URL 且本地缺失 → 远程 URL（fetch-skill-icons 下载后自动变本地路径）
    - 其余保留旧映射
    """
    current = parse_js_object(DATA_SKILL_DIR / "skill_icons.js", "skillIcons")
    icon_map = {}
    local_count = remote_count = 0
    for name in skill_library:
        # 优先官方 API 完整 URL(运行期下载后缓存本地);本地 webp 仅兜底
        icon_url = sanitize(official_skills.get(name, {}).get("icon"))
        if icon_url:
            icon_map[name] = icon_url
            remote_count += 1
        elif (STATIC_SKILLS_DIR / f"{name}.webp").exists():
            icon_map[name] = f"/cdn-assets/static-web/skills/{name}.webp"
            local_count += 1
        elif current.get(name):
            icon_map[name] = current[name]
    return icon_map, local_count, remote_count


def fetch_skill_icons(client, skill_library, official_skills):
    """下载缺失的技能图标并转为 webp（仅补缺，不覆盖已有文件）"""
    print("=" * 60)
    print("🖼 下载缺失技能图标 → cdn-assets/static-web/skills/（webp）")
    print("=" * 60)
    try:
        from PIL import Image
    except ImportError:
        print("❌ 缺少 Pillow，请先: pip install Pillow")
        sys.exit(1)

    STATIC_SKILLS_DIR.mkdir(parents=True, exist_ok=True)
    targets = [(name, sanitize(official_skills.get(name, {}).get("icon")))
               for name in skill_library]
    targets = [(name, url) for name, url in targets
               if url and not (STATIC_SKILLS_DIR / f"{name}.webp").exists()]
    print(f"  待下载: {len(targets)} 张（本地已有跳过）")

    done, failed = 0, 0
    for name, url in targets:
        try:
            response = client.session.get(url, timeout=15)
            response.raise_for_status()
            import io
            image = Image.open(io.BytesIO(response.content)).convert("RGBA")
            image.save(STATIC_SKILLS_DIR / f"{name}.webp", "WEBP", quality=90)
            done += 1
        except Exception as e:
            failed += 1
            print(f"  ❌ {name}: {e}")
        time.sleep(0.15)
        if (done + failed) % 20 == 0:
            print(f"  进度 {done + failed}/{len(targets)}")
    print(f"  ✅ 下载 {done} 张，失败 {failed} 张（重跑可补）\n")


def fetch_pet_images(force_all=False, seq_filter=None):
    """按官方 API 更新精灵立绘 → cdn-assets/static-web/pets/（webp，覆盖式）
    模式：seq_filter 指定序号强制更新 > force_all 全量覆盖 > 默认仅补本地缺失
    本地文件名保持 {seq3}_{page_title}.webp 不变（与 pet_detail.js 引用一致）"""
    print("=" * 60)
    print("🖼 更新精灵立绘 → cdn-assets/static-web/pets/（webp）")
    print("=" * 60)
    try:
        from PIL import Image
    except ImportError:
        print("❌ 缺少 Pillow，请先: pip install Pillow")
        sys.exit(1)

    profile_dir = CACHE_DIR / "profile"
    if not profile_dir.exists():
        print("❌ 无 profile 缓存，请先运行 fetch")
        sys.exit(1)

    # 1) profile 缓存 → seq3 -> {page_title: icon_url}
    #    同时建 NFKC 归一化索引（兜底匹配 权杖-Ⅴ/权杖-V 这类全半角罗马数字差异）
    import unicodedata
    def norm_title(t):
        return unicodedata.normalize("NFKC", t)

    by_seq = {}
    by_seq_norm = {}
    for f in sorted(profile_dir.glob("*.json")):
        d = load_cache_json(f)
        if not d or not d.get("handbook_no") or not d.get("icon"):
            continue
        seq3 = str(sanitize(d["handbook_no"])).zfill(3)
        title = page_title_of(d)
        by_seq.setdefault(seq3, {})[title] = sanitize(d["icon"])
        by_seq_norm.setdefault(seq3, {})[norm_title(title)] = sanitize(d["icon"])
    print(f"  API 立绘映射: {len(by_seq)} 个序号")

    def lookup_icon(seq3, title):
        url = by_seq.get(seq3, {}).get(title)
        if url:
            return url
        return by_seq_norm.get(seq3, {}).get(norm_title(title))

    # 2) 组装更新清单（跳过异色图，官方 icon 接口未提供异色资源）
    STATIC_PETS_DIR.mkdir(parents=True, exist_ok=True)
    local_files = [f for f in os.listdir(STATIC_PETS_DIR)
                   if f.endswith(".webp") and not f.endswith("_异色.webp")]
    targets, skipped = [], []

    if seq_filter:
        mode = f"指定 {len(seq_filter)} 个序号强制覆盖"
        for fname in local_files:
            seq3, _, title = fname[:-5].partition("_")
            if seq3 not in seq_filter:
                continue
            url = lookup_icon(seq3, title)
            if url:
                targets.append((fname, url))
            else:
                skipped.append(fname)
    elif force_all:
        mode = "全量强制覆盖"
        for fname in local_files:
            seq3, _, title = fname[:-5].partition("_")
            url = lookup_icon(seq3, title)
            if url:
                targets.append((fname, url))
            else:
                skipped.append(fname)
    else:
        mode = "仅补本地缺失"
        existing = set(local_files)
        for seq3, titles in by_seq.items():
            for title, url in titles.items():
                fname = f"{seq3}_{title}.webp"
                if fname not in existing:
                    targets.append((fname, url))
    print(f"  模式: {mode}，待处理: {len(targets)} 张"
          + (f"，无 API 匹配跳过: {len(skipped)} 张" if skipped else ""))

    # 3) 下载并转换（RGBA webp q90，与 fetch-skill-icons 一致）
    import io
    client = ApiClient()
    done, failed = 0, 0
    for fname, url in targets:
        try:
            response = client.session.get(url, timeout=15)
            response.raise_for_status()
            image = Image.open(io.BytesIO(response.content)).convert("RGBA")
            image.save(STATIC_PETS_DIR / fname, "WEBP", quality=90)
            done += 1
        except Exception as e:
            failed += 1
            print(f"  ❌ {fname}: {e}")
        time.sleep(0.15)
        if (done + failed) % 20 == 0:
            print(f"  进度 {done + failed}/{len(targets)}")
    print(f"  ✅ 更新 {done} 张，失败 {failed} 张")
    if skipped:
        preview = ", ".join(sorted(skipped)[:10])
        print(f"  ⚠️ 未匹配 API 条目（保持原样）: {preview}" + ("..." if len(skipped) > 10 else ""))
    print()


def run_fetch_pet_images():
    """子命令入口: fetch-pet-images [seq...] [--all]
    例: fetch-pet-images            # 补本地缺失
        fetch-pet-images 150 152    # 指定序号强制覆盖
        fetch-pet-images --all      # 全量覆盖（图片错乱时一键修复）"""
    argv = sys.argv[2:]
    force_all = "--all" in argv
    seq_filter = {str(int(a)).zfill(3) for a in argv if a.isdigit()}
    fetch_pet_images(force_all=force_all, seq_filter=seq_filter or None)


def build_all(pets, handbooks):
    print("=" * 60)
    print("🔧 第二步：生成前端数据文件（输出到 output/generated/）")
    print("=" * 60)
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    img_index = build_local_image_index()
    pet_to_handbook = {}
    for hb, group in handbooks.items():
        for p in group:
            pet_to_handbook[p["pet_id"]] = hb

    pet_index = {}
    pet_detail = {}
    pet_skills = {}
    pet_race_speed = {}
    leader_handbooks = []
    problems = []

    for hb in sorted(handbooks, key=lambda x: int(x)):
        group = handbooks[hb]
        seq = int(hb)
        seq3 = f"{seq:03d}"

        # 官方图鉴规范名与变体顺序
        hb_cache = load_cache_json(CACHE_DIR / "handbook" / f"{hb}.json") or {}
        canonical_name = sanitize(hb_cache.get("name"))
        order_ids = [p["pet_id"] for p in hb_cache.get("pets") or []]
        if not canonical_name:
            canonical_name = sanitize(min(group, key=lambda g: g["pet_id"]).get("name"))
        if not order_ids:
            order_ids = sorted(g["pet_id"] for g in group)

        by_pid = {p["pet_id"]: p for p in group}
        ordered_pets = [by_pid[i] for i in order_ids if i in by_pid]
        ordered_pets += [p for p in sorted(group, key=lambda g: g["pet_id"])
                         if p["pet_id"] not in order_ids]

        if any(sanitize(p.get("form")) == "首领形态" for p in group):
            leader_handbooks.append(seq)

        # 组装变体
        variants, seen_titles = [], set()
        for p in ordered_pets:
            form = sanitize(p.get("form"))
            if form in EXCLUDED_FORMS:
                continue
            pid = p["pet_id"]
            title = page_title_of(p)
            if title in seen_titles:
                continue
            seen_titles.add(title)

            profile = load_cache_json(CACHE_DIR / "profile" / f"{pid}.json")
            overview = load_cache_json(CACHE_DIR / "overview" / f"{pid}.json")
            race = race_from_profile(profile)

            name = sanitize(p.get("name"))
            # 优先官方 API 完整 URL(运行期下载后缓存本地);本地 webp 仅兜底
            img = sanitize((profile or {}).get("icon") or (overview or {}).get("icon"))
            if not img:
                img = match_local_image(img_index, seq3, title, name)

            shiny = (overview or {}).get("shiny") or {}
            yise = sanitize(shiny["icon"]) if shiny.get("available") and shiny.get("icon") else None
            if not yise:
                yise = match_local_yise(seq3, title, name)

            trait_img = (f"/static/static-web/traits/{seq3}.webp"
                         if (STATIC_TRAITS_DIR / f"{seq3}.webp").exists() else None)

            variants.append({
                "page_title": title,
                "type": [sanitize(t) for t in (p.get("type_names") or [])],
                "img": img or "",
                "race": race,
                "trait": trait_from_overview(overview),
                "yiseImg": yise,
                "traitImg": trait_img,
                "_pet_id": pid,
            })

        if not variants:
            problems.append(f"seq {seq} {canonical_name}: 无有效变体")
            continue

        # 官方对 4xxx 首领形态不提供种族值（返回全 0），从同组同名可获取版本继承
        dropped = []
        for variant in variants:
            if variant["race"]["total"]:
                continue
            base_name = re.sub(r"（.*?）$", "", variant["page_title"])
            donor = next((v for v in variants
                          if v["race"]["total"] and v["page_title"] == base_name), None)
            if not donor:
                donor = next((v for v in variants
                              if v["race"]["total"] and v["page_title"].startswith(base_name + "（")), None)
            if donor:
                variant["race"] = dict(donor["race"])
            else:
                # 无同名版本可继承：剔除该变体（禁止编造数据），记录到报告
                dropped.append(variant)
                problems.append(f"seq {seq} {variant['page_title']}: 官方无种族值且无同名版本，已剔除")
        if dropped:
            variants = [v for v in variants if v not in dropped]

        base = variants[0]
        family = load_cache_json(CACHE_DIR / "family" / f"{hb}.json")
        ui_tag = ui_tag_from_family(family, pet_to_handbook, hb)

        pet_index[f"{seq3}_{canonical_name}"] = {
            "wikiId": seq3,
            "seq": seq,
            "name": canonical_name,
            "page_title": canonical_name,
            "uiTag": ui_tag,
        }
        pet_detail[str(seq)] = [
            {k: v for k, v in variant.items() if not k.startswith("_")}
            for variant in variants
        ]
        base_skills_cache = load_cache_json(CACHE_DIR / "skills" / f"{base['_pet_id']}.json")
        pet_skills[str(seq)] = {"skills": skills_from_cache(base_skills_cache)}
        pet_race_speed[str(seq)] = base["race"]["speed"]

    # ==================== 差异报告 ====================
    current = parse_current_data()
    cur_detail, cur_index = current["detail"], current["index"]
    name_by_seq = {e["seq"]: e["name"] for e in pet_index.values()}

    lines = ["# 官方 API 数据差异报告", ""]
    lines.append(f"- 旧图鉴条目: {len(cur_index)}，新图鉴条目: {len(pet_index)}")
    lines.append(f"- 旧变体总数: {sum(len(v) if isinstance(v, list) else 1 for v in cur_detail.values())}，"
                 f"新变体总数: {sum(len(v) for v in pet_detail.values())}")

    new_seqs = sorted(set(name_by_seq) - set(cur_index))
    lines.append(f"\n## 新增图鉴（{len(new_seqs)} 个）\n")
    lines.append("无" if not new_seqs else
                 ", ".join(f"{s}·{name_by_seq[s]}" for s in new_seqs))

    missing_seqs = sorted(set(cur_index) - set(name_by_seq))
    lines.append(f"\n## 官方缺失的旧条目（{len(missing_seqs)} 个）\n")
    lines.append("无" if not missing_seqs else
                 ", ".join(f"{s}·{cur_index[s]['name']}" for s in missing_seqs))

    lines.append("\n## 名称变化（图鉴条目名，旧多为首领形态命名，新用官方图鉴规范名）\n")
    name_changes = [
        (s, cur_index[s]["name"], name_by_seq[s])
        for s in sorted(set(cur_index) & set(name_by_seq))
        if cur_index[s]["name"] != name_by_seq[s]
    ]
    lines.append("无" if not name_changes else
                 "\n".join(f"- {s} {old} → {new}" for s, old, new in name_changes))

    lines.append("\n## 种族值变化（主形态六维，旧值 → 新值）\n")
    race_changes = []
    for s in sorted(set(cur_detail) & set(pet_detail)):
        old_v = cur_detail[s]
        old = old_v[0] if isinstance(old_v, list) else old_v
        new = pet_detail[s][0]
        old_race = {k: int(x) for k, x in old["race"].items()}
        if old_race != new["race"]:
            race_changes.append((s, old.get("page_title"), old_race, new["race"]))
    lines.append("无" if not race_changes else
                 "\n".join(f"- {s} {title}: 总{old['total']} {old} → 总{new['total']} {new}"
                           for s, title, old, new in race_changes))

    known = current["known_skills"]

    # ==================== 技能库（官方聚合 + 保留旧独有） ====================
    official_skills = aggregate_official_skills()
    skill_library, kept_old_skills = build_skill_library(official_skills)
    icon_map, local_icons, remote_icons = build_skill_icon_map(skill_library, official_skills)

    new_skills = sorted(set(skill_library) - known)
    lines.append("\n## 技能库（data/skill/skills.js）\n")
    lines.append(f"- 官方技能 {len(official_skills)} 个，新增 {len(new_skills)} 个，"
                 f"保留旧库独有 {kept_old_skills} 个，合并后共 {len(skill_library)} 个")
    if new_skills:
        lines.append(f"- 新增技能: {', '.join(new_skills[:60])}" +
                     ("…" if len(new_skills) > 60 else ""))
    lines.append(f"- 图标: 本地 webp {local_icons} 个，官方远程 URL {remote_icons} 个，"
                 f"缺失 {len(skill_library) - local_icons - remote_icons} 个")
    lines.append("- 运行 `python crawler_official_api/update_data.py fetch-skill-icons` 可把远程图标下载为本地 webp")

    if problems:
        lines.append(f"\n## ⚠️ 数据问题（{len(problems)}）\n")
        lines.extend(f"- {p}" for p in problems[:60])

    (GENERATED_DIR / "diff_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # ==================== 写文件 ====================
    write_js(GENERATED_DIR / "pet_detail.js", [
        ("petTypes", PET_TYPES),
        ("rarityColors", RARITY_COLORS),
        ("typeRestriction", {}),
        ("typeIconMap", {}),
        ("petDetail", pet_detail),
    ])
    write_js(GENERATED_DIR / "pet_index.js", [("petIndex", pet_index)])
    write_js(GENERATED_DIR / "pet_skills.js", [("petSkills", pet_skills)])
    write_js(GENERATED_DIR / "pet_race_speed.js", [("petRaceSpeed", pet_race_speed)])
    write_js(GENERATED_DIR / "skills.js", [("skillsData", skill_library)])
    write_js(GENERATED_DIR / "skill_icons.js", [("skillIcons", icon_map)])
    if (CACHE_DIR / "egg").exists():
        egg_items = build_egg_data(handbooks)
        if egg_items:
            write_egg_data_js(egg_items)
            print(f"  ✅ eggData.js: {len(egg_items)} 条孵蛋配置")
    (GENERATED_DIR / "leader_forms.js").write_text(
        f"export const leaderFormPetIds = {json.dumps(leader_handbooks)}\n\n"
        f"export const leaderFormPetIdSet = new Set(leaderFormPetIds.map((id) => Number(id)))\n\n"
        f"export function hasLeaderFormPetId(id) {{\n"
        f"  return leaderFormPetIdSet.has(Number(id))\n}}\n",
        encoding="utf-8")

    print(f"  ✅ pet_detail.js: {len(pet_detail)} 图鉴 / {sum(len(v) for v in pet_detail.values())} 变体")
    print(f"  ✅ pet_index.js: {len(pet_index)} 条")
    print(f"  ✅ pet_skills.js: {len(pet_skills)} 条")
    print(f"  ✅ pet_race_speed.js: {len(pet_race_speed)} 条")
    print(f"  ✅ leader_forms.js: {len(leader_handbooks)} 个首领图鉴")
    print(f"  ✅ skills.js: {len(skill_library)} 技能（官方 {len(official_skills)} + 旧库独有 {kept_old_skills}）")
    print(f"  ✅ skill_icons.js: {len(icon_map)} 条（本地 {local_icons} / 远程 {remote_icons}）")
    if problems:
        print(f"  ⚠️ {len(problems)} 个数据问题，详见 diff_report.md")
    print(f"  📋 差异报告: {GENERATED_DIR / 'diff_report.md'}（请审核后再 apply）\n")


# ==================== apply ====================
def apply_generated():
    print("=" * 60)
    print("📤 第三步：将生成物覆盖到 data/pet/ 与 data/skill/（请确认已审核 diff_report.md）")
    print("=" * 60)
    if not GENERATED_DIR.exists():
        print("❌ 未找到生成物，请先运行 build")
        sys.exit(1)
    report = GENERATED_DIR / "diff_report.md"
    if report.exists():
        print("  ⚠️ 差异报告摘要:")
        for line in report.read_text(encoding="utf-8").splitlines()[:8]:
            if line.strip():
                print(f"     {line}")
    targets = [
        ("pet_detail.js", DATA_PET_DIR), ("pet_index.js", DATA_PET_DIR),
        ("pet_skills.js", DATA_PET_DIR), ("pet_race_speed.js", DATA_PET_DIR),
        ("leader_forms.js", DATA_PET_DIR),
        ("skills.js", DATA_SKILL_DIR), ("skill_icons.js", DATA_SKILL_DIR),
    ]
    if (GENERATED_DIR / "eggData.js").exists():
        targets.append(("eggData.js", DATA_CONFIG_DIR))
    for fname, target_dir in targets:
        src = GENERATED_DIR / fname
        if not src.exists():
            print(f"  ❌ 缺少 {fname}，请先运行 build")
            sys.exit(1)
        target_dir.mkdir(parents=True, exist_ok=True)
        dst = target_dir / fname
        backup = target_dir / f"{fname}.bak"
        if dst.exists():
            dst.replace(backup)
        shutil.copy2(src, dst)
        print(f"  ✅ {target_dir.name}/{fname}（旧文件备份为 {fname}.bak）")
    print("\n✅ 应用完成。请在 HBuilderX 中核验图鉴/详情/PVP/技能查询页面。")


def run_fetch_skill_icons():
    """下载缺失技能图标（需要已有 skills 缓存；下载后重跑 build 让映射指向本地）"""
    skills_dir = CACHE_DIR / "skills"
    if not skills_dir.exists():
        print("❌ 无技能缓存，请先运行 fetch")
        sys.exit(1)
    official_skills = aggregate_official_skills()
    skill_library, _ = build_skill_library(official_skills)
    client = ApiClient()
    fetch_skill_icons(client, skill_library, official_skills)
    # 下载完成后重新生成映射（远程 URL → 本地路径）
    icon_map, local_count, remote_count = build_skill_icon_map(skill_library, official_skills)
    write_js(GENERATED_DIR / "skill_icons.js", [("skillIcons", icon_map)])
    DATA_SKILL_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(GENERATED_DIR / "skill_icons.js", DATA_SKILL_DIR / "skill_icons.js")
    print(f"  ✅ skill_icons.js 已更新：本地 {local_count} / 远程 {remote_count}")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    if cmd in ("fetch", "all"):
        pets, handbooks = fetch_all()
        if cmd == "all":
            build_all(pets, handbooks)
    elif cmd == "build":
        list_cache = CACHE_DIR / "list.json"
        if not list_cache.exists():
            print("❌ 无缓存数据，请先运行 fetch")
            sys.exit(1)
        pets = json.loads(list_cache.read_text(encoding="utf-8"))
        handbooks = {}
        for p in pets:
            handbooks.setdefault(sanitize(p.get("handbook_no")), []).append(p)
        build_all(pets, handbooks)
    elif cmd == "apply":
        apply_generated()
    elif cmd == "fetch-egg":
        fetch_egg()
    elif cmd == "egg":
        run_egg()
    elif cmd == "fetch-skill-icons":
        run_fetch_skill_icons()
    elif cmd == "fetch-pet-images":
        run_fetch_pet_images()
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
