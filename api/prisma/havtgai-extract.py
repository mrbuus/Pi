#!/usr/bin/env python3
"""
«Хавтгайн геометр 1-р дэвтэр» PDF → бодлого бүрийн хэсэг (зураг) + чертеж.

PDF-д бодлогын текст хүртэл ЗУРАГ (Word-оос растер), тиймээс:
  cells/<тест>-<NN>.png  — бодлогын бүтэн нүд (нөхцөл + чертеж + сонголт), 300dpi — хуулбарлахад
  fig/<тест>-<NN>.png    — зөвхөн чертеж, 450dpi, цагаан захгүй — вэб/ӨС-д
  manifest.json          — бодлого бүрийн хуудас, байрлал, чертежийн bbox

Бүтэц (pages.json-оор баталсан): хуудас бүрт ①..⑤ нүд, зүүн багана (x<258) бодлого,
баруун багана «Бодолт» тор. II хэсэг («Нөхөх даалгавар») хуудсанд 4 бодлого «II. n».

  python3 prisma/havtgai-extract.py <pdf> <гаралтын хавтас>
"""
import json
import os
import re
import sys
import unicodedata

import fitz
from PIL import Image, ImageFilter

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"
LEFT_X1 = 258        # бодлогын баганын баруун зах (Бодолт тор 258-аас)
PAGE_BOTTOM = 662    # хүснэгтийн доод зах
TEXT_H = 30          # үүнээс намхан зураг = бичвэрийн мөр
CELL_DPI = 300
FIG_DPI = 450


def flatten(pix):
    mode = "RGBA" if pix.alpha else "RGB"
    im = Image.frombytes(mode, (pix.width, pix.height), pix.samples)
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[3])
        im = bg
    return im


def remove_borders(im, thr=170, cover=0.9, edge=0.06):
    """Хүснэгтийн хүрээ (захын ойролцоо, бараг бүтэн урттай шулуун) → цагаан."""
    g = im.convert("L")
    w, h = g.size
    px = g.load()
    im = im.copy()
    out = im.load()
    # дээд 6%, доод 40% (хүснэгтийн доод хүрээ чертежийн доор): бүтэн өргөнтэй шулуун
    for y in list(range(0, int(h * edge) + 1)) + list(range(int(h * 0.6), h)):
        need = cover * w if y < h * edge else 0.95 * w
        if sum(1 for x in range(w) if px[x, y] < thr) > need:
            for x in range(w):
                out[x, y] = (255, 255, 255)
    for x in list(range(0, int(w * edge) + 1)) + list(range(int(w * (1 - edge)), w)):
        # хамгийн захын 2%-д тасархай хүрээ (сонголт/нөхцөл арилгасны дараа хэсэгчилсэн) ч хүрээ
        need = 0.35 * h if (x < w * 0.02 or x > w * 0.98) else cover * h
        if sum(1 for y in range(h) if px[x, y] < thr) > need:
            for y in range(h):
                out[x, y] = (255, 255, 255)
    return im


def keeps_glyph(g, a, b, horiz, side, thr, near=34, long_frac=0.35):
    """
    Захын нимгэн зурвас нь бичвэрийн тэмдэгт үү («|AB|»-ийн «|», 10B-08/22B-13)? Богино (<35%)
    бөгөөд дотогш 34px-д ижил мөр/баганад бэх байвал тэмдэгт — хасахгүй. Урт хүрээний шугам,
    ганцаар үлдсэн сонголтын хэсэг хасагдана.
    """
    import numpy as np
    if horiz or (b - a + 1) > 9:
        return False  # зөвхөн босоо нарийн зураас («|»); хэвтээ хэлтэрхий (15B-12, 30A-10) хасагдана
    a_ = np.array(g)
    ink = a_ < thr
    ink = ink.T  # багана → мөр болгож нэг логикоор
    n, length = ink.shape
    sub = ink[a:b + 1].any(axis=0)
    span = np.nonzero(sub)[0]
    if not len(span):
        return False
    s0, s1 = span[0], span[-1]
    if (s1 - s0 + 1) >= long_frac * length:
        return False
    lo, hi = (b + 1, min(n, b + 1 + near)) if side == "lo" else (max(0, a - near), a)
    return bool(ink[lo:hi, s0:s1 + 1].any())


def peel_edges(im, thr=200, gap=8, thick=12, rounds=3):
    """
    Зах бүрийн ГАДНА талын, бусдаасаа ≥gap px хоосон зайгаар тусгаарлагдсан нимгэн (≤thick px)
    зурвасыг хасна — хүснэгтийн хүрээний үлдэгдэл, «|» зураас, сонголтын үлдэгдэл цэг.
    Үсэг (~40px) ба чертежийн хэсэг хэвээр.
    """
    for _ in range(rounds):
        g = im.convert("L")
        w, h = g.size
        px = g.load()
        rows = [any(px[x, y] < thr for x in range(0, w, 2)) for y in range(h)]
        cols = [any(px[x, y] < thr for y in range(0, h, 2)) for x in range(w)]
        changed = False
        for prof, horiz in ((rows, True), (cols, False)):
            idx = [i for i, v in enumerate(prof) if v]
            if not idx:
                continue
            for side in ("lo", "hi"):
                seq = idx if side == "lo" else idx[::-1]
                band = [seq[0]]
                for i in seq[1:]:
                    if abs(i - band[-1]) == 1:
                        band.append(i)
                    else:
                        break
                rest = [i for i in seq if i not in band]
                if not rest or len(band) > thick:
                    continue
                if abs(rest[0] - band[-1]) <= gap:
                    continue
                a, b = min(band), max(band)
                if keeps_glyph(g, a, b, horiz, side, thr):
                    continue
                if horiz:
                    im = im.copy()
                    im.paste((255, 255, 255), (0, a, w, b + 1))
                else:
                    im = im.copy()
                    im.paste((255, 255, 255), (a, 0, b + 1, h))
                changed = True
        if not changed:
            break
    return im


def peel_long_gray_edge(im, min_cover=0.5):
    """
    Захын урт СААРАЛ шугам (1–3px, өргөний 50%+) чертежид шүргэсэн үед (17A-20 «C»): зөвхөн
    саарал пикселийг (≥80) цайруулна — хар бэх хэвээр.
    """
    import numpy as np
    a = np.array(im.convert("L"))
    changed = False
    for axis in (0, 1):
        m = a if axis == 0 else a.T
        n, w = m.shape
        rows = np.nonzero((m < 235).any(axis=1))[0]
        if not len(rows):
            continue
        for edge in (rows[0], rows[-1]):
            step = 1 if edge == rows[0] else -1
            band = []
            for k in range(4):
                i = edge + step * k
                if not (0 <= i < n):
                    break
                r = m[i]
                ink = r < 235
                if ink.sum() >= min_cover * w and np.median(r[ink]) >= 110:
                    band.append(i)
                else:
                    break
            if not band or len(band) > 3:
                continue
            nxt = band[-1] + step
            # дараагийн мөр бараг хоосон байх ёстой — эс бөгөөс энэ нь зузаан шугамын саарал ирмэг
            if 0 <= nxt < n and (m[nxt] < 235).sum() >= 0.2 * w:
                continue
            for i in band:
                r = m[i]
                r[r >= 80] = 255
            changed = True
    if not changed:
        return im
    return Image.fromarray(a).convert(im.mode)


def peel_hairlines(im, rounds=4):
    """
    Захын 1–3px СААРАЛ шугам (хүрээний үлдэгдэл, ~145) — чертежээс ≥2px зайтай бол хасна.
    Чертежийн шугам хар (≤90) тул хөндөгдөхгүй.
    """
    for _ in range(rounds):
        g = im.convert("L")
        w, h = g.size
        px = g.load()
        changed = False
        for horiz in (True, False):
            n = h if horiz else w
            line = (lambda i: [px[x, i] for x in range(0, w, 2)]) if horiz else (lambda i: [px[i, y] for y in range(0, h, 2)])
            ink = [min(line(i)) < 235 for i in range(n)]
            idx = [i for i, v in enumerate(ink) if v]
            if not idx:
                continue
            for seq in (idx, idx[::-1]):
                band = [seq[0]]
                for i in seq[1:]:
                    if abs(i - band[-1]) == 1:
                        band.append(i)
                    else:
                        break
                rest = [i for i in seq if i not in band]
                if not rest or len(band) > 3 or abs(rest[0] - band[-1]) <= 2:
                    continue
                darkest = min(min(line(i)) for i in band)
                if darkest < 90:
                    continue
                a, b = min(band), max(band)
                im = im.copy()
                im.paste((255, 255, 255) if im.mode == "RGB" else 255, (0, a, w, b + 1) if horiz else (a, 0, b + 1, h))
                changed = True
        if not changed:
            break
    return im


def despeckle(im, max_area=8, thr=200, win=25):
    """
    1–8 пикселийн ГАНЦААР цэг (хүрээ/сканы үлдэгдэл). Эргэн тойронд 25px-д өөр бэх байвал
    хөндөхгүй — цэгэн сүүдэр (34A-20), үсгийн ирмэг хэвээр.
    """
    import numpy as np
    from scipy import ndimage
    a = np.array(im.convert("L"))
    ink = a < thr
    lab, n = ndimage.label(ink, structure=np.ones((3, 3)))
    if not n:
        return im
    idx = np.arange(1, n + 1)
    areas = ndimage.sum(ink, lab, index=idx)
    local = ndimage.uniform_filter(ink.astype(np.float32), win, mode="constant") * win * win
    near = ndimage.maximum(local, lab, index=idx)
    big = np.isin(lab, idx[areas > max_area])
    if not big.any():
        return im
    ys, xs = np.nonzero(big)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    objs = ndimage.find_objects(lab)
    # зөвхөн том бэхийн хүрээнээс ГАДНА (тайралтыг тэлдэг) — дотор нь бутархайн зураас г.м. хэвээр
    outside = np.array([
        sl[0].stop <= y0 or sl[0].start > y1 or sl[1].stop <= x0 or sl[1].start > x1 for sl in objs
    ])
    drop = idx[(areas <= max_area) & (near <= areas + 0.5) & outside]
    if not len(drop):
        return im
    m = ndimage.binary_dilation(np.isin(lab, drop), iterations=1)
    out = np.array(im.convert("RGB"))
    out[m] = 255
    return Image.fromarray(out)


def trim(im, pad=10, thr=200):
    im = despeckle(peel_hairlines(peel_long_gray_edge(peel_edges(remove_borders(im)))))
    g = im.convert("L").point(lambda v: 255 if v < thr else 0)
    box = g.getbbox()
    if not box:
        return None
    im = im.crop(box)
    out = Image.new("RGB", (im.width + 2 * pad, im.height + 2 * pad), (255, 255, 255))
    out.paste(im, (pad, pad))
    return out


def ink_columns(im, thr=200):
    """Багана бүрийн бараан пикселийн тоо (хүснэгтийн босоо хүрээ — өндрийн 85%+ — тооцохгүй)."""
    g = im.convert("L")
    w, h = g.size
    px = g.load()
    cols = []
    for x in range(w):
        n = sum(1 for y in range(0, h, 2) if px[x, y] < thr)
        cols.append(0 if n > 0.85 * (h / 2) else n)
    return cols


def split_left_of_choices(im, dpi):
    """
    Чертеж + сонголт НЭГ зурагт байх үед: баруун талын «(A).. (E)» баганын өмнөх хамгийн өргөн
    босоо цагаан завсраар таслаж зүүн хэсгийг (чертеж) буцаана. Завсар олдохгүй бол None.
    """
    cols = ink_columns(im)
    w = len(cols)
    min_gap = int(dpi * 4 / 72)  # ≥4pt
    gaps, start = [], None
    for x, v in enumerate(cols + [1]):
        if v == 0 and start is None:
            start = x
        elif v != 0 and start is not None:
            if x - start >= min_gap and start > w * 0.35 and x < w * 0.95:
                gaps.append((x - start, start, x))
            start = None
    if not gaps:
        return None
    # сонголт ихэвчлэн баруун 25–55% — хамгийн баруун талын томоохон завсар
    # чертежийн дараах ЭХНИЙ завсар (2 баганат сонголтын хоорондох завсар биш)
    gaps.sort(key=lambda g: g[1])
    _, gx0, _ = gaps[0]
    return im.crop((0, 0, gx0, im.height))


def cut_before(im, x_choice, search):
    """x_choice-ийн өмнөх [x_choice-search, x_choice+2] мужид хамгийн өргөн цагаан баганын эхлэл."""
    cols = ink_columns(im)
    lo, hi = max(0, x_choice - search), min(len(cols), x_choice + 3)
    best, run_start, best_start = 0, None, None
    for x in range(lo, hi):
        if cols[x] == 0:
            if run_start is None:
                run_start = x
            if x - run_start + 1 > best:
                best, best_start = x - run_start + 1, run_start
        else:
            run_start = None
    return best_start if best_start is not None else max(1, x_choice - 2)


XREF_OF = {}
OVERRIDES = {}


def erase_choice_ink(doc, page, rendered, region, choice_rects, dpi):
    """
    Сонголтын зургийн (PDF-ийн тусдаа давхарга) БЭХТЭЙ пикселийг л цагаан болгоно — чертеж
    сонголтын доор/хажууд үргэлжилсэн ч хөндөгдөхгүй (бүтэн өндрөөр таслахгүй).
    """
    out = rendered.copy()
    k = dpi / 72
    for r in choice_rects:
        ref = XREF_OF.get((page.number, tuple(round(v, 2) for v in r)))
        if not ref:
            continue
        xref, smask = ref
        try:
            pix = fitz.Pixmap(doc, xref)
            if pix.n - pix.alpha >= 4:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            if smask:
                # Soft mask (alpha) хэрэглэхгүй бол дэвсгэр зураг бүхэлдээ «бэх» болж чертежийг устгана
                pix = fitz.Pixmap(pix, fitz.Pixmap(doc, smask))
            src = flatten(pix).convert("L")
        except Exception:
            continue
        tw, th = max(1, int(r.width * k)), max(1, int(r.height * k))
        # бэхтэй пиксел → 255 маск, 5×5 тэлэлт (антиалиасын хүрээ ч арилна), цагаанаар буулгана
        mask = src.resize((tw, th)).point(lambda v: 255 if v < 232 else 0).filter(ImageFilter.MaxFilter(9))
        ox, oy = int((r.x0 - region.x0) * k), int((r.y0 - region.y0) * k)
        out.paste((255, 255, 255), (ox, oy, ox + tw, oy + th), mask)
    return out


def whiten_light(im, level=215):
    """Дэвсгэр зургийн антиалиас үлдэгдэл (цайвар саарал хүрээ) → цагаан. Сүүдэр (~170–200) хэвээр."""
    return im.point(lambda v: 255 if v > level else v)


def erase_raster_choices(im, choice_px, dpi):
    """
    Сонголт чертежтэй НЭГ растерт байвал давхаргаар арилахгүй — сонголтын мөрийн (босоо)
    мужид л баруун талын «(A)…» хэсгийг завсраар таслан цагаан болгоно (чертежийн доод/дээд
    хэсэг хөндөгдөхгүй).
    """
    x0, y0, x1, y1 = choice_px
    g = im.convert("L")
    w, h = g.size
    y0, y1 = max(0, y0), min(h, y1)
    if y1 - y0 < 5:
        return im
    band = g.crop((0, y0, w, y1))
    px = band.load()
    bw, bh = band.size
    lo, hi = max(0, x0 - int(25 * dpi / 72)), min(bw, x0 + int(6 * dpi / 72))
    # сонголтын бүсэд бэх үлдсэн үү
    resid = sum(1 for x in range(max(0, x0), min(bw, x1), 2) for y in range(0, bh, 2) if px[x, y] < 160)
    if resid < 20:
        return im
    best, start, best_start = 0, None, None
    for x in range(lo, hi):
        blank = all(px[x, y] >= 200 for y in range(0, bh, 2))
        if blank:
            start = x if start is None else start
            if x - start + 1 > best:
                best, best_start = x - start + 1, start
        else:
            start = None
    cut = best_start if best_start is not None else x0
    out = im.copy()
    out.paste((255, 255, 255), (cut, max(0, y0 - 6), w, min(h, y1 + 6)))
    return out


def drop_cut_top(im, frac=0.15, thr=200):
    """Дээд зах дээр тасарсан бичвэрийн мөр байвал эхний хоосон мөр хүртэл хасна."""
    g = im.convert("L")
    w, h = g.size
    px = g.load()
    def blank(y):
        return all(px[x, y] >= thr for x in range(0, w, 2))
    if all(blank(y) for y in range(0, min(3, h))):
        return im
    # зөвхөн НИМГЭН тасархай (≤30px, өндрийн ≤6%) — дээд захад хүрсэн үсэг (A ~40px) хэвээр
    for y in range(3, min(int(h * 0.06), 30) + 1):
        if blank(y):
            return im.crop((0, y, w, h))
    return im


def enhance(im):
    """
    Шугамын зургийн зөөлөн тодруулга: бага unsharp + түвшин (≥242 → цагаан, ≤45 → хар,
    антиалиас хэвээр). 200ppi эхтэй чертежийг тод болгоно; halo/шатлал үүсгэхгүй (туршсан).
    """
    g = im.convert("L").filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=4))
    return g.point(lambda v: 255 if v > 242 else (0 if v < 45 else int((v - 45) * 255 / (242 - 45))))


def save_atomic(im, path):
    """Түр файлд бичээд rename — зэрэг уншиж буй агент хагас бичигдсэн PNG харахгүй."""
    tmp = path + ".tmp.png"
    im.save(tmp, optimize=True)
    os.replace(tmp, path)


def layer_mask(doc, page, region, rects, dpi, thr=232, dilate=9):
    """Өгөгдсөн зургуудын (PDF давхарга) бэхтэй пикселийн маск — бүсийн хэмжээтэй L зураг."""
    k = dpi / 72
    W, H = int(round(region.width * k)), int(round(region.height * k))
    mask = Image.new("L", (max(1, W), max(1, H)), 0)
    for r in rects:
        ref = XREF_OF.get((page.number, tuple(round(v, 2) for v in r)))
        if not ref:
            continue
        xref, smask = ref
        try:
            pix = fitz.Pixmap(doc, xref)
            if pix.colorspace is None or pix.colorspace.n != 3:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            if smask:
                if pix.alpha:
                    pix = fitz.Pixmap(pix, 0)
                pix = fitz.Pixmap(pix, fitz.Pixmap(doc, smask))
            src = flatten(pix).convert("L")
        except Exception:
            continue
        tw, th = max(1, int(r.width * k)), max(1, int(r.height * k))
        m = src.resize((tw, th)).point(lambda v: 255 if v < thr else 0)
        if dilate > 1:
            m = m.filter(ImageFilter.MaxFilter(dilate))
        ox, oy = int((r.x0 - region.x0) * k), int((r.y0 - region.y0) * k)
        mask.paste(255, (ox, oy, ox + tw, oy + th), m)
    return mask


def erase_layer_protected(doc, page, rendered, region, erase_rects, protect_rects, dpi):
    """erase_rects-ийн бэхийг цагаан болгоно, ГЭХДЭЭ protect_rects (чертеж)-ийн бэхтэй пиксел хэвээр (6A-06 «D»)."""
    er = layer_mask(doc, page, region, erase_rects, dpi)
    raw = layer_mask(doc, page, region, erase_rects, dpi, dilate=3)  # нөхцөлийн жинхэнэ бэх
    pr = layer_mask(doc, page, region, protect_rects, dpi, thr=200, dilate=3)
    from PIL import ImageChops
    # чертежийн бэхийг зөвхөн тэлэлтийн (dilate) бүсэд хамгаална; нөхцөлийн бэхтэй давхцвал арилна
    # (чертежийн растерт нөхцөлийн хэлтэрхий давхар байдаг: 15B-12, 30A-10, 8B-11)
    m = ImageChops.subtract(er, ImageChops.subtract(pr, raw)).resize(rendered.size)
    out = rendered.copy()
    out.paste((255, 255, 255), (0, 0), m)
    return out


def image_rects(page):
    rects = []
    for info in page.get_images(full=True):
        for r in page.get_image_rects(info[0]):
            XREF_OF[(page.number, tuple(round(v, 2) for v in r))] = (info[0], info[1])
            rects.append(r)
    # давхардсан (нэг xref олон газар) болон хос (дэвсгэр+агуулга) — union-д нөлөөгүй
    return rects


def markers(page):
    """Нүдний дугаар ба y байрлал: ①.. эсвэл «II. n»."""
    found = []
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        for l in b["lines"]:
            raw = "".join(s["text"] for s in l["spans"]).strip()
            x0, y0 = l["bbox"][0], l["bbox"][1]
            if x0 > 110:
                continue
            m = re.match(r"^([①-⑳])", raw)
            if m:
                found.append((CIRCLED.index(m.group(1)) + 1, y0, "I"))
                continue
            # «𝐈𝐈. 𝟏» (математик тод) → «II. 1»; NFKC-г дугуйлсан дугаарын ДАРАА (① → 1 болгодог)
            t = unicodedata.normalize("NFKC", raw)
            m = re.match(r"^II\s*\.\s*(\d+)", t)
            if m:
                found.append((int(m.group(1)), y0, "II"))
    found.sort(key=lambda f: f[1])
    # Word-оос үлдсэн нуугдмал дугаар (17A/21A: «⑯»-ийн яг доор «⑪») — нэг мөрөнд хоёр
    # дугаар таарвал дараагийн дугаараас нэгээр бага нь (дараалал) үлдэнэ
    dedup = []
    for i, f in enumerate(found):
        same = [g for g in found if abs(g[1] - f[1]) < 5]
        if len(same) > 1:
            nxt = next((g for g in found if g[1] > f[1] + 5), None)
            want = nxt[0] - 1 if nxt else max(g[0] for g in same)
            if f[0] != want:
                continue
        dedup.append(f)
    return dedup


def main():
    pdf, out = sys.argv[1], sys.argv[2]
    pages = json.load(open(os.path.join(out, "pages.json")))
    os.makedirs(os.path.join(out, "cells"), exist_ok=True)
    os.makedirs(os.path.join(out, "fig"), exist_ok=True)
    doc = fitz.open(pdf)
    global OVERRIDES
    ov_path = os.path.join(out, "fig-overrides.json")
    OVERRIDES = {k: v for k, v in json.load(open(ov_path)).items() if not k.startswith("_")} if os.path.exists(ov_path) else {}
    only = None
    for a in sys.argv[3:]:
        if a.startswith("--only="):
            only = set(a.split("=", 1)[1].split(","))
    manifest = []
    for meta in pages:
        if only and meta["test"] not in only:
            continue
        page = doc[meta["page"] - 1]
        test = meta["test"]
        marks = markers(page)
        rects = image_rects(page)
        part2 = any(m[2] == "II" for m in marks)
        x1_cell = 450 if part2 else LEFT_X1  # II хэсэгт бодлого хүснэгтийн бүтэн өргөнөөр
        for i, (num, y0, part) in enumerate(marks):
            y1 = marks[i + 1][1] - 2 if i + 1 < len(marks) else PAGE_BOTTOM
            top = y0 - 3
            cell = fitz.Rect(72, top, x1_cell, y1)
            inside = [r for r in rects if r.intersects(cell) and r.x0 < x1_cell - 5 and r.y0 >= top - 4 and r.y1 <= y1 + 6]
            tall = [r for r in inside if r.height >= TEXT_H]
            # сонголтын багана: баруун талын нарийн өндөр зураг (I хэсэг)
            choice = None
            if part == "I":
                right = [r for r in tall if r.x0 > 180 and r.x1 > 240]
                if right:
                    choice = fitz.Rect(min(r.x0 for r in right), min(r.y0 for r in right),
                                       max(r.x1 for r in right), max(r.y1 for r in right))
            figs = [r for r in tall if choice is None or r.x1 <= choice.x0 + 12]
            if part == "II":
                # II хэсэг: зүүн талын чертеж (бичвэр баруун талд)
                # чертеж зүүн баганад (x1<210); «Бодолт» торын хавтгай хэсгүүд (өргөн/өндөр >3) хасна
                figs = [r for r in tall if r.x0 < 200 and r.x1 < 210 and r.width / max(r.height, 1) < 3]
            fig_rect = None
            if figs:
                fig_rect = fitz.Rect(min(r.x0 for r in figs), min(r.y0 for r in figs),
                                     max(r.x1 for r in figs), max(r.y1 for r in figs))
                if choice is not None:
                    fig_rect.x1 = min(fig_rect.x1, choice.x0 - 1)
            label = f"{test}-{'II' if part == 'II' else ''}{num:02d}"
            cell_png = os.path.join("cells", f"{label}.png")
            save_atomic(flatten(page.get_pixmap(clip=cell, dpi=CELL_DPI)), os.path.join(out, cell_png))
            fig_png = None
            fig_mode = None
            im = None
            if part == "I":
                # Нөхцөлийн мөрийн (намхан зураг) доорх бүсийг рендерлээд сонголтын бичвэрийн
                # өмнөх цагаан завсраар таслана — чертежийн зургийн цагаан зах сонголттой давхацдаг,
                # зарим нүдэнд чертеж+сонголт НЭГ зураг
                # нөхцөлийн мөрүүд: дээрээс гинжлэн (3 мөр хүртэл) — мөр бүр өмнөхийн доор ≤8pt
                # олон мөрт нөхцөл нэг өндөр зурагт байж болно: дээд талын өргөн (>140pt) зураг ч нөхцөл
                short = sorted([r for r in inside if r.height < TEXT_H
                                or (r.width > 140 and r.height < 60 and r.y0 < top + 25)], key=lambda r: r.y0)
                tops, reach = [], top + 25
                for r in short:
                    # нөхцөлийн мөр зүүн захаас (x0<105) эхэлнэ; чертежийн хажуугийн өгөгдөл
                    # («sinβ=3/5», «DB∥CK») догол мөртэй тул нөхцөлд тооцохгүй
                    if r.y0 < reach and (not tops or r.x0 < 105):
                        tops.append(r)
                        reach = max(reach, r.y1 + 8)
                # дэвсгэр/агуулга хос: доторх (агуулга) зургийн доод зах — дэвсгэр чертежийн
                # дээд үсэгтэй давхцаж таслахаас сэргийлнэ
                inner_tops = [r for r in tops if not any(o != r and r.contains(o) for o in tops)]
                y_start = max(r.y1 for r in inner_tops) + 0.5 if inner_tops else top + 15
                body = [r for r in tall if r.y1 > y_start + 5]
                # өгөгдлийн мөрүүд (намхан, нөхцөл биш, сонголтын багана биш) ч чертежийн бүсэд
                givens = [r for r in inside if r.height < TEXT_H and r not in tops and r.y1 > y_start + 2
                          and not (r.x0 > 180 and r.x1 > 240)]
                if body:
                    body = body + givens
                    # бүс чертежийн зургийн ДЭЭД захаас (нөхцөлийн мөрийн доор биш) — дээд үсэг (L, C, D)
                    # нөхцөлийн зурагтай давхацдаг; нөхцөлийн бэхийг доор давхаргаар арилгана
                    region = fitz.Rect(max(72, min(r.x0 for r in body)), max(top + 4, min(r.y0 for r in body)),
                                       min(x1_cell - 2.5, max(r.x1 for r in body)), min(y1 - 1.5, max(r.y1 for r in body)))
                    rendered = flatten(page.get_pixmap(clip=region, dpi=FIG_DPI))
                    k = FIG_DPI / 72
                    # I хэсгийн бүх агуулга растер — бүс доторх ВЕКТОР бичвэр нь Word-оос үлдсэн сул
                    # тэмдэгт («p», «W», «ы» г.м., 4A-04) → цагаан (дугаарын мөр бүсэд ордоггүй)
                    for b in page.get_text("dict")["blocks"]:
                        if b["type"] != 0:
                            continue
                        for l in b["lines"]:
                            lr = fitz.Rect(l["bbox"])
                            if lr.intersects(region) and "".join(sp["text"] for sp in l["spans"]).strip():
                                rendered.paste((255, 255, 255), (int((lr.x0 - region.x0 - 0.5) * k), int((lr.y0 - region.y0 - 0.5) * k),
                                                                 int((lr.x1 - region.x0 + 0.5) * k), int((lr.y1 - region.y0 + 0.5) * k)))
                    figlayers = [r for r in tall if not (r.x0 > 180 and r.x1 > 240)]
                    rendered = erase_layer_protected(doc, page, rendered, region,
                                                     [r for r in tops if r.intersects(region)], figlayers, FIG_DPI)
                    rendered = drop_cut_top(rendered)
                    if choice is not None:
                        right = [r for r in tall if r.x0 > 180 and r.x1 > 240]
                        before = rendered.copy()
                        left = erase_choice_ink(doc, page, rendered, region, right, FIG_DPI)
                        # растерт нийлсэн сонголт үлдсэн бол сонголтын мөрийн мужид таслана
                        inner = min(right, key=lambda r: r.width * r.height)
                        cpx = (int((inner.x0 - region.x0) * k), int((inner.y0 - region.y0) * k),
                               int((inner.x1 - region.x0) * k), int((inner.y1 - region.y0) * k))
                        pre = left
                        left = erase_raster_choices(left, cpx, FIG_DPI)
                        combined = left is not pre
                        # сонголтын (дэвсгэр) хүрээний саарал үлдэгдэл: сонголтын бүсэд зөвхөн
                        # СААРАЛ (>110) пикселийг цагаан — чертежийн бараан үсэг («C») хэвээр
                        gray = left.convert("L")
                        for r in right:
                            bx = (max(0, int((r.x0 - region.x0 - 4) * k)), max(0, int((r.y0 - region.y0 - 4) * k)),
                                  min(gray.width, int((r.x1 - region.x0 + 4) * k)), min(gray.height, int((r.y1 - region.y0 + 4) * k)))
                            if bx[2] > bx[0] and bx[3] > bx[1]:
                                part_img = gray.crop(bx).point(lambda v: 255 if v > 110 else v)
                                gray.paste(part_img, bx[:2])
                        left = gray.convert("RGB")
                        # чертежийн давхаргын бэх (сонголтын давхаргатай 3–12pt давхцдаг: 10B-08 «|»,
                        # 11B-09 «0») — сонголтын агуулгын бэхгүй газарт буцааж тавина
                        from PIL import ImageChops
                        prot = layer_mask(doc, page, region, figlayers, FIG_DPI, thr=200, dilate=3)
                        prot = ImageChops.subtract(prot, layer_mask(doc, page, region, [inner], FIG_DPI, thr=200, dilate=7))
                        if combined:  # сонголт чертежийн растерт — сонголтын мужийг хамгаалахгүй
                            prot.paste(0, (max(0, cpx[0] - int(25 * k)), cpx[1], prot.width, cpx[3]))
                        left.paste(before, (0, 0), prot.resize(left.size))
                        fig_mode = "erase"
                    else:
                        left = split_left_of_choices(rendered, FIG_DPI)
                        fig_mode = "split"
                    if left is not None:
                        im = trim(whiten_light(left.convert("L")).convert("RGB"))
                        fig_rect = region
            elif part == "II" and figs:
                # II хэсэг: бичвэр нь вектор (чертежтэй давхцана) → чертежийн ЭХ растер зургийг
                # (soft mask-тай) шууд авна — бичвэр, тор огт орохгүй
                def raster_of(r):
                    xref, smask = XREF_OF[(page.number, tuple(round(v, 2) for v in r))]
                    pix = fitz.Pixmap(doc, xref)
                    if pix.colorspace is None or pix.colorspace.n != 3:
                        pix = fitz.Pixmap(fitz.csRGB, pix)  # саарал/CMYK → RGB
                    if smask:
                        if pix.alpha:
                            pix = fitz.Pixmap(pix, 0)  # alpha-гүй болгоод soft mask-аар солино
                        pix = fitz.Pixmap(pix, fitz.Pixmap(doc, smask))
                    return flatten(pix)

                def ink(img):
                    return sum(img.convert("L").point(lambda v: 1 if v < 160 else 0).getdata())

                # дэвсгэр/агуулга хос — хоосон дэвсгэр биш, БЭХ ихтэйг сонгоно
                cands = [(r, raster_of(r)) for r in figs]
                best, raw = max(cands, key=lambda c: ink(c[1]))
                # бага нягтралтай бол 2× томруулна (Lanczos) — вэбэд тод
                if raw.width < 900:
                    raw = raw.resize((raw.width * 2, raw.height * 2), Image.LANCZOS)
                im = trim(raw)
                fig_rect = best
                fig_mode = "raster"
            elif fig_rect is not None and fig_rect.width > 20 and fig_rect.height > 20:
                rendered = flatten(page.get_pixmap(clip=fig_rect, dpi=FIG_DPI))
                # «II. n» шошго (бичвэр) чертежийн дээд зүүн буланд давхцдаг → цагаан
                k = FIG_DPI / 72
                lab = fitz.Rect(70, y0 - 3, 112, y0 + 16)
                if lab.intersects(fig_rect):
                    rendered.paste((255, 255, 255), (int((lab.x0 - fig_rect.x0) * k), int((lab.y0 - fig_rect.y0) * k),
                                                     int((lab.x1 - fig_rect.x0) * k), int((lab.y1 - fig_rect.y0) * k)))
                im = trim(rendered)
                fig_mode = "image"
            ov = OVERRIDES.get(label)
            if ov and ov.get("crop"):
                # гараар тодорхойлсон чертежийн хүрээ (нүдний хувиар)
                cw, chh = cell.width, cell.height
                fx0, fy0, fx1, fy1 = ov["crop"]
                rect = fitz.Rect(cell.x0 + fx0 * cw, cell.y0 + fy0 * chh, cell.x0 + fx1 * cw, cell.y0 + fy1 * chh)
                rendered = flatten(page.get_pixmap(clip=rect, dpi=FIG_DPI))
                k = FIG_DPI / 72
                for wx0, wy0, wx1, wy1 in ov.get("whiten", []):
                    box = (cell.x0 + wx0 * cw, cell.y0 + wy0 * chh, cell.x0 + wx1 * cw, cell.y0 + wy1 * chh)
                    rendered.paste((255, 255, 255), (int((box[0] - rect.x0) * k), int((box[1] - rect.y0) * k),
                                                     int((box[2] - rect.x0) * k), int((box[3] - rect.y0) * k)))
                im = trim(rendered)
                fig_rect = rect
                fig_mode = "manual"
            if im is not None and ov and ov.get("figWhiten"):
                # эцсийн чертеж дээрх сул тэмдэгт (эх PDF-ийн алдаа) — чертежийн хувиар
                w0, h0 = im.size
                for a, b, c, d in ov["figWhiten"]:
                    im.paste((255, 255, 255), (int(a * w0), int(b * h0), int(c * w0), int(d * h0)))
                im = trim(im)
            if im is not None:
                fig_png = os.path.join("fig", f"{label}.png")
                save_atomic(enhance(im), os.path.join(out, fig_png))  # саарал PNG
            manifest.append({
                "label": label,
                "test": test,
                "part": part,
                "number": num,
                "page": meta["page"],
                "cell": cell_png,
                "fig": fig_png,
                "figMode": fig_mode if fig_png else None,
                "figRect": [round(v, 1) for v in fig_rect] if fig_rect is not None else None,
                "choiceRect": [round(v, 1) for v in choice] if choice is not None else None,
            })
    if only and os.path.exists(os.path.join(out, "manifest.json")):
        # зөвхөн сонгосон тестүүдийг шинэчилж бусдыг хэвээр
        old = [m for m in json.load(open(os.path.join(out, "manifest.json"))) if m["test"] not in only]
        manifest = sorted(old + manifest, key=lambda m: (m["page"], m["part"], m["number"]))
    tmp = os.path.join(out, "manifest.json.tmp")
    json.dump(manifest, open(tmp, "w"), ensure_ascii=False, indent=1)
    os.replace(tmp, os.path.join(out, "manifest.json"))
    print(len(manifest), "бодлого")


if __name__ == "__main__":
    main()
