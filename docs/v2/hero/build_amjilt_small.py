"""Утсанд зориулсан жижиг амжилтын зураг (400px өргөн) — «Он оноор»-ын тор утсанд ~2 дахин бага татна.
amjilt/<он>/s2/<нэр>.webp үүсгэж, <он>.json-ийн мөр бүрт `s2` талбар нэмнэ (байвал шинэчилнэ).
build_amjilt_cards.py / build_amjilt_cls.py-ийн ДАРАА ажиллуулна (тэд JSON-ийг дахин бичдэг):
    python3 docs/v2/hero/build_amjilt_small.py
"""
import json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUTS = [os.path.expanduser('~/Intern/pi.mnv2/web/public/amjilt'), os.path.join(HERE, 'home', 'amjilt')]
SRC, W = OUTS[1], 400

years = json.load(open(os.path.join(SRC, 'index.json'), encoding='utf-8'))
total = [0, 0]
for y in years:
    rows = json.load(open(os.path.join(SRC, f'{y}.json'), encoding='utf-8'))
    for d in rows:
        if d.get('group') or not d.get('f'):
            continue  # бүлэг карт бүтэн өргөнөөр харагдана — жижиг хувилбар хэрэггүй
        name = os.path.basename(d['f'])
        im = Image.open(os.path.join(SRC, d['f'][len('amjilt/'):])).convert('RGB')
        im.thumbnail((W, W * 4))
        for out in OUTS:
            dd = os.path.join(out, str(y), 's2'); os.makedirs(dd, exist_ok=True)
            im.save(os.path.join(dd, name), 'WEBP', quality=74, method=6)
        d['s2'] = f'amjilt/{y}/s2/{name}'
        total[0] += 1
        total[1] += os.path.getsize(os.path.join(SRC, str(y), 's2', name))
    for out in OUTS:
        json.dump(rows, open(os.path.join(out, f'{y}.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(total[0], 'зураг,', total[1] // 1024, 'KB (жижиг хувилбар нийт)')
