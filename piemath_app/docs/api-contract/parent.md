# API гэрээ — Эцэг эх (M7)

Эх: `api/src/parents/{parents.controller,parents.service,parent-history}.ts`, `api/src/reports/weekly-report.*`,
`api/src/exams/exam-results.*` (`parentCard`), `api/src/tuition/tuition.controller.ts` (`paid-until`),
`api/src/study-review/study-review.controller.ts`, `api/src/mistakes/mistakes.controller.ts`.
Вэб: `web/src/app/app/parent/{page,weekly/page}.tsx`, `web/src/components/parent/*`,
`web/src/components/reports/WeeklyReportClient.tsx`, `web/src/components/payments/PaidUntilCard.tsx`. Огноо: 2026-11-01.

Нийтлэг дүрэм — `exam.md` §0. Эрх: бүгд `JwtAuthGuard + RolesGuard`, `role = PARENT`.
**Хүүхдийн мэдээлэл зөвхөн БАТАЛГААЖСАН холболттой** (`ParentLink.verifiedAt != null`) үед; баталгаажаагүй бол
403 «Хүүхэдтэй холболт баталгаажаагүй байна.» Бодлогын код (`token`) эцэг эхэд ХЭЗЭЭ Ч ирэхгүй.

## 1. Хүүхэд холбох

### 1.1 `POST /parent/links`

Бие: `{ "studentPhone": "99112233" }` (`^\d{8}$`, 400 «Сурагчийн утас 8 оронтой байх ёстой»).
404 «Ийм утасны дугаартай сурагч олдсонгүй». Idempotent (upsert). Хариу (Prisma мөр):
```json
{ "id": "lnk1", "parentId": "...", "studentId": "...", "verifiedAt": null, "verifiedById": null,
  "student": { "id": "...", "firstName": "Бат", "lastName": "Дорж", "phone": "99112233" } }
```
Ажилтан (ADMIN/TEACHER_PLUS) `POST /parent/links/:id/verify` хийсний дараа л мэдээлэл харагдана. Апп: «Хүсэлт
илгээгдлээ. Төвийн ажилтан баталгаажуулсны дараа хүүхдийн мэдээлэл харагдана.»

## 2. `GET /parent/children` — хүүхдүүд + сүүлийн мэдээлэл

Вэб: `app/app/parent/page.tsx`, `WeeklyReportClient` (хүүхэд сонгох). Эрэмбэ: холболтын `id` өсөх.
```json
[
  { "id": "lnk2", "verifiedAt": null, "studentId": "s2", "verified": false,
    "student": { "id": "s2", "firstName": "...", "lastName": "...", "phone": "88xxxxxx" } },
  { "id": "lnk1", "verifiedAt": "2026-09-01T03:00:00.000Z", "verified": true,
    "student": {
      "id": "s1", "firstName": "Бат", "lastName": "Дорж", "phone": "99112233",
      "studentProfile": { "grade": 12, "school": "Жишээ сургууль", "type": "CLASSROOM" },
      "classroom": { "id": "cls1", "name": "12Б", "grade": 12 },
      "joinedAt": "2026-09-01T00:00:00.000Z",
      "enrollments": [{ "joinedAt": "...", "classroom": { "id": "cls1", "name": "12Б", "grade": 12 } }],
      "attendances": [{ "date": "2026-10-30T00:00:00.000Z", "status": "PRESENT", "classroom": { "name": "12Б" } }],
      "dailyHomeworkMarks": [{ "date": "2026-10-30T00:00:00.000Z", "status": "PARTIAL", "comment": null, "classroom": { "name": "12Б" } }],
      "submissions": [{ "id": "sub1", "state": "SUBMITTED", "imageKeys": ["k1.jpg"], "submittedAt": "...", "checkedAt": null,
                        "assignment": { "title": "...", "dueDate": "...", "classroom": { "name": "12Б" } } }],
      "testResults": [{ "id": "tr1", "totalScore": 31, "maxScore": 40, "source": "ONLINE_TEST", "createdAt": "...",
                        "test": { "title": "...", "type": "EESH_MOCK" }, "acknowledgements": [{ "verifiedAt": "..." }] }],
      "payments": [{ "id": "pay1", "status": "CONFIRMED", "amount": 350000, "createdAt": "..." }]
    } }
]
```
- Баталгаажаагүй мөрт зөвхөн нэр/утас (`verified: false`) — өөр мэдээлэл ирэхгүй.
- Хязгаар: `attendances` сүүлийн 12, `dailyHomeworkMarks` (тэмдэглэгдсэн) 14, `submissions` 8, `testResults` 8,
  `payments` 12 — бүгд шинэ нь эхэнд. `enrollments` идэвхтэй 1 (`classroom`, `joinedAt` нь түүнээс).
- `date` талбар (`@db.Date`): `"YYYY-MM-DDT00:00:00.000Z"` — **огнооны хэсгийг л ав** (UB-д хөрвүүлбэл өдөр гулсахгүй, гэхдээ
  цагийн бүсээр бүү шилжүүл — STATUS §8.9).
- Enum + вэбийн монгол шошго (`page.tsx`):
  - Ирц `AttendanceStatus`: `PRESENT` «Ирсэн», `LATE` «Хоцорсон», `ABSENT` «Тасалсан», `EXCUSED` «Чөлөөтэй».
    «Өвчтэй» сонголт БАЙХГҮЙ (RULES §6).
  - Танхимын даалгавар `HomeworkMarkStatus`: `DONE` «Хийсэн», `PARTIAL` «Дутуу», `NOT_DONE` «Хийгээгүй».
  - Онлайн даалгавар `SubmissionState`: `NOT_DONE` «Хийгээгүй», `SUBMITTED` «Шалгуулахаар илгээсэн»,
    `RETURNED` «Дахин илгээх», `DONE_ONLINE` «Шалгасан», `DONE_IN_CLASS` «Ангид шалгасан».
  - Төлбөр `PaymentStatus`: `PENDING | CONFIRMED | REJECTED | REVERSED`.
- Даалгаврын загвар (STATUS §7.11): `studentProfile.type == "CLASSROOM"` бол `dailyHomeworkMarks`, `ONLINE` бол `submissions`
  харуулна (тэмдэглэгээ байвал түүнийг, үгүй бол илгээлтийг).
- `imageKeys` (илгээлтийн зураг) → `GET /files/:key` (эцэг эх баталгаажсан бол эрхтэй; 7 хоногийн дараа серверийн cron
  устгадаг → 404 хэвийн).
- `acknowledgements[0].verifiedAt` → «Танилцсан» тэмдэг (§5).

## 3. `GET /parent/children/:studentId/history?year=YYYY&page=N` — бүтэн түүх

Вэб: `components/parent/ChildHistory.tsx`. `year` анхдагч одоогийн UTC жил (2000..одоо+1), `page` 1..1000
(400 «Жилээ шалгана уу.», «Түүхийн хуудсыг шалгана уу.»). Хуудас бүр 50 мөр (жагсаалт тус бүрд тусдаа).
Цонх: `[YYYY-01-01T00:00Z, YYYY+1-01-01T00:00Z)` — **UTC жил** (UB-ийн 1-р сарын 1-ний 00:00–08:00 өмнөх жилд орно).
```json
{
  "year": 2026, "page": 1, "pageSize": 50,
  "summary": { "activeDays": 40, "attemptCount": 820, "learningEventCount": 12,
               "days": [{ "date": "2026-10-30T00:00:00.000Z", "attempts": 20 }] },
  "attempts":  { "rows": [{ "id": "...", "problemId": "...", "testId": "..." , "source": "ONLINE_TEST",
                            "occurredOn": "...", "createdAt": "...", "autoCorrect": true, "selfState": null,
                            "givenAnswer": "C", "problem": { "chapterId": "ch1", "chapter": { "title": "..." } } }], "hasMore": false },
  "learning":  { "rows": [{ "id": "...", "problemId": "...", "chapterId": "...", "at": "...", "evidence": { ... } }], "hasMore": false },
  "homework":  { "rows": [{ "id": "...", "date": "...", "status": "DONE", "comment": null, "classroom": { "name": "12Б" } }], "hasMore": false },
  "submissions": { "rows": [{ "id": "...", "state": "DONE_ONLINE", "studentNote": null, "reviewNote": null,
                              "revisions": [{ "id": "...", "action": "...", "state": "...", "studentNote": null, "reviewNote": null, "imageKeys": [], "at": "..." }],
                              "imageKeys": [], "submittedAt": "...", "checkedAt": "...",
                              "assignment": { "title": "...", "dueDate": "...", "classroom": { "name": "12Б" } } }], "hasMore": false },
  "results":   { "rows": [{ "id": "tr1", "testId": "...", "totalScore": 31, "maxScore": 40, "source": "...", "createdAt": "...",
                            "test": { "title": "...", "type": "..." }, "acknowledgements": [] }], "hasMore": false },
  "attendance": { "rows": [{ "id": "...", "date": "...", "status": "LATE", "classroom": { "name": "12Б" } }], "hasMore": false },
  "dismissals": { "rows": [{ "id": "...", "date": "...", "approximateAt": "...", "lastLeftAt": null, "note": null, "classroom": { "name": "12Б" } }], "hasMore": false },
  "lessonPackets": { "rows": [{ "id": "...", "date": "...", "chapter": { "title": "..." },
                                "receipts": [{ "id": "...", "kind": "...", "imageKeys": [], "submittedAt": "..." }] }], "hasMore": false }
}
```
- `hasMore: true` → `page+1`. `dismissals` — ангийн тарах ойролцоо цаг (`approximateAt`, `lastLeftAt` нь ISO агшин —
  UB цагаар `HH:mm` харуул), багш `/learning-lab/classrooms/:id/dismissal`-аар бичдэг (teacher.md).
- `learning[].evidence`: зөвхөн `lab: "v1"` мета-ийн сурагчид харагдах талбарууд (`parent-history.ts parentLearningMeta`);
  ТОДРУУЛАХ — бүтэц нь лабын туршилтын өгөгдөл, апп-д одоохондоо харуулахгүй байж болно.
- `givenAnswer`: бодлогын канон хариу (сонголтын бичвэр, тоо, объект) эсвэл null.

### 3.1 `GET /parent/children/:studentId/theory/:chapterId`

Хүүхдийн эрхтэй бүлгийн онол. 404 «Хичээл олдсонгүй.», 403 «Энэ хичээлийг үзэх эрхгүй.»
`{ "chapter": { "id": "...", "title": "..." }, "theories": [{ "id": "...", "title": "...", "content": "<LaTeX бичвэр>", "imageKeys": ["..."] }] }`.

## 4. 7 хоногийн тайлан — `GET /parents/weekly-report?studentId=&week=YYYY-MM-DD`

Анхаар: угтвар **`/parents`** (олон тоо), бусад нь `/parent`. Эрх PARENT (баталгаажсан хүүхэд), ADMIN.
`week` = **Даваа гарагийн** огноо (UB календарь) — эс бөгөөс 400 «Долоо хоногийн эхлэл Даваа гараг байх ёстой».
403 «Зөвхөн баталгаажсан хүүхдийн тайланг үзнэ», 404 «Сурагч олдсонгүй». Вэб: `WeeklyReportClient.tsx`
(URL `?studentId=&week=`).
```json
{
  "student": { "id": "s1", "firstName": "Бат", "lastName": "Дорж" },
  "week": { "start": "2026-10-26", "end": "2026-11-01" },
  "attendance": { "present": 3, "absent": 0, "excused": 1 },
  "tests": [{ "title": "...", "score": 31, "maxScore": 40, "createdAt": "..." }],
  "testResultsComplete": true, "testResultLimit": null,
  "snapshotAt": "2026-11-01T06:00:00.000Z",
  "practiceCount": 42,
  "homework": {
    "assignments": { "done": 2, "notDone": 1, "items": [{ "title": "...", "dueDate": "...", "done": true }] },
    "dailyMarks": { "done": 2, "partial": 1, "notDone": 0, "unmarked": 1 }
  },
  "topics": { "best": { "topic": "Интеграл", "total": 20, "correct": 18, "rate": 0.9 },
              "weakest": { "topic": "...", "total": 10, "correct": 3, "rate": 0.3 },
              "complete": true, "sampleLimit": null },
  "nextWeekSchedule": [{ "date": "2026-11-02", "startMinute": 900, "endMinute": 1020, "room": "501", "classroom": "12Б" }]
}
```
- `attendance.present` = PRESENT + LATE. `tests[].score/maxScore`: null байж болно (ангийн тест, дүн ороогүй).
- `nextWeekSchedule`: дараагийн 7 хоногийн хичээл; `date` UB календарийн `YYYY-MM-DD`; `startMinute`/`endMinute` — UB
  шөнө дундаас хойших минут (900 = 15:00). Цуцалсан хасагдсан, зөөсөн нь шинэ цагтаа. **Серверт ClassSchedule.weekday нь
  JS дугаарлалт (0=Ням…6=Бямба)** — апп энэ хариуг ашиглавал гараг тооцох шаардлагагүй (`date` бэлэн).
- `topics.best/weakest`: null байж болно. `rate` 0..1.

## 5. Шалгалтын дүн, танилцах

### 5.1 `GET /exam-results/parent/:testResultId` — дүнгийн карт

Вэб: `components/parent/ExamResultCard.tsx`. 404 «Шалгалтын дүн олдсонгүй», 403 «Хүүхэдтэй холболт баталгаажаагүй байна.»
```json
{ "testResultId": "tr1", "test": { "title": "...", "type": "EESH_MOCK" },
  "totalScore": 31, "maxScore": 40, "percent": 78,
  "parts": { "part1": 24, "part1Max": 28, "part2": 7, "part2Max": 12 },
  "weakTopics": [{ "name": "Интеграл", "percent": 40 }],
  "takenAt": "...", "acknowledgedAt": null, "canAcknowledge": true }
```
`parts`: null байж болно. `weakTopics` ≤3 (сэдэв 1 бол хоосон). `canAcknowledge` = танхимын сурагч.

### 5.2 Танилцсанаа батлах (имэйл OTP)

1. `POST /parent/results/:testResultId/ack/request` → `{ "maskedEmail": "b***@gmail.com" }`. **Код ХҮҮХДИЙН имэйл рүү**
   очно. 400 «Танхимын сурагчидын дүн л танилцуулах боломжтой», 400 «Сурагчийн имэйл бүртгэлгүй байна. Эхлээд регистр хийнэ үү.»
2. `POST /parent/results/:testResultId/ack/verify` бие `{ "code": "123456" }` (`^\d{6}$`) → ResultAcknowledgement мөр
   (`{ id, testResultId, parentId, channel: "EMAIL_OTP", verifiedAt, ... }`). Давтан батлахад өмнөх мөр.
   ТОДРУУЛАХ: OTP-ийн буруу/хугацаа дууссан үеийн статус, мессеж `EmailOtpService.verifyOtp`-д (энэ баримтад уншаагүй).
- Хэрэглэгчдийн ихэнх имэйлгүй (RULES §2) — имэйлгүй бол товчийг идэвхгүй болгож тайлбар харуул.

## 6. Төлбөрийн төлөв — `GET /tuition/paid-until/:studentId`

Эрх PARENT (баталгаажсан хүүхэд; 403 «Эцэг эхийн холбоос баталгаажаагүй байна»). Хариу `{ "paidUntil": "<ISO>" | null }`.
Вэб: `PaidUntilCard` (compact). Төлбөрийн бүрэн гэрээ/ledger эцэг эхэд одоогоор API-гүй — апп зөвхөн `paidUntil`
ба `/parent/children`-ийн `payments` (сүүлийн 12)-ийг харуулна. Данс хуулах «Хуулах» товч — дансны мэдээллийн эх
сурвалж ТОДРУУЛАХ (part 1 `payments` гэрээг үз).

## 7. Бусад эцэг эхэд нээлттэй (товч, дэлгэрэнгүй нь learning.md)

| Маршрут | Юу |
|---|---|
| `GET /study-review/children/:childId/history?year=&take=&cursor=` | Хүүхдийн давтлагын түүх |
| `GET /mistakes/student/:studentId` | Хүүхдийн алдааны дэвтэр (ADMIN/TEACHER_PLUS/TEACHER/PARENT) |
| `GET /readiness/student/:id` | ЭЕШ бэлэн байдал |
| `GET /lesson-flow/days/:id?studentId=` | Хичээлийн урсгалын өдөр |
| `GET /formulas`, `/formulas/:slug`, `/formulas/sections` | Томьёоны сан |
| Мэдэгдэл, тохиргоо | `notification-center`, `notification-preferences` — part 1 гэрээ |

## ТОДРУУЛАХ

1. «Чөлөө» (`/app/dismissal`) нь эцэг эхийн чөлөө хүсэх БИШ — багшийн «ангийн тарах цаг» бүртгэл; эцэг эх зөвхөн
   `history.dismissals`-аар хардаг. Эцэг эх хүүхдэд чөлөө хүсэх API одоогоор БАЙХГҮЙ (PARITY-ийн «Чөлөө» мөрийг засах).
2. Эцэг эхэд төлбөрийн ledger (сар бүрийн төлөв) харуулах эсэх — одоо зөвхөн `paidUntil` + `payments`.
