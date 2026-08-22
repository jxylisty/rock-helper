import hashlib
import re
from pathlib import Path

detail = Path('data/pet/pet_detail.js').read_text(encoding='utf-8')

# 提取被引用的图片文件名
refs = set(re.findall(r'/static/static-web/pets/([^"\']+?\.webp)', detail))
print('pet_detail.js 引用的立绘数:', len(refs))

pets_dir = Path('static/static-web/pets')
missing = [r for r in refs if not (pets_dir / r).exists()]
print('引用但文件不存在:', len(missing), missing[:5])

# 对被引用的文件做内容重复检测
by_hash = {}
for r in sorted(refs):
    p = pets_dir / r
    if not p.exists():
        continue
    h = hashlib.md5(p.read_bytes()).hexdigest()
    by_hash.setdefault(h, []).append(r)

dupes = {h: names for h, names in by_hash.items() if len(names) > 1}
print('\n被引用图片中的内容重复组:', len(dupes))
for h, names in dupes.items():
    print('  ' + ' = '.join(names))

# 零宽字符差异验证：370 是否已被 --all 更新
import os
stat = os.path.getmtime(pets_dir / '370_霹雳迪迪.webp')
import datetime
print('\n370_霹雳迪迪.webp 修改时间:', datetime.datetime.fromtimestamp(stat))
stat2 = os.path.getmtime(pets_dir / '001_迪莫.webp')
print('001_迪莫.webp 修改时间:', datetime.datetime.fromtimestamp(stat2))
