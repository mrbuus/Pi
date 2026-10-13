# 200x200 V3 + 100x100 V3 — импорт, гараар шалгах жагсаалт

Огноо: 2026-10-13. Зөвхөн ЛОКАЛ ӨС. Commit/прод хийгдээгүй.

## Юу хийгдсэн

- 200x200 V3 (`~/Desktop/Books/200x200 V3`) → шинэ ном `200V3`: 19 сэдэв, 202 тест (A/B), 2532 бодлого. V2 ном (`200`) нуусан, устгаагүй
- Шинэ: Дифференциал тэгшитгэл 1–5, Хурд хурдатгал (12 тест); өмнө алгасагддаг 3 файл
- Зурагтай бодлого: text box задлах (`docx-unwrap-textboxes.py`) + PDF байрлалаар эрэмбэлэх (`pdf-image-order.py`)
- График сонголт: 23 бодлого × 5 зураг (`ProblemChoice.imageKey`), нүдээр + PDF-тэй тулгаж шалгасан
- KaTeX: 12729 томьёо, алдаа 4 (2 бодлого, доор). 100x100 V3: 7937 томьёо, алдаа 0
- 100x100 V3 Рациональ тэнцэтгэл биш 13 (A/B): 12 өргөн зургийг 60 сонголт болгон таслав, 09/10 салгав, хариуны түлхүүр байхгүй байсныг бодож тогтоов (B-09 эх зураг 1 нүдээр хазайсан)

## Буцаах

```sql
UPDATE "Book" SET archived=false WHERE code='200';
UPDATE "Book" SET archived=true WHERE code='200V3';
```

## Гараар засах (67)

Засах: Номын сан → бодлого → «Засах» таб (сонголт бүрт «Зураг» товч)

### Задгай болсон — сонголт таниагүй (20)

- `INTEGRALYN_HEREGLEE-01-A-08` (текст зураг дотор)
- `INTEGRALYN_HEREGLEE-02-A-04` (текст зураг дотор)
- `KVADRAT_FUNKTSIIN_GRAFIK-01-B-12` (текст зураг дотор)
- `TRIGONOMETR_ILERHIILEL-03-A-02` $\cos\alpha = 2a - 5$ бол $a$ тооны авч болох бүх утгыг ол.
- `TRIGONOMETR_ILERHIILEL-03-B-04` (текст зураг дотор)
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-A-10` $f(x) = 1 - 3\sin2x$ функцийн график аль нь вэ?
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-A-11` $f(x) = - 2 + 4\cos2x$ функцийн график аль нь вэ?
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-B-10` $f(x) = 3 - 3\sin2x$ функцийн график аль нь вэ?
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-B-11` $f(x) = - 1 + 3\sin4x$ функцийн график аль нь вэ?
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-02-A-04` (текст зураг дотор)
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-02-A-05` $f(x) = 3\tg\left( \frac{x}{2} \right) - 4$ функцийн график аль нь вэ?
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-02-B-04` (текст зураг дотор)
- `TEGSH_SONDGOI_FUNKTS-02-A-02` Дараах функцийн графикуудын аль нь сондгой функцийн график вэ?
- `ULAMJLALYN_HEREGLEE-08-B-09` (текст зураг дотор)
- `ULAMJLALYN_HEREGLEE-11-B-01` (текст зураг дотор)
- `ULAMJLALYN_HEREGLEE-11-B-09` (текст зураг дотор)
- `FUNKTS-02-A-02` $f(x) = 3x - 7$ бол $f(2x + 1) -$ ийг ол.
- `FUNKTS-03-A-05` $P(3x + 1) = x^{2} - 3x - 2$ бол $P( - 2) -$ ийн утгыг ол. $(A). - 5 (
- `FUNKTS-03-B-05` $P(2x + 3) = 4x^{2} - 2x + 7$ бол $P(3) -$ ийн утгыг ол. $(A).37 (B).7
- `FUNKTS-04-A-01` Дараах графикуудын аль нь функцийн график болж чадахгүй вэ?

### Хариуны түлхүүрт байхгүй (22)

- `TRIGONOMETR_ILERHIILEL-03-B-09` (текст зураг дотор)
- `TRIGONOMETR_ILERHIILEL-03-B-10` $K\left( \frac{n\sqrt{3}}{2};\frac{1}{2} - n \right)$ цэг тригонометри
- `TRIGONOMETR_ILERHIILEL-08-A-01` $2\sin15{^\circ} \bullet \cos15{^\circ}$ утгыг ол.
- `TRIGONOMETR_ILERHIILEL-08-A-02` $\sin^{2}\frac{\pi}{8} - \cos^{2}\frac{\pi}{8}$ утгыг ол.
- `TRIGONOMETR_ILERHIILEL-08-A-03` $2\cos^{2}75{^\circ} - 1$ утгыг ол.
- `TRIGONOMETR_ILERHIILEL-08-A-04` $1 - 2\sin^{2}\frac{7\pi}{12}$ утгыг ол.
- `TRIGONOMETR_ILERHIILEL-08-A-05` $\sin75{^\circ} \bullet \cos75{^\circ}$ утгыг ол.
- `TRIGONOMETR_ILERHIILEL-08-A-06` $\left( \cos\frac{\pi}{12} + \sin\frac{\pi}{12} \right)^{2}$ утгыг ол.
- `TRIGONOMETR_ILERHIILEL-08-A-07` $\frac{\sin15{^\circ}}{\cos15{^\circ}} + \frac{\cos15{^\circ}}{\sin15{
- `TRIGONOMETR_ILERHIILEL-08-A-08` $\cos^{4}\frac{\pi}{8} - \sin^{4}\frac{\pi}{8}$ утгыг ол.
- `TRIGONOMETR_ILERHIILEL-08-A-09` $\frac{2}{\cos^{2}75{^\circ}} + \frac{2}{\sin^{2}75{^\circ}}$ утгыг ол
- `TRIGONOMETR_ILERHIILEL-08-A-10` $16 \bullet \sin\frac{\pi}{32} \bullet \cos\frac{\pi}{32} \bullet \cos
- `TRIGONOMETR_ILERHIILEL-08-A-11` $\sin\frac{\pi}{12} \bullet \left( 1 - 2\sin^{2}\frac{\pi}{24} \right)
- `TRIGONOMETR_ILERHIILEL-08-A-12` $\frac{4 - 2\sin^{2}15{^\circ}}{3}$ утгыг ол.
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-A-09` Дараах зурагт өгөгдсөн функц аль функцийн график вэ?
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-B-05` (текст зураг дотор)
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-B-09` Дараах зурагт өгөгдсөн функц аль функцийн график вэ?
- `ULAMJLALYN_HEREGLEE-06-B-16` Зурагт $y = f'(x)$ функцийн график өгөгдөв. $y = f(x)$ функцийн миниму
- `ULAMJLALYN_HEREGLEE-06-B-17` $f(x) = x^{3} + ax^{2} - bx + 7$ функцийн экстремумын цэгүүдийн абсцис
- `ULAMJLALYN_HEREGLEE-06-B-18` $f(x) = x^{3} - 2x^{2} + (6 - m)x + 6$ функц экстремумын цэггүй бол $m
- `ULAMJLALYN_HEREGLEE-06-B-19` $f(x) = x^{3} + ax^{2} - 9x + b$ функц $x = 1$ цэг дээр минимумын утга
- `FUNKTS-04-A-05` Дараах зурагт өгөгдсөн графикуудыг ашиглан $f\left( g(8) \right) + g\l

### A–E үсэг + бүтэн зураг (сонголтыг зургаар салгавал сайн) (25)

- `INTEGRALYN_HEREGLEE-01-A-07` Дараах зурагт $f(x) = {(x - 2)}^{2}$ функцийн график өгөгдөв. $\frac{S
- `INTEGRALYN_HEREGLEE-02-A-03` $y = x^{2} + 5x; y = 7 - x^{2}$ ба $x = - 1; x = 1$ шугамуудаар хязгаа
- `KVADRAT_FUNKTSIIN_GRAFIK-01-B-11` Дараах зурагт координатын эхийг дайрах $g(x)$ шулууннь $f(x) -$ ийн ор
- `TRIGONOMETR_ILERHIILEL-03-A-03` (текст зураг дотор)
- `TRIGONOMETR_ILERHIILEL-03-B-02` $\sin\alpha = 2a + 3$ бол $a$ тооны авч болох бүх утгыг ол.
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-A-02` (текст зураг дотор)
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-B-01` Дараах зурагт өгөгдсөн функцийн үеийг ол.
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-B-02` (текст зураг дотор)
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-B-04` Дараах зурагт $f(x) = a + bsin(cx)$ функцийн график өгөгдөв. $a - b + 
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-B-07` Дараах зурагт өгөгдсөн функц аль функцийн график вэ?
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-01-B-08` (текст зураг дотор)
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-02-A-01` (текст зураг дотор)
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-02-A-03` Дараах зурагт $y = a \bullet tgx + b$ функцийн график өгөдөв. $a \bull
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-02-B-01` (текст зураг дотор)
- `TRIGONOMETR_FUNKTSIIN_GRAFIK-02-B-03` Дараах зурагт $y = a \bullet tgx + b$ функцийн график өгөдөв. $a \bull
- `ULAMJLALYN_HEREGLEE-08-B-06` Дараах зурагт өгөгдсөн тэгш өнцөгтийн талбайн хамгийн их утгыг ол.
- `ULAMJLALYN_HEREGLEE-10-A-01` Зурагт өгсөн $L$ хэлбэрийн танхимын периметр нь 60 бол талбайн авч бол
- `ULAMJLALYN_HEREGLEE-10-A-03` (текст зураг дотор)
- `ULAMJLALYN_HEREGLEE-11-A-01` (текст зураг дотор)
- `ULAMJLALYN_HEREGLEE-11-B-08` Суурийн хүрээний урт нь $18\pi$ см;өндөр нь 6 см байх конус дотор цили
- `FUNKTS-02-A-03` (текст зураг дотор)
- `FUNKTS-04-A-02` Дараах функцийн графикуудын аль нь харилцан нэг утгатай функцийн графи
- `FUNKTS-04-A-03` Дараах зурагт өгөгдсөн $y = f(x)$ функцийн тодорхойлогдох мужийг ол.
- `FUNKTS-04-A-04` (текст зураг дотор)
- `FUNKTS-04-B-01` Дараах графикуудын аль нь функцийн график болж чадахгүй вэ?

### KaTeX алдаа

- `ULAMJLALYN_HEREGLEE-10-A-06` E сонголт (холимог бутархай)
- `ULAMJLALYN_HEREGLEE-10-B-07` бодлогын текст (холимог бутархай)
