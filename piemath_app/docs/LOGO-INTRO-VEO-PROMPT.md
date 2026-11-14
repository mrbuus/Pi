# Логоны нээлтийн бичлэг — Gemini (Veo) prompt (2026-11-14)

## Хэрхэн ашиглах

1. Gemini → бичлэг (Veo). **Зураг хавсаргаж** эхэл: `web/public/logo-full.png` (бүтэн лого, ил тод дэвсгэр).
   Зураггүйгээр бичвэл AI «Shine ireeduin ezed» үсгийг заавал гажуудуулна.
2. Доорх үндсэн prompt-ыг бүтнээр нь хуул. Хэрэгсэл тусдаа «negative prompt» талбартай бол сөрөг хэсгийг тэнд.
3. 3–4 хувилбар гаргуулж, лого хамгийн цэвэр гарсныг сонго. Сүүлийн кадр яг хавсаргасан логотой ижил байх ёстой.
4. Бичлэгээ над өг (MP4) — би апп-д нээлтийн дэлгэц болгож оруулна (эхлэх, дуусах кадрыг тааруулж, шахна).

## Үндсэн prompt (хуулах)

```
Create a 3-second logo intro animation for an education brand, using the attached logo image as the exact final
frame. The logo has two parts: a handwritten script wordmark "Shine ireeduin ezed" in deep navy blue (#273F74) on
the left, and a solid deep navy circle on the right containing a white square-root sign with a white infinity
symbol under the root. The final frame must match the attached logo exactly — same letters, same proportions,
same colors, centered on a plain white background (#FFFFFF).

Sequence:
0.0–0.4 s: Plain white background. A single small glowing point of light, deep navy, appears at the left side of
where the infinity symbol will be.
0.4–1.4 s: The point of light travels smoothly along the path of the infinity symbol (a figure-eight loop),
leaving a clean white-and-navy ink trail behind it, completing one full loop of the infinity sign. The motion
accelerates gently and decelerates at the end, like a pen drawing it in one confident stroke.
1.2–1.8 s: As the loop closes, the deep navy circle expands outward from the center of the infinity symbol in one
soft, elastic pop (slight overshoot, then settles), and the square-root sign draws itself in white from its short
left tail, down into the check-shaped dip, and up along the long top bar, ending just above the infinity sign.
1.6–2.4 s: The handwritten wordmark "Shine ireeduin ezed" writes itself from left to right in deep navy, as if
written by a calligraphy pen, with the flourish under "ezed" drawn last.
2.4–3.0 s: Everything settles into the exact attached logo and holds perfectly still for the last half second.

Style: flat 2D vector motion graphics, crisp clean edges, no 3D, no shading, no gradients, no texture, no grain.
Only two colors: deep navy #273F74 and pure white #FFFFFF. Calm, premium, confident — like a high-end education
brand, not childish. Static camera, no zoom, no shake. 60 fps smoothness. Aspect ratio 9:16, logo centered,
logo width about 70% of the frame width. No sound.
```

## Сөрөг prompt (хуулах)

```
no grey, no light grey, no faded or washed-out colors, no pastel, no yellow, no gold, no orange, no red,
no gradients, no glow halo around the whole logo, no lens flare, no sparkles, no confetti, no particles, no 3D,
no shadows, no extra text, no misspelled letters, no changed letter shapes, no extra symbols, no pi symbol,
no people, no hands, no pen visible, no camera movement, no background pattern, no watermark
```

## Хувилбар: хязгааргүйн тэмдгийг дагаж эргэх гогцоо (ачаалах үед, 2 с, давтагддаг)

```
Seamless 2-second looping animation on a plain white background. A deep navy (#273F74) infinity symbol, thick
smooth stroke, centered. A small white dot with a short soft navy trail travels continuously along the infinity
path, looping forever at a constant calm speed. The first and last frames are identical so it loops seamlessly.
Flat 2D vector style, only navy and white, no text, no gradients, no grey, static camera, aspect ratio 1:1.
```

## Хүлээн авах шалгуур (бичлэгийг шалгах)

- Сүүлийн 0.5 секундэд лого хавсаргасан зурагтай яг ижил, хөдөлгөөнгүй.
- Үсэг гажаагүй: «Shine ireeduin ezed», «ezed» доорх зураас бүтэн.
- Саарал, бүдэг өнгө огт байхгүй — зөвхөн хар хөх ба цагаан.
- Дэвсгэр цэвэр цагаан (апп-д хар горимд тусдаа хувилбар хэрэгтэй бол дэвсгэрийг #0F1319, бичвэрийг цагаан
  болгож дахин гаргуулна; дугуй хар хөх хэвээр).
