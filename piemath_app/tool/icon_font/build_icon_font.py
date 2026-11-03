"""Lucide дүрсний фонтыг апп-д ХЭРЭГЛЭСЭН глифээр л үлдээж, жижиг орлуулагч багц үүсгэнэ.

Яагаад: `lucide_icons_flutter` багц 7 фонт (lucide.ttf ~930KB + 6 хувьсах жин ~3MB) бүгдийг
APK-д оруулдаг. Flutter-ийн icon tree-shake зөвхөн хэрэглэсэн «Lucide» фонтыг багасгадаг, бусад 6
жинг бүтнээр нь хийдэг. Энэ скрипт:
  1) эх багцын `lib/lucide_icons.dart`-аас нэр → codepoint хүснэгтийг уншина
  2) `lib/` дотор `LucideIcons.<нэр>` гэж хэрэглэсэн бүх дүрсийг (AppIcons болон бусад) цуглуулна
  3) `pyftsubset`-ээр зөвхөн тэр глифүүдтэй НЭГ фонт үүсгэнэ
  4) ижил нэртэй (`lucide_icons_flutter`) орлуулагч багц бичнэ: `LucideIcons` классын API
     бүрэн хэвээр (бүх нэр, ижил codepoint), фонт нь зөвхөн subset.

Шинэ дүрс нэмбэл (AppIcons эсвэл feature дотор `LucideIcons.x`) скриптийг ДАХИН ажиллуул —
`test/core/ui/icon_font_test.dart` дутуу глифийг илрүүлж унана.

Ажиллуулах (piemath_app хавтсаас):
  pip install fonttools
  dart pub cache add lucide_icons_flutter --version 4.0.1   # эх багц pub-cache-д байхгүй бол
  python3 tool/icon_font/build_icon_font.py
"""
import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys

VERSION = "4.0.1"
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, "lucide_icons_flutter")

DECL = re.compile(
    r"static const IconData (\w+) = const IconData\((\d+),\s*"
    r"fontFamily: 'Lucide',\s*fontPackage: 'lucide_icons_flutter'(,\s*matchTextDirection: true)?\);"
)
USE = re.compile(r"\bLucideIcons\.(\w+)")


def find_source():
    roots = [os.environ.get("PUB_CACHE", ""), os.path.expanduser("~/.pub-cache")]
    for r in roots:
        p = os.path.join(r, "hosted", "pub.dev", f"lucide_icons_flutter-{VERSION}")
        if os.path.isfile(os.path.join(p, "lib", "lucide_icons.dart")):
            return p
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", help="эх lucide_icons_flutter багцын хавтас (pub-cache)")
    args = ap.parse_args()
    src = args.source or find_source()
    if not src:
        sys.exit(f"Эх багц олдсонгүй: dart pub cache add lucide_icons_flutter --version {VERSION}")

    with open(os.path.join(src, "lib", "lucide_icons.dart"), encoding="utf-8") as f:
        decls = [(m.group(1), int(m.group(2)), bool(m.group(3))) for m in DECL.finditer(f.read())]
    if len(decls) < 1000:
        sys.exit(f"Эх файлаас хэт цөөн дүрс уншигдлаа ({len(decls)}) — формат өөрчлөгдсөн байж магадгүй")
    code = {name: cp for name, cp, _ in decls}

    used = set()
    for path in glob.glob(os.path.join(APP, "lib", "**", "*.dart"), recursive=True):
        with open(path, encoding="utf-8") as f:
            used.update(USE.findall(f.read()))
    unknown = sorted(n for n in used if n not in code)
    if unknown:
        sys.exit(f"Lucide-д байхгүй нэр: {unknown}")
    names = sorted(used)
    unicodes = sorted({code[n] for n in names})

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, "assets"))
    os.makedirs(os.path.join(OUT, "lib"))

    font = os.path.join(OUT, "assets", "lucide.ttf")
    subprocess.check_call([
        "pyftsubset", os.path.join(src, "assets", "lucide.ttf"),
        "--unicodes=" + ",".join(f"U+{u:04X}" for u in unicodes),
        "--output-file=" + font,
        "--no-hinting", "--desubroutinize", "--layout-features=", "--name-IDs=", "--notdef-outline",
    ])

    with open(os.path.join(OUT, "assets", "glyphs.json"), "w", encoding="utf-8") as f:
        json.dump({"version": VERSION, "names": names, "codepoints": unicodes}, f, indent=1)
        f.write("\n")

    lines = [
        "// ЭНЭ ФАЙЛЫГ ГАРААР БҮҮ ЗАС — tool/icon_font/build_icon_font.py үүсгэсэн.",
        f"// Эх: lucide_icons_flutter {VERSION} (MIT), Lucide дүрс (ISC).",
        "// API нь эх багцынхтай ижил; фонтод зөвхөн апп-д хэрэглэсэн глиф бий.",
        "// ignore_for_file: constant_identifier_names",
        "library;",
        "",
        "import 'package:flutter/widgets.dart';",
        "",
        "@staticIconProvider",
        "class LucideIcons {",
        "  const LucideIcons._();",
        "",
    ]
    for name, cp, rtl in decls:
        extra = ", matchTextDirection: true" if rtl else ""
        lines.append(
            f"  static const IconData {name} = IconData({cp}, fontFamily: 'Lucide', "
            f"fontPackage: 'lucide_icons_flutter'{extra});"
        )
    lines += ["}", ""]
    with open(os.path.join(OUT, "lib", "lucide_icons.dart"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    with open(os.path.join(OUT, "pubspec.yaml"), "w", encoding="utf-8") as f:
        f.write(
            "# tool/icon_font/build_icon_font.py үүсгэсэн — апп-д хэрэглэсэн Lucide глифийн subset.\n"
            "name: lucide_icons_flutter\n"
            f"version: {VERSION}+subset\n"
            "publish_to: none\n"
            "environment:\n  sdk: '>=3.0.0 <4.0.0'\n"
            "dependencies:\n  flutter:\n    sdk: flutter\n"
            "flutter:\n  fonts:\n    - family: Lucide\n      fonts:\n        - asset: assets/lucide.ttf\n"
        )
    shutil.copy(os.path.join(src, "LICENSE"), os.path.join(OUT, "LICENSE"))

    print(f"дүрс: {len(names)} нэр, {len(unicodes)} глиф; фонт {os.path.getsize(font)} байт "
          f"(эх {os.path.getsize(os.path.join(src, 'assets', 'lucide.ttf'))})")


if __name__ == "__main__":
    main()
