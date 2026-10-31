# Танхимын сурагч V2: API ба вэбийн гэрээ (2026-10-31)

Эзний хүсэлтээр сурагчийн мэдээлэл хэт олон хуудсанд хуваагдсан байсныг нэг дор цэгцэлнэ.
Нэг хичээлийн өдөр бүрд дараах мэдээлэл НЭГ мөрөнд байна:
- сэдэв;
- анги хийсэн тестүүд;
- миний ирц;
- багшийн тавьсан даалгаврын тэмдэглэгээ ба тайлбар;
- онолын зураг;
- миний гэрийн даалгаврын зураг.

## Прод өгөгдөл (2026-10-31, уншсан)

| Хүснэгт | Мөрийн тоо | Тайлбар |
|---|---|---|
| Attendance | 2150 | 10-23 → 10-31, гол эх сурвалж |
| DailyHomeworkMark | 1804 | DONE 1500, PARTIAL 157, NOT_DONE 137 |
| LessonTopic (≥10-23) | 31 | |
| ClassTestSession (≥10-23) | 21 | |
| LessonRecord | 16 | Багш батлах үед л үүснэ, ихэнх өдөрт байхгүй |
| LessonPhoto | 0 | Зөвхөн томилогдсон сурагч илгээдэг байсан тул хэн ч илгээгээгүй |
| Assignment, HomeworkAttempt | 0 | |

## Дүрэм

- **Хичээлийн өдрийн жагсаалт:** тухайн сурагчийн одоогийн (leftAt null, archived биш) ангийн дараах өдрүүдийн нэгдэл (≤ өнөөдөр):
  - Attendance (өөрийн мөр);
  - LessonTopic (schedule.classroomId);
  - ClassTestSession;
  - LessonRecord (cancelledAt null).
- **Сэдэв:** `LessonRecord.topic`, байхгүй бол `LessonTopic.title`, байхгүй бол Chapter-ийн нэр, бүгд байхгүй бол null.
- **Гэрийн даалгаврын тэмдэглэгээ:** D өдрийн даалгаврыг багш ДАРААГИЙН хичээлийн өдөр (D') тэмдэглэдэг (`DailyHomeworkMark.date = D'`). Энэ нь `homework-practice` модулийн `nextLessonDate` конвенц. D мөрөнд D'-ийн тэмдэглэгээ ба `comment` харагдана. D' хараахан болоогүй бол «Шалгаагүй».
- **Ирц:** зөвхөн дараах талбарууд харагдана:
  - `status`;
  - `lateRange`.

  `Attendance.note` сурагчид ХЭЗЭЭ Ч харагдахгүй.
- **Харуулахгүй талбарууд:** `LessonNote`, `LessonRecord.description`, `dismissMode`.
- **Тест:** анги ClassTestSession-оор хийсэн (`testId` null биш) тест. Нээх нөхцөл нь гарсан өдрийн маргааш (`date < todayUB`); энэ нь `classroomRelease`-ийн дүрэмтэй адил. Тухайн өдөр нээгдэхгүй.
  - **Гарааны тест:** `manualTitle`-тай мөр жагсаалтад нэрээрээ харагдана, нээх боломжгүй.
- **Онолын зураг харах:** тухайн өдөр ангид элссэн байсан сурагч харна (одоо байгаа `classMember`).
- **Онолын зураг илгээх:** ШИНЭ дүрэм. Тухайн өдөр ангид элссэн аль ч сурагч илгээж болно. Хугацаа нь өнөөдөр ба сүүлийн 14 хоног.
  - Томилогдсон сурагч (`photoStudentId`) байвал «Томилогдсон» гэж тодорно.
  - Сурагч бүрийн илгээсэн зураг тусдаа (одоо байгаа LessonPhoto, нэг сурагч нэг өдөрт нэг мөр).
- **Даалгаврын зураг:** сүүлийн 14 хоногийн ХИЧЭЭЛИЙН ӨДӨР БҮРД илгээж болно. B хувилбартай тест байх албагүй.
  - Одоо `HomeworkPhoto`-ийн илгээлт зөвхөн B хувилбартай өдөрт л боломжтой байгаа — энэ нь «даалгавар илгээх хэсэг эвдэрсэн» гэсэн гомдлын гол шалтгаан.

## API: `api/src/student-hub/*` (STUDENT)

```
GET /student-hub/overview
→ {
  classrooms: { id, name }[],
  attendance: { total, PRESENT, LATE, ABSENT, EXCUSED, rate },   // rate = (PRESENT+LATE)/total, 0..100 бүхэл, бүх хугацаа
  homework:   { total, DONE, PARTIAL, NOT_DONE, rate },           // rate = (DONE + PARTIAL*0.5)/total
  today: { classroomId, classroomName, date, startMinute, endMinute, room, topic } | null,
  latestMark: { date, status, comment } | null
}

GET /student-hub/days?month=YYYY-MM      (өгөгдмөл: одоогийн сар; хамгийн эрт 2026-09)
→ {
  month, prevMonth|null, nextMonth|null,
  days: [{                       // огноогоор буурах
    date, classroomId, classroomName,
    startMinute|null, endMinute|null, room|null,
    topic|null,
    teachers: string[],           // LessonRecord/LessonStaffing-ийн нэр, Багш+ нэрэнд «+»
    problemNumbers: string|null,  // LessonRecord.problemNumbersText
    tests: [{ testId|null, title, variant|null, open: boolean }],
    attendance: { status, lateRange|null } | null,
    homework: { status|null, comment|null, checkedOn: date|null } ,  // checkedOn = D'
    theory: { count, mine: boolean, canUpload: boolean, assignedToMe: boolean },
    homeworkPhoto: { id, fileKey, pages, uploadedAt } | null,
    canSendHomework: boolean      // D ≥ today-13 ба D ≤ today
  }]
}

GET /student-hub/tests?q=
→ [{ testId|null, title, variant|null, date, classroomName, problemCount, open }]   // огноогоор буурах

GET /student-hub/tests/:testId
→ { testId, title, variant, date, problems: [{ id, order, stem, imageKey|null, choices: [{label,text,imageKey|null}], correctAnswer, hasVideo }] }
   // 403: анги хийгээгүй, эсвэл өнөөдөр хийсэн (маргааш нээгдэнэ)

GET /student-hub/theory?q=&from=&to=
→ [{ classroomId, classroomName, date, topic|null, tests: string[], count, uploaders: string[], canUpload }]
   // q: сэдэв (LessonTopic.title, LessonRecord.topic, Chapter.title) ба тестийн нэрээр, том жижиг үсэг ялгахгүй
   // q байхгүй бол хичээлийн бүх өдөр (зураггүй өдөр ч орно, count=0) — from/to өгөгдмөл: сүүлийн 60 хоног
```

Онолын зураг өдрөөр харах, илгээх хэсэгт одоо байгаа endpoint-ууд хэвээр ашиглагдана. Зөвхөн илгээх эрхийн дүрэм өөрчлөгдөнө:

```
GET  /lesson-day/:classroomId/:date/photos
POST /lesson-day/:classroomId/:date/photos
```

Даалгаврын зураг одоо байгаа endpoint-оор хэвээр илгээгдэнэ. Гэхдээ B хувилбаргүй өдөрт ч ажилладаг болно:

```
POST   /homework/photos   { classroomId, date, fileKey, pages }
DELETE /homework/photos/:id
```

Ачаалал: endpoint бүр ≤ 6 асуулга, `Promise.all` ашиглана. N+1 асуулга хориотой. Сар нь ≤ 31 өдөр.

## Вэб

Сурагчийн цэс (STUDENT):

| Цэс | Маршрут | Агуулга |
|---|---|---|
| Миний самбар | `/app/student` | Өнөөдрийн хичээл, ирцийн хувь, даалгаврын хувь, сүүлийн тэмдэглэгээ, өнөөдрийн онолын зураг илгээх товч |
| Хичээл | `/app/my-class` | Табууд: Хичээлүүд · Ирц · Тестүүд · Нөхөх (зөвхөн нөхөх байвал) · Хуваарь |
| Онолын зураг | `/app/theory` | Хайлт (сэдэв, тестийн нэр), огноо сонгох, галерей, өнөөдрийнхийг илгээх |
| Гэрийн даалгавар | `/app/homework` | Хичээлийн өдөр бүр: зураг илгээх, онлайн тест (байвал), багшийн тэмдэглэгээ |
| Шалгалт | `/app/tests` | Одоогийнх хэвээр |
| Ном | `/app/library` | Одоогийнх хэвээр |
| Төлбөр | `/app/student/payments` | Одоогийнх хэвээр |

Хуучин `/app/lesson-flow/my` маршрут `/app/my-class` руу шилжинэ (redirect).

**Хичээлүүд таб:** сараар шүүнэ. Хичээлийн өдөр бүр нэг мөр, дарахад дэлгэрэнгүй цонх нээгдэнэ. Мөрөнд харагдах зүйлс:
- огноо, гараг;
- сэдэв;
- тестийн тоо;
- ирцийн тэмдэг;
- даалгаврын тэмдэг;
- онолын зургийн тоо.

Дэлгэрэнгүй цонхонд дараах бүх зүйл нэг дор байна:
- тестийг нээх;
- онолын зураг харах ба илгээх;
- даалгаврын зураг илгээх;
- багшийн тайлбар.

**Ирц таб:** бүх хугацааны тоо хувиар, сар бүрийн хуанлийн тор. Өнгөний тайлбар (legend) ХАМГИЙН ДООР байна.

**Тестүүд таб:** хайлт, жагсаалт. Нээгдсэн тест дээр дарахад `/app/my-class/tests/[testId]` хуудас нээгдэнэ: бодлого, хариу, LaTeX (`MathText`).

Дизайн: `STATUS.md` §6 (дизайны гэрээ) болон багшийн самбарын стандартыг дагана.
- Lucide дүрс ашиглана. Emoji, `·` хориотой; тусгаарлагчийг `Meta.tsx`-ээс авна.
- Шар, алтан өнгө хориотой.
- Гарчиг болон картын төгсгөлд цэг тавихгүй.
- Бичвэр цөөн байна.
- Утсанд эхэлж зохионо.
- Хоосон, ачаалж буй, алдааны төлөв бүгд байна.
