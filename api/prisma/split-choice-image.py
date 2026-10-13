#!/usr/bin/env python3
"""
A–E сонголтыг нэг өргөн зурагт хэвтээ байрлуулсан зургийг сонголт бүрээр таслана.

  python3 prisma/split-choice-image.py <зураг> <гаралтын угтвар> [--n 5] [--keep-label]

Алхам: цагаан босоо зурвасаар n багана болгоно → баганын дээд «(A).» шошгыг
(эхний хэвтээ цагаан зурвас хүртэлх хэсэг) хасна → цагаан захыг тайрна.
"""
import sys
from PIL import Image

def ink_mask(im, thr=200):
    g = im.convert("RGBA")
    bg = Image.new("RGBA", g.size, (255, 255, 255, 255))
    bg.alpha_composite(g)
    return bg.convert("L"), lambda v: v < thr

def runs(flags):
    out, start = [], None
    for i, f in enumerate(flags + [False]):
        if f and start is None:
            start = i
        elif not f and start is not None:
            out.append([start, i])
            start = None
    return out

def split_columns(gray, is_ink, n):
    w, h = gray.size
    px = gray.load()
    col = [any(is_ink(px[x, y]) for y in range(h)) for x in range(w)]
    segs = runs(col)
    # хамгийн жижиг завсраар нь нийлүүлж n хэсэг болгоно
    while len(segs) > n:
        gaps = [(segs[i + 1][0] - segs[i][1], i) for i in range(len(segs) - 1)]
        _, i = min(gaps)
        segs[i] = [segs[i][0], segs[i + 1][1]]
        del segs[i + 1]
    return segs

def strip_label(gray, is_ink, box):
    x0, x1 = box
    w, h = gray.size
    px = gray.load()
    rows = [any(is_ink(px[x, y]) for x in range(x0, x1)) for y in range(h)]
    blocks = runs(rows)
    if len(blocks) >= 2:
        first = blocks[0]
        # шошго: намхан (зургийн өндрийн 25%-иас бага) эхний блок
        if first[1] - first[0] < h * 0.25:
            return blocks[1][0], blocks[-1][1]
    return blocks[0][0], blocks[-1][1]

def main():
    src, prefix = sys.argv[1], sys.argv[2]
    n = int(sys.argv[sys.argv.index("--n") + 1]) if "--n" in sys.argv else 5
    keep = "--keep-label" in sys.argv
    im = Image.open(src).convert("RGBA")
    gray, is_ink = ink_mask(im)
    segs = split_columns(gray, is_ink, n)
    if len(segs) != n:
        sys.exit(f"{src}: {len(segs)} багана олдлоо, {n} хүлээсэн")
    flat = Image.new("RGB", im.size, (255, 255, 255))
    flat.paste(im, mask=im.split()[3])
    for i, (x0, x1) in enumerate(segs):
        y0, y1 = (0, im.size[1]) if keep else strip_label(gray, is_ink, (x0, x1))
        crop = flat.crop((x0, y0, x1, y1))
        g2, ink2 = ink_mask(crop)
        bbox = Image.eval(g2, lambda v: 255 if ink2(v) else 0).getbbox()
        if bbox:
            crop = crop.crop(bbox)
        pad = Image.new("RGB", (crop.width + 16, crop.height + 16), (255, 255, 255))
        pad.paste(crop, (8, 8))
        out = f"{prefix}-{'ABCDE'[i]}.png"
        pad.save(out, optimize=True)
        print(out, pad.size)

if __name__ == "__main__":
    main()
