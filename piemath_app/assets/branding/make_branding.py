# Piemath брэндийн эх зургуудыг вэбийн logo-circle.png-оос гаргана (шинэ лого зохиохгүй).
# Ажиллуулах: python3 assets/branding/make_branding.py  (Pillow хэрэгтэй)
from pathlib import Path
from PIL import Image
import numpy as np

HERE = Path(__file__).parent
SRC = HERE.parent.parent.parent / "web/public/logo-circle.png"
NAVY = (0x27, 0x3F, 0x74)

im = np.asarray(Image.open(SRC).convert("RGBA")).astype(float)
rgb, a = im[..., :3], im[..., 3] / 255.0
navy = np.array(NAVY, float)
# Цагаан тэмдэг = дугуйн цагаан хэсэг: цагаан руу ойр байх хэмжээгээр alpha
t = np.clip((rgb - navy).mean(axis=2) / (255 - navy.mean()), 0, 1)
alpha = np.clip((t * a - 0.15) / 0.85, 0, 1)  # дугуйн ирмэгийн сүүдрийг таслана
# Дугуйн гадна хүрээ (тунгалаг) -> 0
mark = np.zeros(im.shape, np.uint8)
mark[..., :3] = 255
mark[..., 3] = (alpha * 255).astype(np.uint8)
m = Image.fromarray(mark, "RGBA")
bbox = m.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
m = m.crop(bbox)

def place(size, frac, bg=None):
    """Тэмдгийг size хэмжээт зураг дээр, өргөнийхөө frac хувьд төвлөрүүлнэ."""
    w = int(size * frac)
    h = int(m.height * w / m.width)
    r = m.resize((w, h), Image.LANCZOS)
    base = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    base.alpha_composite(r, ((size - w) // 2, (size - h) // 2))
    return base

# Android adaptive: 108dp-ийн дундах 66% аюулгүй бүс; тэмдгийн өргөн ~52%
place(1024, 0.52).save(HERE / "icon-foreground.png")
place(1024, 0.46).save(HERE / "icon-monochrome.png")
Image.new("RGB", (1024, 1024), NAVY).save(HERE / "icon-background.png")
# iOS: альфагүй, бүтэн хөх дэвсгэр
place(1024, 0.60, NAVY + (255,)).convert("RGB").save(HERE / "icon-ios.png")
# Splash: цагаан дэвсгэр дээр — хөх дугуй лого; хар горимд хөх дэвсгэр дээр цагаан тэмдэг
Image.open(SRC).convert("RGBA").resize((768, 768), Image.LANCZOS).save(HERE / "splash-light.png")
place(768, 0.80).save(HERE / "splash-dark.png")
# Android 12 splash icon (дугуй маск 2/3-д багтана)
place(960, 0.42).save(HERE / "splash-android12.png")
print("ok", m.size)

# Бүтэн лого (эзэн 2026-11-14: апп нээгдэхэд бүтэн лого хамгийн түрүүнд). flutter_native_splash зургийг
# 4x нягтралтай гэж үздэг: 1120px өргөн = 280pt. Бичвэр хар горимд цагаан хувилбар (вэбийн LogoMark).
FULL = HERE.parent.parent.parent / "web/public"
for src, out in (("logo-full.png", "splash-full-light.png"), ("logo-full-dark.png", "splash-full-dark.png")):
    full = Image.open(FULL / src).convert("RGBA")
    full = full.crop(full.getchannel("A").getbbox())
    w = 1120
    h = round(full.height * w / full.width)
    canvas = Image.new("RGBA", (w + 64, h + 64), (0, 0, 0, 0))
    canvas.alpha_composite(full.resize((w, h), Image.LANCZOS), (32, 32))
    canvas.save(HERE / out)
print("full ok")
