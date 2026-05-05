# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import os
import re
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

COOKIE_STR = 'gamecenter_wiki_UserName=456876771; gamecenter_wiki_UserGroups=bilibili; gamecenter_wiki__sessionId=b08c807a4362ffeb8f3b; gamecenter_wiki_mwuser-sessionId=b08c807a4362ffeb8f3b; gamecenter_wiki_UserID=459306; DedeUserID=456876771; DedeUserID__ckMd5=f493c69c86642855; SESSDATA=a86fdf4e%2C1790995011%2Ce727c%2A42CjBpPoEfmslz-j-T3ATWds-MP6usq1B1mCt4HI0owCpY9egszCv51tZlUQGwtcOdBZwSVk5yTEV0ZjY5bzhIdVM3WjBhZHV5bTJjZ2E4WU8zaUgydGxxR3U3RkpvS3NRNHVkRTVsRnVfaVJ5bWxIMFZ1T3MtTHNhTFowNG1rcmI4ZDBuY0t4dUdnIIEC; bili_jct=a2e823c3a2d40900db06997bfe31bd27;'


def parse_args():
    parser = argparse.ArgumentParser(description='Download base pet images from static/pets.html source.')
    parser.add_argument('--output-root', default='', help='Optional staging root directory.')
    return parser.parse_args()


def get_session() -> requests.Session:
    session = requests.Session()
    session.trust_env = False
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://wiki.biligame.com/rocom/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    })
    session.cookies.update({c.split('=')[0]: c.split('=')[1] for c in COOKIE_STR.split('; ')})
    return session


def download_image(session: requests.Session, url: str, filepath: str) -> bool:
    try:
        response = session.get(url, timeout=30)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as exc:
        print(f'下载失败: {url} - {exc}')
    return False


def get_pet_info(div):
    name_p = div.find('p', class_='rocom_prop_name')
    if not name_p:
        return None, None, None
    link = name_p.find('a')
    if not link:
        return None, None, None
    href = link.get('href', '')
    match = re.search(r'/rocom/([^/]+)', href)
    if not match:
        return None, None, None
    pet_name = unquote(match.group(1))

    no_p = div.find('span', string=re.compile(r'NO\.\d+'))
    pet_id = None
    if no_p:
        no_match = re.search(r'NO\.(\d+)', no_p.get_text())
        pet_id = no_match.group(1).zfill(3) if no_match else None
    if not pet_id:
        return None, None, None

    prop_relative = div.find('div', style=re.compile('position:relative'))
    if not prop_relative:
        return pet_id, pet_name, None

    imgs = prop_relative.find_all('img', class_='rocom_prop_icon')
    if not imgs:
        return pet_id, pet_name, None

    first_img = imgs[0]
    if '异色' in (first_img.get('alt', '') or ''):
        return pet_id, pet_name, None

    srcset = first_img.get('srcset', '')
    if srcset:
        urls = [u.strip().split()[0] for u in srcset.split(',')]
        if urls:
            return pet_id, pet_name, urls[-1]
    return pet_id, pet_name, first_img.get('src')


def main():
    args = parse_args()
    root_dir = os.path.abspath(args.output_root) if args.output_root else PROJECT_ROOT
    html_path = os.path.join(PROJECT_ROOT, 'static', 'pets.html')
    output_dir = os.path.join(root_dir, 'static', 'pets')
    os.makedirs(output_dir, exist_ok=True)

    session = get_session()
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    seen_pets = {}
    for div in soup.find_all('div', class_='divsort'):
        pet_id, pet_name, img_url = get_pet_info(div)
        if not pet_id or not pet_name:
            continue
        if pet_id not in seen_pets:
            seen_pets[pet_id] = {'name': pet_name, 'url': img_url}

    print(f'找到 {len(seen_pets)} 只宠物')
    downloaded = 0
    failed = []
    for pet_id, pet in seen_pets.items():
        if not pet['url']:
            continue
        filename = f"{pet_id}_{pet['name']}.png"
        filepath = os.path.join(output_dir, filename)
        if os.path.exists(filepath):
            continue
        print(f'下载: {filename}')
        if download_image(session, pet['url'], filepath):
            downloaded += 1
        else:
            failed.append(pet['name'])

    print(f'下载完成！成功: {downloaded}, 失败: {len(failed)}')


if __name__ == '__main__':
    main()
