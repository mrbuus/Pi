# API гэрээ — Бие даасан суралцах: алдааны дэвтэр, давтлага, дадлага, хичээл, томьёо (M5)

Эх: `api/src/{mistakes,study-review,recommend,lessons,videos,formulas,goals,readiness,activity,learning-lab}/*`.
Вэб: `web/src/app/app/{mistakes,study,study/review,study/history,practice,learn,library,videos,formulas,goals,readiness}/**`,
`web/src/components/{mistakes,study,lesson,goals,readiness,activity,practice}/*`. Огноо: 2026-11-01.

Нийтлэг — `exam.md` §0 (хариуны формат §3.2, `/files/:key` §7). Энэ хэсэг нь «товч гэрээ»: endpoint бүрийн зорилго,
гол хэлбэр. Дэлгэц бичихээсээ өмнө ★ тэмдэгтэйг service-ээс давхар шалга.

Хүнд/ховор: **[хүнд]** = серверт 1–2 сек (кэшлэ, дахин бүү дууд), **[ховор]** = вэбэд бага хэрэглэгддэг/ажилтны.

## 1. Алдааны дэвтэр (`/app/mistakes`) — STUDENT

| Маршрут | Бие / query | Хариу |
|---|---|---|
| `GET /mistakes/my?status=&topic=&source=&cursor=` | `status: NEW\|RETRYING\|MASTERED`, `topic` (≤80, сэдвийн нэрээр хэсэгчилсэн хайлт), `source: PRACTICE\|TEST`, `cursor` | `{ counts: {NEW, RETRYING, MASTERED}, byTopic: [{topic, count}], items: Entry[], nextCursor: string\|null }` (хуудас 200, `createdAt` буурах) |
| `GET /mistakes/today` | — | `Entry[]` ≤5 — өнөөдөр давтах (`nextRetryAt <= now` эсвэл null) |
| `POST /mistakes/:id/retry` | `{ answer }` (хоосон биш; формат §1.1) | `{ correct, correctAnswer, status, retryCount, nextRetryAt, solutionOutline: string\|null }` |
| `PATCH /mistakes/:id` | `{ reason?: CALC\|CONCEPT\|FORMULA\|READING\|TIME\|UNKNOWN, note? (≤500) }` | `{ id, reason, note }` |

`Entry`:
```json
{ "id": "m1",
  "problem": { "id": "p1", "statementText": "...", "choices": ["$2$", "$4$"], "choiceMode": "TEXT",
               "answerFields": ["a", "bc"], "format": "CHOICE", "imageKey": null },
  "givenAnswer": 1, "status": "NEW", "retryCount": 0, "reason": null, "note": null,
  "testTitle": "...", "createdAt": "...", "nextRetryAt": null,
  "formulas": [{ "slug": "div-2", "title": "...", "latex": "..." }],
  "correctAnswer": "$4$", "solutionOutline": "..." }
```
- `correctAnswer`, `solutionOutline` зөвхөн **дахин оролдсоны дараа** (эсвэл MASTERED) ирнэ — сервер шийднэ.
  `correctAnswer`: TEXT сонголтод зөв сонголтын **бичвэр**, бусдад түлхүүрийн утга. `solutionOutline` — VERIFIED л.
- `answerFields`: FILL_NUMBER-ийн объект түлхүүрийн нүднүүд (эсвэл байхгүй).
- Алдааны дэвтэрт орох, давтах хуваарь (`nextRetryAt`, MASTERED болох) — **сервер** (`mistake-scheduling.ts`). 409 «Дахин оролдоно уу» (зэрэг оролдлого).
- 400 «Энэ бодлогын хариу баталгаажаагүй байна», «Хариултаа оруулна уу»; 404 «Алдаа олдсонгүй».

### 1.1 Retry хариуны формат

Сонголт холилдохгүй (session-гүй): TEXT → `choices`-ийн **эх индекс** (number); LETTER → үсэг; FILL_NUMBER → мөр/объект;
OPEN → мөр. (`gradeAnswer(problem, answer)` choiceOrder-гүй.) Сонголтын зураг энэ хариунд ирэхгүй (ТОДРУУЛАХ — зурагтай сонголттой бодлого).

### 1.2 Бусад

`GET /mistakes/student/:studentId` (ADMIN/TEACHER_PLUS/TEACHER/PARENT) → `{ counts, byTopic, weakestTopics (≤5) }`.

## 2. Давтлага (`/app/study/review`, `/app/study/history`) — STUDENT, BUYER

Хугацаатай давтлагын «run». Вэб `study/review/page.tsx`.

| Маршрут | Бие / query | Хариу |
|---|---|---|
| `GET /study-review/options` | — | `{ resumeRunId: string\|null, chapters: [{ id, title, freshCount }] }` |
| `POST /study-review` | `{ clientRequestId: <uuid>, budgetMinutes: 10\|30\|60, chapterIds: string[1..5] }` | `Run` |
| `GET /study-review/:id` | — | `Run` |
| `POST /study-review/:id/items/:itemId/response` | `{ clientRequestId: <uuid>, answer: string (≤128), flags?: ("unsure"\|"guessed"\|"could-not"\|"help")[≤4], kind: "FIRST"\|"CORRECTION" }` | `Run` |
| `POST /study-review/:id/submit` | — | `Run` |
| `GET /study-review/history?year=&take=&cursor=` | | түүх ★ |

```json
// Run
{ "id": "r1", "budgetMinutes": 10, "deadlineAt": "...", "serverNow": "...", "status": "...",
  "items": [{ "id": "i1", "problemId": "p1",
              "source": { "statement": "...", "imageKey": null, "format": "CHOICE", "choiceMode": "TEXT",
                          "choices": ["...", { "label": "A", "text": "..." }] },
              "first": { "answer": "choice:2", "flags": [], "correct": true } ,
              "responses": [{ "kind": "FIRST", "answer": "choice:2", "correct": true, "assistance": false }],
              "solution": null, "answerKey": null }],
  "evidence": { "assigned": 5, "answered": 3, "firstCorrect": 2, "independentFirstCorrect": 2, "unknown": 0 },
  "caution": "..." }
```
- Бодлого тоо: 10 мин → 5, 30 → 10, 60 → 20 (`REVIEW_CAPS`).
- TEXT сонголтын хариу мөр: **`"choice:<индекс>"`** (вэб `displayAnswer`), бусад — бичсэн утга. «Бодож чадаагүй» (`could-not`) бол хоосон хариу зөвшөөрнө.
- `clientRequestId` (uuid) — idempotency: сүлжээ тасарч дахин илгээхэд давхардахгүй. **Ижил хүсэлтийг дахин илгээхдээ ижил id.**
- Таймер: `deadlineAt` ба `serverNow`-оос (утасны цагийн зөрүүг `serverNow`-оор тэгшил — вэб `offset`).
- `source.token` вэбийн төрөлд бий ч сервер интерцептороор ХАСДАГ — апп хүлээж бүү ав.
- `solution`/`answerKey` — хэзээ нээгдэх нь сервер (`study-review.policy.ts`; хэрэглэгдэхүүний дүрэм STATUS §7.21: анхны оролдлогод бодолт хэзээ ч үгүй).
- 400: «10, 30 эсвэл 60 минут сонгоно уу.», «1–5 сэдэв сонгоно уу.», «Хариулт буруу.», «Тэмдэглэгээ буруу.», «Хариултын төрөл буруу.», «Хүсэлтийн дугаар буруу.»
- Шалгалтын дүнгийн «Ижил сэдвийн бодлого бодох» мөн энэ `POST /study-review`-ээр (exam.md §5.1).
- Эцэг эх: `GET /study-review/children/:childId/history`.

## 3. Дадлага (`/app/practice`, `/app/study`) — STUDENT, BUYER

- `GET /recommend/next?limit=N` (0–99, анхдагч 10) **[хүнд]** → `[{ problemId, topicId, score, reason: RETRY_TOPIC|WEAK_TOPIC|RIGHT_LEVEL|NEW_TOPIC|CONFIDENCE,
  evidence: {...}, uncertainty: "small-sample"|"observed-only", explanation: string, contract: "observed-independent-v1" }]`.
  Бодлогын агуулга энэ хариунд байхгүй — тусад нь ★ (вэб `practice/AttemptModal`).
- Сэдвээр дасгал (2026-11-04): `GET /recommend/next?limit=N&chapterId=a,b` — сонголттой, 12 хүртэл бүлэг (таслалаар эсвэл давтан). Зөвхөн
  тэдгээр бүлгээс, эрхийн шүүлтүүр хэвээр; эрхгүй бол `[]`; бүх бодлогыг бодсон бол бодсоноос нь давтуулна. Буруу ID 400.
- `GET /recommend/chapter-match?topic=` (STUDENT, BUYER) → `{ chapterId: string|null, chapterIds: string[], title: string|null }` — хичээлийн
  чөлөөт сэдвийг зөвхөн яг/хэвшүүлсэн гарчгаар («Х · Тест N» бүлгүүдийг суурь гарчгаар) тааруулна; эргэлзээтэй/эрхгүй бол `null`.
- `POST /recommend/attempt` `{ problemId, givenAnswer?, autoCorrect?, selfState? }` — **`autoCorrect`-ыг сервер ҮЛ ТООМСОРЛОНО**,
  өөрөө дүгнэнэ (`void autoCorrect`). TEXT сонголтын хариуг бичвэр эсвэл үсгээр ч хүлээнэ. 400 «Хариултаа шалгана уу.»
- `/app/study` нүүр: `GET /learning-lab/history`, `GET /assignments/my`, `GET /recommend/next?limit=3`, `GET /lessons/chapters`, `GET /activity/me`.
- `learning-lab/*` (`problem`, `bank/:id`, `response`, `correction`, `solution`, `history`) — туршилтын «лаборатори» урсгал **[ховор]**,
  апп-д эхний шатанд хэрэггүй. ★

## 3.1 Алдсан бодлогын хугацаатай давталт (2026-11-04) — STUDENT

Дасгал, давтлага, тест, онлайн гэрийн даалгаварт буруу бодсон бодлого маргааш (УБ шөнө дунд) давтагдана. Давтлагаар зөв: 3 → 7 →
интервал × ease хоног (≤180); буруу: 1 хоног.
- `GET /review/problems/due?limit=` (1–30, анхдагч 10) → `{ total, items: [{ id, problem: {id, statementText, choices, choiceMode, answerFields,
  format, imageKey}, dueAt, intervalDays, reps, lapses, lastResult: WRONG|CORRECT, source, formulas }] }`. `problem` нь `/mistakes/today`-тэй
  ижил хэлбэр; хариуны түлхүүр, бодолт ИРЭХГҮЙ.
- `POST /review/problems/:id/answer` `{ answer }` (§1.1-ийн retry хэлбэр) → `{ correct, correctAnswer|null, solutionOutline|null, scheduled,
  dueAt, intervalDays, reps, lapses }`. Хугацаа болоогүй бол 409 (дүгнэхгүй, юу ч задрахгүй). Бусдын мөр 404, зэрэг 409.
- Хариу нээх хаалга (гэрийн даалгавар, шалгалтын дүнтэй ижил): ангид бодогдох тестийн (`reservedAnywhere`) эсвэл эрх нь FULL биш
  1000 бодлогын бодлого давтлагад гарахгүй (хуваарь хэвээр). Тестэд орсон бодлогод `correctAnswer: null` (тест дахин ашиглагдана),
  гэрийн даалгаврын тухайн тестэд л нээгдэнэ; бодолт зөвхөн VERIFIED.

## 4. Хичээл, номын сан, видео (`/app/learn`, `/app/library`, `/app/videos`)

- `GET /lessons/chapters?subject=&bookId=` (бодит хэлбэр, `lessons.service.ts` `listChaptersWithLessons`) →
  `[{ id, title, order, grade, book: { code, title, displayName, subject }, theoryCount, videoCount, theoriesRead, videosWatched, completed }]`.
  `freePreview`, `bookId`, `progress{percent,stepsDone}` ГЭСЭН талбар БАЙХГҮЙ (өмнөх хувилбар таамагласан). Явц = `(theoriesRead + videosWatched) / (theoryCount + videoCount)`
  (тоолуурыг бүлгийн тооноос хэтрүүлэхгүй); `completed` — сервер тооцсон. `videoCount` нь бичлэгийн эрхгүй бол 0.
  `videosWatched` зөвхөн `VIDEO_COMPLETED` үйл явдлыг тоолно (`VIDEO_STARTED` тоологдохгүй).
- `GET /lessons/:chapterId` → `{ chapter: { id, title, book }, theories: [{ id, title, content, imageKeys, order }], videos: [{ id, title, url|s3Key, duration?, media?: { embedUrl }, unavailable? }],
  problemCount, tests: [{ id, title, type, problemCount }], progress: { theoryRead: string[], videosWatched: string[], problemsAttempted: number } }`.
  `theories[].content` — markdown + LaTeX. Эрхгүй бүлэгт 403 (сервер монгол тайлбар өгнө).
- `POST /lessons/:chapterId/progress` `{ action, theoryId?, videoId? }`, `action` ∈ **`THEORY_READ`** (`theoryId` заавал), **`VIDEO_STARTED`**, **`VIDEO_COMPLETED`**
  (`videoId` заавал). Хуучин `THEORY_VIEWED`, `PROBLEMS_OPENED` БАЙХГҮЙ. Хариу ҮРГЭЛЖ 202 `{ accepted: true }` (бичилт алдаатай ч); дутуу id-д 400.
  `THEORY_READ` нь `LearningEvent PAGE_VIEW` болж `progress.theoryRead`-д орно. Апп `VIDEO_STARTED`-ыг товшилтоор илгээнэ; `VIDEO_COMPLETED`-ыг
  гадаад тоглуулагчаас мэдэх боломжгүй тул илгээхгүй (тиймээс «бичлэг үзсэн» тоо апп-аас өсөхгүй) ★.
- Номын сан: `GET /books?subject=`, `GET /chapters?bookId=` (вэб `library/page.tsx`) — part 1 онолын гэрээтэй давхцана ★.
  Апп бүлгийн жагсаалтыг `GET /lessons/chapters`-аас авна.
- Бүлгийн бодлого (`/app/library/:chapterId/problems`): `GET /chapters/:id/problems?skip=0&take=50` (`take` ≤ 100, нийт тоо ИРЭХГҮЙ — хуудас дүүрэн ирвэл үргэлжлүүлнэ) →
  `[{ id, number, page, statementText, imageKey, format, choices: string[]|null, choiceOptions: [{ label, text, imageKey }], youtubeUrl, variantLabel, tags, formulas }]`.
  Сурагчид `correctAnswer`, `analysis`, `version` ирэхгүй; `youtubeUrl` бичлэгийн эрхгүй бол `null`. Ангийн сурагчид зөвхөн нээгдсэн тестийн бодлого.
  Эрхгүй бол 403, бүлэг устсан бол 404 (монгол тайлбартай).
  **Номын `code`-ийг сурагчид бүү харуул** (`displayName ?? title`).
- Видео: `GET /videos?chapterId=`, `GET /videos/chapters`, `GET /videos/problem` ★, `POST /videos/:id/open` (тоглуулах холбоос/эрх; вэб
  `ProblemVideoDisclosure`). Видео файл `/files/:s3Key`-ээр (S3 → 302 presigned, exam.md §7) — урсгал (stream) тоглуулагч Range header
  дэмжих ёстой ★. Сул сүлжээнд видеог автоматаар бүү ачаал.

## 5. Томьёоны сан (`/app/formulas`) — бүх нэвтэрсэн role

- `GET /formulas/sections`, `GET /formulas?…` (`FormulaQueryDto` ★), `GET /formulas/:slug`, `GET /formulas/my?studentId=` (сурагчийн туулсан тестийн томьёо).
- Нэвтрэлтгүй статик хувилбар (вэб `57f5fde`, `1a882b3`; апп жагсаалтыг эндээс эхэлж авна, унавал дээрх API-руу шилжинэ):
  - `GET {web}/tools/formulas.json` — хөнгөн жагсаалт `{version: 2, detail: true, count, sections:[{slug,title,order,count}], formulas:[{slug,title,section,order,grade,level,latex,keywords,widget,simple?}]}`.
    `simple` = `{say, formula, parts:[{tex,mean}]}` (385 томьёо); `formula`/`tex`/`say` дотор `\colA{…}`–`\colD{…}` өнгөт тэмдэглэгээ.
  - `GET {web}/tools/formulas-detail/<бүлгийн slug>.json` — `{<томьёоны slug>: {explanation, examples, …, simpleMore:{steps, example:{problem,steps,answer}, watch?}}}`.
    Апп зөвхөн `simpleMore`-ыг авна; «Алхамаар ойлгох»-ыг анх дарахад л татаж, бүлэг тутамд нэг удаа санах ойд кэшлэнэ. Алдаа → «Дахин оролдох».
  - Өнгө: `\colA` = тодотгол хөх, `\colB` = улаавтар, `\colC` = ногоон, `\colD` = гүн хөх (`AppColors` токен, зөвхөн бичвэрт; шар/алт, өнгөт дэвсгэр хориотой).
  - Хайлт нь нэр, slug, `simple.say`, `parts[].mean`-аар (томьёоны тэмдэгтгүй).
  - Нэвтрэлтгүй (`auth:false`), `Env.webBaseUrl` суурьтай. Дэлгэрэнгүй (`related`, жишээ, алдаа) нь `GET /formulas/:slug` хэвээр.
- `/app/formulas/review|print|widgets` — ажилтны **[ховор]**, `↗`.

## 6. Зорилго, бэлэн байдал, идэвх

- Зорилго (`/app/goals`, STUDENT): `GET /goals`, `POST /goals` `{ title, description?, targetDate? (ISO), status?: TaskStatus, subject?: MATH|SOCIAL_STUDIES|SAT }`,
  `PATCH /goals/:id` (бүх талбар сонголттой; `targetDate: null` бол огноог арилгана), `DELETE /goals/:id` → `{ ok: true }` — **ХАТУУ устгал** (`prisma.studentGoal.delete`),
  тиймээс апп хэрэглэхгүй: оронд нь `status: "CANCELLED"`. Хариу: `{ id, title, description, targetDate (ISO), status, subject, createdAt, updatedAt }`.
  `TaskStatus` ∈ PLANNED|IN_PROGRESS|DONE|BLOCKED|CANCELLED. Бусдын зорилгод 404 «Зорилго олдсонгүй».
- ЭЕШ бэлэн байдал (`/app/readiness`): `GET /readiness/my` (STUDENT), `GET /readiness/student/:id` (эцэг эх, ажилтан) →
  `{ index (0–100), low, high, dataPoints, effectiveDataPoints, coverage, topics: [{ topic, title, mastery: number|null, measured, weight, attempts, effectiveAttempts, trend: UP|DOWN|FLAT }] }`.
  Нэмэлт: `nextBestTopics` (сул тал × ЭЕШ-ийн жингээр эхний 3 сэдэв, `topics`-тэй ижил хэлбэр), `weeklyHistory: [{ week: "YYYY-MM-DD", index, coverage }]` (8 долоо хоног; `coverage` 0 бол хэмжилтгүй). `topic` нь кодын нэр (ALG, DERIV), `title` монгол.
  Тооцоолол серверт — апп зөвхөн харуулна (`low..high` муж = тодорхойгүй байдал; «таамаг» гэж хэт итгэлтэй бүү харуул).
  Нэмэлт (2026-11-04): сэдэв бүрт `chapterId: string|null` — тухайн сэдэвт сурагчийн хамгийн их бодсон бүлэг (сэдвээр дасгал нээхэд).
- Идэвх: `GET /activity/me?year=` → `{ year, totalActiveDays, days: [{ date: "YYYY-MM-DD", count, level, isHoliday, isClassDay }] }` (бүтэн жил —
  ~365 мөр; `level` 0-4: 0, 1-3, 4-7, 8-14, 15+ бодлого). `GET /activity/streak` → `{ currentStreak, longestStreak, totalActiveDays }` (вэб) +
  нэмэлт (2026-11-04): `flexStreak` (ISO 7 хоног бүрт 1 идэвхгүй өдрийг тэвчинэ), `restDayUsedThisWeek`, `activeDaysThisWeek`, `weeklyGoal: number|null`.
  Апп цувралын тоог дарамттай харуулахгүй (UX-RESEARCH §10) — зөвхөн амралтын өдрийн тайван мэдээлэл.
- 7 хоногийн зорилго: `GET /study/weekly-goal` → `{ daysPerWeek: 1..7|null, updatedAt }`; `PUT /study/weekly-goal` `{ daysPerWeek: 1..7|null }`
  (null = арилгах, зөөлөн устгал). STUDENT, зөвхөн өөрийнх.

## 7. Сурагчид хамааралгүй (PARITY засвар)

- `/app/planner` — ажилтны даалгаврын самбар (`/tasks/*`, `staff-directory`), сурагчийн «төлөвлөгч» БИШ → M9/`↗`. Сурагчийн төлөвлөгч нь `/app/goals` (`StudentGoal`).
- `/app/insights` — багшийн аналитик (`/insights/distractor-analysis|problem-quality|topic-mastery`) **[хүнд]** → M9/`↗`.
- `/app/results-ranking` → `/app/tests?tab=rank` redirect (exam.md §1.5 `GET /test-rankings/:testId`).
- Гэрийн даалгаврын B хувилбар (`/homework/my`, `/homework/attempts*`, `/homework/photos*`) — part 1 (homework) гэрээ.

## ТОДРУУЛАХ

1. ★ тэмдэгтэй endpoint-уудын бүтэн хэлбэр (videos, formulas query, study-review history) — тухайн дэлгэцийг бичихэд. Lessons progress, goals delete, chapter problems — 2026-11-02 баталгаажсан.
2. Алдааны дэвтрийн retry-д сонголтын зураг (`choiceImages`) ирдэггүй — зурагтай сонголттой бодлогыг апп-д яаж харуулах ([A] эсвэл зөвхөн бичвэр).
