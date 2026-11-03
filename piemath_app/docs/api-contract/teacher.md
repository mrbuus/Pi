# API гэрээ — Багш (утсанд тохирох хэсэг, M8)

Эх: `api/src/attendance/{attendance.controller,attendance.service,marking-access,board-logic}.ts`,
`api/src/assignments/{assignments,homework-marks}.*`, `api/src/classrooms/*`, `api/src/class-dashboard/*`,
`api/src/notes/*`, `api/src/presence/*`, `api/src/schedule/{schedule.controller,teacher-hours.*,week-resolver}.ts`,
`api/src/lesson-records/*`, `api/src/lesson-day/*`, `api/src/learning-lab/dismissal*`, `api/src/tuition/tuition.controller.ts`.
Вэб: `web/src/components/TeacherDashboard/board/{Board,useBoard,lib}.tsx`, `web/src/hooks/usePresence.ts`,
`web/src/app/app/{teacher,classes,students,teacher-hours,dismissal}/**`. Огноо: 2026-11-01.

Нийтлэг — `exam.md` §0. Огнооны параметр бүр `YYYY-MM-DD` (**UB календарийн өдөр**); сервер `@db.Date`-ээр хадгална.
`startMinute`/`endMinute` = UB шөнө дундаас хойших минут (900 = 15:00). Бүх хичээл 120 минут (STATUS §7.1).

## 0. Эрхийн загвар (сервер шийднэ — апп зөвхөн UI нуух/харуулах)

| | ADMIN | TEACHER_PLUS (Багш+) | TEACHER |
|---|---|---|---|
| Ирц, даалгавар тэмдэглэх/харах | бүх идэвхтэй анги | бүх идэвхтэй анги | **бүх идэвхтэй анги** (`TEACHER_SEES_ALL = true`, эзэн 2026-10-19; хэн тэмдэглэсэн нь аудитад) |
| Эрсдэлийн шалгуур засах (`PUT …/criteria`) | тийм | тийм | үгүй (`canEditCriteria: false`) |
| Хуваарь засах, сэдэв, staffing | тийм | тийм (`schedule.manage` байнга) | зөвхөн харна |
| Анги солих/нэмэх (`POST /classrooms/:id/enroll`) | тийм | тийм | үгүй |
| Ангиас хасах | `canManageStudents` | `canManageStudents` | үгүй |
| Мөнгө (төлбөрийн дүн, ledger) | тийм | `finance.manage` эрхтэй бол | **ҮГҮЙ** — зөвхөн сурагч тус бүрийн `paidUntil` (§8) |
| Сурагчийн тэмдэглэл | бичих/унших бүгд; засах/устгах бүгд | бичих/унших бүгд; засах/устгах зөвхөн өөрийн | мөн адил |

- Багш+ хүний нэрийн ард үргэлж «+» (`teacher.role == "TEACHER_PLUS"` — `classrooms` хариунд `role` ирнэ).
- Гадны багш (TEACHER + externalTeacherProfile) — өөр бүлэг, энд хамаарахгүй (`/teacher-groups`).
- `presence`, `scan` г.м. зарим маршрут `internalTeachingRole` (дотоод багш)-ыг ӨС-ээс шалгана — JWT role-д бүрэн бүү итгэ.

## 1. Өнөөдрийн хичээл — ангийн жагсаалт

### 1.1 `GET /attendance/board?date=YYYY-MM-DD[&classroomId=]`

Тухайн өдөр хичээлтэй, хэрэглэгчийн тэмдэглэж болох ангиуд. Вэб `board/Board.tsx`. Хуваарийн онцгой өдөр
(CANCELLED/MOVED, амралт) **тооцсон** (`resolveWeek`).
```json
{
  "date": "2026-11-02",
  "classes": [{
    "id": "cls1", "name": "12Б", "type": "IN_PERSON", "grade": 12, "studentCount": 24,
    "lessons": [{ "scheduleId": "sch1", "startMinute": 900, "endMinute": 1020, "room": "501",
                  "topic": "Интеграл", "teacherName": "Б. Болд", "leadTeacher": "Б. Болд",
                  "assistantTeacher": null, "mine": true }]
  }],
  "selected": { "id": "cls9", "name": "11А", "type": "IN_PERSON", "studentCount": 20 }
}
```
- Эрэмбэ: эхний хичээлийн цаг, дараа нь нэр (`localeCompare(..., 'mn')`).
- `mine: true` → нэвтэрсэн хүний орох хичээл (вэб тэр ангийг автоматаар нээнэ).
- `selected`: `classroomId` өгсөн бол тэр анги (хичээлгүй өдөр ч), эрхгүй/өгөөгүй бол null.
- `type`: `IN_PERSON | ONLINE` (даалгаврын загвар — §4).
- **`/schedule/days` (§9)-ийг өнөөдрийн хичээлд БҮҮ ашигла** — тэр нь зөвхөн давтагдах хэв маяг, CANCELLED/MOVED
  онцгойг тооцдоггүй.

### 1.2 `GET /attendance/day-summary?date=` — «Ангиуд → Өнөөдөр» (анги бүрийн ирц, даалгаврын тоо)

ТОДРУУЛАХ: хариуны бүтэн хэлбэр `day-summary.service.ts`/`day-summary.logic.ts`-д (энэ баримтад задлаагүй).

## 2. Ирц, даалгаврын самбар

### 2.1 `GET /attendance/classrooms/:id/board?date=` — анх нээхэд

```json
{
  "date": "2026-11-02", "today": "2026-11-02",
  "classroom": { "id": "cls1", "name": "12Б", "type": "IN_PERSON", "grade": 12 },
  "holiday": null,
  "lessons": [ /* §1.1 lessons-тэй ижил */ ],
  "students": [{ "id": "s1", "firstName": "Бат", "lastName": "Дорж", "code": "M2601", "joinedAt": "..." }],
  "attendance": [{ "studentId": "s1", "status": "LATE", "note": null, "lateRange": "FIVE_TO_TEN", "markedBy": "Б. Болд" }],
  "homework": [{ "studentId": "s1", "status": "PARTIAL", "comment": "дутуу хийсэн", "markedBy": "Б. Болд", "updatedAt": "..." }],
  "criteria": { "windowDays": 30, "minAttendance": 80, "maxAbsences": 3, "maxLates": 4, "minHomework": 60, "missingStreak": 2 },
  "risk": { "s1": [{ "kind": "lates", "label": "5 удаа хоцорсон" }] },
  "sent": { "assignmentIds": ["a1"], "students": ["s1"] },
  "recordedBy": { "attendance": [{ "id": "u1", "name": "Б. Болд", "at": "...", "count": 22 }], "homework": [] },
  "canEditCriteria": false
}
```
- `holiday`: амралтын нэр эсвэл null (амралт бол `lessons: []`).
- Тэмдэглээгүй сурагч `attendance`/`homework`-д мөргүй (= «тэмдэглээгүй»). `homework[].status` null байж болно (зөвхөн тайлбар).
- `risk`: сурагч бүрийн эрсдэлийн тэмдэг — сервер тооцно (`board-logic.ts`), апп зөвхөн харуулна. `kind`:
  `attendance` («Ирц 70%»), `absences` («4 удаа тасалсан»), `lates` («5 удаа хоцорсон»), `homework` («Даалгавар 50%»),
  `streak` («3 удаа дараалан хийгээгүй»); `label` нь монгол бэлэн бичвэр.
- `sent`: тухайн хичээлийн онлайн даалгавар илгээсэн сурагчид.

### 2.2 `GET /attendance/classrooms/:id/marks?date=` — **15 сек тутмын poll**

`{ date, attendance, homework, criteria, risk, sent, recordedBy }` (2.1-ийн хэсэг). Вэб `POLL_MS = 15_000`; хоёр багш
зэрэг тэмдэглэх үед бусдын өөрчлөлтийг авна. Апп: дэлгэц харагдаж байх үед л poll (`AppLifecycleState.resumed`),
хүлээгдэж буй өөрийн бичилттэй нүдийг poll-ийн утгаар бүү дар (вэб `useBoard.ts` override логик).

### 2.3 `POST /classrooms/:id/attendance` — ирц тэмдэглэх (товшилт бүр шууд)

```json
{ "date": "2026-11-02",
  "entries": [{ "studentId": "s1", "status": "LATE", "lateRange": "FIVE_TO_TEN", "note": "автобус", "onlyIf": "UNMARKED" }] }
```
- `entries` 1..200; нэг сурагч давхардвал сүүлийнх.
- `status`: `PRESENT | LATE | ABSENT | EXCUSED`, **`null` = тэмдэглэгээ цэвэрлэх (мөр устна)**, ирүүлээгүй = зөвхөн
  `note`/`lateRange` шинэчлэх (мөр байх ёстой, эс бөгөөс `skipped`).
- `note` (≤300): ирүүлээгүй = хуучин хэвээр; `null`/`""` = цэвэрлэх. `lateRange`: `FIVE_TO_TEN | TEN_TO_THIRTY |
  THIRTY_TO_SIXTY | OVER_ONE_HOUR` — зөвхөн LATE үед; бусад төлөвт сервер null болгоно.
- `onlyIf`: `UNMARKED | PRESENT | LATE | ABSENT | EXCUSED` — серверийн одоогийн төлөв таарвал л бичнэ
  («Бүгд ирсэн» = тэмдэглээгүйд л `PRESENT, onlyIf: UNMARKED`; «Буцаах» = `status: null, onlyIf: PRESENT`). Ингэснээр
  өөр багшийн тэмдэглэгээг дарахгүй.
- Хариу: `{ "marked": 1, "date": "2026-11-02", "applied": ["s1"], "skipped": [], "rows": [ /* 2.1 attendance мөр, зөвхөн эдгээр сурагч */ ] }`.
- 403 `Энэ ангид байхгүй сурагч байна: <id>` (идэвхтэй элсэлтгүй), 404 «Анги олдсонгүй».
- Шалтгааны чип (вэб `lib.ts`): тасалсан/чөлөөтэй үед санал болгох бичвэрээс **«өвч…» агуулсныг ХАСНА** (эзний дүрэм).
  Чөлөөтэйд нэмэлт «өөр давтлагатай». Тэмдэглэл ≤200 (UI), сервер 300.
- «Бүгд ирсэн» товч жагсаалтын ДООР тусдаа (PLAN M8).

### 2.4 Танхимын даалгавар (Хийсэн/Дутуу/Хийгээгүй)

- `PATCH /classrooms/:id/homework-marks/:studentId` — бие `{ date, status?, comment?, onlyIf? }`.
  `status`: `DONE | PARTIAL | NOT_DONE | null` (null = цэвэрлэх); `comment` ≤2000 (null = цэвэрлэх); талбар бүр
  сонголттой (өнгө шууд, тайлбар debounce-тэй тусад нь илгээж болно). `onlyIf`: `UNMARKED | DONE | PARTIAL | NOT_DONE`.
  Хариу: `{ "student": { "id": "s1" }, "applied": true, "status": "DONE", "comment": null, "markedBy": "Б. Болд", "updatedAt": "..." }`
  (`applied: false` бол серверийн одоогийн утга буцна).
- `POST /classrooms/:id/homework-marks/bulk` — `{ date, entries: [{ studentId, status?, onlyIf? }] }` (≤200; «Бүгд хийсэн»).
  Хариу: `{ date, applied: [...], skipped: [...], rows: [{ studentId, status, comment, markedBy, updatedAt }] }`.
- `GET /classrooms/:id/homework-marks?date=` — ангийн жагсаалт `[{ student, status, comment, markedBy, updatedAt }]`.
- Шалтгааны чип: «ойлгоогүй», «дутуу хийсэн», «өмнөх хичээлдээ суугаагүй».
- Хариуны бичвэр: эзний өнгөний дүрэм — Дутуу нь шар БИШ (апп-д `warning` улбар шар токен + дүрс).

### 2.5 `GET /classrooms/:id/homework-marks/online?date=` — B хувилбар (апп доторх гэрийн даалгаврын тест)

```json
{ "date": "2026-11-02", "previousLessonDate": "2026-10-30",
  "tests": [{ "testId": "t1", "title": "...", "variant": "A", "problems": 10, "fromTestId": "t0" }],
  "students": { "s1": { "score": 8, "max": 10, "testId": "t1", "taken": 1 } } }
```

### 2.6 Эрсдэлийн шалгуур

`GET /attendance/classrooms/:id/criteria[?date=]`; `PUT …/criteria` (ADMIN/TEACHER_PLUS) бие
`{ windowDays ∈ {7,14,30,60,90}, minAttendance 50–100, maxAbsences 1–10, maxLates 1–10, minHomework 0–100, missingStreak 1–6 }` (бүгд бүхэл).

### 2.7 Сурагчийн drawer — `GET /attendance/classrooms/:id/students/:studentId?date=[&month=YYYY-MM]`

Утас + тухайн сарын бүх ирц/даалгавар, сараар гүйлгэнэ (400 «Сарын формат буруу байна (YYYY-MM)»).
ТОДРУУЛАХ: хариуны бүтэн хэлбэр `attendance.service.ts studentCard` (≈л.792–1100).

### 2.8 Presence — «хэн засаж байна» (`POST /presence`)

Бие `{ "keys": ["attendance:<classroomId>:<YYYY-MM-DD>"], "leave"?: true }` (1–4 түлхүүр; regex
`^(?:(exam|problem|grades|test-edit):[A-Za-z0-9_-]{1,40}(:[A-Za-z0-9_-]{1,40})?|attendance:[A-Za-z0-9_-]{1,40}:\d{4}-\d{2}-\d{2})$`).
HTTP 200: `{ "editors": { "<key>": [{ "name": "Б. Болд", "since": "<ISO>" }] } }` (өөрийгөө оруулахгүй).
Вэб 45 сек тутам (`PRESENCE_BEAT_MS`), таб нуугдвал зогсоно, гарахдаа `leave: true`. Серверийн TTL 100 сек (санах ойд, ӨС-д бичихгүй).
403 «Төвийн багшийн эрх шаардлагатай» (дотоод бус).

## 3. Хичээлийн тэмдэглэл, тарах цаг, нөхөх

- `GET /lesson-records/day?date=` → `{ notes: [{ scheduleId, body, updatedByName, updatedAt }], ... }`
  (вэб зөвхөн `notes`-ийг уншина; ТОДРУУЛАХ бусад талбар). `PUT /lesson-records/:scheduleId/note` бие `{ date, body?: string|null (≤500) }`.
  `PUT|DELETE /lesson-records/:scheduleId/confirm?date=` — ADMIN/TEACHER_PLUS.
- Тарах цаг: `GET /learning-lab/classrooms/:id/dismissal?date=` → `{ approximateAt, lastLeftAt, note, ... } | null`;
  `PUT …?date=` бие `{ "approximateTime": "17:10", "lastLeftTime"?: "17:40" | null, "note"?: string | null }` (зөвхөн эдгээр түлхүүр —
  өөр түлхүүр 400 «Мэдээллээ шалгана уу.»; цагийг UB-ээр). Баталгаажсан эцэг эх `history.dismissals`-аар харна. Вэб `/app/dismissal`.
- Нөхөх: `GET /makeup/classrooms/:classroomId?date=` → `[{ studentId, status: "PENDING"|"PARTIAL"|"DONE"|"WAIVED" }]`;
  `PUT /makeup/:classroomId/:studentId/:date` (ажилтан). Сурагчийн тал `makeup/me*` — part 1.
- Онолын зураг: `GET|POST /lesson-day/:classroomId/:date/photos` (ажилтан + сурагч).

## 4. Онлайн даалгавар (ONLINE анги)

| Маршрут | Тайлбар |
|---|---|
| `GET /classrooms/:id/assignments[?from=&to=]` | `deletedAt == null`, `createdAt` буурах; Assignment мөр + `_count.submissions` (зөвхөн `SUBMITTED` = шалгах хүлээгдэж буй) + хичээлийн өдөр (`withHomeworkLessons`) |
| `GET /classrooms/:id/assignments/stats?from=&to=` | сурагч бүрийн хийгээгүй/шалгагдаагүй тоо |
| `GET /assignments/:id/submissions` | анги бүх сурагч (даалгавар үүсэхээс өмнө элссэн): `[{ student:{id,firstName,lastName}, state, imageKeys, note, studentNote, reviewNote, revisions[], submittedAt, checkedAt }]`, нэрээр эрэмбэ |
| `POST /assignments/:id/review` | `{ studentId, action: "APPROVE"|"RETURN"|"MARK_IN_CLASS", note? }` → state `DONE_ONLINE`/`RETURNED`/`DONE_IN_CLASS`; 400 «Сурагч хараахан юу ч илгээгээгүй байна» (APPROVE/RETURN үед) |
| `POST /classrooms/:id/assignments` | `{ title, description?, type?: "DAILY"|"EXTRA", imageKeys? (≤10), dueDate?, lessonDate? }` |
| `PATCH /assignments/:id`, `DELETE /assignments/:id` | засах; устгах = **зөөлөн** (`deletedAt`) |

- Илгээлтийн зураг/PDF `GET /files/:key` (7 хоногийн дараа серверийн cron устгадаг → 404 хэвийн; «хадгалагдах хугацаа дууссан»).
  PDF харах: апп-д PDF viewer (байт `Authorization` header-ээр татаад).

## 5. Анги

- `GET /classrooms` → идэвхтэй бүх анги (Classroom мөр бүхэлдээ + `teacher`, `assistantTeacher` `{id, firstName, lastName, role}` |
  null, `_count.enrollments`), `createdAt` өсөх. Багшид шүүлтгүй (бүгдийг) — «Миний анги» = `teacher.id == me.id ||
  assistantTeacher.id == me.id` клиент талд (вэб `/app/dismissal` ингэж шүүдэг).
- `GET /classrooms/:id` → `{ classroom: { id, name, type, grade, teacherId, teacher, assistantTeacherId, assistantTeacher },
  students: [{ id, firstName, lastName, studentCode, joinedAt }], permissions: { canManageStudents } }`. 404 «Анги олдсонгүй».
- `GET /class-dashboard` → `{ windowDays, permissions: { money, manageClasses, isAdmin }, classes: [{ ..., students, attendanceRate,
  homeworkRate, examAvg, examCount, riskCount, lastLesson: {date, topic} | null, payment: {PAID,PARTIAL,PENDING,NONE} | null }] }`.
  `payment` нь `finance.manage`-гүй бол **null** (энгийн багш мөнгө харахгүй).
- `GET /class-dashboard/classes/:classroomId` (ангийн самбар, сурагч бүрийн `competency`, `risk`, `flags`, `makeup`,
  `payment: {state, tuitionAmount, paidThisMonth} | null`), `…/month?month=YYYY-MM`, `…/coverage`. ТОДРУУЛАХ: бүтэн хэлбэр
  `class-dashboard.service.ts` (`detail`, `month`) — том, M8-д хэрэгтэй талбарыг тэр үед уншина.
- `GET /classrooms/:id/daily-summary?date=`, `GET /classrooms/:id/attention?date=` (`attempts.controller.ts`) — самбарын
  хураангуй, анхаарах сурагчид. ТОДРУУЛАХ хэлбэр.

## 6. Сурагчийн хуудас (`/app/students/[id]`: Ангийн явц · Шалгалт · Тэмдэглэл · Бие даасан явц)

| Маршрут | |
|---|---|
| `GET /students/:id/attendance?from=&to=` | ирцийн түүх |
| `GET /students/:id/homework-marks?from=&to=` | даалгаврын түүх |
| `GET /students/:id/test-results` | бүх дүн (TEACHER — өөрийн ангийн сурагч; TEACHER_PLUS/ADMIN — бүгд) |
| `GET /class-dashboard/students/:studentId/competency`, `…/flags`, `POST …/flags`, `POST /class-dashboard/flags/:flagId/remove` | чадамж, тэмдэг |
| `GET /mistakes/student/:studentId` | алдааны дэвтэр |
| `GET /readiness/student/:id` | ЭЕШ бэлэн байдал |
| `GET /lesson-records/student/:studentId` | хичээлийн бүртгэл |

### 6.1 Тэмдэглэл — `GET|POST /students/:id/notes`, `PATCH|DELETE /notes/:id`

- `GET ?type=GENERAL|PAYMENT` — type өгөөгүй бол `finance.manage`-гүй хүнд зөвхөн GENERAL. `PAYMENT` нь `finance.manage` шаардана.
  Мөр: StudentNote (`id, studentId, type, body, promisedOn, resolvedAt, createdById, createdAt, updatedAt…`) + `authorName` («Б. Нэр»,
  Багш+ бол «+»), `canEdit` (ADMIN эсвэл зохиогч). Эрэмбэ `createdAt` буурах.
- `POST` бие `{ type: "GENERAL"|"PAYMENT", body (1–4000), promisedOn?: "YYYY-MM-DD" }` → мөр + `authorName`, `canEdit: true`.
  Бүтэн жил төлсөн сурагчид PAYMENT тэмдэглэл хориотой (сервер).
- `PATCH /notes/:id` `{ body?, resolvedAt?: ISO|null, promisedOn?: "YYYY-MM-DD"|null }`; 403 «Зөвхөн өөрийн бичсэн тэмдэглэлийг засна».
- `DELETE /notes/:id` → `{ deleted: true }`; 403 «Зөвхөн өөрийн бичсэн тэмдэглэлийг устгана». **Анхаар: тэмдэглэлийн устгал ХАТУУ**
  (`studentNote.delete`, аудитад үлдэнэ) — апп заавал баталгаажуулах диалогтой.
- Эрх: төвийн аль ч багш (Багш, Багш+, Админ) ямар ч сурагчид бичиж, бүгдийг уншина (эзэн 2026-10-11); гадны багш —
  өөрийн бүлэг, өөрийн тэмдэглэл.

## 7. Цагийн бүртгэл — `GET /teacher-hours/me?month=YYYY-MM`

Эрх TEACHER, TEACHER_PLUS. `{ "month": "2026-10", "teachers": [{ "teacherId": "...", "teacherName": "...", "lessons": 18,
"minutes": 2160, "sessions": [{ "date": "2026-10-02", "classroomName": "12Б", "startMinute": 900, "endMinute": 1020 }] }] }`
(өөрийн нэг мөр). Хуваариас: цуцалсан/амралт хасна, зөөсөнийг шинэ цагт. Цагийн хөлс хадгалахгүй. 400 «Сар YYYY-MM хэлбэртэй байх ёстой».

## 8. Төлбөрийн төлөв (энгийн багш) — `GET /tuition/paid-until/:studentId`

`{ "paidUntil": "<ISO>" | null }`. TEACHER — зөвхөн `classroom.teacherId == me` ангийн сурагч (403 «Та энэ сурагчийн багш биш байна»;
туслах багшид хамаарахгүй — ТОДРУУЛАХ). TEACHER_PLUS — `finance.manage` шаардана. **Нийт дүн, ledger (`/payments/ledger/*`) энгийн
багшид 403** (ADMIN/TEACHER_PLUS + finance.manage) — апп багшийн дэлгэцэд мөнгөн дүн хэзээ ч харуулахгүй (RULES §6).

## 9. Хуваарь

- `GET /schedule/days?from=&to=[&classroomId=][&teacherId=]` → `[{ date, weekday, holiday: {type,title,note}|null, restingClasses: [...],
  classes: [{ id, classroomId, classroomName, startMinute, endMinute, teacherId, teacherName, teacherRole, room, subject }] }]`.
  **`weekday` нь JS дугаарлалт (0=Ням…6=Бямба)** (`getUTCDay`); апп монгол 1–7 рүү НЭГ функцээр хөрвүүлнэ (`core/time`).
  ClassSchedule.weekday ч мөн JS дугаарлалт. Энэ endpoint CANCELLED/MOVED онцгойг тооцдоггүй — хуваарийн тойм л.
- `GET /schedule/me` (STUDENT/TEACHER/TEACHER_PLUS), `GET /schedule/week?start=` — 7 хоногийн бодит хуваарь (`ResolvedDay`:
  `{ date, weekday (JS), isHoliday, holiday, restingClasses, entries: [{ scheduleId, classroomId, classroomName, teacherId, teacherName,
  teacherRole, startMinute, endMinute, room, subject, topic, leadTeacher: {id,name}|null, assistantTeacher, exception: {kind:"MOVED", note,
  originalDate}|null }] }`). ТОДРУУЛАХ: `/schedule/me`, `/schedule/week`-ийн яг wrapper хэлбэр (part 1 schedule гэрээтэй давхцана).
- Хуваарь засах бүх маршрут ADMIN/TEACHER_PLUS — M9 (таблет/вэб).

## 10. Вэбийн 2026-11-01..03-ны шинэчлэл (апп-д орсон)

- **Ангийн «Код» таб** (`49d09fe`): шинэ endpoint үгүй — `GET /classrooms/:id`-ийн `students[].studentCode`. Нэрээр эрэмбэлж
  «Нэр Овог - код» (кодгүй бол «кодгүй»), «Бүгдийг хуулах» нэг товч.
- **Сурагчийн «Мэдээлэл» таб** (`665ae6b`): `GET /users/:id` (TEACHER, TEACHER_PLUS, ADMIN; Багш зөвхөн сурагчийг). Хариу:
  `{ id, role, firstName, lastName, phone|null, email, studentCode, studentProfile: { grade, school, fatherPhone|null, motherPhone|null,
  guardianNote, ... }, classHistory: [{ classroomId, name, joinedAt, leftAt|null, attendance, homework }] }` (`classHistory` эрт -> сүүл,
  апп шинэ нь дээр харуулна; нэрийн «(Зүүн 4)» хаалт хасна). Утас, эцэг эхийн утас Багшид `null` (Багш+/Админ л харна). Төлбөрийн
  талбар (`tuition*`) апп-д БАЙХГҮЙ.
- **Профайл засах** (`482c030`, `7e9c1bf`, `3f3e7b1`): `PATCH /users/:id/profile` (TEACHER_PLUS, ADMIN) бие = зөвхөн өөрчилсөн
  талбар: `firstName, lastName, phone (8 орон), email, grade (1..12), school, fatherPhone, motherPhone, guardianNote`.
  Хариу: `{ user, studentProfile, passwordFollowedPhone? }`. Дүрэм: Багш+ сурагч/эцэг эхийг засна; багш, Багш+, админ (ажилтан)-ыг
  зөвхөн Админ (403 «Ажилтны мэдээллийг зөвхөн Админ засна»); өөр админыг хэн ч (403). Утас солигдоход ЗӨВХӨН СУРАГЧИЙН нууц
  үг (хуучин утас хэвээр байсан бол) шинэ утас болно — `passwordFollowedPhone: true|false`; шийдвэр серверт. Апп «Засах» товчийг
  `ADMIN` эсвэл (`TEACHER_PLUS` ба засагдах хүн ажилтан биш) үед л харуулна; 403 бол серверийн мессежийг формд тайван харуулна.
- **Тестийн эх PDF** (`c6289a1`): төвийн бүх багш (TEACHER, TEACHER_PLUS, ADMIN); сурагч, эцэг эх, гадны багш 403.
  - `GET /schedule/day-plan?date=` -> `tests[testId].sourcePdfKey` (`chapter-pdf-<chapterId>.pdf` | null) ба `entries[].plan.testIds`,
    `entries[].done[].testId`, `entries[].previous.tests[].testId`. Апп ангийнхаа (`entries[].classroomId`) тестүүдийг авна: хийсэн
    тест байвал тэр, үгүй бол төлөвлөсөн; өмнөх хичээлийн тест тусдаа тэмдэглэгээтэй. Файлгүй (`null`) тестийг харуулахгүй.
  - `GET /tests/source-pdf?chapterId=` -> `{ key: string | null }` (номын бүлгээр; ном-ын хуудас feature-д хэрэгтэй).
  - Файл: `GET /files/:key` (`core/files`, Authorization толгойтой; токен URL-д орохгүй); сервер тестийн нэрээр
    `Content-Disposition: attachment` өгнө. Апп `FileGalleryScreen`-ээр хуудас хуудсаар харуулна.

## ТОДРУУЛАХ

1. `day-summary`, `studentCard`, `class-dashboard detail/month`, `daily-summary`, `attention` хариуны бүтэн хэлбэр — M8 эхлэхэд
   service-ийг уншиж нэмэх (энд зөвхөн замыг баталгаажуулсан).
2. `paid-until`: туслах багш (assistantTeacherId) эрхгүй — зориуд уу.
3. Тэмдэглэл хатуу устгал (RULES §6 «устгах бүр зөөлөн»-тэй зөрнө) — эзэнд мэдэгдэх.
