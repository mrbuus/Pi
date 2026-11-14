# Piemath брэндийн эх зургуудыг вэбийн logo-circle.png-оос гаргана (шинэ лого зохиохгүй).
# Ажиллуулах: python3 assets/branding/make_branding.py [intro]  (Pillow, numpy хэрэгтэй; `intro` = зөвхөн нээлтийн анимац)
import sys
from pathlib import Path
from PIL import Image
import numpy as np

HERE = Path(__file__).parent


def icons():
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


def intro():
    """Нээлтийн анимацын (BrandIntro) давхарга + системийн эхний цонхны дугуй.

    Эх: жинхэнэ бүтэн логоны том хувилбар `docs/v2/hero/home/logo-full.png` (вэбийн logo-full.png-ийн 2x эх).
    Лого = хар хөх эллипс дугуй (кодоор зурна) + хар хөх бичвэр + цагаан (дугуй дээрх үсэг, язгуур,
    хязгааргүйн тэмдэг). Цагаан бүрэлдэхүүнийг өнгөний цайралтаас, бичвэрийг дугуйн дээрх үлдэгдлээс
    яг задална — давхаргуудыг давхарлавал эх логотой давхцана. Зураг бүр alpha-гийн хүрээгээр тайрагдсан
    (санах ой бага); offset-ийг `brand_intro.dart`-ийн `_Layer`-т бичнэ.
    """
    NAVY = np.array([0x27, 0x3F, 0x74], float)
    OUT = HERE.parent / "brand/intro"
    W = 1120  # 280pt x 4 (BrandIntro.canvasWidth)
    src = Image.open(HERE.parent.parent.parent / "docs/v2/hero/home/logo-full.png").convert("RGBA")
    src = src.crop(src.getchannel("A").getbbox())
    H = round(src.height * W / src.width)
    im = np.asarray(src.resize((W, H), Image.LANCZOS)).astype(float)
    a = im[..., 3] / 255
    w = np.clip(a * (im[..., :3].mean(axis=2) - NAVY.mean()) / (255 - NAVY.mean()), 0, a)  # цагаан (дээд давхарга)
    navy = np.where(w < 1, np.clip((a - w) / np.maximum(1 - w, 1e-6), 0, 1), 0)  # доор нь хар хөх

    yy, xx = np.mgrid[0:H, 0:W] + 0.5

    def ellipse(cx, cy, rx, ry, x=xx, y=yy):
        k = np.hypot((x - cx) / rx, (y - cy) / ry)
        grad = np.hypot((x - cx) / (rx * rx), (y - cy) / (ry * ry)) / np.maximum(k, 1e-6)
        return np.clip((1 - k) / np.maximum(grad, 1e-9) + 0.5, 0, 1)

    # Дугуй (лого дээр бага зэрэг өргөн эллипс): үсэг, язгуурын шугамгүй хэсэгт антиалиастай тааруулна
    fit = ~((yy < 330) & (xx < 860)) & ~((yy > 160) & (yy < 192) & (xx > 1060)) & (xx > 560)
    p, step = np.array([868.0, 234.5, 233.0, 233.0]), np.full(4, 2.0)
    best = np.abs(ellipse(*p) - navy)[fit].mean()
    while step.max() > 0.01:
        moved = False
        for i in range(4):
            for sgn in (1, -1):
                q = p.copy(); q[i] += sgn * step[i]
                e = np.abs(ellipse(*q) - navy)[fit].mean()
                if e < best: p, best, moved = q, e, True
        if not moved: step /= 2
    cx, cy, rx, ry = p
    disc = ellipse(*p)
    keep = (disc > 0) | ((xx > W - 60) & (yy > 160) & (yy < 190))  # цагаан зөвхөн дугуй дээр (+ язгуурын үзүүр)
    w = np.where(keep, w, 0)
    navy = np.where(keep, navy, a)
    word = np.where(disc < 1, np.clip((navy - disc) / np.maximum(1 - disc, 1e-6), 0, 1), 0)
    word[:, 850:] = 0  # дугуйн ирмэгийн антиалиасын үлдэгдэл (харанхуй горимд цагаан цагираг болохгүй)
    inf_box = (xx > 905) & (xx < 1060) & (yy > 245) & (yy < 325)
    letters = (yy < 308) & (xx < 850) & ~inf_box

    print(f"canvas {W}x{H}; disc center ({cx:.2f}, {cy:.2f}) radii ({rx:.2f}, {ry:.2f})")
    for f in ("disc.png", "root-infinity.png"):
        (OUT / f).unlink(missing_ok=True)
    for name, alpha in (("wordmark", word), ("text-on-disc", w * letters), ("root", w * ~letters * ~inf_box),
                        ("infinity", w * inf_box)):
        al = (np.clip(alpha, 0, 1) * 255 + 0.5).astype(np.uint8)
        b = Image.fromarray(al).getbbox()
        img = np.zeros((H, W, 4), np.uint8); img[..., :3] = 255; img[..., 3] = al
        Image.fromarray(img).crop(b).save(OUT / f"{name}.png", optimize=True)
        print(f"  {name}: offset ({b[0]}, {b[1]})")

    # Системийн эхний цонх = анимацын эхний кадр: дугуй дангаараа, дэлгэцийн голд, 4x (1px = 0.25pt).
    def disc_png(size):
        ss = 4
        y, x = (np.mgrid[0:size[1] * ss, 0:size[0] * ss] + 0.5) / ss
        cov = ellipse(size[0] / 2, size[1] / 2, rx, ry, x, y)  # дэд пикселд хатуу ирмэг -> дундаж
        cov = (cov > 0.5).reshape(size[1], ss, size[0], ss).mean(axis=(1, 3))
        img = np.zeros((size[1], size[0], 4), np.uint8); img[..., :3] = NAVY; img[..., 3] = (cov * 255 + 0.5).astype(np.uint8)
        return Image.fromarray(img)
    d = (2 * int(np.ceil(rx)) + 4, 2 * int(np.ceil(ry)) + 4)
    disc_png(d).save(HERE / "splash-disc.png", optimize=True)
    disc_png((960, 960)).save(HERE / "splash-disc-android12.png", optimize=True)  # 240dp, дугуй маск 160dp
    print("intro ok")


if __name__ == "__main__":
    if sys.argv[1:] != ["intro"]:
        icons()
    intro()
