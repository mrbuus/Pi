# Анимацын бичлэг үүсгэх prompt-ууд (2026-11-14)

Зорилго: Duolingo-той өрсөлдөхүйц, «Шинэ ирээдүйн эзэд» / Piemath-ийн нэр, өнгө, математикийн дүр төрхтэй богино
бичлэгүүд. Санааны дэлгэрэнгүй: [ANIMATION-RESEARCH-2026-11.md](ANIMATION-RESEARCH-2026-11.md) §3 (С1–С15).

## Эхлээд унш: аль нь AI бичлэгээр, аль нь кодоор

| Төрөл | Хэрхэн | Яагаад |
|---|---|---|
| **Логоны нээлт** (бичвэр бичигдэх → дугуй гарч ирэх → √∞) | **Кодоор**, жинхэнэ лого файлаар | AI бичлэг «Shine ireeduin ezed» үсгийг заавал гажуудуулна, дугуйн өнгө, √-ийн хэлбэр өөрчлөгдөнө. Брэнд тэр чигээрээ үлдэх ёстой |
| **Урам өгөх дүр зураг** (амжилт, дараалсан өдөр, багшийн өдөр дууслаа) | AI бичлэг (доорх prompt) эсвэл код | Бичвэргүй, логогүй дүрслэл тул AI сайн хийнэ |
| **Ачааллын гогцоо, таб солих** | Зөвхөн код | Бичлэг декодер асахдаа саатуулж, хар кадр гаргадаг |

AI бичлэгт апп дотор **бичвэр бүү оруул** — оноо, нэр, «Сайн байна» зэргийг апп өөрөө дээр нь давхарлана
(тэгвэл монгол бичвэр зөв, сурагчийн жинхэнэ оноо гарна).

## Нийтлэг загвар — prompt бүрийн ӨМНӨ хуулж тавь

```
Style: clean 2D motion graphics with a subtle textbook-3D feel — thick rounded strokes, soft shadow "lip" under
shapes, like a premium math textbook come to life. Flat solid colors only: deep navy #273F74, white #FFFFFF,
light blue-grey #F5F7FB, soft sky blue #8FB3E8, teal #007373 for success accents, coral red #D9534F only for
small sparks. Plain solid #F5F7FB background (no gradient, no texture) so it can be keyed out.
Motifs: square-root sign, infinity sign, coordinate grid, parabola, unit circle, compass arc, graph paper,
chalk lines, geometric shapes snapping together. Smooth, bouncy but confident easing (spring overshoot ~10%),
60 fps feel, camera static. Audience: high school students 15–18 and their teachers — energetic, smart, not babyish.
Duration 2–3 seconds, seamless start and end on the same calm frame. Vertical 9:16 (also export 1:1).
```

**Сөрөг prompt** (хэрэгсэл зөвшөөрвөл):

```
no text, no letters, no numbers, no logos, no watermark, no yellow, no gold, no orange, no emoji, no faces,
no human characters, no cartoon animals, no photorealism, no 3D render plastic look, no gradients, no lens flare,
no glitter, no confetti rain, no particles everywhere, no camera shake, no flashing
```

## Дүр зургууд (нийтлэг загварын ДАРАА нэм)

**1. Шалгалт илгээсэн — «Давхар зураас» (сурагч, 2с)**
```
A white notebook card slides up from the bottom and lands with a soft bounce. A navy pen-stroke draws a confident
double underline beneath an empty space in the middle of the card (space reserved for a score). Two small sky-blue
sparks pop at the ends of the underline. The card settles. End on a calm frame.
```

**2. Даалгавар илгээгдсэн — «Хуудас хавтас руу» (сурагч, 1.5с)**
```
Three white paper sheets with faint graph-paper lines fan out, then glide one by one into a navy folder that closes
with a gentle snap. A teal check-mark draws itself on the folder in one smooth stroke. End on the closed folder.
```

**3. Өөрийн дээд амжилт — «Параболын орой» (сурагч, 2.5с)**
```
On a faint coordinate grid, a navy parabola draws from left to right, rising to a peak higher than a dashed sky-blue
line (the previous best). At the vertex a small teal circle pops and pulses once, the dashed line fades.
End with the parabola resting, vertex glowing softly.
```

**4. Дараалсан өдөр — «Долоо хоногийн нүд» (сурагч, 2с)**
```
Seven rounded square cells in a row, like a week. They fill one after another with navy, each with a tiny bounce,
the last one fills teal and a thin infinity sign draws itself above the row. End on the full row.
```

**5. Түвшин ахих — «Луужингийн нум» (сурагч, 2.5с)**
```
A navy geometry compass plants its point, swings a perfect white arc that closes into a full circle, the circle
fills sky blue and lifts up one step on a three-step staircase made of thick rounded blocks. End on the circle
resting on the higher step.
```

**6. Багш ирцээ дуусгасан — «Битүүмжлэх» (багш, 1с)**
```
A clean white clipboard sheet with rows of small navy dots. A teal stamp presses down once with a satisfying squash,
leaving a circular check seal. Minimal, respectful, quick. End on the stamped sheet.
```

**7. Багшийн өдрийн бүх анги — «Цэвэр самбар» (багш, 2.5с)**
```
A dark navy chalkboard with faint white chalk formulas (shapes only, unreadable). A felt eraser sweeps across in one
graceful arc, leaving the board clean and calm, then a single white chalk line draws a square-root sign with an
infinity sign under it. End on the clean board.
```

**8. Эцэг эхийн долоо хоногийн тойм (эцэг эх, 2с)**
```
A soft white card opens like a booklet, inside a row of seven small bar shapes grows from the bottom in navy and
sky blue, a thin teal line connects their tops. Calm and reassuring, slower easing. End on the open card.
```

**9. Нэвтрэх hero гогцоо — «Самбарын томьёо» (бүгд, 6с, гогцоо)**
```
Slow seamless loop: on a light graph-paper background, geometric shapes (triangle, unit circle, parabola, square
root sign, infinity sign) drift and gently assemble into a balanced composition, hold, then drift apart back to the
start. Very subtle motion, plenty of empty space at the top third for overlaid text.
```

**10. Интернэт эргэж холбогдсон (бүгд, 1с)**
```
A broken navy line graph with a small gap; the gap closes with a smooth snap and a tiny teal pulse travels along
the line to the end. End on the continuous line.
```

## Хэрэгсэл, тохиргоо

- Image-to-video боломжтой бол эхний кадрыг өөрөө зурж (эсвэл миний HTML загвараас screenshot авч) өг — өнгө,
  хэлбэр илүү тогтвортой гарна: `anim-proto/01-neelt-nevtrekh.html`, `anim-proto/02-mochid.html`.
- Нэг дүр зургийг 3–4 удаа үүсгэж хамгийн цэвэрийг сонго. Өнгө нь #273F74-аас хазайвал хэрэглэхгүй.
- Экспорт: MP4 H.264, 1080×1920 ба 1080×1080, 30 эсвэл 60 fps, дуугүй. Файл бүр 1 MB-аас бага байвал апп-д
  оруулж болно; их бол над өг — шахна.
- Апп-д оруулахаас өмнө: дэвсгэр #F5F7FB цэвэр эсэх (хар горимд тусдаа хувилбар хэрэгтэй), эхний ба сүүлийн
  кадр ижил эсэх, шар/алтан өнгө, үсэг, тоо огт байхгүй эсэхийг шалга.
