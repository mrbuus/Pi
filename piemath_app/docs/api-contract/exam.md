# API гэрээ — Шалгалт өгөх, дүн, эргэн харалт (M4)

Эх: `api/src/tests/{tests.controller,tests.service,grading,exam-items,ranking.*}.ts`,
`api/src/exams/{exam-results.*,exam-data,exam-analytics}.ts`, `api/src/thousand/*`,
`api/src/storage/{files-auth.guard,file-authorization.service,uploads.controller}.ts`.
Вэб: `web/src/app/app/tests/[id]/{page,result/page,review/page}.tsx`, `web/src/components/exam/*`,
`web/src/components/exams/{StudentExamsHub,StudentExamLists}.tsx`, `web/src/components/test-list/types.ts`.
Огноо: 2026-11-01 (branch `piemath-app`).

## 0. Нийтлэг

- Бүх зам `/api` угтвартай: `GET https://api.pimath.mn/api/tests/...`. Доор угтваргүй бичив.
- Нэвтрэлт: `Authorization: Bearer <JWT>`. Бүх маршрут `JwtAuthGuard + RolesGuard`.
- `ValidationPipe({ whitelist: true, transform: true })` — DTO-д байхгүй талбарыг **чимээгүй хасна** (400 өгөхгүй).
- Глобал throttle: хэрэглэгч тус бүрд (userId-аар) **300/мин**. Маршрутын тусгай хязгаар доор.
- Алдааны бие: Nest стандарт `{ statusCode, message, error }`; `message` нь монгол мөр (заримдаа мөрийн массив —
  ValidationPipe). Апп `message`-ийг харуулна.
- Огноо бүгд ISO-8601 UTC мөр (`2026-11-01T06:30:00.000Z`) — апп UB (UTC+8)-аар харуулна.
- **Сурагчид бодлогын `token` (ж: «100-23-05») ХЭЗЭЭ Ч ирэхгүй** — `strip-problem-token.interceptor.ts` ажилтан
  бус хариунаас бодлого хэлбэртэй объектын `token`, бүх `problemToken`-ийг хасна. Апп кэшлэх, харуулах ёсгүй.
- **Хариуны түлхүүр шалгалт өгөх үед ирэхгүй.** Оноо, зөв/буруу, нээгдэх хаалт бүгд серверт. Апп давтаж бодохгүй.

### 0.1 Бодлогын агуулгын формат

| Талбар | Төрөл | Тайлбар |
|---|---|---|
| `statementText` | `string \| null` | Монгол бичвэр + LaTeX (`$...$`, `$$...$$`), мөр шилжилт `\n`. Вэб `MathText`-ээр зурна. FILL_NUMBER-д нүдний тэмдэглэгээ `[a]`, `[bc]`, эсвэл Word-оос `\lbrack a\rbrack` (§3.3). |
| `imageKey` | `string \| null` | Бодлогын зураг → `GET /files/:imageKey` (§7). |
| `format` | `"CHOICE" \| "FILL_NUMBER" \| "OPEN"` | `ProblemFormat` enum. |
| `choiceMode` | `"TEXT" \| "LETTER" \| null` | Зөвхөн CHOICE-д (§3.1). |
| `choices` | `string[] \| null` | TEXT: сонголтын бичвэр (LaTeX байж болно, хоосон `""` байж болно — зурагтай сонголт); LETTER: `["A","B",...]` үсэг. |
| `choiceImages` | `(string \| null)[] \| null` | TEXT горимд `choices`-той ИЖИЛ (холилдсон) дараалалтай зургийн түлхүүр; нэг ч зураггүй бол `null`. |
| `points` | `number` | Тухайн тест дэх оноо (`TestProblem.points`). |

## 1. Жагсаалт

### 1.1 `GET /tests?includeThousand=1[&subject=MATH|SOCIAL_STUDIES|SAT][&chapterId=]`

Эрх: бүх нэвтэрсэн (сурагч/BUYER-д доорх хэлбэр; ажилтанд өөр — бүрэн мөр). Хуудаслалтгүй (вэб 20-иор зүсэж
render хийдэг). Эрэмбэ: `createdAt` буурах. Вэб: `StudentExamsHub` «Өгөх» таб.

Сурагчийн мөр:
```json
{
  "id": "ck...", "title": "Илтгэгч тэгшитгэл 1", "type": "DAILY",
  "gradingMode": "AUTO", "timeLimitMin": 40, "variantLabel": "A",
  "groupKey": "Илтгэгч тэгшитгэл 1",
  "chapter": { "book": { "code": "200V3", "displayName": "200x200" } },
  "createdAt": "2026-10-20T02:00:00.000Z",
  "_count": { "problems": 10 },
  "results": [{ "totalScore": 7, "maxScore": 10 }],
  "sessionStatus": "IN_PROGRESS"
}
```
- `type`: `DAILY | CHAPTER_EXAM | EESH_MOCK | CUSTOM | THEORY | THOUSAND`.
- `gradingMode`: `AUTO | MANUAL` (MANUAL = онлайнаар өгөхгүй, багш цаасан дүн оруулна — эхлүүлэх товчгүй).
- `timeLimitMin`: `number | null` (null = хугацаагүй). `variantLabel`, `groupKey`: `string | null`. `chapter`: `null` байж болно.
- `results`: 0 эсвэл 1 мөр. `sessionStatus`: `"IN_PROGRESS" | "SUBMITTED" | null`.
- Ирээдүйд оноосон шалгалт (CHAPTER_EXAM/EESH_MOCK/THOUSAND) жагсаалтын ТӨГСГӨЛД нэмэгдэнэ:
  `upcoming: true`, `assignedAt` (хамгийн эрт оноосон огноо, ISO), `_count.problems: 0`, `results: []`,
  `sessionStatus: null` — эхлэх товчгүй «Эхлэх: огноо» мөр.
- **Номын кодыг (`book.code`, ж: «200V3») сурагчид ХЭЗЭЭ Ч харуулахгүй** (эзэн 2026-10-29) — `displayName` эсвэл юу ч үгүй.
- Вэб «Өгөх» таб `isExamType(type)` (CHAPTER_EXAM/EESH_MOCK/THOUSAND) болон `upcoming`-ийг энэ жагсаалтаас хасаж,
  шалгалтуудыг `/exam-results/my`-ээс авна (§1.2).
- **А/Б хувилбар (UI-ийн дүрэм, апп ЯГ давтах ёстой — эс бөгөөс вэб, апп өөр хувилбар харуулна):**
  `variantKey = (groupKey ?? title).trim()`; нэг түлхүүртэй мөрүүдээс: дүнтэй (`results.length>0`) → эсвэл
  `sessionStatus=="IN_PROGRESS"` → эсвэл `key = "${studentId}:${variantKey}"`,
  `hash=0; for c in UTF-16 code units: hash = (hash*31 + c) >>> 0` (uint32), `rows[hash % rows.length]`
  (эх: `components/test-list/types.ts` `pickForStudent`). `studentId` = `GET /auth/me`-ийн `id`.
- Сэдэв/дугаар задлах (`splitTopic`): THOUSAND бол тусгай сэдэв; бусад `key = groupKey ?? chapter.title ?? title`,
  `/^(.*?)\s+(\d+)$/` → `{topic, num}`, эс бөгөөс «Бусад».

### 1.2 `GET /exam-results/my`

Эрх: STUDENT, BUYER. Вэб: `StudentExamLists.tsx` («Өгөх»-ийн шалгалтын хэсэг, «Өгсөн» таб).
Зөвхөн `type ∈ {CHAPTER_EXAM, EESH_MOCK, THOUSAND}`. Эрэмбэ `createdAt` буурах.
```json
{ "exams": [{
  "id": "ck...", "title": "1000 бодлого · Явцын 3-A", "type": "THOUSAND", "gradingMode": "AUTO",
  "timeLimitMin": 90, "variantLabel": null, "groupKey": null,
  "chapter": { "book": { "code": "1000", "displayName": "1000 бодлого" } },
  "_count": { "problems": 40 },
  "results": [{ "totalScore": 31, "maxScore": 40 }],
  "percent": 78,
  "sessionStatus": "SUBMITTED",
  "assignedAt": "2026-10-28T00:00:00.000Z",
  "upcoming": false,
  "takenAt": "2026-10-29T03:12:00.000Z",
  "absent": false
}]}
```
- `percent`: `number | null` (бүхэл, бөөрөнхийлсөн). `assignedAt`, `takenAt`: ISO | null. `absent`: багш «ирээгүй»
  тэмдэглэсэн, дүнгүй. `upcoming: true` → эхлэх товчгүй.
- `title`-д `·` (U+00B7) байж болно — `MetaTitle` шиг задалж харуул (глифийг шууд бүү зур).

### 1.3 `GET /tests/my-results`

Эрх: STUDENT, BUYER. Бүх дүн (дасгал тест ч), `createdAt` буурах. Prisma мөр шууд:
`[{ id, testId, studentId, totalScore, maxScore, source, createdAt, ..., test: { id, title, type } }]`.
`source`: `ONLINE_TEST | CHAPTER_EXAM | OMR_IMPORT | MANUAL_ENTRY | EVENING_SELF_REPORT`. ТОДРУУЛАХ: бусад
TestResult баганууд (enteredById г.м.) мөн ирнэ — апп зөвхөн дээрх талбарыг уншина.

### 1.4 `GET /thousand/tests`

Эрх: STUDENT, BUYER (+ ажилтан — өөр хэлбэр). Сурагчид: эрэмбэ `groupKey asc, title asc`.
```json
{ "role": "STUDENT", "tests": [{
  "id": "ck...", "title": "...", "timeLimitMin": 90, "problemCount": 40,
  "ready": true, "status": "SUBMITTED",
  "score": { "total": 31, "max": 40 },
  "review": { "level": "PROBLEMS", "opensAt": null }
}]}
```
`ready` = `gradingMode == AUTO`. `status`: `NOT_STARTED | IN_PROGRESS | SUBMITTED`. `review` зөвхөн SUBMITTED үед
(эс бөгөөс null): `level: NONE|PROBLEMS|FULL`, `opensAt`: NONE үед автоматаар нээгдэх огноо (ISO) эсвэл null.
Вэб `/app/thousand/*` → `/app/tests` руу redirect; энэ endpoint вэбийн гол жагсаалтад одоо ашиглагдахгүй
(StudentExamsHub `/tests?includeThousand=1` + `/exam-results/my`) — апп ч мөн тэгнэ.

### 1.5 `GET /test-rankings/:testId` (Эрэмбэ)

Эрх: STUDENT, BUYER. 404 «Дууссан шалгалтын дүн олдсонгүй» (дүнгүй бол).
```json
{ "test": { "id": "ck...", "title": "..." }, "totalScore": 31, "maxScore": 40,
  "classes": [{ "id": "cls1", "label": "12Б", "rank": 3, "participants": 24, "tied": 1 }],
  "school": { "label": "Жишээ сургууль", "rank": 10, "participants": 80, "tied": 2 },
  "exam": { "rank": 41, "participants": 520, "tied": 3 },
  "rankingMethod": "COMPETITION_PERCENTAGE", "identityVisibility": "PRIVATE" }
```
`rank`: `number | null`. Бусдын нэр ХЭЗЭЭ Ч ирэхгүй. `school`: null байж болно.

## 2. Шалгалтын өмнө — `GET /tests/:id`

Эрх: бүгд (сурагчид интро мета л; бодлого ЗӨВХӨН session эхэлсний дараа). Вэб: `tests/[id]/page.tsx` эхний ачаалал.
```json
{ "id": "ck...", "title": "...", "type": "DAILY", "gradingMode": "AUTO",
  "timeLimitMin": 40, "variantLabel": "A", "problemCount": 10, "totalPoints": 10,
  "myResult": { "totalScore": 7, "maxScore": 10 },
  "sessionStatus": "SUBMITTED" }
```
- `myResult`: `null` байж болно. `sessionStatus`: `IN_PROGRESS | SUBMITTED | null`.
- Урсгал (вэб): `sessionStatus=="SUBMITTED"` эсвэл `myResult` → дүн рүү (§5); эс бөгөөс интро.
  `isExamType(type)` бол дүн нь `/app/tests/:id/result` (§5.1), бусад нь `/tests/:id/review` (§5.2) — ExamResult компонент.
- Алдаа: 404 «Тест олдсонгүй»; 403 «Ноорог тестэд сурагч нэвтрэх боломжгүй»,
  «Энэ тест таны ангийн хичээлд хамаарахгүй байна», «Энэ тестийг худалдаж авууд эсвэл танай ангид оноогдоон байна»
  (серверийн бичвэр ингэж үсгийн алдаатай — апп харуулахдаа өөрийн монгол бичвэрээр сольж болно).
- Интро дээр урьдчилан хэлэх (STATUS §7.3, `ExamIntro.tsx`): «...дэлгэцээс гарах, бүтэн дэлгэцээс гарах ... оролдлого
  2 удаа анхааруулга өгч, 3 дахь удаад шалгалт автоматаар дуусна». Апп-д: «аппаас гарах» гэж тайлбарла.

## 3. Шалгалт өгөх

### 3.1 `POST /tests/:id/start`

Эрх: STUDENT, BUYER. Throttle **20/мин** (хэрэглэгчээр). Бие хоосон. **Idempotent**: дахин дуудахад ижил
(хөлдсөн) дараалал, хадгалсан хариу, үлдсэн хугацаа буцна (өөр төхөөрөмж ч мөн).

Хариу — шалгалт явагдаж буй үед:
```json
{
  "test": { "id": "ck...", "title": "...", "variantLabel": "A", "gradingMode": "AUTO", "timeLimitMin": 40 },
  "session": {
    "status": "IN_PROGRESS",
    "startedAt": "2026-11-01T02:00:00.000Z",
    "remainingSec": 2310,
    "leaveCount": 0,
    "draftAnswers": { "<problemId>": 2, "<problemId2>": "3_5" },
    "draftStates": { "<problemId>": "SOLVED_CLEAN" }
  },
  "problems": [{
    "id": "<problemId>", "format": "CHOICE", "statementText": "...", "imageKey": null, "points": 1,
    "choiceMode": "TEXT", "choices": ["$2$", "$\\frac{1}{2}$", "$4$", "$-2$", "$0$"],
    "choiceImages": null
  }]
}
```
Хариу — аль хэдийн дууссан / хугацаа хэтэрсэн / цаасан дүнтэй:
```json
{ "session": { "status": "SUBMITTED" }, "result": { "totalScore": 7, "maxScore": 10 } }
```
(`test`, `problems` байхгүй; `result` null байж болно.)

- `remainingSec`: `number | null` (null = хугацаагүй). Серверийн `deadlineAt − now`, 0-ээс доош биш.
  **Таймерыг утасны цагаар бүү шийд** — `remainingSec`-ээс тоол, autosave бүрийн хариугаар дахин тохируул.
- `problems` нь `session.problemOrder`-ийн дарааллаар (одоогоор каноник = тестийн дараалал; холилт хийгдэхгүй).
  Вэб: CHOICE эхэнд (Хэсэг I), FILL_NUMBER (Хэсэг II) — `partIIStart` = эхний FILL_NUMBER-ийн индекс.
- **Сонголтын дараалал хөлдсөн:** TEXT горимд `choices` сурагч бүрд өөр (seed-тэй холилт) — апп өөрөө холихгүй,
  ирсэн дарааллаар харуулна. TEXT горимд **үсэг (A–E) харуулахгүй** (вэб: үсэггүй, зөвхөн утга). LETTER горимд
  үсэг харуулна, байрлал хөдлөхгүй (хувилбарын бичвэр нь `statementText` дотор).
- Алдаа: 400 «Энэ шалгалтын дүнг багш гараар оруулна — онлайнаар өгөхгүй.» (MANUAL), 400 «Энэ тестэд бодлого
  оруулаагүй байна», 403 (§2-ийн эрхийн мессежүүд), 404 «Тест олдсонгүй», 409 «Шалгалтын сесс үүсгэж чадсангүй».

### 3.2 Хариуны формат (`answers` утга) — `grading.ts`

| Бодлого | Утга | Жишээ |
|---|---|---|
| CHOICE, `choiceMode=TEXT` | **харуулсан индекс** (`number`, 0-ээс; `choices` массивын индекс) | `2` |
| CHOICE, `choiceMode=LETTER` | үсэг (`string`) | `"C"` |
| FILL_NUMBER, нүдтэй (`[a]`,`[bc]` statement-д) | нэг мөр, нүд бүр 1 цифр, бодлогын текстэд гарсан дарааллаар; хоосон нүд `"_"`, төгсгөлийн хоосныг тайрна; бүгд хоосон → `""` | `"3_5"` (a=3, b=хоосон, c=5) |
| FILL_NUMBER, нүдгүй | чөлөөт мөр (`-`, `.` зөвшөөрнө) | `"-3.5"` |
| FILL_NUMBER, объект | `{ "<slot>": "<value>" }` — зөвхөн түлхүүрийн нүдний нэрс, ≤32, мөр ≤1000 | `{ "a": "3", "bc": "54" }` |
| OPEN | мөр ≤ 1000 | `"x=2"` |
| Хариу арилгах | `null`, `""` | `null` |

- Сервер `number` (finite), `string` (≤1000)-г хүлээнэ; объект зөвхөн FILL_NUMBER-ийн түлхүүртэй таарвал.
  Бусад төрөл (массив, bool) чимээгүй хаягдана.
- Нүдний тэмдэглэгээ: `/\[([a-zA-Zа-яА-ЯёЁ]{1,8})\]|\\lbrack\s*([a-zA-Zа-яА-ЯёЁ]{1,8})\s*\\rbrack/g`,
  давхардлыг нэг удаа; бүлгийн урт = үсгийн тоо (`[bc]` = 2 нүд). Вэб `components/exam/fillSlots.ts`
  (`parseFillSlots`, `encodeSlotDigits`, `typeSlotDigit`, `backspaceSlot`) — Dart-д ижил логикоор (тесттэй).
- «Хариулсан» тоолол (навигатор): `answers[id] !== undefined && answers[id] !== ""`.

### 3.3 Өөрийн тэмдэглэгээ (`selfStates`)

`SelfState`: `SOLVED_CLEAN` (алдалгүй бодсон) · `FIXED_AFTER_ERROR` (алдаад зассан) · `FAILED` (чадаагүй) ·
`GUESSED` (таамагласан). Оноонд нөлөөгүй; алдааны дэвтэрт орох эсэхэд нөлөөлнө (FAILED/FIXED_AFTER_ERROR).
«Дараа эргэж харах» туг (⚑) — зөвхөн клиентэд, серверт илгээдэггүй.

### 3.4 `PATCH /tests/:id/session` — autosave

Эрх: STUDENT, BUYER. Throttle **180/мин**. Бүх талбар сонголттой, **зөвхөн өөрчлөгдсөнийг** илгээнэ (сервер
бодлого бүрээр нэгтгэнэ, «сүүлийн хариу хүчинтэй»):
```json
{
  "answers": { "<problemId>": 2 },
  "selfStates": { "<problemId>": "FAILED" },
  "problemTimes": { "<problemId>": 95 },
  "event": "LEAVE"
}
```
- `problemTimes`: бодлого бүр дээр зарцуулсан **нийт** секунд (хуримтлагдсан, 0..86400, бүхэлтэлнэ). Вэб: дэлгэц
  харагдаж байх үед тухайн бодлогод 1с тутам +1; сүүлд хадгалснаас өөрчлөгдсөнийг л илгээнэ.
- `event`: `"LEAVE" | "RETURN" | "FULLSCREEN_EXIT"` (өөр утга → 400). `LEAVE`, `FULLSCREEN_EXIT` → `leaveCount += 1`.
  `events` массивт `{ "t": "<ISO>", "type": "<event>" }` нэмэгдэж, **сүүлийн 100** хадгалагдана.
  Апп: аппаас гарах (`AppLifecycleState.paused/hidden`) → `LEAVE`, буцаж ирэхэд → `RETURN`.
  Скриншот/бичлэгийн шинэ төрөл одоогоор **ЗӨВШӨӨРӨГДӨХГҮЙ** — нэмэх бол [A]: DTO-ийн `@IsIn` жагсаалтыг өргөтгөнө
  (EXAM-INTEGRITY.md §3). Түр хувилбар: `POST /tests/:id/heartbeat {event}` нь дурын мөрийг бүртгэдэг (§3.6).
- Үл мэдэгдэх `problemId` түлхүүрийг чимээгүй хаяна. Хүчингүй `selfStates` утгыг хаяна.
- Хариу (явагдаж буй): `{ "status": "IN_PROGRESS", "leaveCount": 1, "remainingSec": 1800 }` (`remainingSec` null байж болно).
- Хариу (хугацаа + 30с GRACE хэтэрсэн → сервер ӨӨРӨӨ илгээж дүгнэнэ, энэ хүсэлтийн хариуг ч оруулна):
  `{ "status": "SUBMITTED", "result": { "totalScore": 7, "maxScore": 10 } }` → апп дүн рүү шилжинэ.
- Аль хэдийн SUBMITTED: `{ "status": "SUBMITTED", "result": {...} | null }`.
- 404 «Шалгалт эхлээгүй байна» (session алга).
- **Зөрчлийн (409/version) механизм БАЙХГҮЙ** — сүүлд ирсэн хүсэлт ялна. Хоёр төхөөрөмжөөс зэрэг өгвөл бодлого
  бүрийн хариу дарагдана.

Вэбийн хэмнэл (апп ижил барина — серверийн ачааллын тооцоо үүн дээр суурилсан):
- Хариу/тэмдэглэгээ өөрчлөгдмөгц **1.2 сек debounce** (`SAVE_DEBOUNCE_MS = 1200`); шинэ өөрчлөлт хүлээгдэж буй retry-г цуцална.
- «Heartbeat» = PATCH session (тусдаа endpoint биш): **20с ± 20% jitter** (тик бүрд шинэ санамсаргүй),
  dirty бол жинхэнэ save; dirty-гүй бол сүүлийн амжилттай холбоо барьснаас **90с** өнгөрсөн үед л хоосон `{}` keepalive.
  Юу ч хийх шаардлагагүй бол хүсэлт илгээхгүй.
- Амжилтгүй жинхэнэ save: dirty-г хадгална (алдагдахгүй), «офлайн» тууз, дахин оролдлого
  `min(30000, 2000·2^n) · (0.7..1.3)` мс, n ≤ 8. Хоосон keepalive амжилтгүй бол тууз ХАРУУЛАХГҮЙ.
- Амжилттай бол: илгээсэн snapshot-тай ижил хэвээр байгаа dirty түлхүүрүүдийг л цэвэрлэнэ; `remainingSec`,
  `leaveCount`-ийг серверийнхээр сольно.
- Гарах тооцоо (вэб): нэг гаралт = нэг үйл явдал (1.5с дотор давхардуулахгүй); `next = leaveCount+1`;
  `next >= LEAVE_MAX(3)` → автоматаар илгээх; эс бөгөөс анхааруулга (`LEAVE_WARN = 1`). Тогтмолууд
  **клиентэд** (`web/src/app/app/tests/[id]/page.tsx`), сервер хязгаар хэрэгжүүлдэггүй — зөвхөн тоолно.
  STATUS §7.3: 2 секундээс богино алга болохыг тоолохгүй (утасны дуудлага, мэдэгдэл); апп `inactive`-ийг тоолохгүй.
- 5 минут үлдэхэд нэг удаа: «5 минут үлдлээ — N бодлого хариулаагүй байна» (8с toast).
- `navigator.sendBeacon` **вэбэд одоогоор ашиглагдаагүй** (STATUS §7.3-т бичсэн ч код алга). Апп: `paused` үед
  dirty-г шууд (debounce-гүй) PATCH хийж, амжилтгүй бол офлайн дараалалд (drift) хадгална.

### 3.5 `POST /tests/:id/submit`

Эрх: STUDENT, BUYER. Throttle **20/мин**. Бие = autosave-тай ижил хэлбэр (`SubmitTestDto extends SaveSessionDto`);
вэб **бүх** хариуг илгээнэ: `{ answers: <бүгд>, selfStates: <бүгд>, problemTimes: <бүгд> }`.
- Хариу (энгийн тест): `{ "result": { <TestResult мөр: id, testId, studentId, totalScore, maxScore, source, createdAt...> },
  "graded": [{ "problemId": "...", "correct": true, "points": 1 }] }`.
- Хариу (THOUSAND): `{ "result": {...} }` — `graded` байхгүй (бодлого бүрийн зөв/буруу хаалттай).
- Апп зөвхөн `result.totalScore`, `result.maxScore`-ийг уншаад дүн/эргэн харалтыг тусад нь ачаална.
- 409 «Та энэ тестийг аль хэдийн өгсөн байна» (дахин илгээвэл — апп үүнийг амжилт гэж үзээд дүн рүү шилж),
  400 (MANUAL) «Энэ тестийн хариу баталгаажаагүй тул авто оноо бодохгүй. Багш дүнг гараар оруулна.», 404, 403.
- Цаасан (гар) дүн аль хэдийн орсон бол сервер дарж бичихгүй (хуучин дүн буцна).
- Вэб: хугацаа 0 болоход (`secondsLeft <= 0`) клиент өөрөө submit дуудна; сервер ч deadline+30с дараа дараагийн
  start/heartbeat/session дуудлагад автоматаар дүгнэнэ (cron биш — хүсэлт ирэхэд).

### 3.6 `POST /tests/:id/heartbeat`

Эрх: STUDENT, BUYER. Throttle 180/мин. Бие: `{ "event"?: string }` — **баталгаажуулалтгүй, дурын мөр** `events`-д
(`{t,type}`) бичигдэнэ, `leaveCount`-д НӨЛӨӨЛӨХГҮЙ. Вэб ЭНЭ маршрутыг ашигладаггүй.
Хариу: `{ status, leaveCount, remainingSec }`; SUBMITTED/хугацаа хэтэрсэн бол `{ status:"SUBMITTED", result, remainingSec:null }`.
404 «Шалгалт эхлээгүй байна». Апп скриншот/бичлэгийг (`SCREENSHOT`, `RECORDING_ON` …) түр энэ замаар бүртгэж болно,
гэхдээ багшийн дүнгийн хуудсанд харагдуулах бол [A] шаардлагатай (EXAM-INTEGRITY.md).

## 4. Хугацаа ба автоматаар илгээх (сервер)

- `deadlineAt = startedAt + timeLimitMin` (start үед нэг удаа). `GRACE_MS = 30 000`.
- `now > deadlineAt + 30с` бол start / heartbeat / session PATCH аль нь ч ирмэгц `finalize()` — тухайн хүсэлтийн
  `answers`-ийг ч нэгтгэнэ. Ажилтны cron байхгүй тул хүүхэд апп-аа хаавал дараагийн хандалт хүртэл IN_PROGRESS үлдэнэ.
- Дүгнэлт: хариугүй (ANSWER_KEY_MISSING) бодлого `maxScore`-д орохгүй; хоосон хариу хэзээ ч зөв биш.

## 5. Дүн ба эргэн харалт

### 5.1 `GET /exam-results/my/:testId` — шалгалтын дүнгийн нэг хуудас

Эрх: STUDENT, BUYER. Хэрэглэх: `isExamType(type)` (CHAPTER_EXAM / EESH_MOCK / THOUSAND). Вэб: `tests/[id]/result/page.tsx`.
```json
{
  "test": { "id": "ck...", "title": "...", "type": "EESH_MOCK" },
  "absent": false,
  "result": { "totalScore": 31, "maxScore": 40, "percent": 78 },
  "parts": { "part1": 24, "part1Max": 28, "part2": 7, "part2Max": 12 },
  "review": { "level": "FULL", "opensAt": null, "open": true, "fullReview": false },
  "topics": [{ "name": "Интеграл", "percent": 60, "earned": 6, "max": 10 }],
  "wrong": [{
    "n": 12, "part": 1,
    "items": [{ "label": "12", "status": "WRONG", "points": 1 }],
    "lost": 1,
    "problem": {
      "format": "CHOICE", "statementText": "...", "imageKey": "k.png",
      "choices": [{ "letter": "A", "text": "$2$", "image": null }],
      "myAnswer": "C", "correctAnswer": null, "solution": "...",
      "answerNeedsCheck": false,
      "youtube": { "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX", "embedUrl": "https://www.youtube-nocookie.com/embed/XXXXXXXXXXX" }
    }
  }],
  "practice": { "topic": "Интеграл", "chapterIds": ["ch1", "ch2"] }
}
```
- Ирээгүй: `{ test, absent:true, result:null, parts:null, review:null, topics:[], wrong:null, practice:null }`.
- Дүн гараагүй: 404 «Энэ шалгалтын дүн хараахан гараагүй байна».
- `review.level`: THOUSAND-аас бусад үргэлж `FULL`. THOUSAND: `NONE|PROBLEMS|FULL` (§5.3). `open` = харуулах эсэх.
  `fullReview: true` → «Бүх бодлогыг харах» → `/thousand/tests/:id/review`.
- `wrong`: `open` бол буруу/хоосон бодлого; `items[].status`: `"WRONG" | "BLANK"`; `part`: 1 (сонгох) / 2 (нөхөх).
  `items[].label`: алхмын багцгүй бодлогод бодлогын дугаар (`"12"`); 2-р хэсгийн алхмын багцад багцын нэр
  (`"a"`, `"bc"` …); давхцвал `"<дугаар>:<нэр>"` (`"15:a"`). `n` = тест дэх `order` (1-ээс).
  `problem` = null байж болно (бодлогыг харуулахгүй горим).
- Энгийн шалгалтад `correctAnswer` ҮРГЭЛЖ null (тест дахин ашиглагдана), `solution` зөвхөн багш баталгаажуулсан (VERIFIED).
  THOUSAND FULL үед зөв хариу, бүх бодолт, YouTube.
- `myAnswer`: сонгох бодлогод **канон үсэг** (`"C"`, холилтоос үл хамаарна — `choices[].letter`-тэй тулгана),
  бусдад сурагчийн түүхий утга (мөр эсвэл объект).
- `correctAnswer` (ирвэл): сонгоход үсэг, бусдад түлхүүрийн утга (`"35"` эсвэл `{"a":"3"}`).
- `practice`: «Ижил сэдвийн бодлого бодох» → `POST /study-review` `{clientRequestId: uuid, budgetMinutes: 10, chapterIds}`
  → `{id}` → давтлага (learning.md).
- Ангийн байр (rank) энд харуулахгүй (§8.6) — тусдаа `/test-rankings/:id`.

### 5.2 `GET /tests/:id/review` — энгийн (дасгал) тестийн эргэн харалт

Эрх: STUDENT, BUYER. 404 «Дууссан шалгалт олдсонгүй» (SUBMITTED session байхгүй — ж: зөвхөн цаасан дүн).
```json
{
  "result": { "totalScore": 7, "maxScore": 10, "createdAt": "..." },
  "items": [{
    "n": 1, "points": 1, "chapterId": "ch1", "chapterTitle": "Илтгэгч · Тест 1",
    "statementText": "...", "imageKey": null,
    "answered": true, "correct": false, "answerUnknown": false,
    "myAnswer": "$\\frac{1}{2}$", "solution": null
  }],
  "leaveCount": 1
}
```
- THOUSAND: `{ result, items: [], leaveCount, gatedReview: true }` → `/thousand/tests/:id/review`-ээр.
- `myAnswer`: TEXT сонголтод **сонгосон бичвэр** (үсэг биш), бусдад түүхий утга мөрөөр; хариулаагүй бол null.
- `answerUnknown: true` → «буруу» гэж бүү харуул («хариу тодорхойгүй»).
- Зөв хариу задрахгүй. `solution` — зөвхөн VERIFIED бодолт (LaTeX бичвэр).

### 5.3 `GET /thousand/tests/:testId/review` — 1000 бодлогын эргэн харалт (сервер талын хаалт)

Эрх: STUDENT, BUYER. 404 «1000 бодлогын шалгалт олдсонгүй»; 403 «Шалгалтаа илгээсний дараа эргэн харах боломжтой»;
403 «Энэ шалгалт танай ангид оноогдоогүй байна».
```json
{
  "test": { "id": "ck...", "title": "..." },
  "result": { "totalScore": 31, "maxScore": 40 },
  "level": "FULL", "opensAt": null,
  "items": [{
    "n": 1, "problemId": "...", "format": "CHOICE", "points": 1,
    "statementText": "...", "imageKey": null,
    "choices": [{ "letter": "A", "text": "...", "image": null }],
    "answered": true, "myAnswer": "B",
    "answerKnown": true, "correct": false, "correctAnswer": "D",
    "solution": "...", "answerNeedsCheck": false,
    "youtube": { "url": "...", "embedUrl": "https://www.youtube-nocookie.com/embed/..." }
  }]
}
```
- `level=NONE` → `items: []` (+ `opensAt` ирвэл «Нээгдэх: огноо»). `PROBLEMS` → бодлого + өөрийн хариу (FULL-ийн
  талбаргүй). `FULL` → `answerKnown`, `correct` (`bool|null`), `correctAnswer`, `solution` (баталгаажаагүй ч бүх
  бодолт), `answerNeedsCheck`, `youtube`.
- `choices` зөвхөн TEXT горимд (эх/канон дараалал, үсэгтэй); LETTER/FILL/OPEN → null.
- `myAnswer`: TEXT → канон үсэг; объект → `{slot: string}`; бусад → мөр.
- Хаалтын дүрэм (сервер, давтахгүй): ангийн `TestAccess` түвшин; багш гараар тавиагүй бол оноосноос 7 хоногийн
  дараа (эсвэл `reviewAutoAt`) FULL; хэд хэдэн анги → хамгийн нээлттэй; ангигүй (худалдан авалт) → илгээснээс 7 хоног.
- YouTube: `embedUrl` нь cookie-гүй (`youtube-nocookie.com`); WebView-д зөвхөн тэр домэйн, эсвэл `url`-ийг гаднаа нээ.

## 6. Эцэг эхийн дүнгийн карт — `GET /exam-results/parent/:testResultId`

parent.md-ийг үз (энд товч): эрх PARENT, баталгаажсан холболт; `{ testResultId, test:{title,type}, totalScore,
maxScore, percent, parts, weakTopics:[{name,percent}], takenAt, acknowledgedAt, canAcknowledge }`.

## 7. Зураг — `GET /files/:key`

- Түлхүүр `^[\w][\w.-]*$`, ≤200 (эс бөгөөс 400 «Буруу түлхүүр»). Апп **`Authorization: Bearer` header**-ээр
  (вэб `?token=` query ашигладаг — апп-д бүү, log-д үлдэнэ).
- 401: токенгүй/хүчингүй/нууц үг солигдсон. 403 «Энэ файлыг үзэх эрхгүй.» — **хэвийн хариу** (эвдэрсэн зураг биш,
  тайлбар харуул). 404 «Файл олдсонгүй».
- **S3 горимд 302 redirect** → 5 минутын presigned URL (`Cache-Control: private, max-age=300`). Presigned URL руу
  `Authorization` header ДАМЖУУЛАХ ЁСГҮЙ (S3 давхар нэвтрэлтийг 400-аар татгалзана) — dio-д `followRedirects:false`,
  `Location`-ийг header-гүй татах. Диск/ӨС горимд байтыг шууд (`Cache-Control: private, no-store`) — HTTP кэш
  ажиллахгүй тул апп өөрийн санах ойн кэш (key-ээр) хэрэглэнэ.
- Шалгалтын бодлого/сонголтын зураг: сурагч тухайн бодлоготой тестийг **эхлүүлсэн** (session бий) бол зөвшөөрнө.
  Эхлүүлээгүй бол ангид нээгдсэн бодлогын эрхээр л — эс бөгөөс 403 (ж: QR-аар нээсэн, шалгалт эхлээгүй).

## 8. Апп давтах ЁСГҮЙ (серверт)

Оноо бодох, зөв/буруу, холилт (seed), хугацаа дуусгах, эргэн харалтын түвшин/нээгдэх огноо, эрх (анги, худалдан
авалт, хичээлийн хаалт), алдааны дэвтэрт оруулах. Апп зөвхөн: таймерыг `remainingSec`-ээс харуулах, гарах тоолж
`LEAVE` илгээх, LEAVE_MAX хүрэхэд submit дуудах (вэбтэй ижил UX дүрэм), А/Б хувилбар сонгох (§1.1).

## ТОДРУУЛАХ

1. Скриншот/дэлгэц бичлэгийн үйл явдлыг `PATCH session event`-д нэмэх үү (DTO өргөтгөл [A]), эсвэл heartbeat-ийн
   дурын `event`-ээр бүртгэх үү — багшийн дүнгийн хуудсанд харагдах эсэх.
2. `LEAVE_MAX`/`LEAVE_WARN` нь клиентийн тогтмол — апп өөр утга хэрэглэх бол эзэн шийднэ (вэбтэй ижил байлгахыг зөвлөнө).
3. `/tests/my-results` нь TestResult-ийн бүх баганыг буцаадаг — апп-д хэрэгтэй багана л (§1.3).
