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
- `POST /recommend/attempt` `{ problemId, givenAnswer?, autoCorrect?, selfState? }` — **`autoCorrect`-ыг сервер ҮЛ ТООМСОРЛОНО**,
  өөрөө дүгнэнэ (`void autoCorrect`). TEXT сонголтын хариуг бичвэр эсвэл үсгээр ч хүлээнэ. 400 «Хариултаа шалгана уу.»
- `/app/study` нүүр: `GET /learning-lab/history`, `GET /assignments/my`, `GET /recommend/next?limit=3`, `GET /lessons/chapters`, `GET /activity/me`.
- `learning-lab/*` (`problem`, `bank/:id`, `response`, `correction`, `solution`, `history`) — туршилтын «лаборатори» урсгал **[ховор]**,
  апп-д эхний шатанд хэрэггүй. ★

## 4. Хичээл, номын сан, видео (`/app/learn`, `/app/library`, `/app/videos`)

- `GET /lessons/chapters?subject=&bookId=` → `[{ id, title, order, grade?, freePreview, bookId?, book?: { id?, code, title, displayName? }, progress?: { percent?, stepsDone?, stepsTotal?, lastOpenedAt? } }]`.
- `GET /lessons/:chapterId` → `{ chapter, theories: [{ id, title, content, imageKeys, order, freePreview? }], videos: [{ id, title, s3Key, duration? }],
  problemCount, tests: [{ id, title, type, timeLimitMin?, price?, variantLabel? }], progress?: { theoryIds?, videoIds?, problemsOpened?, testIds? } }`.
  `theories[].content` — markdown + LaTeX (`SafeMarkdown`-аар). Эрхгүй бүлэгт 403 ★.
- `POST /lessons/:chapterId/progress` `{ action: THEORY_VIEWED|VIDEO_STARTED|VIDEO_COMPLETED|PROBLEMS_OPENED, theoryId?, videoId? }`.
- ТОДРУУЛАХ: вэбийн `components/lesson/types.ts` өөрөө «progress-ийн бүтэц таамагласан» гэж бичсэн — `lessons.service.ts`
  (`getLesson`, `listChaptersWithLessons`)-ээс апп бичихээс өмнө баталгаажуул; бүх progress талбарыг optional-оор уншина.
- Номын сан: `GET /books?subject=`, `GET /chapters?bookId=` (вэб `library/page.tsx`) — part 1 онолын гэрээтэй давхцана ★.
  **Номын `code`-ийг сурагчид бүү харуул** (`displayName ?? title`).
- Видео: `GET /videos?chapterId=`, `GET /videos/chapters`, `GET /videos/problem` ★, `POST /videos/:id/open` (тоглуулах холбоос/эрх; вэб
  `ProblemVideoDisclosure`). Видео файл `/files/:s3Key`-ээр (S3 → 302 presigned, exam.md §7) — урсгал (stream) тоглуулагч Range header
  дэмжих ёстой ★. Сул сүлжээнд видеог автоматаар бүү ачаал.

## 5. Томьёоны сан (`/app/formulas`) — бүх нэвтэрсэн role

- `GET /formulas/sections`, `GET /formulas?…` (`FormulaQueryDto` ★), `GET /formulas/:slug`, `GET /formulas/my?studentId=` (сурагчийн туулсан тестийн томьёо).
- Нэвтрэлтгүй статик хувилбар: `https://pimath.mn/tools/formulas.json` (books-scan-public.md §5) — офлайн кэшэд тохиромжтой.
- `/app/formulas/review|print|widgets` — ажилтны **[ховор]**, `↗`.

## 6. Зорилго, бэлэн байдал, идэвх

- Зорилго (`/app/goals`, STUDENT): `GET /goals`, `POST /goals` `{ title, description?, targetDate? (ISO), status?: TaskStatus, subject?: MATH|SOCIAL_STUDIES|SAT }`,
  `PATCH /goals/:id` (бүх талбар сонголттой), `DELETE /goals/:id` ★ (устгал хатуу/зөөлөн эсэхийг шалга).
- ЭЕШ бэлэн байдал (`/app/readiness`): `GET /readiness/my` (STUDENT), `GET /readiness/student/:id` (эцэг эх, ажилтан) →
  `{ index (0–100), low, high, dataPoints, effectiveDataPoints, coverage, topics: [{ topic, title, mastery: number|null, measured, weight, attempts, effectiveAttempts, trend: UP|DOWN|FLAT }] }`.
  Тооцоолол серверт — апп зөвхөн харуулна (`low..high` муж = тодорхойгүй байдал; «таамаг» гэж хэт итгэлтэй бүү харуул).
- Идэвх: `GET /activity/me?year=` → `{ year, totalActiveDays, days: [{ date: "YYYY-MM-DD", count, level, isHoliday, isClassDay }] }` (бүтэн жил —
  ~365 мөр; `compute()` хэрэггүй, гэхдээ кэшлэ); `GET /activity/streak` → `{ currentStreak, longestStreak, totalActiveDays }`.

## 7. Сурагчид хамааралгүй (PARITY засвар)

- `/app/planner` — ажилтны даалгаврын самбар (`/tasks/*`, `staff-directory`), сурагчийн «төлөвлөгч» БИШ → M9/`↗`.
- `/app/insights` — багшийн аналитик (`/insights/distractor-analysis|problem-quality|topic-mastery`) **[хүнд]** → M9/`↗`.
- `/app/results-ranking` → `/app/tests?tab=rank` redirect (exam.md §1.5 `GET /test-rankings/:testId`).
- Гэрийн даалгаврын B хувилбар (`/homework/my`, `/homework/attempts*`, `/homework/photos*`) — part 1 (homework) гэрээ.

## ТОДРУУЛАХ

1. ★ тэмдэгтэй endpoint-уудын бүтэн хэлбэр (lessons progress, videos, formulas query, study-review history, goals delete) — тухайн дэлгэцийг бичихэд.
2. Алдааны дэвтрийн retry-д сонголтын зураг (`choiceImages`) ирдэггүй — зурагтай сонголттой бодлогыг апп-д яаж харуулах ([A] эсвэл зөвхөн бичвэр).
