# -*- coding: utf-8 -*-
# ============================================================
# 【重要】技能图标爬虫 - 请勿删除！
# 此脚本从B站游戏Wiki爬取洛克王国技能图标
# 使用方法: python crawl_skill_icons.py
# 依赖: requests, beautifulsoup4
# 输出目录: ../static/skills/
# 数据文件: ../data/skill_icons.js
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

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COOKIE_STR = 'gamecenter_wiki_UserName=456876771; gamecenter_wiki_UserGroups=bilibili; gamecenter_wiki_mwuser-sessionId=b08c807a4362ffeb8f3b; gamecenter_wiki__session=k6b2fe2p4f5heutdq8ae0736s1glcts0; gamecenter_wiki_UserID=459306; DedeUserID=456876771; DedeUserID__ckMd5=f493c69c86642855; b_nut=1743586512; buvid3=D4F796A8-FBE0-4DBF-534D-0B15BCD8E1D212528infoc; buvid4=37928632-71F8-0334-CB98-3C090FB3C17B12356-025040209-jI4Hj3XrV9xRkf8rxxY97w%3D%3D; buvid_fp=f635bd06b2d50e92ab0346c848d9e27a; Hm_lvt_e61bc5e4df128a1dc4db0bb30558ebe4=1747478069,1749705251; SESSDATA=a86fdf4e%2C1790995011%2Ce727c%2A42CjBpPoEfmslz-j-T3ATWds-MP6usq1B1mCt4HI0owCpY9egszCv51tZlUQGwtcOdBZwSVk5yTEV0ZjY5bzhIdVM3WjBhZHV5bTJjZ2E4WU8zaUgydGxxR3U3RkpvS3NRNHVkRTVsRnVfaVJ5bWxIMFZ1T3MtTHNhTFowNG1rcmI4ZDBuY0t4dUdnIIEC; bili_jct=a2e823c3a2d40900db06997bfe31bd27; sid=dte3t3rd; Hm_lvt_cb50e488eca598646f26b3bf09b83ada=1775615700; HMACCOUNT=A87B2B7EB58BBB3A; bsource=search_baidu; b_lsid=AE2F9372_19D6E2CF93B; Hm_lpvt_cb50e488eca598646f26b3bf09b83ada=1775669936'

PROXY_POOL = []

class SkillIconCrawler:
    def __init__(self, output_root=''):
        self.root_dir = os.path.abspath(output_root) if output_root else PROJECT_ROOT
        self.session = requests.Session()
        self.session.trust_env = False
        self.proxies = {'http': None, 'https': None}
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows  NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
            'Referer': 'https://wiki.biligame.com/rocom/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        }
        self.cookies = {c.split('=')[0]: c.split('=')[1] for c in COOKIE_STR.split('; ')}
        self.skills_dir = os.path.join(self.root_dir, 'static', 'skills')
        self.progress_file = os.path.join(self.root_dir, 'crawler', 'skill_icon_progress.json')
        self.failed_file = os.path.join(self.root_dir, 'crawler', 'skill_icon_failed.json')
        os.makedirs(self.skills_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.progress_file), exist_ok=True)

    def get_cookies(self):
        return self.cookies

    def rotate_proxy(self):
        if PROXY_POOL:
            proxy = random.choice(PROXY_POOL)
            self.proxies = {'http': proxy, 'https': proxy}
        else:
            self.proxies = {'http': None, 'https': None}

    def random_delay(self, min_sec=0.5, max_sec=1.5):
        delay = random.uniform(min_sec, max_sec)
        time.sleep(delay)

    def fetch_page(self, url, retries=3):
        for attempt in range(retries):
            try:
                self.rotate_proxy()
                response = self.session.get(
                    url,
                    headers=self.headers,
                    cookies=self.get_cookies(),
                    proxies=self.proxies,
                    timeout=15
                )
                if response.status_code == 200:
                    return response.text
                elif response.status_code == 404:
                    return None
                else:
                    print(f'  [{response.status_code}] 请求失败，重试 ({attempt + 1}/{retries})')
            except Exception as e:
                print(f'  [错误] {e}，重试 ({attempt + 1}/{retries})')
                time.sleep(2)
        return None

    def get_img_url(self, img):
        srcset = img.get('srcset', '')
        if srcset:
            urls = [u.strip().split()[0] for u in srcset.split(',')]
            if urls:
                return urls[-1]
        return img.get('src')

    def download_image(self, url, filepath):
        if not url or not url.startswith('http'):
            return False
        for attempt in range(3):
            try:
                self.rotate_proxy()
                response = self.session.get(
                    url,
                    headers=self.headers,
                    cookies=self.get_cookies(),
                    proxies=self.proxies,
                    timeout=15
                )
                if response.status_code == 200:
                    with open(filepath, 'wb') as f:
                        f.write(response.content)
                    return True
            except Exception as e:
                print(f'  [下载错误] {e}')
                time.sleep(1)
        return False

    def save_progress(self, downloaded, failed):
        with open(self.progress_file, 'w', encoding='utf-8') as f:
            json.dump({'downloaded': list(downloaded), 'failed': list(failed)}, f, ensure_ascii=False, indent=2)

    def load_progress(self):
        if os.path.exists(self.progress_file):
            with open(self.progress_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return set(data.get('downloaded', [])), set(data.get('failed', []))
        return set(), set()

    def get_skill_list(self):
        print('\n[1/4] 获取技能列表...')
        url = 'https://wiki.biligame.com/rocom/技能图鉴'
        html = self.fetch_page(url)
        if not html:
            print('[错误] 无法获取技能列表页面')
            return []

        soup = BeautifulSoup(html, 'html.parser')
        skills = []

        skill_divs = soup.find_all('div', class_='rocom_select_skill_original')
        skill_divs += soup.find_all('div', class_='rocom_select_skill_sort')

        for div in skill_divs:
            spans = div.find_all('span')
            for span in spans:
                name = span.get_text(strip=True)
                if name and len(name) > 0:
                    skills.append(name)

        print(f'  找到 {len(skills)} 个技能')
        return skills

    def crawl(self):
        print('='*50)
        print('开始爬取技能图标...')
        print('='*50)

        downloaded, failed = self.load_progress()
        print(f'已下载: {len(downloaded)} 个, 失败: {len(failed)} 个')

        skills = self.get_skill_list()
        if not skills:
            return

        print(f'\n[2/4] 提取技能图标 URL...')
        skill_icons = {}
        new_downloaded = set(downloaded)

        for i, skill_name in enumerate(skills):
            if i % 50 == 0:
                print(f'  进度: {i}/{len(skills)}')

            if skill_name in new_downloaded:
                continue

            safe_name = re.sub(r'[<>:"/\\|?*]', '', skill_name)
            icon_path = os.path.join(self.skills_dir, f'{safe_name}.png')

            url = f'https://wiki.biligame.com/rocom/{quote(skill_name)}'
            html = self.fetch_page(url)
            if not html:
                failed.add(skill_name)
                continue

            soup = BeautifulSoup(html, 'html.parser')

            icon_div = soup.find('div', class_='rocom_skill_template_skillIcon')
            img_url = None
            if icon_div:
                img = icon_div.find('img')
                if img:
                    img_url = self.get_img_url(img)
            
            if not img_url:
                imgs = soup.find_all('img')
                for img in imgs:
                    alt = img.get('alt') or ''
                    if alt == skill_name or alt == f'技能图标 {skill_name}.png':
                        img_url = self.get_img_url(img)
                        break

            if img_url:
                if self.download_image(img_url, icon_path):
                    new_downloaded.add(skill_name)
                    skill_icons[skill_name] = f'/static/skills/{safe_name}.png'
                    print(f'  [OK] {skill_name}')
                else:
                    failed.add(skill_name)
                    print(f'  [下载失败] {skill_name}')
            else:
                failed.add(skill_name)
                print(f'  [未找到图标] {skill_name}')

            self.random_delay(0.3, 1.0)
            self.save_progress(new_downloaded, failed)

        print(f'\n[3/4] 保存技能图标数据...')
        output_file = os.path.join(self.root_dir, 'data', 'skill_icons.js')
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        all_icons = dict(skill_icons)
        for name in new_downloaded:
            if name not in all_icons:
                safe = re.sub(r'[<>:"/\\|?*]', '', name)
                all_icons[name] = f'/static/skills/{safe}.png'

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('export const skillIcons = ' + json.dumps(all_icons, ensure_ascii=False, indent=2) + ';')

        self.save_progress(new_downloaded, failed)

        print(f'\n[4/4] 统计...')
        print('\n' + '='*50)
        print(f'爬取完成！')
        print(f'成功: {len(new_downloaded)} 个')
        print(f'失败: {len(failed)} 个')
        print(f'图标目录: {self.skills_dir}')
        print('='*50)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Crawl skill icon data from wiki.')
    parser.add_argument('--output-root', default='', help='Optional staging root directory.')
    args = parser.parse_args()
    crawler = SkillIconCrawler(args.output_root)
    crawler.crawl()
