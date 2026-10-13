#!/usr/bin/env python3
"""
DOCX-ийн text box (mc:AlternateContent → w:txbxContent)-ыг ердийн догол мөр болгоно.

pandoc text box агуулсан догол мөрийн ҮЛДСЭН хэсгийг (дугуйлсан дугаар ③, анкертай
график) хаядаг тул 200x200 V3-ийн зурагтай бодлогууд алга болж, хоёр бодлого нийлдэг.
Энд: эх догол мөрөөс text box-ыг авч хаяад (дугаар + зураг үлдэнэ), text box доторх
догол мөрүүдийг араас нь оруулна. Анкертай зургийг inline болгоно (pandoc найдвартай уншина).

  python3 prisma/docx-unwrap-textboxes.py <эх.docx> <гаралт.docx>
"""
import copy
import sys
import zipfile

from lxml import etree

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}
W = "{%s}" % NS["w"]
WP = "{%s}" % NS["wp"]


def anchor_to_inline(anchor):
    inline = etree.Element(WP + "inline", nsmap=anchor.nsmap)
    for attr in ("distT", "distB", "distL", "distR"):
        inline.set(attr, "0")
    for tag in ("extent", "effectExtent", "docPr", "cNvGraphicFramePr"):
        el = anchor.find(WP + tag)
        if el is not None:
            inline.append(copy.deepcopy(el))
    graphic = anchor.find("a:graphic", NS)
    if graphic is not None:
        inline.append(copy.deepcopy(graphic))
    anchor.getparent().replace(anchor, inline)


def _offset(anchor, axis):
    pos = anchor.find("wp:position" + axis, NS)
    if pos is None:
        return None
    off = pos.find("wp:posOffset", NS)
    try:
        return int(off.text) if off is not None else None
    except (TypeError, ValueError):
        return None


ROW_EMU = 400000  # ~0.44 инч: үүнээс бага босоо зөрүүтэй зургууд нэг мөрөнд


def sort_anchored_pictures(root):
    """
    Нэг догол мөр дэх анкертай зургууд XML-д дурын дараалалтай (хуудсан дээр A–E
    зүүнээс баруун тийш харагдана). Мөр (босоо) → хэвтээ байрлалаар эрэмбэлж
    run-уудын байрыг солино — сонголтын зураг үсэгтэйгээ таарна.
    """
    changed = 0
    for p in root.iter(W + "p"):
        runs = [r for r in p.findall("w:r", NS) if r.find(".//wp:anchor/a:graphic", NS) is not None]
        if len(runs) < 2:
            continue
        keys = []
        for r in runs:
            a = r.find(".//wp:anchor", NS)
            x, y = _offset(a, "H"), _offset(a, "V")
            if x is None or y is None:
                keys = None
                break
            keys.append((y, x))
        if not keys:
            continue
        # босоо байрлалыг мөр болгон бүлэглэнэ
        ys = sorted(k[0] for k in keys)
        rows, cur = [], [ys[0]]
        for v in ys[1:]:
            if v - cur[0] > ROW_EMU:
                rows.append(cur)
                cur = [v]
            else:
                cur.append(v)
        rows.append(cur)
        row_of = lambda v: next(i for i, rr in enumerate(rows) if v in rr)
        order = sorted(range(len(runs)), key=lambda i: (row_of(keys[i][0]), keys[i][1]))
        if order == list(range(len(runs))):
            continue
        slots = [(r.getparent(), r.getparent().index(r)) for r in runs]
        copies = [copy.deepcopy(runs[i]) for i in order]
        for (parent, idx), new in zip(slots, copies):
            parent.replace(parent[idx], new)
        changed += 1
    return changed


def outer_paragraph(el):
    """el-ийг агуулсан хамгийн гадна талын w:p (text box доторх биш)."""
    p = None
    cur = el.getparent()
    while cur is not None:
        if cur.tag == W + "p":
            p = cur
        if cur.tag == W + "txbxContent":
            p = None  # text box доторх догол мөр — гадна талынхыг хайна
        cur = cur.getparent()
    return p


def unwrap(xml_bytes):
    root = etree.fromstring(xml_bytes)
    moved = 0
    # Гаднаас дотогш: эхлээд гадна талын text box-ууд
    for ac in root.iter("{%s}AlternateContent" % NS["mc"]):
        pass
    acs = [ac for ac in root.iter("{%s}AlternateContent" % NS["mc"])
           if ac.find(".//w:txbxContent", NS) is not None]
    for ac in acs:
        if ac.getparent() is None:
            continue
        host = outer_paragraph(ac)
        if host is None:
            continue
        choice = ac.find("mc:Choice", NS)
        src = choice if choice is not None else ac
        boxes = src.findall(".//w:txbxContent", NS)
        paras = []
        for box in boxes:
            for p in box.findall("w:p", NS):
                paras.append(copy.deepcopy(p))
        # text box-ыг эх мөрөөс авна (дугаар/зураг үлдэнэ)
        ac.getparent().remove(ac)
        parent = host.getparent()
        idx = parent.index(host)
        for i, p in enumerate(paras):
            parent.insert(idx + 1 + i, p)
        moved += 1
    reordered = sort_anchored_pictures(root)
    for anchor in list(root.iter(WP + "anchor")):
        if anchor.find(".//a:graphic", NS) is not None:
            anchor_to_inline(anchor)
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True), moved


def main():
    src, out = sys.argv[1], sys.argv[2]
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
        moved = 0
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                data, moved = unwrap(data)
            zout.writestr(item, data)
    print(moved)


if __name__ == "__main__":
    main()
