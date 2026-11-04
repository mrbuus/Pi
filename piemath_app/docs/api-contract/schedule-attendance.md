# Хуваарь, ирц, нөхөх хичээл (сурагч / эцэг эх)

Эх: `api/src/schedule/schedule.controller.ts`, `schedule.service.ts` (`forMe`, `forClassroom`, `expandDays`, `getWeek`,
`listCalendarDays`), `schedule-access.service.ts`, `week-resolver.ts`, `api/prisma/schema.prisma` (`ClassSchedule`,
`ScheduleException`, `AcademicCalendarDay`), `api/src/attendance/attendance.controller.ts` + `attendance.service.ts`
(`myAttendance`), `api/src/lesson-day/*` (нөхөх), `makeup.logic.ts`; вэб `web/src/components/student-hub/{ScheduleTab,
AttendanceTab,MyClassHub}.tsx`, `web/src/components/schedule/{UpcomingAgenda,WeeklyGrid,types}.ts(x)`,
`web/src/components/makeup/*`.

## ⚠ Гарагийн дугаарлалт — талбар бүрээр

| Талбар | Дугаарлалт |
|---|---|
| `ClassSchedule.weekday` (`/schedule/me`, `/schedule/classroom/:id` `entries[].weekday`) | **JS: 0=Ням, 1=Даваа … 6=Бямба** (схемийн тайлбар, `getUTCDay()`) |
| `/schedule/days` `[].weekday` | **JS 0=Ням** (`cursor.getUTCDay()`) |
| `/schedule/week` `days[].weekday` | **JS 0=Ням** (`weekdayOf` = `getUTCDay()`) |
| `TeacherWorkDay.weekday` (багшид) | JS (2-р хэсэг) |

Апп-д Монгол 1=Даваа…7=Ням-аар харуулна: `mn = js == 0 ? 7 : js`; буцааж `js = mn % 7`. Dart
`DateTime.weekday` = Монголтой ижил (1=Даваа). Хөрвүүлэлтийг НЭГ функцэд, тесттэй (RULES §6).

## ⚠ Огноо, цаг

- `startMinute`/`endMinute` — УБ-ийн шөнө дундаас хойшхи минут (540 = 09:00). Бүх хичээл 120 минут.
- `ClassSchedule.effectiveFrom/effectiveTo` — `DateTime` (ISO UTC, ихэвчлэн `…T00:00:00.000Z`); өдрийн утгаар нь (эхний 10) ав.
- `Attendance.date`, `ScheduleException.date`, `AcademicCalendarDay.date` — `@db.Date` → `YYYY-MM-DDT00:00:00.000Z`. Эхний 10 тэмдэгт.
- `/schedule/days`, `/schedule/week` — `date: "YYYY-MM-DD"` мөр.
- Query огноо: `YYYY-MM-DD` (буруу → 400 `Огнооны формат буруу байна (YYYY-MM-DD)`).
- «Өнөөдөр» = УБ-ийн өдөр (вэб `todayUBKey()`). Утасны цагийн бүсээс үл хамаар — UTC+8-аар тооцоол.

## Эрх (`ScheduleAccessService.readableClassrooms`)

- STUDENT: өөрийн одоогийн (leftAt null, архивлаагүй) ангиуд. PARENT: **баталгаажсан** (`verifiedAt` not null) хүүхдүүдийн
  ангиуд. TEACHER/TEACHER_PLUS: бүх анги (харах). Бусад: юу ч үгүй.
- Өөр анги асуувал 403 `Энэ ангийн хуваарийг харах эрхгүй`.

---

## GET /schedule/me — 7 хоногийн тогтмол хуваарь

- Roles: STUDENT, TEACHER, TEACHER_PLUS (**PARENT 403** — эцэг эх `/schedule/week` эсвэл `/schedule/classroom/:id`).
- STUDENT response:

```ts
{
  classroomId: string | null;   // ⚠ ЭХНИЙ идэвхтэй элсэлт (findFirst) — 2 ангитай бол нэгийг л буцаана; анги архивлагдсан эсэхийг шүүдэггүй
  entries: ClassScheduleRow[];  // элсэлтгүй бол []
}

interface ClassScheduleRow {    // ӨНӨӨДӨР хүчинтэй мөрүүд (effectiveFrom ≤ today ≤ effectiveTo|null), weekday asc, startMinute asc
  id: string;
  classroomId: string;
  weekday: number;              // JS 0=Ням
  startMinute: number; endMinute: number;
  teacherId: string | null;
  room: string | null;          // "501", "Онлайн" гэх мэт
  subject: 'MATH' | 'SOCIAL_STUDIES' | 'SAT' | null;
  effectiveFrom: string; effectiveTo: string | null;  // ISO
  createdAt: string;
  classroom: { id: string; name: string; _count: { enrollments: number } };   // идэвхтэй сурагчийн тоо
  teacher: { id: string; firstName: string; lastName: string; role: Role } | null;  // TEACHER_PLUS бол нэрийн ард «+» апп нэмнэ
}
```

- Хуваарь нь ТОГТМОЛ хэв маяг — цуцалсан/зөөсөн, амралтыг тусгахгүй. Тодорхой өдрүүдэд `/schedule/week`.
- Вэб (`ScheduleTab`): `classroomId` null → «Идэвхтэй анги алга». Өнөөдрийн гарагийг `getUTCDay()` (JS)-ээр тодотгоно.

## GET /schedule/classroom/:id

- Бүх эрх (readClassroom шалгана). Response: `ClassScheduleRow[]` (дээрхтэй ижил). 404 анги олдоогүй.

## GET /schedule/week?start=YYYY-MM-DD — тухайн 7 хоног, БҮРЭН шийдсэн (санал болгох)

- Бүх эрх; уншиж болох ангиудаар шүүнэ. `start` заавал (400 `"start" огноо заавал шаардлагатай`). `start`..`start+6`
  (Даваа байх албагүй — апп Даваагаас эхлүүлж өг).
- Цуцалсан (CANCELLED) хичээл хасагдана, зөөсөн (MOVED) нь шинэ өдөр/цагт `exception`-тэй, амралт тэмдэглэгдэнэ.
- Response:

```ts
{
  start: string;                // YYYY-MM-DD
  days: {                       // 7 өдөр, огноогоор өсөх
    date: string;               // YYYY-MM-DD
    weekday: number;            // JS 0=Ням
    isHoliday: boolean;         // БҮХ ангид хамаарах онцгой өдөр
    holiday: { type: CalendarDayType; title: string } | null;
    restingClasses: { classroomId: string; classroomName: string; type: CalendarDayType; title: string }[];  // зөвхөн тэр ангид амралт
    entries: {
      scheduleId: string; classroomId: string; classroomName: string;
      teacherId: string | null;
      teacherName: string | null;   // "Овог Нэр" (бүтэн)
      teacherRole: string | null;   // 'TEACHER_PLUS' бол «+»
      startMinute: number; endMinute: number;
      room: string | null; subject: string | null;
      topic: string | null;         // LessonTopic.title
      leadTeacher: { id: string; name: string; role: string | null } | null;       // өдрийн ахлах багш
      assistantTeacher: { id: string; name: string; role: string | null } | null;
      exception: { kind: 'MOVED'; note: string | null; originalDate: string } | null;
    }[];
  }[];
  teacherRoster: unknown[];     // ажилтанд л утгатай; сурагч/эцэг эхэд хоосон (ТОДРУУЛАХ: DEFAULT_ROSTER_CONFIG + багшгүй)
}
type CalendarDayType = 'HOLIDAY' | 'BREAK' | 'EXAM_DAY' | 'SPECIAL' | 'NO_CLASS';
```

## GET /schedule/days?from=&to=&classroomId=&teacherId= — ойрын өдрүүд

- Бүх эрх. `from`, `to` заавал (400 `"from" болон "to" огноо заавал шаардлагатай`), `from ≤ to`, ≤370 хоног.
- ⚠ **`ScheduleException` (цуцалсан/зөөсөн)-ийг ТООЦДОГГҮЙ** — зөвхөн хэв маяг + амралт (AcademicCalendarDay).
  Вэбийн «Ойрын өдрүүд» (`UpcomingAgenda`, 14 хоног) үүнийг ашигладаг. Апп-д цуцлагдсан хичээл харуулахгүйн тулд
  `/schedule/week` ашиглах нь зөв (`ТОДРУУЛАХ`: эзэнтэй/вэбтэй нийцүүлэх).
- Response `[]` (өдөр бүр, огноогоор өсөх):

```ts
{
  date: string; weekday: number;  // JS 0=Ням
  holiday: { type: string; title: string; note: string | null } | null;
  restingClasses: { classroomId: string; classroomName: string; type: string; title: string }[];
  classes: {                      // startMinute asc; holiday бол []
    id: string; classroomId: string; classroomName: string;
    startMinute: number; endMinute: number;
    teacherId: string | null; teacherName: string | null; teacherRole: string | null;
    room: string | null; subject: string | null;
  }[];
}
```

## GET /calendar?from=&to= — онцгой өдрүүд (амралт)

- Бүх нэвтэрсэн хэрэглэгч. Response: `{ id, date (ISO @db.Date), type: CalendarDayType, title, note, createdById,
  createdAt, classroomIds: string[], classrooms: { id, name }[] }[]`, огноо asc. `classroomIds` хоосон = БҮХ анги.

---

## GET /attendance/my — сурагчийн бүх ирц

- Roles: STUDENT. Query `from?`, `to?` (`YYYY-MM-DD`). Вэб бүх түүхийг НЭГ дуудлагаар авдаг (`AttendanceTab`).
- Response (огноогоор БУУРАХ):

```ts
{
  date: string;                 // @db.Date → "2026-10-23T00:00:00.000Z" — эхний 10 тэмдэгт
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
  lateRange: 'FIVE_TO_TEN' | 'TEN_TO_THIRTY' | 'THIRTY_TO_SIXTY' | 'OVER_ONE_HOUR' | null;  // LATE үед л
  classroom: { id: string; name: string } | null;
}[]
```

- `note` (багшийн тайлбар) сурагчид ХЭЗЭЭ Ч ирэхгүй. Тасалсан шалтгаанд «өвчтэй» сонголт байхгүй (RULES §6).
- Нийт хувь: `/student-hub/overview` `attendance` (сервер тооцсон) — апп дахин бүү тооцоол.
- Ирцийн тэмдэг, өнгө: вэб `web/src/components/attendance/marks.tsx` (дүрс + бичиг, өнгө дангаараа биш). Легенд
  жагсаалтын ДООР.
- Эцэг эх: хүүхдийн ирц `/parent/children`, `/parent/weekly` (2-р хэсэг).

---

## Нөхөх хичээл (STUDENT) — `/makeup/me*`

Тухайн өдөр ABSENT/EXCUSED/LATE бол үүрэг үүснэ (серверт тооцоолно, сүүлийн 60 хоног): тэмдэглэлийн зураг + тэр өдрийн
тест бүрийн A, B хувилбар (LATE бол ангид хийсэн хувилбар тооцогдоно). Багш CONFIRM/WAIVE/REOPEN хийнэ.
Вэб: `/app/my-class` «Нөхөх» таб (байвал л), `/app/makeup`.

### GET /makeup/me

- Roles: STUDENT. Response (өөрийн үүргүүд; ажилтны тэмдэглэл, шийдвэр гаргагч ХЭЗЭЭ Ч үгүй):

```ts
{
  classroomId: string; classroomName: string;
  date: string;                 // YYYY-MM-DD
  reason: 'ABSENT' | 'EXCUSED' | 'LATE';
  status: 'PENDING' | 'PARTIAL' | 'DONE' | 'WAIVED';
  photos: number;               // илгээсэн хуудас/зургийн тоо
  imageKeys: string[];          // миний тэмдэглэлийн зураг → /files/:key
  submittedAt: string | null;   // ISO
  resubmit: boolean;            // багш дахин илгээхийг хүссэн (REOPENED) — өмнөх зураг тооцогдохгүй
  photosAccepted: boolean;
  tests: {
    testId: string; title: string; variant: string | null;   // "A" | "B" | …
    done: boolean;              // TestResult байгаа
    inClass: boolean;           // ангид хийсэн тул тооцогдсон (LATE) — дахин хийхгүй
    online: boolean;            // онлайнаар өгч болно (AUTO дүгнэлттэй, бодлоготой); false → «Дүнг багш оруулна»
    open: boolean;              // анги одоо TestAccess-тэй (шалгалтын жагсаалтад нээгдсэн)
  }[];
}[]
```

### POST /makeup/me/:classroomId/:date/photos

- Body `{ imageKeys: string[] }` — БҮТЭН жагсаалт, 0–12 key, өөрийн байршуулсан зураг/PDF, нийт ≤10 хуудас.
- Response: шинэчлэгдсэн нэг мөр (GET-ийн элемент).
- Алдаа: 404 `Энэ өдөр нөхөх хичээл байхгүй.`; 409 `Багш энэ хичээлийг аль хэдийн шийдвэрлэсэн.`; key/хуудасны 400/403
  ([student-hub.md](student-hub.md) онолын зурагтай ижил мессеж); 400 `Огноог ЖЖЖЖ-СС-ӨӨ хэлбэрээр өгнө үү.`
- Хадгалах: шийдвэрээс хойш 14 хоногийн дараа зураг устна (`MAKEUP_KEEP_DAYS_AFTER_DECISION`).

### POST /makeup/me/:classroomId/:date/tests/:testId/open

- Нөхөх тестийг шалгалтын горимоор нээнэ (ангид TestAccess үүсгэнэ). Response `{ testId: string, href: '/app/tests/<id>' }`
  → апп шалгалт өгөх дэлгэц рүү (`testId`).
- Алдаа: 409 `Энэ нөхөх хичээл хаагдсан.`; 404 `Энэ тест нөхөх хичээлд хамаарахгүй.`; 400 `Энэ тестийн дүнг багш оруулна — онлайнаар өгөхгүй.`

## Апп тооцохгүй

Хуваарийн задлал (давтамж, цуцлалт, зөөлт, амралт), нөхөх үүрэг/төлөв, ирцийн хувь — бүгд серверт.
