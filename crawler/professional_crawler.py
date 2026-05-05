# -*- coding: utf-8 -*-
# ============================================================
# 洛克王国世界 - 宠物数据爬虫 (重要！请勿删除)
# ============================================================
# 用途: 从BiliGame Wiki爬取宠物详细数据（种族值、技能、属性等）
# 使用方式:
#   1. 完整爬取: python professional_crawler.py
#   2. 断点续爬: 直接运行上面的命令，会自动跳过已完成的宠物
#   3. 爬取完成后必须运行: python convert_details.py (将JSON转为JS模块供前端使用)
#
# 注意事项:
#   - 此文件依赖 data/pets.js 中的宠物列表作为输入
#   - 爬取结果保存在 pet_details.json (临时)，经convert_details.py转换后生成 data/pets_detail.js
#   - 进度保存在 crawl_progress.json，支持断点续爬
#   - 如需重新爬取，请先删除 pet_details.json 和 crawl_progress.json
# ============================================================

import requests
import random
import time
import json
import re
import os
import sys
import argparse
from bs4 import BeautifulSoup
from urllib.parse import quote, unquote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COOKIE_STR = 'gamecenter_wiki_UserName=456876771; gamecenter_wiki_UserGroups=bilibili; gamecenter_wiki_mwuser-sessionId=b08c807a4362ffeb8f3b; gamecenter_wiki__session=k6b2fe2p4f5heutdq8ae0736s1glcts0; gamecenter_wiki_UserID=459306; DedeUserID=456876771; DedeUserID__ckMd5=f493c69c86642855; b_nut=1743586512; buvid3=D4F796A8-FBE0-4DBF-534D-0B15BCD8E1D212528infoc; buvid4=37928632-71F8-0334-CB98-3C090FB3C17B12356-025040209-jI4Hj3XrV9xRkf8rxxY97w%3D%3D; buvid_fp=f635bd06b2d50e92ab0346c848d9e27a; Hm_lvt_e61bc5e4df128a1dc4db0bb30558ebe4=1747478069,1749705251; SESSDATA=a86fdf4e%2C1790995011%2Ce727c%2A42CjBpPoEfmslz-j-T3ATWds-MP6usq1B1mCt4HI0owCpY9egszCv51tZlUQGwtcOdBZwSVk5yTEV0ZjY5bzhIdVM3WjBhZHV5bTJjZ2E4WU8zaUgydGxxR3U3RkpvS3NRNHVkRTVsRnVfaVJ5bWxIMFZ1T3MtTHNhTFowNG1rcmI4ZDBuY0t4dUdnIIEC; bili_jct=a2e823c3a2d40900db06997bfe31bd27; sid=dte3t3rd; Hm_lvt_cb50e488eca598646f26b3bf09b83ada=1775615700; HMACCOUNT=A87B2B7EB58BBB3A; bsource=search_baidu; b_lsid=AE2F9372_19D6E2CF93B; Hm_lpvt_cb50e488eca598646f26b3bf09b83ada=1775669936'

PROXY_POOL = []

def resolve_root(output_root=''):
    return os.path.abspath(output_root) if output_root else PROJECT_ROOT


def load_pets_from_data(root_dir=None):
    root_dir = root_dir or PROJECT_ROOT
    pets_file = os.path.join(root_dir, 'data', 'pets.js')
    if os.path.exists(pets_file):
        with open(pets_file, 'r', encoding='utf-8') as f:
            content = f.read()

        match = re.search(r'export\s+const\s+pets\s*=\s*(\[.*\]);', content, re.DOTALL)
        if match:
            pets_str = match.group(1)
            pets_str = pets_str.replace("'", '"')
            pets_str = pets_str.replace('None', 'null')
            pets_str = pets_str.replace('True', 'true')
            pets_str = pets_str.replace('False', 'false')
            try:
                return json.loads(pets_str)
            except json.JSONDecodeError as e:
                print(f'JSON解析错误: {e}')
                return []
    return []

class PetCrawler:
    def __init__(self, output_root=''):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        self.root_dir = resolve_root(output_root)
        self.session = requests.Session()
        self.session.trust_env = False
        self.proxies = {'http': None, 'https': None}
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
            'Referer': 'https://wiki.biligame.com/rocom/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        }
        self.cookies = {c.split('=')[0]: c.split('=')[1] for c in COOKIE_STR.split('; ')}
        self.output_file = os.path.join(self.root_dir, 'pet_details.json')
        self.progress_file = os.path.join(self.root_dir, 'crawler', 'crawl_progress.json')
        self.failed_file = os.path.join(self.root_dir, 'crawler', 'crawl_failed.json')
        os.makedirs(os.path.dirname(self.progress_file), exist_ok=True)

    def get_cookies(self):
        return self.cookies
    
    def _get_ids_with_traits(self):
        main_file = os.path.join(self.root_dir, 'data', 'pets_detail.js')
        backup_file = os.path.join(self.root_dir, 'data', 'pets_detail_backup.js')
        
        check_files = [main_file, backup_file] if os.path.exists(main_file) else [backup_file]
        
        for check_file in check_files:
            if not os.path.exists(check_file):
                continue
            try:
                with open(check_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                match = re.search(r'export const petsDetail = ({.*});', content, re.DOTALL)
                if match:
                    data = json.loads(match.group(1))
                    ids = []
                    for k, v in data.items():
                        trait = v.get('trait', '')
                        if trait and trait != '特性':
                            try:
                                ids.append(int(k))
                            except:
                                pass
                    if ids:
                        print(f'从 {os.path.basename(check_file)} 读取到 {len(ids)} 个已有特性的精灵')
                        return ids
            except Exception as e:
                print(f'读取特性列表失败: {e}')
        return []

    def rotate_proxy(self):
        if PROXY_POOL:
            proxy = random.choice(PROXY_POOL)
            self.proxies = {'http': proxy, 'https': proxy}
            print(f'  [代理] 切换到: {proxy.split("@")[1] if "@" in proxy else proxy}')
        else:
            self.proxies = {'http': None, 'https': None}

    def random_delay(self, min_sec=1, max_sec=3):
        delay = random.uniform(min_sec, max_sec)
        print(f'  [延时] 等待 {delay:.1f} 秒')
        time.sleep(delay)

    def fetch_page(self, url, retries=3):
        for attempt in range(retries):
            try:
                self.rotate_proxy()
                response = self.session.get(
                    url,
                    headers=self.headers,
                    proxies=self.proxies,
                    timeout=15
                )
                if response.status_code == 200:
                    return response.text
                elif response.status_code == 429:
                    print(f'  [警告] 请求过于频繁,等待60秒...')
                    time.sleep(60)
                else:
                    print(f'  [错误] 状态码: {response.status_code}')
            except requests.exceptions.ProxyError as e:
                print(f'  [代理错误] 重试 {attempt + 1}/{retries}: {e}')
                self.rotate_proxy()
            except requests.exceptions.Timeout as e:
                print(f'  [超时] 重试 {attempt + 1}/{retries}: {e}')
            except Exception as e:
                print(f'  [异常] {attempt + 1}/{retries}: {e}')
            self.random_delay(2, 5)
        return None

    def parse_pet_detail(self, html_content):
        soup = BeautifulSoup(html_content, 'html.parser')
        result = {}

        race_container = soup.find('div', class_='rocom_sprite_info_qualification')
        if race_container:
            values = race_container.find_all('p', class_='rocom_sprite_info_qualification_value')
            if len(values) >= 6:
                result['race'] = {
                    'hp': int(values[0].get_text()),
                    'attack': int(values[1].get_text()),
                    'mattack': int(values[2].get_text()),
                    'defense': int(values[3].get_text()),
                    'mdefense': int(values[4].get_text()),
                    'speed': int(values[5].get_text())
                }
                result['race']['total'] = sum(result['race'].values())

        text = soup.get_text()
        height_match = re.search(r'([\d.]+)~([\d.]+)M', text)
        weight_match = re.search(r'([\d.]+)~([\d.]+)KG', text)
        if height_match:
            result['height'] = height_match.group(1)
        if weight_match:
            result['weight'] = weight_match.group(1)

        all_text = soup.get_text()
        
        char_box = soup.find('div', class_='rocom_sprite_info_characteristic_content')
        if char_box:
            title_elem = char_box.find('p', class_='rocom_sprite_info_characteristic_title')
            desc_elem = char_box.find('p', class_='rocom_sprite_info_characteristic_text')
            if title_elem:
                trait_name = title_elem.get_text(strip=True)
                trait_desc = desc_elem.get_text(strip=True) if desc_elem else ''
                if trait_name and trait_name != '特性':
                    result['trait'] = f'{trait_name} {trait_desc}'

        tabs = soup.find_all('div', class_='tabbertab')
        skill_types = {'精灵技能': [], '血脉技能': [], '可学技能石': []}
        seen_skills = {'精灵技能': set(), '血脉技能': set(), '可学技能石': set()}

        for tab in tabs:
            title = tab.get('title', '')
            if '精灵技能' in title:
                stype = '精灵技能'
            elif '血脉技能' in title:
                stype = '血脉技能'
            elif '可学技能石' in title:
                stype = '可学技能石'
            else:
                stype = None

            if stype:
                skill_boxes = tab.find_all('div', class_='rocom_sprite_skill_box')
                for box in skill_boxes:
                    level_elem = box.find('div', class_='rocom_sprite_skill_level')
                    name_elem = box.find('div', class_='rocom_sprite_skillName')
                    type_elem = box.find('div', class_='rocom_sprite_skillType')
                    power_elem = box.find('div', class_='rocom_sprite_skill_power')
                    damage_elem = box.find('div', class_='rocom_sprite_skillDamage')
                    desc_elem = box.find('div', class_='rocom_sprite_skillContent')
                    attr_img = box.find('img', class_='rocom_sprite_skill_attr')

                    level = level_elem.get_text(strip=True) if level_elem else '0'
                    level = level.replace('LV', '').replace(' ', '').replace('\ufffd', '')

                    name = name_elem.get_text(strip=True) if name_elem else ''
                    skill_type = type_elem.get_text(strip=True) if type_elem else ''
                    power_text = power_elem.get_text(strip=True) if power_elem else '0'
                    power = int(power_text) if power_text.isdigit() else 0
                    consume = damage_elem.get_text(strip=True) if damage_elem else '0'
                    consume = int(consume) if consume.isdigit() else 0
                    desc = desc_elem.get_text(strip=True) if desc_elem else ''

                    attr = ''
                    if attr_img:
                        src = attr_img.get('src', '')
                        match = re.search(r'属性_(.+?)\.png', unquote(src))
                        if match:
                            attr = match.group(1)

                    if name and name not in seen_skills[stype]:
                        seen_skills[stype].add(name)
                        skill_types[stype].append({
                            'name': name,
                            'level': level,
                            'type': skill_type,
                            'power': power,
                            'consume': consume,
                            'describe': desc,
                            'attr': attr,
                            'skill_type': stype
                        })

        skills = []
        for skills_list in skill_types.values():
            skills.extend(skills_list)

        result['skills'] = skills
        result['skill_types'] = skill_types

        return result

    def load_progress(self):
        if os.path.exists(self.progress_file):
            with open(self.progress_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {'completed': [], 'failed': []}

    def save_progress(self, progress):
        with open(self.progress_file, 'w', encoding='utf-8') as f:
            json.dump(progress, f, ensure_ascii=False)

    def load_results(self):
        if os.path.exists(self.output_file):
            with open(self.output_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []

    def save_results(self, results):
        temp_file = self.output_file + '.tmp'
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        if os.path.exists(self.output_file):
            try:
                os.remove(self.output_file)
            except PermissionError:
                time.sleep(0.5)
                try:
                    os.remove(self.output_file)
                except:
                    pass
        os.rename(temp_file, self.output_file)

    def crawl_pet(self, pet_name, pet_id, url=None):
        if url is None:
            url = f'https://wiki.biligame.com/rocom/{quote(pet_name)}'
        print(f'\n[{pet_id}] 正在抓取: {pet_name}')
        print(f'  URL: {url}')

        html = self.fetch_page(url)
        if not html:
            print(f'  [失败] 无法获取页面')
            return False

        try:
            data = self.parse_pet_detail(html)
            data['id'] = pet_id
            data['name'] = pet_name
            data['url'] = url
            print(f'  [成功] 种族值:{data.get("race", {}).get("total", "?")} 技能:{len(data.get("skills", []))}')
            return data
        except Exception as e:
            print(f'  [解析错误] {e}')
            return False

    def crawl_all(self, pet_list, start_index=0):
        print('=' * 50)
        print(f'开始抓取 {len(pet_list)} 个宠物')
        print('=' * 50)

        results = self.load_results()
        completed_ids = [r['id'] for r in results]
        progress = self.load_progress()
        
        have_trait_ids = self._get_ids_with_traits()
        if have_trait_ids:
            print(f'已有完整特性的精灵: {len(have_trait_ids)}只，将跳过')

        for i, pet in enumerate(pet_list[start_index:], start=start_index):
            pet_id = pet.get('id')
            pet_name = pet.get('name')
            pet_url = pet.get('url')

            if pet_id in completed_ids:
                print(f'[{i+1}/{len(pet_list)}] 跳过已完成的: {pet_name}')
                continue
            
            if pet_id in have_trait_ids:
                print(f'[{i+1}/{len(pet_list)}] 跳过已有特性的: {pet_name}')
                continue

            data = self.crawl_pet(pet_name, pet_id, pet_url)

            if data:
                results.append(data)
                completed_ids.append(pet_id)
                progress['completed'].append(pet_id)
            else:
                progress['failed'].append({'id': pet_id, 'name': pet_name})
                with open(self.failed_file, 'w', encoding='utf-8') as f:
                    json.dump(progress['failed'], f, ensure_ascii=False)

            self.save_results(results)
            self.save_progress(progress)

            if (i + 1) % 10 == 0:
                print(f'\n[进度] 已完成 {i + 1}/{len(pet_list)}, 成功 {len(results)}, 失败 {len(progress["failed"])}')

            self.random_delay(1, 2)

        print(f'\n{"=" * 50}')
        print(f'抓取完成! 成功: {len(results)}, 失败: {len(progress["failed"])}')
        print(f'结果保存到: {self.output_file}')
        print(f'{"=" * 50}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Crawl pet detail data from wiki.')
    parser.add_argument('--test', action='store_true', help='Only crawl one pet for smoke test.')
    parser.add_argument('--output-root', default='', help='Optional staging root directory.')
    args = parser.parse_args()

    if args.test:
        pet_list = [{'id': 1, 'name': '迪莫'}]
    else:
        pet_list = load_pets_from_data(resolve_root(args.output_root))
        print(f'从 data/pets.js 加载了 {len(pet_list)} 个宠物')

    crawler = PetCrawler(args.output_root)
    crawler.crawl_all(pet_list)
