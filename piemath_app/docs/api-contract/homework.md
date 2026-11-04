# Гэрийн даалгавар (сурагч)

Эх: `api/src/homework-practice/{homework-practice.controller.ts,homework-practice.service.ts,homework-logic.ts,
homework-practice.dto.ts}`, `api/src/assignments/{assignments.controller.ts,assignments.service.ts,
homework-marks.controller.ts,homework-marks.service.ts,homework-lesson.ts,homework-lesson.logic.ts,dto/submit.dto.ts}`,
`api/src/student-hub/*`, `api/prisma/schema.prisma` (`Assignment`, `Submission`, `DailyHomeworkMark`, `HomeworkPhoto`,
`HomeworkAttempt`); вэб `web/src/components/homework-practice/{HomeworkList,HomeworkSolve,PhotoButton}.tsx`,
`web/src/components/student-hub/HomeworkPhotoPanel.tsx`, `web/src/components/homework/{HomeworkList,MyHomeworkMarks}.tsx`,
`web/src/lib/photosToPdf.ts`, `web/src/app/app/homework/page.tsx`; гэрээ `docs/v2/SURAGCH-V2-GEREE.md`, STATUS §7.11.

## Аль загвар вэ (STATUS §7.11 + 2026-10-29/31 шинэчлэл)

| Анги (`/assignments/my-classrooms` `type` эсвэл `/auth/me` `studentProfile.type`) | Сурагч юу хийнэ | Endpoint |
|---|---|---|
| **Танхим** (`Classroom.type = IN_PERSON`, `StudentProfile.type = CLASSROOM`) | 1) хичээлийн өдөр бүр **даалгаврын зураг (PDF)** илгээх, 2) ангид хийсэн тестийн **B хувилбарыг** гэртээ бодох (байвал), 3) багшийн тэмдэглэгээ (Хийсэн/Дутуу/Хийгээгүй) харах | `/homework/my`, `/homework/photos`, `/homework/attempts*`, `/homework-marks/my`, `/student-hub/days` |
| **Онлайн** (`Classroom.type = ONLINE`, `StudentProfile.type = ONLINE`) | Багшийн үүсгэсэн даалгаварт зураг/PDF + тэмдэглэл илгээх, Батлах/Буцаах хүлээх | `/assignments/my`, `/assignments/:id/submit` |

Вэбийн одоогийн `/app/homework` = `homework-practice/HomeworkList` (танхимын загвар). Онлайн загвар нь
`components/homework/HomeworkList.tsx`. **Апп тооцохгүй:** аль өдөр илгээж болох, хугацаа, оноо, тэмдэглэгээ — серверт.

Тэмдэглэгээний конвенц: D өдрийн даалгаврыг багш **дараагийн хичээлийн өдөр (D')** тэмдэглэнэ
(`DailyHomeworkMark.date = D'`). D' болоогүй бол «Шалгаагүй».

---

## Танхимын загвар

### GET /homework/my?days=

- Roles: STUDENT. `days` = 1–31, өгөгдмөл 14 (буруу бол 14).
- Хүрээ: өнөөдөр−(days−1) … өнөөдөр, мөн **ирэх 7 хоногийн** хичээлийн өдрүүд (`upcoming: true` — зургаа урьдчилан илгээнэ).
- Response:

```ts
{
  days: {                       // огноогоор БУУРАХ, дараа нь ангийн нэрээр
    date: string;               // D, YYYY-MM-DD
    classroomId: string;
    classroomName: string;
    deadlineAt: string | null;  // ISO UTC — B хувилбарын хугацаа, эсвэл D'-ийн 00:00 (УБ); мэдэгдэхгүй бол null
    items: {                    // ангид хийсэн тестийн B хувилбар (байхгүй бол [] — зөвхөн зураг илгээнэ)
      testId: string;
      title: string;
      variantLabel: string | null;  // "A" | "B" (хэвийн болгосон)
      problemCount: number;
      timeLimitMin: number | null;
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED';
      attemptId: string | null;
      checksUsed: number;       // 0..2
      maxChecks: number;        // 2
      score: { correct: number; total: number } | null;   // SUBMITTED үед л
      submittedAt: string | null;   // ISO
      late: boolean;            // deadlineAt-аас хойш илгээсэн
    }[];
    photo: { id: string; fileKey: string; pages: number; uploadedAt: string } | null;  // миний сүүлийн (устгаагүй) зураг
    mark: 'DONE' | 'PARTIAL' | 'NOT_DONE' | null;   // D'-ийн тэмдэглэгээ
    markComment: string | null;
    upcoming: boolean;          // ирээдүйн хичээл
    topic: string | null;
  }[];
}
```

### POST /homework/photos — даалгаврын зураг илгээх (D өдөрт нэг идэвхтэй)

- Roles: STUDENT. **Throttle: минутад 20.**
- Body (`HomeworkPhotoDto`): `{ classroomId: string, date: 'YYYY-MM-DD', fileKey: string, pages: number (1–6) }`.
- Файлын шаардлага (серверт шалгана): **ӨӨРИЙН байршуулсан, `purpose: 'homework'` (expiresAt-тай), `application/pdf`,
  ≤25 МБ (гэхдээ homework upload өөрөө ≤12 МБ), сервер тоолсон хуудас 1–6.** Тиймээс апп: камер/галерейн зургуудыг
  утсан дээр **≤6 хуудас PDF** болгож (`photosToPdf.ts`-тэй ижил), `/uploads*`-аар `purpose: 'homework'` илгээгээд
  key-г энд өгнө. Клиентийн `pages`-д итгэхгүй (сервер `StoredFile.pages`).
- Илгээх боломжтой өдөр: ирэх 7 хоног (элссэн өдрөөс хойшхи хичээл) ЭСВЭЛ өнөөдөр+сүүлийн 13 хоногийн хичээлийн өдөр
  ЭСВЭЛ B хувилбартай өдөр; 31 хоногоос хуучин биш.
- Шинээр илгээвэл тэр өдрийн өмнөх зураг зөөлөн устгагдана (`deletedAt`). Ижил fileKey давтан илгээвэл ижил хариу.
- Response: `{ id: string, fileKey: string, pages: number, uploadedAt: string /* ISO */ }`.
- Алдаа: 400 `classroomId шаардлагатай` / `fileKey шаардлагатай` / `1–6 хуудас илгээнэ үү` / `Огнооны формат буруу байна (YYYY-MM-DD)` /
  `Гэрийн даалгаврын PDF файл илгээнэ үү` / `PDF файлын хуудсыг уншиж чадсангүй — дахин илгээнэ үү`;
  403 `Энэ өдрийн гэрийн даалгавар нээгдээгүй байна`; 403 `Зөвхөн өөрийн байршуулсан файлыг илгээнэ үү`.
- UX (PLAN M3): «PDF» гэдэг үгийг хүүхдэд харуулахгүй — «зураг», «хуудас». Файл 7 хоногийн дараа устна.

### DELETE /homework/photos/:id

- Throttle минутад 20. Зөөлөн устгал. Response `{ deleted: true }`. 404 `Зураг олдсонгүй` (бусдынх ч 404).

### B хувилбарын онлайн бодолт — `/homework/attempts*`

Ангид хийсэн тестийн нөгөө хувилбар. «Шалгах» 2 удаа (зөв/буруу л, зөв хариу ХЭЗЭЭ Ч үгүй), дараа нь «Илгээх».
Эрх: зөвхөн `/homework/my`-ийн `items`-д байгаа тест, дуудлага бүрт сервер дахин шалгана.

**POST /homework/attempts** (throttle 30/мин) — эхлүүлэх эсвэл үргэлжлүүлэх (давтан дуудвал байгааг буцаана)

- Body: `{ testId: string, date: 'YYYY-MM-DD' /* анги тестийг хийсэн өдөр = items-ийн D */ }`
- Response `AttemptView`:

```ts
{
  attemptId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  startedAt: string;            // ISO
  deadlineAt: string | null;    // ISO
  remainingSec: number | null;  // timeLimitMin-тэй үед л (серверийн тооцоо); SUBMITTED → null
  checksUsed: number;
  score: { correct: number; total: number } | null;
  maxChecks: number;            // 2
  problems: {                   // ЗӨВ ХАРИУГҮЙ
    id: string;                 // problemId
    order: number;
    format: string;             // 'CHOICE' | 'FILL_NUMBER' | … (Problem.format enum — 2-р хэсэг)
    statementText: string | null;   // LaTeX холилдсон → MathText
    imageKey: string | null;
    choices: { label: string; text: string; imageKey: string | null }[] | null;  // null = нөхөх/чөлөөт хариу
    fillSlots?: string[];       // FILL_NUMBER: нүдний түлхүүрүүд (ж: ["a","b"])
  }[];
  answers: Record<string, unknown>;     // хадгалсан хариу {problemId: ...}
  lastCheck: Record<string, 'CORRECT' | 'WRONG' | 'BLANK'> | null;  // сүүлийн «Шалгах» (SUBMITTED бол эцсийн)
}
```

- 403 `Энэ гэрийн даалгавар танд нээгдээгүй байна`; 400 `testId шаардлагатай`.

**Хариуны хэлбэр** (`answers`): `{ [problemId]: "B" /* сонголтын үсэг */ | "35" /* тоо/бичвэр ≤1000 */ | { a: "3", b: "-1" } /* FILL_NUMBER нүд */ | null /* арилгах */ }`.
Зөвхөн өөрчлөгдсөн түлхүүрийг илгээж болно (сервер нэгтгэнэ — `mergeAnswers`).

**PATCH /homework/attempts/:id** (autosave, throttle 180/мин) — Body `{ answers }` → `{ savedAt: string }`.
409 `Хугацаа дууссан — илгээнэ үү`; 409 `Гэрийн даалгавар илгээгдсэн байна`; 404 `Гэрийн даалгавар олдсонгүй`;
403 `Энэ гэрийн даалгаврын хугацаа дууссан байна`.

**POST /homework/attempts/:id/check** (throttle 20/мин) — Body `{ answers }` →
`{ checksUsed: number, results: Record<problemId, 'CORRECT'|'WRONG'|'BLANK'>, correct: number, total: number }`.
409 `Шалгах эрх дууссан — одоо илгээнэ үү`; 409 `Хугацаа дууссан — илгээнэ үү`.

**POST /homework/attempts/:id/submit** (throttle 20/мин) — Body `{ answers }` →
`{ score: { correct, total }, results: Record<problemId, CheckResult>, submittedAt: string | null }`.
Давтан дуудвал анхны илгээлтийг буцаана (идемпотент). Хугацаа дууссаны (timeLimit + 60с) дараах шинэ хариуг авахгүй —
хадгалсан хариугаар дүгнэнэ. 409 `Гэрийн даалгаврыг илгээж чадсангүй`.

Апп: autosave debounce ~1.2с (PERFORMANCE.md), таймерыг серверийн `remainingSec`-ээр, утасны цагаар шийдэхгүй.

### GET /homework-marks/my?year=

- Roles: STUDENT. `year` байхгүй → сүүлийн 14 хоног; `year=2026` → тэр жил бүхэлдээ (400 `Он буруу байна`).
- Response (огноогоор БУУРАХ, status null мөр орохгүй):

```ts
{
  date: string;                 // D' — тэмдэглэсэн өдөр, @db.Date ISO ("2026-10-27T00:00:00.000Z")
  status: 'DONE' | 'PARTIAL' | 'NOT_DONE';
  comment: string | null;       // багшийн тайлбар (сурагчид харагдана)
  classroom: { id: string; name: string };
}[]
```

- Өдрийн дэлгэрэнгүйд `/student-hub/days` (`homework.status/comment/checkedOn`) илүү тохиромжтой.

---

## Онлайн загвар (Assignment / Submission)

### GET /assignments/my-classrooms

- Roles: STUDENT. Response: `{ id: string; name: string; type: 'IN_PERSON' | 'ONLINE'; grade: number | null }[]`
  (одоогийн, архивлаагүй анги, элссэн огноогоор буурах). Ангийн төрлийг шийдэхэд хэрэглэ.

### GET /assignments/my

- Roles: STUDENT. Элсэлт бүрийн хугацаанд үүссэн даалгаврууд (устгасан ч миний илгээлттэй бол харагдана), `createdAt` буурах.
- Response:

```ts
{
  id: string;
  classroomId: string;
  type: 'DAILY' | 'EXTRA';
  title: string;
  description: string | null;
  imageKeys: string[];          // багшийн хавсаргасан зураг → /files/:key
  dueDate: string | null;       // ISO
  createdById: string;
  createdAt: string;            // ISO
  lessonDate: string | null;    // @db.Date ISO; null = хуучин мөр (createdAt-ийн УБ өдөр)
  deletedAt: string | null;
  lesson: {                     // хичээлийн шошго (сервер угсарсан)
    date: string;               // YYYY-MM-DD
    weekday: string;            // «Даваа»
    dateText: string;           // «10-р сарын 26»
    topic: string | null;
    label: string;              // «10-р сарын 26 — Сэдэв» эсвэл «10-р сарын 26-ны даалгавар»
  };
  classroom: { id: string; name: string; type: 'IN_PERSON' | 'ONLINE' };
  canSubmit: boolean;           // одоо элссэн хэвээр, устгаагүй
  myStatus: 'NOT_DONE' | 'SUBMITTED' | 'DONE_ONLINE' | 'DONE_IN_CLASS' | 'RETURNED';
  mySubmission: {
    state: SubmissionState;
    note: string | null;        // legacy (зохиогч тодорхойгүй)
    studentNote: string | null;
    reviewNote: string | null;  // багшийн сурагчид харагдах тайлбар (Буцаасан шалтгаан)
    revisions: {                // түүх, at asc
      id: string; submissionId: string;
      action: string;           // 'SUBMIT' (сурагч) | 'LEGACY' | багш: 'APPROVE' | 'RETURN' | 'MARK_IN_CLASS'
      actorId: string;          // 'legacy' байж болно
      state: SubmissionState;
      studentNote: string | null; reviewNote: string | null; legacyNote: string | null;
      imageKeys: string[];
      at: string;               // ISO
    }[];
    imageKeys: string[];
    submittedAt: string | null;
    checkedAt: string | null;
  } | null;
}[]
```

Төлөв (монгол): NOT_DONE «Илгээгээгүй», SUBMITTED «Илгээсэн, шалгаагүй», DONE_ONLINE «Батлагдсан», DONE_IN_CLASS
«Ангид шалгасан», RETURNED «Буцаасан — дахин илгээнэ».

### POST /assignments/:id/submit — илгээх / дахин илгээх

- Roles: STUDENT. Body (`SubmitDto`): `{ imageKeys?: string[] (≤10, ^[\w][\w.-]*$, ≤200), note?: string (≤10000) }`.
  **Дахин илгээх = ижил endpoint** (өмнөхийг орлуулж, state → SUBMITTED, reviewNote арилна; түүх үлдэнэ).
  Тусдаа «устгах» endpoint БАЙХГҮЙ.
- Файл: өөрийн байршуулсан (эсвэл өмнөх илгээлтийн хуучин key), зураг (jpeg/png/gif/webp/heic/heif) эсвэл PDF, ≤25 МБ.
  Вэб (`components/homework/HomeworkCard.tsx`) `uploadFile(f, { purpose: 'homework' })` — 7 хоног хадгална.
- Response: `Submission` мөр + `revisions[]`:
  `{ id, assignmentId, studentId, state, imageKeys, note, studentNote, reviewNote, checkedById, submittedAt, checkedAt, updatedAt, revisions: [...] }`.
- Алдаа: 404 `Даалгавар олдсонгүй`; 403 `Та энэ ангийн сурагч биш байна`; 403 `Энэ даалгавар таныг элсэхээс өмнө
  өгөгдсөн байна`; 400 `Хамгийн ихдээ 10 файл хавсаргана.`; 400 `25 МБ хүртэлх зураг эсвэл PDF файл хавсаргана уу.`;
  403 `Зөвхөн өөрийн байршуулсан файлыг хавсаргана уу.`

## Хадгалах хугацаа

`purpose: 'homework'` файл 7 хоногийн дараа серверийн cron (03:30 УБ) устгана — дараа нь `/files/:key` 404.
`HomeworkPhoto` мөр үлдэх ч файл байхгүй болно → апп «Хадгалах хугацаа дууссан» гэж харуул.
