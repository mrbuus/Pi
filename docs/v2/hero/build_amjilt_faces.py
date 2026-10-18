"""Амжилтын сувгийн (ТВ) нүүрийн мозайк: сурагч бүрийн нүүрийг нэг атлас болгоно.
Эх: amjilt/<он>.json-ийн бүх картын том зураг (f). Нүүрийг macOS Vision олно (faces.swift).
2018–2022 оны бүлэг картын сурагчийг тор (мөр, багана) дагуулж нэг нэгээр нь тайрна.
Гаралт (хоёр газар, git-д орохгүй): amjilt/faces/atlas.webp (80px нүд), amjilt/faces/<n>.webp
(240px, цөөн нүүртэй сувагт), amjilt/faces/index.json. Үндсэн нүүрийн файлуудыг хөндөхгүй.
Дахин ажиллуулахад бүгдийг шинээр үүсгэнэ: python3 docs/v2/hero/build_amjilt_faces.py
"""
import json, os, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUTS = [os.path.expanduser('~/Intern/pi.mnv2/web/public/amjilt'), os.path.join(HERE, 'home', 'amjilt')]
SRC = OUTS[1]
CELL, AV, COLS = 80, 240, 20

# Бүлэг картын тор (багана, мөр) ба картан дээрээс нүдээр уншсан онцгой оноо (2026-10-17).
# Түлхүүр: (файл, k), k нь уншлагын дараалал (зүүнээс баруун, дээрээс доош). Бусад нь 700–799.
GRID = {2018: (4, 2), 2019: (3, 3), 2020: (4, 2), 2021: (4, 2), 2022: (4, 2)}
TOP = {('card-178', 0), ('card-182', 0), ('card-182', 1), ('card-183', 0), ('card-000', 0), ('card-000', 1)}
LOW = {('card-179', 7), ('card-179', 8), ('card-180', 7)}  # 699, 696, 699


def detect(paths):
    bin_ = os.path.join(tempfile.gettempdir(), 'pi-faces-bin')
    if not os.path.exists(bin_) or os.path.getmtime(bin_) < os.path.getmtime(os.path.join(HERE, 'faces.swift')):
        subprocess.run(['swiftc', '-O', os.path.join(HERE, 'faces.swift'), '-o', bin_], check=True)
    out = subprocess.run([bin_, *paths], check=True, capture_output=True).stdout
    return {r['p']: [f for f in r.get('f', []) if f[4] > .5] for r in json.loads(out)}


def centers(vals, n):
    """1 хэмжээст утгуудыг n бүлэгт хуваагаад төвийг нь буцаана (хамгийн том завсраар)."""
    v = sorted(vals)
    cut = sorted(sorted(range(1, len(v)), key=lambda i: v[i] - v[i - 1])[-(n - 1):]) if n > 1 else []
    parts = [v[a:b] for a, b in zip([0, *cut], [*cut, len(v)])]
    return [sum(p) / len(p) for p in parts]


def fill_grid(dets, cols, rows):
    """Бүлэг картын бүх нүдийг гаргана: олдсон нүүрийг ойрын нүдэнд, олдоогүйг дундаж хэмжээгээр нөхнө."""
    pool = [f for fs in dets for f in fs]
    cx = centers([f[0] + f[2] / 2 for f in pool], cols)
    cy = centers([f[1] + f[3] / 2 for f in pool], rows)
    if len(cx) < cols:  # бүтэн багана олдоогүй бол жигд зайгаар нөхнө
        step = min(b - a for a, b in zip(cx, cx[1:]))
        cx = [cx[0] + i * step for i in range(cols)]
    w = sorted(f[2] for f in pool)[len(pool) // 2]
    h = sorted(f[3] for f in pool)[len(pool) // 2]
    out = []
    for fs in dets:
        cells = []
        for r in range(rows):
            for c in range(cols):
                near = [f for f in fs if abs(f[0] + f[2] / 2 - cx[c]) < w * .8 and abs(f[1] + f[3] / 2 - cy[r]) < h * .8]
                cells.append(near[0] if near else [cx[c] - w / 2, cy[r] - h / 2, w, h, 0])
        out.append(cells)
    return out


def unyellow(im):
    """Картын шар, улбар шар дэвсгэрийг хөх болгоно (эзэн шар өнгө хэрэглэхгүй). Арьс хөндөгдөхгүй:
    шар (38–62°) нь S>140, улбар шар (15–38°) нь зөвхөн тод (S>150, V>170) үед л солигдоно."""
    hsv = np.asarray(im.convert('HSV')).astype(np.float32)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1], hsv[..., 2]
    m = (((h >= 38) & (h <= 62) & (s > 140) & (v > 110)) | ((h >= 15) & (h < 38) & (s > 150) & (v > 170))).astype(np.float32)
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)[..., None] / 255
    navy = np.array([46, 72, 130], np.float32) * (v[..., None] / 235) ** .8
    rgb = np.asarray(im).astype(np.float32)
    return Image.fromarray(np.clip(rgb * (1 - m) + navy * m, 0, 255).astype(np.uint8))


def crop(im, f):
    W, H = im.size
    x, y, w, h = f[0] * W, f[1] * H, f[2] * W, f[3] * H
    side = max(w, h) * 2.1
    cx, cy = x + w / 2, y + h / 2 + h * .12
    l = min(max(cx - side / 2, 0), max(W - side, 0)); t = min(max(cy - side / 2, 0), max(H - side, 0))
    return unyellow(im.crop((int(l), int(t), int(l + side), int(t + side))).resize((AV, AV), Image.LANCZOS))


years = json.load(open(os.path.join(SRC, 'index.json')))
data = {y: json.load(open(os.path.join(SRC, f'{y}.json'))) for y in years}
paths = [os.path.join(SRC, d['f'][len('amjilt/'):]) for y in years for d in data[y] if d['s'] != 'cls']
det = detect(paths)
P = lambda d: os.path.join(SRC, d['f'][len('amjilt/'):])

faces = []  # (y, i, s, tier, o, зураг)
for y in sorted(years):
    rows = [(i, d) for i, d in enumerate(data[y]) if d['s'] != 'cls']
    grp = [(i, d) for i, d in rows if d.get('group')]
    if grp:
        cols, nr = GRID[y]
        for (i, d), cells in zip(grp, fill_grid([det[P(d)] for _, d in grp], cols, nr)):
            im = Image.open(P(d)).convert('RGB'); card = os.path.basename(d['f'])[:-5]
            for k, f in enumerate(cells):
                tier = 8 if (card, k) in TOP else 6 if (card, k) in LOW else 7
                faces.append((y, i, d['s'], tier, 800 if tier == 8 else 0, crop(im, f)))
    for i, d in rows:
        if d.get('group'): continue
        fs = det[P(d)]
        if not fs: print('нүүр олдсонгүй:', d['f']); continue
        o = d.get('o') or 0
        faces.append((y, i, d['s'], 8 if o == 800 else 7 if o >= 700 else 6, o, crop(Image.open(P(d)).convert('RGB'), max(fs, key=lambda f: f[2] * f[3]))))

n = len(faces); R = (n + COLS - 1) // COLS
atlas = Image.new('RGB', (COLS * CELL, R * CELL), (11, 24, 52))
for k, f in enumerate(faces):
    atlas.paste(f[5].resize((CELL, CELL), Image.LANCZOS), ((k % COLS) * CELL, (k // COLS) * CELL))
idx = {'cell': CELL, 'cols': COLS, 'rows': R, 'img': 'amjilt/faces/atlas.webp',
       'list': [[y, i, s, t, o] for y, i, s, t, o, _ in faces]}
for out in OUTS:
    d = os.path.join(out, 'faces'); os.makedirs(d, exist_ok=True)
    atlas.save(os.path.join(d, 'atlas.webp'), 'WEBP', quality=72, method=6)
    for k, f in enumerate(faces): f[5].save(os.path.join(d, f'{k}.webp'), 'WEBP', quality=78, method=6)
    json.dump(idx, open(os.path.join(d, 'index.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
mat = [f for f in faces if f[2] == 'mat']
print(n, 'нүүр; математик 800:', sum(f[3] == 8 for f in mat), ' 700+:', sum(f[3] >= 7 for f in mat),
      ' атлас', atlas.size, os.path.getsize(os.path.join(OUTS[1], 'faces', 'atlas.webp')) // 1024, 'KB')
