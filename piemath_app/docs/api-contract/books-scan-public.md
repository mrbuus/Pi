# API гэрээ — Номын каталог, үнэгүй тест, жишиг сорил, түвшин тогтоох, QR (M5)

Эх: `api/src/content/{catalog.controller,books-catalog.service,try.service}.ts`,
`api/src/mock-exams/*`, `api/src/placement/*`, `api/src/scan/*`, `api/src/passes`, `api/src/store`.
Вэб: `web/src/app/{books,books/[code],sorils,placement,q/[code],app/scan/[code]}/page.tsx`,
`web/src/components/{books,scan}/*`. Огноо: 2026-11-01.

Нийтлэг дүрэм (бүх зам `/api` угтвартай, алдааны бие, огноо ISO UTC) — `exam.md` §0. Нийтийн (нэвтрэлтгүй) маршрутын
throttle нь IP-ээр.

## 1. Номын каталог (нэвтрэлтгүй)

### 1.1 `GET /catalog/books`

Нийтийн, `Cache-Control: public, max-age=300, stale-while-revalidate=60` (апп 5 мин кэшлэж болно). Зөвхөн MATH, архивлаагүй,
нуугдаагүй ном; V3 хувилбартай бол хуучныг нуусан. Эрэмбэ: серверийн `BOOK_DISPLAY_ORDER`.
```json
[{ "id": "bk1", "code": "100V3", "title": "100x100", "displayName": "100x100", "subject": "MATH",
   "topics": 12, "chapters": 60, "tests": 120, "solvableTests": 110, "freeTests": 14, "problems": 1200 }]
```
`displayName`: `string | null`. **`code`-ийг сурагчид харуулахгүй** (`displayName ?? title`); зөвхөн маршрутад
(`/books/:code`). «100×100» — номын цувралын бодит нэр (глифийн хориг хамаарахгүй, STATUS §6.3), гэхдээ
дата `100x100` латин x-тэй ирдэг.

### 1.2 `GET /catalog/books/:code`

Ижил кэш. 404 «Ном олдсонгүй».
```json
{ "id": "bk1", "code": "100V3", "title": "100x100", "displayName": "100x100", "subject": "MATH",
  "freeTests": 14,
  "topics": [{
    "name": "Тоо тоолол", "tests": 6, "freeTests": 1, "problems": 60,
    "chapters": [{
      "id": "ch1", "title": "Тоо тоолол · Тест 1", "label": "Тест 1", "order": 1, "problems": 10,
      "tests": [{ "id": "t1", "title": "...", "variantLabel": "A", "groupKey": "...", "timeLimitMin": 40,
                  "type": "DAILY", "problemCount": 10, "free": true, "solvable": true }]
    }]
  }]
}
```
- Сэдэв = бүлгийн нэрний ` · `-ээс өмнөх хэсэг; `label` = үлдсэн хэсэг (эсвэл бүтэн нэр).
- `free`: сэдэв бүрийн эхний бодогдох бүлгийн эхний тест (A/B бол хоёулаа) + эзний `freePreview` бүлэг. THOUSAND,
  EESH_MOCK хэзээ ч үнэгүй биш. **Сервер шийднэ — апп тооцохгүй.**
- `solvable` = AUTO дүнтэй, бодлоготой.

### 1.3 Үнэгүй тест — `GET /catalog/try/tests/:id`, `POST /catalog/try/tests/:id/grade`

Нэвтрэлтгүй. GET throttle 60/мин, `Cache-Control: no-store`. 404 «Тест олдсонгүй»; 403 үнэгүй биш бол бие нь
`{ "locked": true, "message": "Энэ тест номын эрхтэй сурагчдад нээлттэй" }` (statusCode-гүй өөр хэлбэр!).
```json
{ "id": "t1", "title": "...", "variantLabel": "A", "timeLimitMin": 40, "type": "DAILY",
  "book": { "code": "100V3", "title": "100x100", "displayName": "100x100" },
  "chapter": { "id": "ch1", "title": "Тоо тоолол · Тест 1" },
  "problemCount": 10,
  "problems": [{ "id": "p1", "n": 1, "format": "CHOICE", "statementText": "...", "points": 1,
                 "imageKey": "k.png", "choiceMode": "TEXT", "choices": ["..."], "choiceImages": null }] }
```
- **Сонголт холилдохгүй** (session байхгүй) — TEXT хариу = `choices`-ийн эх индекс.
- Grade (throttle 30/мин): бие `{ "answers": { "<problemId>": <утга> } }` — утгын формат `exam.md` §3.2-той ижил.
  Хариу: `{ "score": 7, "max": 10, "answered": 9, "perProblem": { "<problemId>": true | false | null } }`
  (`null` = хариуны түлхүүргүй, дүнд орохгүй). Зөв хариу, бодолт хэзээ ч ирэхгүй. Сервер юу ч хадгалахгүй
  (апп хариугаа локалд барина).
- Зураг: **`GET /catalog/try/tests/:id/files/:key`** (нэвтрэлтгүй, throttle 120/мин,
  `Cache-Control: public, max-age=3600`) — `/files/:key` БИШ. Зөвхөн тухайн тестийн бодлого/сонголтын зураг; бусад 404 «Зураг олдсонгүй».

### 1.4 Түгжээ тайлах (эрх худалдаж авах) — `GET /catalog/passes`, `GET /store/products`

Нийтийн жагсаалт (`Pass` мөр бүхэлдээ; `ProductItem` + нэр). Вэб `components/books/UnlockPanel.tsx`, `app/app/store`.
**Апп-д анхаар (ТОДРУУЛАХ, эзний шийдвэр):** iOS дээр дижитал контентыг апп дотор зарах нь Apple 3.1.1-ээр In-App
Purchase шаарддаг; QPay/дансны шилжүүлгийн урсгалыг iOS апп-д харуулбал татгалзагдах эрсдэлтэй. Санал: апп-д
«Эрхээ вэбээр эсвэл төвөөс авна уу» гэсэн мэдээлэл л (үнэ, худалдах товчгүй) — PARITY-д `↗`.

## 2. Жишиг сорил (`/sorils`)

### 2.1 `GET /catalog/mock-exams` (нэвтрэлтгүй)

Throttle 60/мин, `no-store`. Тестийн id нийтэд ОРОХГҮЙ.
```json
{ "live": { "id": "ev1", "title": "...", "startsAt": "...", "endsAt": "...", "note": null,
            "timeLimitMin": 180, "problemCount": 40, "registered": 120, "phase": "live" },
  "next": { ... } , "upcoming": [ { ... } ],
  "last": { "title": "...", "startsAt": "...", "participants": 300, "avgPct": 54 } }
```
`live`, `next`, `last`: null байж болно. `upcoming` ≤ 4. `phase`: `upcoming | live | done` (`now` нь `[startsAt, endsAt]`).
`avgPct`: `number | null`.

### 2.2 Нэвтэрсэн: `GET /mock-exams/my`, `POST|DELETE /mock-exams/:id/register`

Эрх STUDENT, BUYER.
- `GET /mock-exams/my` → `{ "registrations": [{ "eventId": "ev1", "testId": "t9", "status": "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED", "score": 31 | null, "max": 40 | null }] }`.
  `testId`-аар шалгалтыг `exam.md`-ийн урсгалаар (`POST /tests/:testId/start`) өгнө — бүртгэл нь цонхны дотор
  (`startsAt..endsAt`) эхлүүлэх эрх; эхэлсэн бол цонх хаагдсан ч дуусгаж, дүнгээ харна.
- `POST /mock-exams/:id/register` → `{ "registered": true, "count": 121 }`; 404 «Сорил олдсонгүй»,
  410 «Энэ сорилын бүртгэл хаагдсан».
- `DELETE /mock-exams/:id/register` → `{ "registered": false }`; 409 «Эхэлсэн сорилын бүртгэлийг цуцлах боломжгүй».

## 3. Түвшин тогтоох шалгалт (`/placement`, нэвтрэлтгүй, зочны нууц түлхүүрээр)

Эрх: нийтийн; зочны эрх = `start`-аас авсан `secret` (24 байт base64url). **`secret`-ийг secure storage-д хадгал**
(дахин нээхэд `resume`). Хариуны түлхүүр хэзээ ч ирэхгүй.

| Маршрут | Throttle | Бие | Хариу |
|---|---|---|---|
| `GET /placement/test` | 30/мин | — | `PlacementTestPublic` |
| `POST /placement/start` | 5/мин | `{ name (2–100), phone (8 цифр), grade (1–12), school? (≤120), parentPhone? (8 цифр) }` | `{ id, secret, deadlineAt, test: PlacementTestPublic }` |
| `POST /placement/:id/resume` | 30/мин | `{ secret }` | `{ id, deadlineAt, submittedAt, answers, photos, test }` |
| `PUT /placement/:id/answers` | 60/мин | `{ secret, answers }` | `{ ok: true }` |
| `POST /placement/:id/photos` | 40/мин | multipart: `secret`, `problem` (1–50), `file` (≤12 MB; jpg/png/webp/heic — байтаар шалгана) | `{ key, photos }` |
| `DELETE /placement/:id/photos/:key` | 40/мин | `{ secret }` (JSON бие DELETE-д) | `{ photos }` |
| `POST /placement/:id/submit` | 10/мин | `{ secret, answers, auto? }` | `{ ok: true, submittedAt }` |

```json
// PlacementTestPublic
{ "key": "math-v1", "title": "Түвшин шалгах тест", "minutes": 40,
  "instructions": "мөр1\nмөр2",
  "problems": [
    { "n": 1, "statement": "$6-\\dfrac{2}{x}=10$ тэгшитгэлийг бод.", "kind": "choice", "points": 1,
      "choices": { "A": "$-4$", "B": "$-1$", "C": "$2$", "D": "$4$", "E": "$-0.5$" } },
    { "n": 9, "statement": "...", "kind": "boxes", "points": 2, "boxes": [{ "key": "a", "digits": 1 }, { "key": "de", "digits": 2 }] }
  ] }
```
- `answers` түлхүүр = бодлогын дугаар **мөрөөр** (`"1"`, `"9"`): choice → `"A".."E"`, boxes → `{ "a": "3", "de": "12" }`.
- `photos`: `{ "<n>": ["<uuid>.jpg", ...] }`; бодлогод ≤3, нийт ≤25 (400 «Нэг бодлогод 3 хүртэл зураг», «Зургийн тоо хэтэрлээ»).
  Бодолтын зураггүй бодлогыг «чадаагүй» гэж үзнэ (заавар).
- Хугацаа: `deadlineAt`-аас хойш 3 минутын GRACE; дараа нь 410 «Шалгалтын хугацаа дууссан». Илгээсэн бол 410
  «Шалгалт аль хэдийн илгээгдсэн». 403 «Шалгалтын эрх таарахгүй байна» (secret буруу). Хугацаа дуусахад клиент
  `auto: true`-гаар submit (вэб). Сервер оноо бодно, дүнг хүүхдэд харуулахгүй — багш үзэж түвшин тогтоож холбогдоно.
- Зураг илгээх: камер/галерей → шахаад multipart. 503 «Зураг хадгалахад алдаа гарлаа. Дахин оролдоно уу.»
- `GET /placement`, `GET /placement/:id`, `GET|PUT /placement/config` — ажилтны (M9).

## 4. Номын QR — `GET /scan/:code`

Эрх: STUDENT, BUYER, PARENT, ADMIN, TEACHER_PLUS, TEACHER (нэвтэрсэн). Throttle **30/мин**. Вэб `app/scan/[code]/page.tsx`.

### 4.1 Код ба deep link

- Хэвлэсэн URL: `https://pimath.mn/q/<КОД>`. Вэб `/q/[code]`: `^[A-Za-z0-9-]{4,40}$` таарвал `/app/scan/<code>`, эс бөгөөс `/app`.
- Код: 8 тэмдэгт Crockford base32, цагаан толгой `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (I, L, O, U байхгүй).
- Сервер нормчилно (`normalizeScanCode`): том үсэг, зай/зураас хасна, `O→0`, `I,L→1`; ≤40 тэмдэгт оролт. Апп ч
  (QR уншигч, гараар бичих) ижил нормчлол + regex `^[0-9A-HJKMNP-TV-Z]{8}$` хийгээд л дуудна (throttle хэмнэнэ).
- Deep link: Android App Links / iOS Universal Links `pimath.mn/q/*` → апп-ын `/scan/:code` (нэвтрээгүй бол нэвтрээд буцна;
  гаднаас нээсэн тул «Буцах» = нүүр). `apple-app-site-association` / `assetlinks.json` вэбэд нэмэх [A/Э].

### 4.2 Хариу

```json
{
  "problemId": "p1", "format": "CHOICE", "statementText": "...",
  "imageKey": "k.png", "hasImage": true,
  "choices": [{ "letter": "A", "text": "...", "image": null }],
  "source": { "book": "300x300", "chapter": "Интеграл · Тест 3", "page": 45, "number": 12 },
  "access": "LOCKED", "lockReason": "NOT_TAKEN", "opensAt": null
}
```
- `access`: `FULL | SOLUTION | LOCKED`.
  - `LOCKED`: `imageKey: null`, `choices[].image: null` (зургийн эрх байхгүй) — `hasImage: true` бол «Зураг номонд бий»
    гэж харуул (хоосон хайрцаг биш). `lockReason`: `NO_SOLUTION | NOT_IN_TEST | NOT_TAKEN | WAITING`; `opensAt`: ISO | null (WAITING).
  - `SOLUTION`: + `solution` (бодолтын LaTeX бичвэр). Зөв хариу тусад нь ирэхгүй.
  - `FULL`: + `solution` (`string|null`), `correctAnswer` (TEXT → канон үсэг; бусад → түлхүүрийн утга), `answerNeedsCheck`,
    `youtube` (`{url, embedUrl}` | null).
- `choices` зөвхөн TEXT горимд (канон дараалал), бусад үед `[]`. `source.page`, `source.number`: `number | null`;
  `source.book`: null байж болно.
- 404 «QR код буруу байна», 404 «Энэ QR кодтой бодлого олдсонгүй». Ажилтан (дотоод багш) → үргэлж FULL.
- Хаалтын дүрэм (сервер, давтахгүй): QR **шинэ эрх олгохгүй**. 1000 = илгээсэн + FULL түвшин; бусад тест = илгээсэн
  (бодлогыг харсан) + бодолт VERIFIED → зөвхөн бодолт.

### 4.3 Хаалттай үеийн бичвэр (вэб `components/scan/lockMessage.ts` — апп ЯГ ижил)

| `lockReason` | Гарчиг | Бичвэр |
|---|---|---|
| `WAITING` | Бодолт удахгүй нээгдэнэ | `opensAt` бол «Шалгалтаа өгсөн байна. Бодолт {UB огноо цаг}-д нээгдэнэ.», эс бөгөөс «Шалгалтаа өгсөн байна. Багш нээсний дараа бодолт харагдана.» |
| `NOT_TAKEN` | Эхлээд өөрөө бодоод үзээрэй | Энэ бодлого орсон шалгалтаа өгсний дараа бодолт нь нээгдэнэ. |
| `NOT_IN_TEST` | Бодолт хараахан нээгдээгүй | Энэ бодлого одоогоор шалгалтад ороогүй тул бодолтыг харах боломжгүй. |
| `NO_SOLUTION` | Бодолт бэлтгэгдэж байна | Энэ бодлогын бодолтыг багш нар бичиж байна. |

(Вэбийн бичвэр гарчиг/товчны төгсгөлд цэггүй; бие бичвэр өгүүлбэр тул цэгтэй.)

## 5. Томьёоны нийтийн JSON, хэрэглэгдэхүүн

- `https://pimath.mn/tools/formulas.json` (вэбийн статик файл, ~600 KB, API биш):
  `{ "version": 1, "count": 385, "sections": [{ slug, title, order, description, count }],
  "formulas": [{ slug, title, section, order, grade, level ("CORE"…), latex, conditions: string[], explanation,
  mnemonic, eeshTip, examples: [{ problem, steps: string[], answer }], commonMistakes, keywords, widget, general }] }`.
  Бүх математик LaTeX (`$...$` бичвэр дотор, `latex` талбар цэвэр TeX). Апп багцлах эсвэл нэг удаа татаж кэшлэх
  (`compute()`-д parse — 100KB-аас том). Нэвтэрсэн томьёоны сан (`/app/formulas`) — `learning.md`.
- `/tools` (бодогч, график, дүрс, биет) — цэвэр клиент логик (`web/src/components/tools/**`), API байхгүй. Апп-д
  WebView биш, `↗` вэб холбоос эсвэл дараагийн шат (PARITY).

## ТОДРУУЛАХ

1. Апп доторх худалдан авалт (§1.4) — Apple IAP / Google Play Billing шаардлага; эзний шийдвэр хэрэгтэй.
2. QR deep link-ийн `assetlinks.json` / `apple-app-site-association`-ийг вэбийн `public/.well-known/`-д нэмэх (bundle ID батлагдсаны дараа).
3. PROGRESS.md «Эзний шийдвэр» #5: QR-аар шалгалт эхлээгүй хүнд зургийг харуулах уу — одоо сервер LOCKED үед
   `imageKey`-г нууна; өөрчлөх бол [A] (`scan.service.ts` + `file-authorization.service.ts`).
