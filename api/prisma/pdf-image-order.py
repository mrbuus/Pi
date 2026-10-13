#!/usr/bin/env python3
"""
Docx-оос гаргасан зургуудыг эх PDF дээрх БОДИТ байрлалаар нь эрэмбэлнэ.

Docx-д анкертай зургийн дараалал хуудсан дээрхээс өөр байж болдог (A–E график холилдоно).
PDF-д суулгасан зураг бүрийн average-hash-ийг docx-ийн зурагтай тулгаж, (хуудас, мөр, x)-ээр
эрэмбэлнэ.

  python3 prisma/pdf-image-order.py <эх.pdf> <зураг1> ... <зурагN>
  → JSON: {"order": [индексүүд], "maxDist": n} эсвэл {"error": "..."}
"""
import json
import sys

import fitz
from PIL import Image

ROW = 25  # pt — үүнээс бага босоо зөрүүтэй зургууд нэг мөрөнд


def ahash(im, size=16):
    g = im.convert("L").resize((size, size), Image.LANCZOS)
    px = list(g.get_flattened_data()) if hasattr(g, "get_flattened_data") else list(g.getdata())
    mean = sum(px) / len(px)
    return [1 if p > mean else 0 for p in px]


def flatten(im):
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[3])
        return bg
    return im.convert("RGB")


def dist(a, b):
    return sum(x != y for x, y in zip(a, b))


def main():
    pdf, imgs = sys.argv[1], sys.argv[2:]
    doc = fitz.open(pdf)
    cands = []  # (hash, page, y, x, aspect)
    for pno, page in enumerate(doc):
        for info in page.get_images(full=True):
            xref = info[0]
            try:
                pix = fitz.Pixmap(doc, xref)
                if pix.n - pix.alpha >= 4:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                mode = "RGBA" if pix.alpha else "RGB"
                im = Image.frombytes(mode, (pix.width, pix.height), pix.samples)
            except Exception:
                continue
            h = ahash(flatten(im))
            for rect in page.get_image_rects(xref):
                cands.append((h, pno, rect.y0, rect.x0, pix.width / max(pix.height, 1)))
    if not cands:
        print(json.dumps({"error": "PDF-д зураг алга"}))
        return
    pos, worst, used = [], 0, set()
    for path in imgs:
        h = ahash(flatten(Image.open(path)))
        best = min(
            (i for i in range(len(cands)) if i not in used),
            key=lambda i: dist(h, cands[i][0]),
            default=None,
        )
        if best is None:
            print(json.dumps({"error": "тулгах зураг дутсан"}))
            return
        used.add(best)
        d = dist(h, cands[best][0])
        worst = max(worst, d)
        pos.append((cands[best][1], cands[best][2], cands[best][3]))
    # мөр бүлэглэх: хуудас + y
    base = sorted(set((p, y) for p, y, _ in pos))
    def row(p, y):
        first = min((pp, yy) for pp, yy in base if pp == p and abs(yy - y) <= ROW)
        return first
    order = sorted(range(len(imgs)), key=lambda i: (row(pos[i][0], pos[i][1]), pos[i][2]))
    print(json.dumps({"order": order, "maxDist": worst}))


if __name__ == "__main__":
    main()
