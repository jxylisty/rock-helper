# -*- coding: utf-8 -*-
# ============================================================
# 【重要】技能详情爬虫 - 请勿删除！
# 此脚本从B站游戏Wiki爬取洛克王国技能详情
# 使用方法: python crawl_skill_details.py
# 依赖: requests, beautifulsoup4
# 输出文件: ../data/skills.js
# ============================================================
import requests
import random
import time
import json
import re
import os
import argparse
from bs4 import BeautifulSoup
from urllib.parse import quote

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COOKIE_STR = 'gamecenter_wiki_UserName=456876771; gamecenter_wiki_UserGroups=bilibili; gamecenter_wiki_mwuser-sessionId=b08c807a4362ffeb8f3b; gamecenter_wiki__session=k6b2fe2p4f5heutdq8ae0736s1glcts0; gamecenter_wiki_UserID=459306; DedeUserID=456876771; DedeUserID__ckMd5=f493c69c86642855; b_nut=1743586512; buvid3=D4F796A8-FBE0-4DBF-534D-0B15BCD8E1D212528infoc; buvid4=37928632-71F8-0334-CB98-3C090FB3C17B12356-025040209-jI4Hj3XrV9xRkf8rxxY97w%3D%3D; buvid_fp=f635bd06b2d50e92ab0346c848d9e27a; Hm_lvt_e61bc5e4df128a1dc4db0bb30558ebe4=1747478069,1749705251; SESSDATA=a86fdf4e%2C1790995011%2Ce727c%2A42CjBpPoEfmslz-j-T3ATWds-MP6usq1B1mCt4HI0owCpY9egszCv51tZlUQGwtcOdBZwSVk5yTEV0ZjY5bzhIdVM3WjBhZHV5bTJjZ2E4WU8zaUgydGxxR3U3RkpvS3NRNHVkRTVsRnVfaVJ5bWxIMFZ1T3MtTHNhTFowNG1rcmI4ZDBuY0t4dUdnIIEC; bili_jct=a2e823c3a2d40900db06997bfe31bd27; sid=dte3t3rd; Hm_lvt_cb50e488eca598646f26b3bf09b83ada=1775615700; HMACCOUNT=A87B2B7EB58BBB3A; bsource=search_baidu; b_lsid=AE2F9372_19D6E2CF93B; Hm_lpvt_cb50e488eca598646f26b3bf09b83ada=1775669936'

PROXY_POOL = []

class SkillDetailCrawler:
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
        self.progress_file = os.path.join(self.root_dir, 'crawler', 'skill_detail_progress.json')
        self.skills_dir = os.path.join(self.root_dir, 'static', 'skills')
        self.output_file = os.path.join(self.root_dir, 'data', 'skills.js')
        os.makedirs(os.path.dirname(self.output_file), exist_ok=True)
        os.makedirs(os.path.dirname(self.progress_file), exist_ok=True)

    def get_cookies(self):
        return self.cookies

    def rotate_proxy(self):
        if PROXY_POOL:
            proxy = random.choice(PROXY_POOL)
            self.proxies = {'http': proxy, 'https': proxy}
        else:
            self.proxies = {'http': None, 'https': None}

    def random_delay(self, min_sec=0.3, max_sec=1.0):
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
            except Exception as e:
                time.sleep(2)
        return None

    def parse_skill(self, html, skill_name):
        soup = BeautifulSoup(html, 'html.parser')
        skill_info = {
            'name': skill_name,
            'type': '',
            'type_icon': '',
            'attr': '',
            'attr_icon': '',
            'consume': '',
            'power': '',
            'describe': ''
        }

        name_div = soup.find('div', class_='rocom_skill_template_skillName')
        if name_div:
            skill_info['name'] = name_div.get_text(strip=True)

        type_div = soup.find('div', class_='rocom_skill_template_skillSort')
        if type_div:
            img = type_div.find('img')
            if img:
                skill_info['type_icon'] = img.get('alt', '')
            skill_info['type'] = type_div.get_text(strip=True)

        attr_div = soup.find('div', class_='rocom_skill_template_skillAttribute')
        if attr_div:
            img = attr_div.find('img')
            if img:
                skill_info['attr_icon'] = img.get('alt', '')
            skill_info['attr'] = attr_div.get_text(strip=True)

        consume_div = soup.find('div', class_='rocom_skill_template_skillConsume')
        if consume_div:
            skill_info['consume'] = consume_div.get_text(strip=True)

        power_div = soup.find('div', class_='rocom_skill_template_skillPower')
        if power_div:
            skill_info['power'] = power_div.get_text(strip=True)

        describe_div = soup.find('div', class_='rocom_skill_template_skillEffect')
        if not describe_div:
            describe_div = soup.find('div', class_='rocom_skill_template_skillDescribe')
        if describe_div:
            skill_info['describe'] = describe_div.get_text(strip=True)

        return skill_info

    def save_progress(self, data):
        with open(self.progress_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_progress(self):
        if os.path.exists(self.progress_file):
            with open(self.progress_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def get_skill_list(self):
        from crawl_skill_icons import SkillIconCrawler
        crawler = SkillIconCrawler(self.root_dir)
        return crawler.get_skill_list()

    def crawl(self):
        print('='*50)
        print('开始爬取技能详情...')
        print('='*50)

        progress = self.load_progress()
        skills_data = progress.get('skills', {})
        failed = set(progress.get('failed', []))

        print(f'已爬取: {len(skills_data)} 个, 失败: {len(failed)} 个')

        skills = self.get_skill_list()
        if not skills:
            return

        print(f'\n[1/3] 开始爬取 {len(skills)} 个技能详情...')

        for i, skill_name in enumerate(skills):
            if i % 50 == 0:
                print(f'  进度: {i}/{len(skills)}')

            if skill_name in skills_data:
                continue

            url = f'https://wiki.biligame.com/rocom/{quote(skill_name)}'
            html = self.fetch_page(url)

            if html:
                skill_info = self.parse_skill(html, skill_name)
                skills_data[skill_name] = skill_info
                print(f'  [OK] {skill_name}')
            else:
                failed.add(skill_name)
                print(f'  [失败] {skill_name}')

            self.random_delay(0.2, 0.8)
            self.save_progress({'skills': skills_data, 'failed': list(failed)})

        print(f'\n[2/3] 保存技能数据...')
        with open(self.output_file, 'w', encoding='utf-8') as f:
            f.write('export const skillsData = ' + json.dumps(skills_data, ensure_ascii=False, indent=2) + ';')

        self.save_progress({'skills': skills_data, 'failed': list(failed)})

        print(f'\n[3/3] 统计...')
        print('\n' + '='*50)
        print(f'爬取完成！')
        print(f'成功: {len(skills_data)} 个')
        print(f'失败: {len(failed)} 个')
        print(f'数据文件: {self.output_file}')
        print('='*50)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Crawl skill detail data from wiki.')
    parser.add_argument('--output-root', default='', help='Optional staging root directory.')
    args = parser.parse_args()
    crawler = SkillDetailCrawler(args.output_root)
    crawler.crawl()
