"""Он оноор хэсэгт хуучин оны амжилтын картуудыг нэмнэ (2018–2025, 2026 SAT).
Эх: ~/Desktop/amjiltiin zurag/before 2026/*.jpg (эзний хадгалсан Facebook зураг, 184 ш).
Он, онооо картын зургаас нүдээр уншсан (2026-10-17). Нэрийг картан дээр хэвлэгдсэнээр нь
харуулна — бид нэрийг дахин бичихгүй (буруу бичих эрсдэлгүй).
Дахин ажиллуулахад өмнөх 'card' мөрүүдийг солино; бусад мөр (2026 сурагч, анги) хөндөгдөхгүй.
"""
import glob, json, os
from PIL import Image
SRC = os.path.expanduser('~/Desktop/amjiltiin zurag/before 2026')
fs = sorted(glob.glob(SRC + '/*.jpg'), key=lambda f: (os.path.basename(f).split('_')[1][:7], os.path.basename(f).split('_')[1]))
assert len(fs) == 184, len(fs)
S2023 = {9:735,10:733,11:708,12:742,13:711,14:723,15:773,17:729,18:751,19:711,20:800,21:708,22:708,23:725,24:723,25:800,26:702,27:702,28:780,29:765,30:704,31:739,32:702,33:747,34:723,35:739,36:747,37:760,38:760,39:750,40:754,41:717,42:765,43:754,44:742}
S2024 = dict(zip(range(45, 71), [740,704,716,748,716,708,787,766,700,712,754,781,754,800,748,708,733,754,770,708,775,748,712,763,727,716]))
S2025 = dict(zip(range(90, 142), [800,800,800,800,800,797,792,788,785,775,775,775,772,772,765,765,765,765,762,758,758,756,754,748,748,744,744,744,744,742,737,734,731,723,723,723,723,720,717,715,715,712,712,712,708,708,708,704,704,704,704,700]))
SAT26 = dict(zip(range(149, 166), [800,699,749,649,649,800,699,649,800,749,800,749,699,649,749,699,699]))
GROUP = {0:2022,1:2022,2:2022,176:2020,180:2020,177:2021,183:2021,178:2018,181:2018,179:2019,182:2019}
OUTS = [os.path.expanduser('~/Intern/pi.mnv2/web/public/amjilt'), os.path.expanduser('~/Intern/pi.mnv2/docs/v2/hero/home/amjilt')]
items = []
for y, S, s in ((2023, S2023, 'mat'), (2024, S2024, 'mat'), (2025, S2025, 'mat'), (2026, SAT26, 'sat')):
    for i, o in S.items(): items.append((i, y, s, o, False))
for i, y in GROUP.items(): items.append((i, y, 'mat', None, True))
new = {}
for i, y, s, o, grp in items:
    im = Image.open(fs[i]).convert('RGB')
    name = f'card-{i:03d}.webp'
    for out in OUTS:
        for sub, mx in (('t', 1100 if grp else 640), ('f', 1800)):
            d = os.path.join(out, str(y), sub); os.makedirs(d, exist_ok=True)
            c = im.copy(); c.thumbnail((mx, mx)); c.save(os.path.join(d, name), 'WEBP', quality=80)
    t = im.copy(); t.thumbnail((1100 if grp else 640,) * 2)
    e = {'y': y, 's': s, 'n': '', 'sc': 'SAT-аас дүйцүүлсэн' if s == 'sat' else '', 'src': 'card',
         't': f'amjilt/{y}/t/{name}', 'f': f'amjilt/{y}/f/{name}', 'w': t.width, 'h': t.height}
    if o: e['o'] = o
    if grp: e['group'] = True; e['n'] = f'{y} оны амжилт'
    new.setdefault(y, []).append(e)
for out in OUTS:
    for y, L in new.items():
        p = os.path.join(out, f'{y}.json')
        old = [d for d in json.load(open(p)) if d.get('src') != 'card'] if os.path.exists(p) else []
        L = sorted(L, key=lambda d: -(d.get('o') or 0))
        json.dump(old + L, open(p, 'w'), ensure_ascii=False)
    ix = os.path.join(out, 'index.json')
    ys = sorted(set(json.load(open(ix)) if os.path.exists(ix) else []) | set(new), reverse=True)
    json.dump(ys, open(ix, 'w'))
print({y: len(L) for y, L in sorted(new.items())})
