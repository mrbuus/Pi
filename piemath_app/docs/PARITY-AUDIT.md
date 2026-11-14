# Вэб ба апп-ын функцийн тулгалтын аудит

Огноо: 2026-11-03 · Салбар: `app/parity` · Зөвхөн уншиж шалгасан (код өөрчлөөгүй). Хоёр тал нэг API, нэг өгөгдлийн сан ашиглана.

Арга: вэбийн `page.tsx` бүр болон шууд компонентуудын `api(...)` зам, аппын `lib/features/*/data/*_repository.dart`-ийн зам хоёрыг нэг бүрчлэн тулгасан. Хуудас тус бүрийн төлөв `PARITY.md`-д.

Тэмдэглэгээ: **S** < 0.5 өдөр · **M** 1-3 өдөр · **L** 1 долоо хоногоос дээш · `↗` вэбээр үлдэх (шалтгаантай) · «хийгдэж байна» = өөр агент одоо хийж буй (давхар хийхгүй).

Хийгдэж буй ажил (энэ аудитад давхар тоолоогүй): багшийн «Код», «Ангийн түүх», профайл засах, тестийн эх PDF (`/tests/source-pdf`), график ба бодогч хэрэгсэл, геометрийн нэмэлт, томьёоны тайлбар.

---

## 1. Вэбд байгаа, аппд дутуу функц (рольоор)

### Нийтийн (Н)

| Функц | Endpoint | Хэмжээ | Тайлбар |
|---|---|---|---|
| Бүртгүүлэх, багшаар бүртгүүлэх | `/auth/register`, `/enrollment-windows`, `/teacher-groups/register` | ↗ | Элсэлтийн цонх, бүртгэл, баталгаажилт нэг урсгал. Эзний шийдвэр хүлээгдэж буй (PARITY.md). Апп-д «вэбээр бүртгүүлэх» товч л байх |
| Түвшин тогтоох өгөх | `/placement/start`, `/placement/test`, `/placement/{id}/answers\|photos\|resume\|submit` | L → ↗ | Цагтай шалгалт + зураг оруулалт. Аппд зөвхөн `/placement/test` (`placement_screen.dart:32`). Одоохондоо ↗ |
| Жишиг сорилд бүртгүүлэх | `/mock-exams/my`, `/mock-exams/{id}/register` | S-M | Аппд зөвхөн `/catalog/mock-exams` жагсаалт |
| Эрх нээх (нэг удаагийн нэвтрэлт) | `/catalog/passes`, `/store/products` | ↗ | Дижитал бүтээгдэхүүн: Apple/Google-ийн төлбөрийн дүрэм (IAP). Шийдвэр шаардлагатай |

### Сурагч (С)

| Функц | Endpoint | Хэмжээ | Тайлбар |
|---|---|---|---|
| Бодлого бүрийн бичлэг (disclosure) | `/videos/problem`, `/videos/{id}/open` | M | Вэбд `ProblemVideoDisclosure` дадлага, бодолт, сан бүгдэд. Аппд зөвхөн бүлгийн бичлэг (`/videos/chapters`, `/videos`) |
| Идэвхийн стрик (дараалсан өдөр) | `/activity/streak` | S | Вэбийн нүүр, `StreakWeekCard`. Аппын сурагчийн нүүрт байхгүй, `/activity/me` жилийн дулааны зураг л |
| Үйл явдлын хяналт (хичээл, бичлэг үзсэн) | `POST /events` (batch), `GET /events/my-summary` | S-M | Аппаас огт илгээдэггүй: админы аналитик, «миний хураангуй» аппын хэрэглээг тооцохгүй |
| Томьёо цээжлэх (SRS) | `/formulas/review/due`, `/stats`, `/{id}` | M | `PARITY.md`-д «Томьёо засвар ↗» гэж буруу тэмдэглэсэн. Энэ нь сурагчийн давтлага, засвар биш. «Томьёоны тайлбар» хийгдэж байгаа ч SRS тусдаа |
| Давтлагын бодолт, түүх (learning-lab) | `/learning-lab/history`, `/learning-lab/solution` | M | Вэбийн «Суралцах» хуудасны даалгаврын бодолт. Аппд `/study-review/*` л |
| Профайл зураг оруулах | `/auth/me/avatar` | S | Аппд зургийг харуулдаг (`profile_screen.dart:188`), солих боломжгүй. `/uploads` суурь бэлэн |
| Дэлгүүр, худалдан авалт | `/store/purchase`, `/store/my-purchases`, `/payments`, `/payments/{id}` (QPay) | ↗ | IAP-н дүрмээс болж. Өмнөх худалдан авалтын жагсаалт (`/store/my-purchases`) унших нь S |
| Дүнгийн «Эрэмбэ» таб (бүх тестийн байр) | `/tests/my-results`, `/test-rankings/{id}` | S | Аппд тест тус бүрийн байр (`ranking_screen.dart`) байгаа, жагсаалтын таб байхгүй. `/app/results-ranking` аппд alias байхгүй |
| `/app/lesson-flow/my` хуучин холбоос | вэбд redirect → `/app/my-class` | S | Аппд alias redirect нэмэх |
| Онлайн хичээл (`/app/online`) | `/progress/online-students`, `/progress/student/{id}/*` | M-L | Энэ нь сурагчийн биш **ажилтны** хуудас (PARITY.md-д сурагч гэж буруу). Багшийн хэсэгт харна |
| Хэрэглэгдэхүүн (график, бодогч) | клиент | хийгдэж байна | `plane`, `solid` бий |

### Эцэг эх (ЭЭ)

| Функц | Endpoint | Хэмжээ | Тайлбар |
|---|---|---|---|
| Хүүхдийн «Хэдий хүртэл төлсөн» | `/tuition/paid-until/{studentId}` | S | Вэбийн `PaidUntilCard`. Аппын `paidUntilProvider` зөвхөн `/tuition/paid-until/my` (`my_class_repository.dart:72`) тул эцэг эхэд карт байхгүй |
| Хүүхдийн онолын зураг, бүлгээр | `/parent/children/{id}/theory/{chapterId}` | S-M | Вэбийн `ChildHistory.tsx:197`. Аппд байхгүй |
| Хүүхдийн төлбөрийн түүх | `/payments/student/{id}` (эрх шалгаж) | S | Аппд зөвхөн үнийн түвшин (`child_panel.dart:143`) |

### Багш (Б) ба Багш+ (Б+)

| Функц | Endpoint | Хэмжээ | Тайлбар |
|---|---|---|---|
| Ангийн самбар (class-dashboard): сар, хамрах хүрээ, чадамж, тэмдэглэгээ | `/class-dashboard`, `/class-dashboard/classes/{id}[/month\|coverage\|coverage/past]`, `/class-dashboard/students/{id}/competency\|flags`, `/class-dashboard/flags/{id}/remove` | M-L | Аппын «Ангиуд» бүхэлдээ өөр endpoint (2-р хэсэг) |
| Хүлээгдэж буй эцэг эхийн холбоос зөвшөөрөх | `/parent/links/pending` (+ зөвшөөрөх) | S-M | `OtherInfo.tsx`. Аппд эцэг эхийн талаас илгээх л байна |
| Самбарын нэмэлт: онлайн даалгаврын тэмдэглэгээ, нөхөх хичээлийн самбар, өдрийн хураангуй, анхаарах сурагч, ангид хуваарилаагүйг оруулах, өнгөт шошго | `/classrooms/{id}/homework-marks/online`, `/makeup/classrooms/{id}`, `/classrooms/{id}/daily-summary\|attention\|enroll`, `/classrooms/unassigned-students`, `/students/{id}/color-tag` | M | Ирц, даалгавар, тэмдэглэл, шалгуур, presence аппд бий |
| Хичээлийн тест ажиллуулах (did-test, test-sessions) | `/classrooms/{id}/did-test`, `/classrooms/{id}/test-sessions`, `/test-sessions/{id}[/excluded]` | M | Вэбийн `ClassDidTest.tsx`. Аппын `test_run_screen.dart`-тай харьцуулж шалгах |
| Сурагчийн хуудас: ангийн шалгалтын дэлгэрэнгүй | `/exams/classes/{classId}/students/{id}` | S | `StudentProgress.tsx:64`. Аппд зөвхөн `/students/{id}/test-results` |
| Мэдэгдэл (announcement) бичих | `POST /announcements`, `/announcements/manage` | S-M | Аппд зөвхөн унших (`my_class_repository.dart:75`) |
| Өдрийн хичээлийн урсгал | `/lesson-flow/classrooms/{id}/day\|preview`, `/lesson-flow/days/{id}/photo-turn`, `/classrooms/{id}/did-test` | L | Багшийн хамгийн нарийн хуудас. «Код»/«Ангийн түүх» хийгдэж байна, урсгал өөрөө тусдаа |
| Гадны багшийн бүлэг | `/teacher-groups/my-groups\|create\|join`, `/teacher-groups/{id}/students/{id}` | M | `GROUP_TEACHER` рольд апп бүхэлдээ дутуу (`/app/groups`) |
| Цагийн бүртгэл, Б+ нийт харах | `/teacher-hours` (Б+/А), `/staff-capabilities/me` | S | Аппд `/teacher-hours/me` л (`teacher_repository.dart:215`) |
| Онлайн сурагчдын жагсаалт, цагийн шугам, сэдэв оноох, дахин эхлүүлэх | `/progress/online-students`, `/progress/student/{id}/timeline\|attempt/{id}\|assign-test\|reset-chapter` | M-L | Дээр |
| Төлөвлөгч (даалгаврын самбар) | `/tasks`, `/tasks/staff-directory`, `/tasks/{id}` | M | Вэбд ажилтны дотоод төлөвлөгч |
| Тест үүсгэх, засах, дүн, gradebook | `/tests/drafts`, `/tests/{id}/edit-info`, `/exams/{id}/gradebook[/excel]`, `/exams/{id}/scoring-groups\|settings\|student-view` | L → ↗ | Бодлого сонгох, Excel, оноо хуваарилалт. Дүн харах (`/tests/{id}/results`) аппд бий. Бүтээх/засахыг ↗ |
| Дүн шинжилгээ (insights) | `/insights/topic-mastery\|problem-quality\|distractor-analysis` | M | Хүснэгт, график: таблетад л. Төвөгтэй биш, уншигч л |
| Төлбөрийн төлөв (Б: сурагч тус бүр, Б+: нийт) | `/payments/ledger/board`, `/payments/ledger/overview`, `/payments/ledger/student/{id}`, `/payments/outstanding` | M | Унших хэсгийг нэмэх. Нэхэмжлэх, баталгаажуулах нь хэрэггүй |
| Сургалтын төлбөр буцаалт | `/tuition/refund[/preview]`, `/tuition/refunds`, `/tuition/refund/{id}` | M | Б+ тооцоолуур. Утсанд хэрэгтэй эсэх эзний шийдвэр |
| Хуваарь засах (тогтмол загвар, онцгой өдөр, хуваах) | `/schedule/{id}/*`, `/schedule/bulk`, `/schedule/classrooms/*`, `/calendar`, `/schedule/teacher-workdays*` | ↗ | Нарийн засварын UI: том дэлгэц, шалтгаан нь хүснэгт. Унших (`/schedule/classroom/{id}`) нь S |
| Календарт нэмэх (ICS) | `/schedule/me/ics`, `/schedule/me/calendar-token` | S | Утсанд хэрэгтэй, сурагч, багш хоёрт |
| Word импорт, дотоод ноорог, томьёо засвар | `/document-import/*`, `/formulas/{id}` | ↗ | Файл импорт, том засварын талбар |
| SMS | `/sms/*` | ↗ | Олноор илгээх, шимтгэл. Админ л |
| Дэлгүүрийн удирдлага | `/store/admin/*` | ↗ | Хүснэгт, үнэ. Админ |

### Админ (А)

Бүх `admin/*` хуудас таблетын «хяналт» болон ↗ гэж `PARITY.md` M9-д хуваарилагдсан. Утсанд үнэ цэнэтэй, хөнгөн 5 үйлдлийг тусад нь санал болгоно (бусад нь ↗):

| Функц | Endpoint | Хэмжээ | Тайлбар |
|---|---|---|---|
| Төлбөр баталгаажуулах | `/payments`, `/payments/{id}/confirm`, `/payments/months/{m}` | S-M | Өдөр бүр хийдэг, хөнгөн |
| Шинэ сурагч зөвшөөрөх | `/users/students/pending-approval`, `/users/students/{id}/approve` | S | Мэдэгдлээс шууд |
| Лидийн төлөв | `/leads/{id}/status` | S | |
| Санал хүсэлт | `/feedback`, `/feedback/{id}` | S | Сурагчийн `/feedback` аль хэдийн бий, ажилтны хариу өгөх хэсэг дутуу |
| Анги, элсэлт | `/classrooms`, `/classrooms/{id}/enroll\|remove-student\|disband`, `/enrollment-windows` | M | |
| Аудит, санхүү, банкны тулгалт, эрхийн матриц, контент, онол засвар, жишиг сорил, түвшин, passes, login-text, registry, аналитик, sheet-sync | `/audit`, `/finance/*`, `/reconcile/*`, `/staff-capabilities`, `/books`, `/chapters`, `/topics`, `/lessons/*`, `/mock-exams/admin`, `/placement/config`, `/passes/*`, `/classrooms/registry`, `/sheet-sync/*` | ↗ | Том хүснэгт, Excel/CSV, файл, нарийн засварын UI. Утсаар хийвэл алдаа ихтэй, хүндрэл өндөр, ашиг бага |

### Худалдан авагч (Х)

| Функц | Endpoint | Хэмжээ | Тайлбар |
|---|---|---|---|
| Миний эрхүүд (нүүр) | `/payments`, `/auth/me` | S | Унших жагсаалт л. Аппд `/app/buyer` бүхэлдээ байхгүй |
| Худалдан авах | `/store/purchase`, QPay | ↗ | IAP-н дүрэм |

---

## 2. Өөр endpoint дуудсан, эсвэл бизнес логикийг аппд локалаар тооцсон газар (зөрөх эрсдэл)

Эрсдэлийн түвшин: **Өндөр** = хэрэглэгч хоёр төхөөрөмж дээр өөр тоо, өөр жагсаалт хардаг боломжтой · **Дунд** · **Бага**.

### A. Өөр endpoint

| # | Файл:мөр | Апп | Вэб | Эрсдэл |
|---|---|---|---|---|
| 1 | `features/teacher/data/teacher_repository.dart:98,101` | `GET /classrooms`, `/classrooms/{id}` | `/class-dashboard`, `/class-dashboard/classes/{id}` (`ClassesListClient.tsx`, `ClassDashboardClient.tsx`) | **Өндөр**: ангийн жагсаалт, тоо, төлбөрийн төлөв, анхаарах сурагч өөр эх сурвалжаас |
| 2 | `features/exam/data/exam_repository.dart:23` + `exam/ui/tests_list_screen.dart:209` | `GET /exam-results/my` + `/tests`, дүнгийн хувийг `r.percent ?? score?.percent` | `StudentExamsHub.tsx:251` `/tests/my-results` | **Дунд**: хоёр жагсаалт нэг дүнг ялгаатай нэгтгэж болно |
| 3 | `features/schedule/data/schedule_repository.dart:20` | `GET /schedule/week?start=` (сурагч, эцэг эх) | Вэб сурагчид `/schedule/me`, `/schedule/days`; `/schedule/week` нь зөвхөн багшийн WeekBuilder (`schedule/types.ts:165`) | **Дунд**: сурагч дээр өөр шийдвэрлэлт (сондгой/тэгш 7 хоног, онцгой өдөр) гарч болно. Серверийн `week-resolver.ts` хоёуланд нэг эсэхийг шалгах |
| 4 | `features/auth/data/account_repository.dart:122,143` | `/auth/google/native`, `/auth/google/native/link` | `/auth/google/exchange`, `/auth/google/link` | **Бага**: зориуд (native). Холбоосын дүрэм нэг эсэхийг сервер талд шалгах |
| 5 | `features/teacher/data/teacher_repository.dart:215` | `/teacher-hours/me` бүх ажилтанд | `TeacherHoursClient.tsx:87` Б+/А-д `/teacher-hours` | **Бага**: Б+ аппд өөрийнхөө цагийг л харна |
| 6 | `features/my_class/data/my_class_repository.dart:49` | `/makeup/me` | `/makeup/me` + `/makeup/{c}/{d}/{t}` (staff) | Нийцтэй |

### B. Аппд локалаар тооцсон, вэбд сервер өгдөг

| # | Файл:мөр | Юу | Эрсдэл |
|---|---|---|---|
| 7 | `features/payments/domain/org_info.dart:60-71`, `:16` | Сургалтын үнэ (350000, 300000, 2500000…) болон банкны данс хатуу бичсэн, ангийн сургуулийн ангиар (`tierForGrade`). `payments_repository.dart:33-41` анги авдаг. Вэб мөн `orgInfo.ts`-ээр (PayInfo.tsx:82) ижил, гэвч ажилтны талд сервер `daysPerWeek`, `tuitionAmount` (`ledgerTypes.ts:137`) өгдөг, үнэ нь ангийн 7 хоногийн өдрөөс (4 өдөр = 350к) | **Өндөр**: үнэ өөрчлөгдөхөд апп сторын хувилбар хүртэл хуучин үнэ харуулна. Сурагч эцэг эх хоёр ангийн хуваарь өөр бол өөр тоо харна. Серверээс авах нь зөв |
| 8 | `features/parent/ui/child_panel.dart:143` | Дээрхтэй ижил `tierForGrade` | **Өндөр** (7-той нэг) |
| 9 | `features/exam/domain/test_list_logic.dart:53-80` | `variantHash` (JS `hash*31+charCodeAt`), `pickForStudent`, `collapseVariants`: сурагчид А/Б хувилбарын алийг харуулахыг апп дахин тооцдог | **Өндөр**: вэбийн алгоритм өөрчлөгдвөл сурагч апп, вэбд өөр хувилбар харна. Серверээс `variantId` өгөх, эсвэл хоёр талын нэг тестийн вектор |
| 10 | `features/teacher/data/teacher_extras.dart:44-58`, `teacher/ui/independent_tab.dart:77` | Стрик (`streak`) жилийн өдрөөс локалаар. Вэб сурагчийн хувьд `/activity/streak` (`ActivityHeatmap.tsx:67`), багшийн горимд л ойролцоо тооцоо | **Дунд**: жилийн заагийг давдаггүй, сурагчийн өөрийнхтэй зөрнө |
| 11 | `features/teacher/ui/independent_tab.dart:261-263` | Дундаж, шилдэг хувийг `totalScore/maxScore*100` локалаар | **Бага-Дунд**: вэбийн `IndependentProgressTab` ижил эсэхийг шалгах |
| 12 | `features/exam/data/exam_models.dart:45`, `exam/ui/result_screens.dart:221` | `percent` сервер өгөөгүй бол локал; сэдвийн хувь `earned/max*100` | **Бага**: fallback. Сервер үргэлж өгдөг болгох |
| 13 | `features/books/data/books_models.dart:247` | Үнэгүй тестийн хувь `score/max` локал (`try_logic.dart:37` тайлбарыг вэбээс хуулсан) | **Бага** |
| 14 | `features/my_class/domain/hub_logic.dart:125-138` | «Хэдий хүртэл төлсөн» картын хил хязгаар (`<0` дууссан, `<7` удахгүй). Вэб `PaidUntilCard.tsx:81-88` дахин хэрэгжүүлсэн | **Бага**: одоо нэг. Хоёр газар засах шаардлагатай |
| 15 | `features/learning/domain/study_logic.dart:10-12` | `reviewBudgets {10:5, 30:10, 60:20}`, `maxReviewChapters=5` (REVIEW_CAPS-ыг хуулсан) | **Бага**: харуулах л, сервер хязгаарлана |
| 16 | `features/homework/domain/homework_logic.dart:9,19` | 14 хоногийн цонх, `canSendPhoto` (`HOMEWORK_WINDOW_DAYS`) | **Бага**: сервер дахин шалгана |
| 17 | `features/teacher/domain/board_logic.dart:8-30` | Шалтгааны чип жагсаалт, `typingDelay`, `pollInterval`, `noteMax=200` (сервер 300 гэж өөрийн тайлбарт), «өвч»-ийг шүүх | **Бага**: сэдэв зөв (өвчтэй хориотой), гэхдээ вэбийн `NOTE_SUGGESTIONS` өөрчлөгдвөл гар аргаар |
| 18 | `features/schedule/domain/schedule_logic.dart:26-41` | `CALENDAR_TYPE_LABEL`, `SUBJECT_LABEL`-ын хуулбар | **Бага** |

Зөвлөмж: 7, 8, 9 нь хамгийн түрүүнд сервер талд өгөгдөл болгох; 1-2-ыг endpoint-оор нэгтгэх. Бусдыг нэг тестийн вектор (golden) вэб ба апп хоёр дээр ажиллуулж хамгаална.

---

## 3. Хэрэглэгчийг төөрүүлэх үг хэллэг ба UX ялгаа

| # | Ялгаа | Вэб | Апп | Нөлөө |
|---|---|---|---|---|
| 1 | **Сурагчийн 6 цэс: «Тун удахгүй» ба идэвхтэй** | `nav-data.ts:90-95`: Суралцах, Давтлага, Дасгал, Хичээл үзэх, Онлайн хичээл, Миний зорилго нь `soon: true`, хуудас `StudentComingSoon` (`goals/learn/practice/videos layout.tsx`, `study/page.tsx`) | `lib/app/nav/nav_data.dart:82-87` бүгд идэвхтэй, `soon` тэмдэг байхгүй | **Өндөр**: нэг сурагч вэбд «удахгүй» гэж харсан зүйлийг аппд ашиглаж байна. Эзний шийдвэр: апп-д нээлттэй юу, вэбийг нээх үү, эсвэл апп-д ч `soon` болгох уу |
| 2 | Цагийн бүртгэл | Хуудасны гарчиг «Хуваарийн цаг» (`nav-data.ts:361`) | «Цагийн бүртгэл» (`nav_data.dart:100`, `teacher_hours_screen.dart:31`, `teacher_home_screen.dart:68`) | Дунд: нэг нэр сонгох |
| 3 | Дүнгийн «байр» | «Миний дүн, байр» (`nav-data.ts:158`), `/app/results-ranking` → `/app/tests?tab=rank` | Таб байхгүй, тест бүрийн байр дотроос л; `/app/results-ranking` нэргүй | Дунд |
| 4 | Богино таб нэр | Цэс бүрэн нэртэй | «Сан», «Видео», «Даалгавар», «Онол», «Нүүр» (`nav_data.dart:44-76`) | Бага: ойлгомжтой, гэхдээ «Видео» = вэбийн «Онлайн хичээл» |
| 5 | Багшийн самбарын гарчиг | Хуудас «Ирц ба даалгавар» (`teacher/page.tsx` metadata), цэс «Багшийн самбар» | «Багшийн самбар» нүүр + самбар `/app/teacher/board/:classId` | Бага |
| 6 | Холбоосын параметр | `/app/teacher?class=<id>&date=YYYY-MM-DD` өдрийн хуваарь, мэдэгдлээс шууд | Апп `/app/teacher/board/:classId` (өдрийг параметрээр авдаг эсэхийг `notification_link.dart`-д шалгах) | Дунд: мэдэгдэл дарахад буруу анги, өдөр нээгдэх эрсдэл |
| 7 | Redirect-ууд | `/app/thousand/*`, `/app/results-ranking`, `/app/lesson-flow/my` | Зөвхөн `/app/thousand*` (`exam_routes.dart:36-40`) | Бага: хуучин имэйл/SMS холбоос |
| 8 | Бүртгэл, түвшин, дэлгүүр | Хуудас дотроо | «Вэбээр нээх» (↗) шилжилт | Дунд: хэрэглэгч сессээ алддаг эсэх (cookie vs token), буцаж ирэх зам тодорхой байх |
| 9 | Эцэг эх: «Анги тарах цаг» | Багшийн хуудас (`/app/dismissal`) | Багшийн `lesson_extras.dart:226`-д бий, `PARITY.md`-д «—» гэж хоцорсон | Бага: баримт |
| 10 | Нөхөх хичээлд зураг илгээх | Бүрэн | Дутуу (PARITY.md «зураг илгээх дутуу» гэсэн) хэдий `makeup/photos` route бий | Дунд: шалгах |
| 11 | Онлайн хичээл (`/app/online`) | Ажилтны «Онлайн сурагчид» | Сурагчийн цэс «Онлайн хичээл» = `/app/videos` | Дунд: нэг нэр хоёр өөр зүйл (вэбд ч адил). Апп нэрийг тодруулах |

---

## 4. Эрэмбэлсэн засварын жагсаалт (топ 15)

| # | Зүйл | Яагаад | Хэмжээ | Хэн |
|---|---|---|---|---|
| 1 | Сурагчийн 6 цэсийн «тун удахгүй» төлөв: апп ба вэбийг нэг байлгах (эзний шийдвэр) | Хамгийн ил зөрүү, хэрэглэгч шууд анзаарна | S (шийдвэр) | эзэн + апп nav |
| 2 | Сургалтын үнэ болон тарифыг серверээс авах (`org_info.dart:60`, `child_panel.dart:143`) | Үнэ өөрчлөгдвөл апп хуучин үнэ харуулна, төлбөрийн маргаан | M | API + апп |
| 3 | А/Б хувилбарын сонголтыг серверээс (эсвэл `variantHash` golden тест) | Сурагч хоёр төхөөрөмж дээр өөр тест харна | M | API + апп |
| 4 | Багшийн «Ангиуд»-ыг `/class-dashboard*` руу шилжүүлэх (эсвэл хариуг баталгаажуулах) | Тоо, төлөв, анхаарах сурагч зөрнө | M | апп teacher |
| 5 | Дүнгийн жагсаалтын эх сурвалж нэгтгэх (`/exam-results/my` ба `/tests/my-results`) + «Эрэмбэ» таб + alias redirect `/app/results-ranking` | Дүн, байр тооцоо ялгаатай, гарчиг зөрөх | S-M | апп exam |
| 6 | Сурагчийн нүүрт `/activity/streak`, `/events` илгээх | Гол идэвхжүүлэх хэсэг, аналитик алдагдана | S | апп learning |
| 7 | Админ/Б+ утсан дээр: төлбөр баталгаажуулах, шинэ сурагч зөвшөөрөх, лидийн төлөв | Өдөр бүрийн хөнгөн үйлдэл | M | апп admin |
| 8 | Багшийн самбарын дутуу: хүлээгдэж буй эцэг эхийн холбоос, нөхөх самбар, онлайн даалгаврын тэмдэглэгээ, анхаарах сурагч | Багшийн гол хэрэгцээ | M | апп teacher |
| 9 | Б/Б+: `/teacher-hours` Б+-д, төлбөрийн ledger унших (`/payments/ledger/board\|student`) | Роль тус бүрд зөв хүрээ (Багш нийтийг харахгүй дүрэм) | M | апп teacher/payments |
| 10 | Эцэг эх: `/tuition/paid-until/{studentId}`, хүүхдийн онолын зураг | Эцэг эхийн хамгийн их асуудаг зүйл «хэдий хүртэл төлсөн» | S-M | апп parent |
| 11 | Бодлого бүрийн бичлэг (`/videos/problem`, `/videos/{id}/open`) | Дадлага, бодолтын гол дутагдал | M | апп learning |
| 12 | Мэдэгдэл бичих (`POST /announcements`) + мэдэгдлийн холбоос `?class=&date=` | Багш мэдэгдэл явуулж чадахгүй, холбоос буруу газар нээнэ | S-M | апп teacher/notif |
| 13 | Томьёо SRS (`/formulas/review/*`) + `PARITY.md`-ийн буруу мөрийг засах | Сурагчийн давтлага | M | апп learning |
| 14 | Профайл зураг солих (`/auth/me/avatar`), ICS хуваарь (`/schedule/me/ics`) | Хэрэглээний жижиг, хурдан ялалт | S | апп auth/schedule |
| 15 | Худалдан авагчийн нүүр (`/app/buyer`: `/payments`, `/store/my-purchases` унших) + мок-сорилд бүртгүүлэх | Роль бүхэлдээ нүүргүй; худалдан авалтыг ↗ хэвээр | S-M | апп store |

Тэмдэглэл:
- ↗-д үлдэх нь: бүртгэл, түвшин өгөх, худалдан авах (IAP-н дүрмээр), тест/хуваарь/контент засах UI, Word импорт, SMS, дэлгүүр удирдлага, банкны тулгалт, санхүү, аудит, эрхийн матриц. Эдгээрийн аппд ач холбогдол бага, алдааны эрсдэл өндөр.
- `Багш` роль төлбөрийн нийтийг харахгүй, `Багш+` зөвхөн төлөв харна (прод дүрэм) тул 9-д серверийн эрхээс хамааруулж, аппд нэмэлт шүүлт бичихгүй.
- Бүх ялгааг баримтжуулсан `PARITY.md`-д төлөвийн нүдийг шинэчилсэн (`/auth/google`, `/help`, `/tools`, `/app/results-ranking`, `/app/dismissal`).
