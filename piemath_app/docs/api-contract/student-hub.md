# Сурагчийн самбар (`/student-hub/*`) ба онолын зураг (`/lesson-day/*`)

Эх: `api/src/student-hub/student-hub.controller.ts`, `student-hub.service.ts`, `student-hub.logic.ts`,
`student-hub.types.ts`, `api/src/homework-practice/homework-logic.ts` (`problemView`),
`api/src/lesson-day/lesson-day.controller.ts`, `lesson-day.service.ts`, `lesson-day.dto.ts`;
дизайн/гэрээ `docs/v2/SURAGCH-V2-GEREE.md`; вэб `web/src/components/student-hub/{types.ts,lib.ts,photo-types.ts,
StudentDashboard.tsx,TestsTab.tsx,TestView.tsx,TheoryBrowser.tsx,TheoryDayPanel.tsx,AttendanceTab.tsx}`,
`web/src/app/app/{student,my-class,theory}/page.tsx`, `web/src/app/app/my-class/tests/[testId]/page.tsx`.

## Ерөнхий

- Guard: `JwtAuthGuard + RolesGuard`, **`@Roles(STUDENT)` л** (бусад эрх 403). Зөвхөн өөрийн мэдээлэл. Глобал throttle.
- **Огноо бүр `"YYYY-MM-DD"` мөр (УБ-ийн өдөр)** — ISO биш, цагийн бүсгүй. Ганц үл хамаарал: `homeworkPhoto.uploadedAt` (ISO UTC).
- **Цаг = `startMinute`/`endMinute`** — УБ-ийн шөнө дундаас хойшхи минут (600 = 10:00). Вэб `hm()`.
- Хамрах: сурагчийн ОДООГИЙН (Enrollment.leftAt null, анги архивлаагүй) ангиуд. Хамгийн эрт өдөр `2026-09-01` (`MIN_MONTH`).
- Хичээлийн өдөр = (өөрийн ирц ∪ LessonTopic ∪ ClassTestSession ∪ цуцлаагүй LessonRecord) ≤ өнөөдөр, ангид элсэхээс
  өмнөх өдрийг зөвхөн өөрийн ирцтэй бол харуулна. Цуцалсан хичээл (CANCELLED) хасагдана, зөөсөн (MOVED) нь шинэ огноонд.
- Сурагчид ХЭЗЭЭ Ч очихгүй (сервер сонгодоггүй): `Attendance.note`, `LessonNote`, `LessonRecord.description`, `dismissMode`.
- Багш+ нэрэнд «+» сервер өөрөө залгасан (`teachers[]`) — апп дахин нэмэхгүй.
- **Апп тооцохгүй:** тест нээгдэх эсэх, ирц/даалгаврын хувь, илгээх цонх (`canUpload`, `canSendHomework`), D' (шалгасан өдөр).

Enum-ууд:

```ts
type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';     // Ирсэн, Хоцорсон, Тасалсан, Чөлөөтэй
type LateRange = 'FIVE_TO_TEN' | 'TEN_TO_THIRTY' | 'THIRTY_TO_SIXTY' | 'OVER_ONE_HOUR';  // 5–10 мин, 10–30 мин, 30 мин–1 цаг, 1 цагаас дээш
type HomeworkStatus = 'DONE' | 'PARTIAL' | 'NOT_DONE';                 // Хийсэн, Дутуу, Хийгээгүй
type TestClosedReason = 'TOMORROW' | 'NOT_AVAILABLE';                  // «Маргааш нээгдэнэ» | юу ч бичихгүй, дарагдахгүй
```

⚠ Сангийн тайлбарт PARTIAL = «шар» гэж бичсэн ч апп-д **шар өнгө ХОРИОТОЙ** (RULES §3) — `warning` токен (улбар) + дүрс.

---

## GET /student-hub/overview

Response `HubOverview`:

```ts
{
  classrooms: { id: string; name: string }[];
  attendance: {                 // БҮХ хугацааны тоо
    total: number; PRESENT: number; LATE: number; ABSENT: number; EXCUSED: number;
    rate: number;               // 0..100 бүхэл = round((PRESENT+LATE)/total*100); total=0 → 0
  };
  homework: {                   // status null (тэмдэглээгүй) тоологдохгүй
    total: number; DONE: number; PARTIAL: number; NOT_DONE: number;
    rate: number;               // 0..100 = round((DONE + PARTIAL*0.5)/total*100)
  };
  today: {                      // өнөөдрийн хичээлүүдээс: дуусаагүй эхнийх, бүгд дууссан бол сүүлийнх; байхгүй бол null
    classroomId: string; classroomName: string;
    date: string;               // өнөөдөр, YYYY-MM-DD
    startMinute: number; endMinute: number;
    room: string | null;        // ж: "501"
    topic: string | null;
  } | null;
  latestMark: {                 // хамгийн сүүлд багшийн тавьсан даалгаврын тэмдэглэгээ
    date: string;               // D' — тэмдэглэсэн өдөр
    status: HomeworkStatus;
    comment: string | null;
    classroomId: string;
    lessonDate: string | null;  // D — даалгавар өгсөн хичээлийн өдөр (35 хоногт олдохгүй бол null)
  } | null;
}
```

## GET /student-hub/days?month=YYYY-MM

- `month` өгөгдмөл = одоогийн сар (УБ). `2026-09`-өөс өмнөх, ирээдүйн, буруу хэлбэр →
  400 `Сарыг ЖЖЖЖ-СС хэлбэрээр, 2026-09-өөс одоогийн сар хүртэл өгнө үү.`
- Response `HubDays`:

```ts
{
  month: string;                // "2026-10"
  prevMonth: string | null;     // 2026-09 бол null
  nextMonth: string | null;     // одоогийн сар бол null
  days: HubDay[];               // огноогоор БУУРАХ (шинэ нь дээр), дараа нь ангийн нэрээр; өнөөдрөөс хойшхи өдөр байхгүй
}

interface HubDay {
  date: string;                 // D, YYYY-MM-DD
  classroomId: string;
  classroomName: string;
  startMinute: number | null; endMinute: number | null;
  room: string | null;
  topic: string | null;         // LessonRecord.topic → LessonTopic.title → Chapter.title
  teachers: string[];           // «Б. Болд», Багш+ бол «Б. Болд+»
  problemNumbers: string | null;// хичээл дээр бодсон бодлогын дугаарууд (чөлөөт бичвэр, "; "-ээр нийлүүлсэн)
  tests: {
    testId: string | null;      // null = гараар бичсэн (гарааны) тест — нээгдэхгүй
    title: string;
    variant: string | null;     // "A" | "B" | бусад (кирилл үсгийн А, Б-г латин A, B болгосон)
    open: boolean;
    closedReason: TestClosedReason | null;
  }[];
  attendance: { status: AttendanceStatus; lateRange: LateRange | null } | null;   // null = ирц бүртгэгдээгүй
  homework: {                   // ЭНЭ өдрийн (D) даалгаврын тэмдэглэгээ, багш дараагийн хичээл (D') дээр тавьдаг
    status: HomeworkStatus | null;   // null = «Шалгаагүй»
    comment: string | null;
    checkedOn: string | null;   // D'; D' хараахан болоогүй бол null
  };
  theory: {
    count: number;              // ангийн бүх сурагчийн онолын зургийн нийт тоо (key-ийн тоо)
    mine: boolean;              // би илгээсэн эсэх
    canUpload: boolean;         // D нь өнөөдөр ба өмнөх 13 хоногт (нийт 14)
    assignedToMe: boolean;      // багш намайг «онолын зураг авагч»-аар томилсон
  };
  homeworkPhoto: {              // миний хамгийн сүүлд илгээсэн даалгаврын зураг (устгаагүй)
    id: string; fileKey: string; pages: number;
    uploadedAt: string;         // ISO UTC
  } | null;
  canSendHomework: boolean;     // D нь өнөөдөр ба өмнөх 13 хоногт
}
```

Тестийн дүрэм (серверт): анги ClassTestSession-оор хийсэн тест **маргааш нь** нээгдэнэ (`date < today`); 1000 бодлого,
ЭЕШ сорил, устгасан, гараар бичсэн, **идэвхжээгүй** сурагч (CLASSROOM профайл + `activatedAt` + одоогийн анги биш) →
`NOT_AVAILABLE`.

## GET /student-hub/tests?q=

- `q`: ≤100 тэмдэгт, эхний 6 үг, том/жижиг үсэг ялгахгүй, бүх үг гарчигт агуулагдах (AND).
- Идэвхжээгүй сурагчид `[]`.
- Response `HubTestRow[]` — огноогоор БУУРАХ, дараа нь ангийн нэр:

```ts
{
  testId: string | null; title: string; variant: string | null;
  date: string;                 // анги хийсэн өдөр
  classroomName: string;
  problemCount: number;         // гараар бичсэнд manualProblemCount ?? 0
  open: boolean; closedReason: TestClosedReason | null;
}
```

## GET /student-hub/tests/:testId

- `testId` ≤64 тэмдэгт — эс бөгөөс 400 `testId буруу байна.`
- Response `HubTestDetail` (анги хийсэн, НЭЭГДСЭН тестийн бодлого + **зөв хариу** — эргэн харах зорилготой):

```ts
{
  testId: string; title: string; variant: string | null;
  date: string;                 // хамгийн сүүлийн нээгдсэн өдөр
  problems: {
    id: string;
    order: number;              // asc эрэмбэлсэн
    stem: string | null;        // statementText — LaTeX холилдсон бичвэр ($…$) → MathText
    imageKey: string | null;    // → GET /files/:key
    choices: {                  // хоосон массив = нөхөх/чөлөөт хариулттай бодлого
      label: string;            // "A".."E" (TEXT горим: дарааллын үсэг; LETTER горим: текст өөрөө)
      text: string;             // LaTeX байж болно; LETTER горимд label-тай ижил
      imageKey: string | null;  // сонголтын зураг (график хариу)
    }[];
    correctAnswer: string | null;   // хүн уншихуйц: "B", олон зөв "B, D", нөхөх "a = 1, b = 2"; тодорхойгүй бол null
    hasVideo: boolean;          // YouTube бодолттой эсэх — холбоосыг энд ХЭЗЭЭ Ч өгөхгүй
  }[];
}
```

- Алдаа (403 body-д `code` талбар бий — `{ statusCode: 403, error: 'Forbidden', code, message }`):

| Статус | code | Мессеж |
|---|---|---|
| 403 | `NOT_CLASS_TEST` | `Энэ тестийг танай анги хийгээгүй байна.` (мөн идэвхжээгүй сурагч) |
| 403 | `NOT_OPEN_YET` | `Энэ тест маргааш нээгдэнэ.` (өнөөдөр хийсэн) |
| 404 | — | `Тест олдсонгүй` |
| 400 | — | `testId буруу байна.` |

Апп: 403-ыг `code`-оор ялгаж монгол тайлбар харуул (алдаа биш, хэвийн төлөв).

## GET /student-hub/theory?q=&from=&to=

- `from`, `to`: `YYYY-MM-DD` (буруу бол 400 `from огноог ЖЖЖЖ-СС-ӨӨ хэлбэрээр өгнө үү.` / `to …`). `to` өгөгдмөл =
  өнөөдөр (ирээдүй бол өнөөдөр болгоно). `from` өгөгдмөл: `q` байхгүй бол сүүлийн 60 хоног; `q`-тэй бол `to − 400`
  хоног (2026-09-01-ээс эрт биш).
- 400 `Хүрээний эхлэл төгсгөлөөсөө хойно байна.`; ИЛ өгсөн хүрээ >400 хоног → 400 `Хүрээ хэт урт байна.`
- `q`: сэдэв (LessonRecord.topic, LessonTopic.title, Chapter.title) ба тестийн нэрээр, том/жижиг үсэг ялгахгүй.
  `q` байхгүй бол зураггүй өдөр ч орно (`count: 0`).
- Response `HubTheoryRow[]` — огноогоор БУУРАХ:

```ts
{
  classroomId: string; classroomName: string;
  date: string;
  topic: string | null;
  tests: string[];              // тухайн өдрийн тестийн нэрс
  count: number;                // онолын зургийн тоо
  uploaders: string[];          // илгээсэн сурагчдын богино нэр (давхардалгүй)
  canUpload: boolean;           // өнөөдөр ба өмнөх 13 хоног
}
```

---

## Онолын зураг — `/lesson-day/*` (сурагчийн хэсэг)

Guard: JWT + Roles. Сурагч онолын (самбарын) зургийг өдөр бүр илгээж, ангийнхныхаа зургийг харна.

### GET /lesson-day/:classroomId/:date/photos

- Roles: ADMIN, TEACHER_PLUS, TEACHER, STUDENT. `date` = `YYYY-MM-DD` (буруу → 400 `Огноог ЖЖЖЖ-СС-ӨӨ хэлбэрээр өгнө үү.`).
- Сурагч: тухайн өдөр ангийн гишүүн байх (эс бөгөөс 403 `Энэ ангийн онолын зургийг харах эрхгүй.`). 404 `Анги олдсонгүй`.
- Response (вэб `TheoryDayV2`, `web/src/components/makeup/types.ts` `TheoryDay`):

```ts
{
  classroomId: string; classroomName: string;
  date: string;                 // YYYY-MM-DD
  upcoming: boolean;            // ирээдүйн өдөр
  topic: string | null;
  tests: { testId: string; title: string; variant: string | null }[];
  uploader: {                   // томилогдсон сурагч (байвал)
    studentId?: string;         // ЗӨВХӨН ажилтанд
    name: string;               // богино нэр, үгүй бол 'Сурагч'
    isMe: boolean;
  } | null;
  canUpload: boolean;           // сурагч: !upcoming && 14 хоногийн цонх
  assignedToMe: boolean;
  photos: {                     // илгээгч бүрийн нэг багц (хоосон багц орохгүй), createdAt asc
    id: string;
    uploaderName: string;
    isMine: boolean;
    isAssigned: boolean;        // томилогдсон сурагчийн зураг
    imageKeys: string[];        // → GET /files/:key (зураг эсвэл PDF)
    pages: number;              // PDF-ийн хуудсыг тоолсон нийт хуудас
    createdAt: string;          // ISO UTC
  }[];
}
```

### POST /lesson-day/:classroomId/:date/photos

- Roles: ажилтан, STUDENT. Body `ImageKeysDto`: `{ imageKeys: string[] }` — **БҮТЭН жагсаалт** (нэмэлт биш, орлуулна),
  0–12 key, тус бүр `^\w[\w.-]*$` ≤200. Хоосон массив = миний багцыг устгах.
- Key бүр МИНИЙ байршуулсан (`StoredFile.ownerId`), зураг (png/jpg/webp/gif/heic/heif) эсвэл PDF байх; нийт ≤10 хуудас.
- Response = GET-тэй ижил (шинэчлэгдсэн).
- Алдаа: 400 `Хичээл болсны дараа онолын зургаа илгээнэ.` (ирээдүй); 403 `Онолын зургийг хичээл болсноос хойш 14 хоногийн
  дотор илгээнэ.`; 403 `Тухайн өдөр та энэ ангид элсээгүй байсан.`; 403 `Энэ өдөр танай ангийн хичээлийн өдөр биш байна.`;
  400 `Нэг удаад 12 хүртэл зураг хавсаргана.`; 403 `Зөвхөн өөрийн байршуулсан зураг / PDF-ийг хавсаргана.`;
  400 `Нийт 10 хүртэл хуудас (зураг) илгээнэ.`
- Байршуулах: `purpose: 'theory'` (байнга хадгална) — [files-uploads.md](files-uploads.md).

### GET /lesson-day/me/photos?from=&to=

- Roles: STUDENT. `from` өгөгдмөл өнөөдөр−60, `to` өгөгдмөл өнөөдөр+14 (ирээдүйн томилолт). Хүрээ ≤400 хоног.
- Response: GET `/lesson-day/:c/:d/photos`-тэй ижил элементийн массив (`topic` талбаргүй, `uploader.studentId`-гүй),
  огноогоор БУУРАХ. Зөвхөн томилолттой эсвэл зурагтай өдрүүд.
