# 6 эрхээр нэвтэрч гол хуудас шалгасан тэмдэглэл

Огноо: 2026-10-08 · Орчин: локал `--production` (вэб 3381, API 3380) · Зохиомол `.runtime/accounts.json` данс.

## Нэвтрэлт ба үндсэн хуудас

| Эрх | Нэвтэрсэн үү | Буусан хуудас | Шалгасан хуудас | Үр дүн |
|---|---|---|---|---|
| ADMIN | Тийм | `/app/admin` | `/app/admin/capabilities`, `/app/admin/v2`, `/app/import`, `/help`, `/app/feedback` | Бүгд бодит өгөгдөлтэй гарч ирэв |
| TEACHER_PLUS | Тийм | `/app/teacher` | `/app/lesson-flow`, `/app/groups` | lesson-flow бүрэн; groups алдааны төлөв (доор §3) |
| TEACHER | Тийм | `/app/teacher` | `/app/import`, `/app/admin` | Эрхийн хаалт зөв ажиллав |
| STUDENT | Тийм | `/app/student` | `/app/study`, `/app/study/review`, `/app/study/history` | study хуудсанд асуудал (§1) |
| BUYER | Тийм | `/app/buyer` | `/app/store`, `/app/study/history` | Бүгд хэвийн |
| PARENT | Тийм | `/app/parent` | `/app/admin` | Хүүхдийн явц бүрэн; админ зөв хаагдав |

Гарах товч ажиллаж, `/login` руу буцаав.

## Эрхийн хаалт

- `TEACHER` → `/app/import`: «Энэ хэрэгсэл багш+ болон админ эрх шаарддаг».
- `TEACHER` → `/app/admin`: «Хандах эрхгүй байна».
- `PARENT` → `/app/admin`: «Хандах эрхгүй байна».
- Серверийн гэрээний тест: `NIGHT1_COMPLETE=1 npx jest src/auth/access-control.spec.ts` → **55/55 passed**.

---

## 1. `/app/study` — өгөгдөл ачаалах нь `requestAnimationFrame`-д түгжигдсэн

**Файл:** `web/src/app/app/study/page.tsx:131`

```js
useEffect(() => {
  const frame = requestAnimationFrame(() => {
    void load();          // ← 5 API дуудлага энд л эхэлнэ
    ...
  });
  return () => cancelAnimationFrame(frame);
}, []);
```

**Нотолгоо (хэмжсэн):**

| Төлөв | API дуудлага | Skeleton | main текст |
|---|---|---|---|
| Таб нуугдсан үед ачаалсан | 3 (`consent`, `notifications`, `auth/me`) | 2 | 129 тэмдэгт |
| Гараар нэг frame үүсгэсний дараа | 8 (`learning-lab/history`, `assignments/my`, `recommend/next`, `lessons/chapters`, `activity/me` нэмэгдэв) | 0 | 751 тэмдэгт |

Браузер нуугдсан баримт бичигт frame гаргахгүй учраас rAF callback ажиллахгүй, `load()` дуудагдахгүй, `loading` үүрд `true` хэвээр үлдэнэ. Таб харагдах болмогц нэг frame гарч, өөрөө сэргэдэг.

**Нөлөө:** cmd+click-ээр ар талд нээсэн, session restore хийсэн, эсвэл ачаалж байх үед өөр таб руу шилжсэн тохиолдолд сурагч зөвхөн skeleton харна. Фокус авмагц сэргэнэ.

**Тэмдэглэл:** React hydration хэвийн (`__reactFiber$` байна), chunk бүгд 200, service worker байхгүй — өөр шалтгаан биш.

**Засвар:** `requestAnimationFrame` боохыг авч хаяж, `load()`-ийг `useEffect` дотор шууд дуудах. Энэ төслийн бусад хуудсуудын аль нь ч өгөгдөл ачаалахдаа rAF ашигладаггүй (бусад 10 хэрэглээ нь бүгд анимаци).

---

## 2. `/app/study/review` — тоолуур `budgetMinutes`-д хязгаарлагдаагүй

**Файл:** `web/src/app/app/study/review/page.tsx:165-173`

```js
setRemaining(
  Math.max(0, Math.ceil((Date.parse(run.deadlineAt) - Date.now() - offset.current) / 1000)),
);
```

Дээд хязгаар байхгүй. Дэлгэц дээр **`1174148:48`** (≈2.2 жил) гэж харагдав.

**Шалтгаан — API-ийн бодит хариу:**

```json
{ "budgetMinutes": 10,
  "startedAt":  "2028-12-31T16:00:00.000Z",
  "deadlineAt": "2028-12-31T16:10:00.000Z",
  "serverNow":  "2026-10-08T07:01:26.012Z",
  "status": "OPEN", "selectionVersion": "synthetic-history" }
```

Seed нь `startedAt`-ийг **2028 он** гэж ирээдүйд үүсгэсэн. Тоолуур зөв тооцоолж байгаа ч гаралт утгагүй.

**Хоёр тусдаа асуудал:**

1. **Seed өгөгдөл буруу** — `synthetic-history` давталтын run 2028 оны огноотой.
2. **UI хамгаалалтгүй** — `budgetMinutes: 10` гэж бичигдсэн run хэзээ ч `1174148:48` гэж харагдах ёсгүй. Цагийн зөрүү, timezone алдаа, эсвэл буруу өгөгдөл орвол 10 минутын давталт **хязгааргүй хугацаатай** болно.

**Засвар:** `Math.min(run.budgetMinutes * 60, ...)` нэмэх. Серверийн талд `deadlineAt > startedAt + budgetMinutes` байх үед татгалзах эсэхийг тусад нь шалгах.

---

## 3. `/app/groups` — Багш+ дээр алдааны төлөв

Багш+-ээр ороход: «Нэгдсэн ангийн бүлгүүд · **Идэвхтэй баталгаажсан гадны багш шаардлагатай** · Дахин оролдох».

Төвийн Багш+ нь гадны баталгаажсан багш биш учраас энэ хариу зөв байж магадгүй. Гэхдээ «Дахин оролдох» товч санал болгож байгаа нь түр зуурын алдаа мэт харагдуулж байна. Хэрэв энэ бол зориудын эрхийн хаалт бол тайлбар бичвэр болгож, retry товчийг авах. **Баталгаажаагүй** — эзэн шийдэх.

---

## 4. Жижиг ажиглалт

- `pi_token` нь `localStorage`-д хадгалагдаж байна (`login_identifier`, `pi_token`, `pi_role`, `teacher_selected_classroom`). XSS үед уншигдана. httpOnly cookie-тай харьцуулах нь тусдаа шийдвэр.
- Console-д давтагдсан **«An unknown error occurred when fetching the script»** (45 мессежийн 30 орчим нь). Chunk-ууд 200 буцааж байгаа, service worker байхгүй. Эх үүсвэр тогтоогоогүй.
- Хажуугийн цэсний бүх линк prefetch хийгдэж, нэг хуудас үзэхэд 500+ `?_rsc=` хүсэлт үүсгэв. Зарим нь **403** (эрхгүй маршрут). Ачаалал ба лог бохирдолтой.
- Хуудасны `<title>`: `/help`, `/app/feedback`, `/app/study`, `/app/groups`, `/app/lesson-flow` зэрэг нь ерөнхий сайтын гарчиг хэвээр; `/app/admin/*`, `/app/store`, `/app/parent` нь өөрийн гарчигтай.

## Шалгаагүй зүйл

- Браузерын таб нуугдсан хэвээр байсан тул **харагдах таб дээрх** байдлыг нүдээр баталгаажуулаагүй; §1-ийн дүгнэлт хэмжсэн тоон нотолгоонд тулгуурласан.
- Бодит үйлдэл (бодлого бодох, даалгавар илгээх, төлбөр хийх) хийгээгүй — зөвхөн хуудас нээж, өгөгдөл гарч ирснийг шалгасан.
- Мобайл харагдац, dark mode шалгаагүй.
