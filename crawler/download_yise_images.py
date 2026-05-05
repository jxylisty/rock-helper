# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
import os
import re
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
COOKIE_STR = 'gamecenter_wiki_UserName=456876771; gamecenter_wiki_UserGroups=bilibili; gamecenter_wiki__sessionId=b08c807a4362ffeb8f3b; gamecenter_wiki_mwuser-sessionId=b08c807a4362ffeb8f3b; gamecenter_wiki_UserID=459306; DedeUserID=456876771; DedeUserID__ckMd5=f493c69c86642855; SESSDATA=a86fdf4e%2C1790995011%2Ce727c%2A42CjBpPoEfmslz-j-T3ATWds-MP6usq1B1mCt4HI0owCpY9egszCv51tZlUQGwtcOdBZwSVk5yTEV0ZjY5bzhIdVM3WjBhZHV5bTJjZ2E4WU8zaUgydGxxR3U3RkpvS3NRNHVkRTVsRnVfaVJ5bWxIMFZ1T3MtTHNhTFowNG1rcmI4ZDBuY0t4dUdnIIEC; bili_jct=a2e823c3a2d40900db06997bfe31bd27;'


def parse_args():
    parser = argparse.ArgumentParser(description='Download shiny pet images from static/pets.html source.')
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


def get_img_url(img):
    srcset = img.get('srcset', '')
    if srcset:
        urls = [u.strip().split()[0] for u in srcset.split(',')]
        if urls:
            return urls[-1]
    return img.get('src')


def main():
    args = parse_args()
    root_dir = os.path.abspath(args.output_root) if args.output_root else PROJECT_ROOT
    html_path = os.path.join(PROJECT_ROOT, 'static', 'pets.html')
    output_dir = os.path.join(root_dir, 'static', 'pets')
    output_js = os.path.join(root_dir, 'data', 'pet_yise.js')
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(os.path.dirname(output_js), exist_ok=True)

    session = get_session()
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    all_images = []
    for div in soup.find_all('div', class_='divsort'):
        name_p = div.find('p', class_='rocom_prop_name')
        if not name_p:
            continue
        link = name_p.find('a')
        if not link:
            continue
        href = link.get('href', '')
        match = re.search(r'/rocom/([^/]+)', href)
        if not match:
            continue
        pet_name = unquote(match.group(1))
        no_p = div.find('span', string=re.compile(r'NO\.\d+'))
        if not no_p:
            continue
        no_match = re.search(r'NO\.(\d+)', no_p.get_text())
        pet_id = no_match.group(1).zfill(3) if no_match else None
        if not pet_id:
            continue
        prop_relative = div.find('div', style=re.compile('position:relative'))
        if not prop_relative:
            continue
        imgs = prop_relative.find_all('img', class_='rocom_prop_icon')
        for img in imgs:
            alt = img.get('alt', '')
            if '异色' not in alt:
                continue
            name_match = re.match(r'页面 宠物 立绘 (.+?) 异色', alt)
            if not name_match:
                continue
            clean_name = name_match.group(1)
            filename = f"{pet_id}_{clean_name}_异色.png"
            all_images.append({
                'pet_id': pet_id,
                'name': clean_name,
                'url': get_img_url(img),
                'filename': filename,
                'filepath': os.path.join(output_dir, filename),
            })

    downloaded = 0
    yise_pets = {}
    for img_info in all_images:
        if not os.path.exists(img_info['filepath']):
            print(f"下载: {img_info['filename']}")
            if download_image(session, img_info['url'], img_info['filepath']):
                downloaded += 1
        yise_pets[img_info['pet_id']] = {
            'name': img_info['name'],
            'img': f"/static/pets/{img_info['filename']}",
        }

    with open(output_js, 'w', encoding='utf-8') as f:
        f.write("export const petYise = " + json.dumps(yise_pets, ensure_ascii=False, indent=2) + ";\n")
    print(f'异色数据已生成到 {output_js}，共 {len(yise_pets)} 条，新增下载 {downloaded} 张')


if __name__ == '__main__':
    main()
