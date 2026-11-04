"""Вэбийн woff2 фонт (web/public/fonts, OFL)-ыг апп-д зориулж статик TTF болгоно.

Вэб нь фонтыг unicode subset бүрээр (latin, latin-ext, cyrillic, cyrillic-ext) хувьсах
(variable, wght тэнхлэг) файлаар хадгалдаг. Flutter-т жин бүрээр нэг статик файл хэрэгтэй тул:
  1) subset бүрийг тухайн жингээр instance хийнэ
  2) subset-үүдийг нэг TTF болгон нэгтгэнэ (Ө ө Ү ү нь cyrillic-ext-д байдаг)

Ажиллуулах (piemath_app хавтсаас):
  pip install fonttools brotli
  python3 tool/build_fonts.py ../web/public/fonts assets/fonts
"""
import os
import sys
import tempfile

from fontTools.merge import Merger
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

WEIGHT_NAMES = {400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold"}
# Монгол кирилл заавал: Ө ө Ү ү, мөн А я A z
REQUIRED = [0x04E8, 0x04E9, 0x04AE, 0x04AF, 0x0410, 0x044F, 0x0041, 0x007A]


def build(src, out, family, weights, subsets):
    with tempfile.TemporaryDirectory() as tmp:
        for w in weights:
            parts = []
            for s in subsets:
                f = TTFont(os.path.join(src, f"{family.lower()}-{s}.woff2"))
                f.flavor = None
                inst = instancer.instantiateVariableFont(f, {"wght": w}, updateFontNames=False)
                p = os.path.join(tmp, f"{family}-{s}-{w}.ttf")
                inst.save(p)
                parts.append(p)
            name = f"{family}-{WEIGHT_NAMES[w]}.ttf"
            Merger().merge(parts).save(os.path.join(out, name))
            cmap = TTFont(os.path.join(out, name)).getBestCmap()
            missing = [hex(c) for c in REQUIRED if c not in cmap]
            print(name, os.path.getsize(os.path.join(out, name)), "дутуу:", missing)


if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    build(src, out, "Onest", [400, 500, 600, 700], ["latin", "latin-ext", "cyrillic", "cyrillic-ext"])
    # Unbounded нь зөвхөн том тоо/гарчигт. Ө/Ү глифгүй тул Onest руу fallback (AppTheme).
    build(src, out, "Unbounded", [600], ["latin", "cyrillic"])
