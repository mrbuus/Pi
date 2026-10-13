#!/usr/bin/env python3
"""Амжилтын зургийн хавтсыг вэбийн «Он оноор» самбарт оруулна.

Хэрэглээ:
  python3 amjilt_import.py ~/Downloads/2025 2025
  python3 amjilt_import.py ~/Downloads/2025-niigem 2025 soc   # хичээл: mat (үндсэн) эсвэл soc

Юу хийдэг вэ:
  - хавтас доторх бүх зургийг (png, jpg, jpeg, webp) нэрээр нь эрэмбэлнэ
  - home/amjilt/<он>/t (жижиг) ба f (том) WebP болгон шахна
  - home/amjilt/<он>.json-д нэмж, home/amjilt/index.json-д оныг бүртгэнэ
Сурагчийн нэр, оноо, сургуулийг дараа нь json дотор нөхөж болно (хоосон байсан ч зураг гарна).
"""
import json, os, re, sys
from PIL import Image

if len(sys.argv) < 3:
    sys.exit(__doc__)
src = os.path.expanduser(sys.argv[1]); year = int(sys.argv[2]); subj = sys.argv[3] if len(sys.argv) > 3 else 'mat'
home = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'home')
out = os.path.join(home, 'amjilt', str(year))
os.makedirs(out + '/t', exist_ok=True); os.makedirs(out + '/f', exist_ok=True)

def natkey(f):
    return [float(x) if x.replace('.', '', 1).isdigit() else x for x in re.findall(r'\d+(?:\.\d+)?|\D+', f.lower())]

files = sorted([f for f in os.listdir(src) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))], key=natkey)
if not files:
    sys.exit('Хавтаст зураг алга: ' + src)
jpath = os.path.join(home, 'amjilt', f'{year}.json')
items = json.load(open(jpath)) if os.path.exists(jpath) else []
items = [d for d in items if d.get('s') != subj]          # тухайн хичээлийг шинээр бичнэ
for i, f in enumerate(files):
    im = Image.open(os.path.join(src, f)).convert('RGB')
    base = f'{subj}-{i + 1:03d}'
    t = im.copy(); t.thumbnail((560, 560)); t.save(f'{out}/t/{base}.webp', 'WEBP', quality=80, method=6)
    F = im.copy(); F.thumbnail((1600, 1600)); F.save(f'{out}/f/{base}.webp', 'WEBP', quality=82, method=6)
    items.append({'y': year, 's': subj, 'o': 0, 'n': '', 'sc': '', 't': f'amjilt/{year}/t/{base}.webp',
                  'f': f'amjilt/{year}/f/{base}.webp', 'w': t.width, 'h': t.height, 'src': f})
    print(f'{i + 1:3d}/{len(files)}  {f}')
json.dump(items, open(jpath, 'w'), ensure_ascii=False, indent=0)
ipath = os.path.join(home, 'amjilt', 'index.json')
years = json.load(open(ipath)) if os.path.exists(ipath) else []
if year not in years:
    years.append(year)
json.dump(sorted(years, reverse=True), open(ipath, 'w'))
print(f'Болсон: {year} он, {len(files)} зураг. Вэбээ шинэчилнэ үү (Cmd+Shift+R)')
