# Өдрийн хичээл, ирц, хуваарь — нэгдсэн дахин бүтээлт (2026-10-18)

Эзний хүсэлт (2026-10-18): демо (`/demo/*`) дээр баталсан бүхнийг ҮНДСЭН апп (pi.mnv2) руу,
**жинхэнэ өгөгдөлтэй**, алдаагүй, цэвэрхэн оруулах. Навигацийн одоогийн бүтэц (зүүн багана,
«Хуваарь» hub-ын табууд) ХЭВЭЭР — демогийн 4 товчтой шилжүүлэгчийг үндсэн аппад ХИЙХГҮЙ.

## Шийдвэрүүд (агент бүр дагана)

| # | Сэдэв | Шийдвэр |
|---|---|---|
| D1 | Хичээлийн төлөвлөгөө | `LessonTopic` (scheduleId+date) + шинэ талбар `testIds[]` (номын дарааллаар), `dismissMode` (`DISMISS`=тарах / `STAY`=үлдэнэ / null), `photoStudentId`. `title` = тестүүдийн богино нэрээс автоматаар. Бичих эрх: **TEACHER_PLUS, ADMIN л** (UI дээр «эрхгүй» гэж бичихгүй — Багшид засах товч л харагдахгүй). |
| D2 | Хийсэн тест, хассан бодлого | `ClassTestSession` (байгаа): анги+тест+огноо, `excludedProblemIds`. Дугаар = `TestProblem.order` дээрх байр (1-ээс). Хуваарь дээр хассан бодлогын дугаар **улаан тоо**. |
| D3 | Ангиас хассан тест | шинэ `ClassTestStatus` (status=`REMOVED`). «Үлдсэн/алгассан» = номын дарааллаар хамгийн сүүлд хийсэн тестээс өмнө байгаа ч хийгдээгүй — ТООЦООЛНО, хадгалахгүй. Хийсэн/хассан тест сонголтоос алга болно; 100V3 дуусвал 200V3 санал болгоно. |
| D4 | Тэмдэглэл | `LessonNote` (scheduleId+date, ≤500) — НЭГ эх сурвалж: өдрийн хуваарь дээр бичсэн нь ирц/даалгаврын самбарын дээд хэсэгт ч яг тэр. Зөвхөн ажилтан. |
| D5 | Батлах | `PUT /lesson-records/:scheduleId/confirm` — **TEACHER_PLUS, ADMIN л**. Батлахдаа хийсэн тест + хассан бодлогыг хамт илгээнэ. |
| D6 | Онолын зураг | шинэ `LessonPhoto` (classroomId+date, сурагч, imageKeys, тэр өдрийн testIds). Хэн илгээх = `LessonTopic.photoStudentId` (Багш+ сонгоно, сурагчид урьдчилж харна). Ангийн бүх сурагч (нөхөх хүмүүс ч) харна. |
| D7 | Нөхөх хичээл | шинэ `LessonMakeup`. Үүрэг = тухайн өдөр ABSENT/EXCUSED/LATE + тэр өдрийн ClassTestSession тестүүд. Шаардлага: тэмдэглэлийн зураг + тестийн A, B хувилбар шалгалтын горимоор (TestResult). Ангид ирсэн (LATE) бол A тооцогдоно → B л. Багш «нөхсөн» гэж баталж/чөлөөлж болно. |
| D8 | Ирц/даалгавар хадгалалт | НЭГ товшилт = НЭГ сурагчийн upsert (бүх ангийг илгээхгүй). Хоёр багш зэрэг тэмдэглэж болно: 15 сек тутам (таб харагдаж байхад) серверээс шинэчилж, хадгалагдаж буй нүдийг дарж бичихгүй. Тэмдэглэлгүй илгээвэл хуучин тэмдэглэл УСТАХГҮЙ. |
| D9 | Ангийн сонголт (самбар) | Тухайн өдөр хичээлтэй ангиуд л. Багш: тэр өдөр орох (lead/assistant) эсвэл өөрийн анги. |
| D10 | Танхимын тэмдэг | `web/src/components/schedule/RoomBadge.tsx` (бэлэн): дүрс дотроо дугаартай, логоны өнгө (`text-logo`), бүх тоо нэг шугамд. Шинэ газар бүрт ЭНИЙГ хэрэглэ. 302 = параллелограмм (од биш). |
| D11 | Нууцлах үйлдэл | Танхим солих, тухайн өдрийн цаг хойшлуулах, анги тараах — «⋯» цэсэнд нуусан; анги тараах нь бичгээр баталгаажуулдаг аюулын бүсэд. |
| D12 | Өдрийн хуваарь → зураг | «Зураг татах» жижиг товч: JPG үүсгээд Web Share (`navigator.share({files})`) → iPhone «Save Image» = Photos, Android = Gallery; дэмжихгүй бол татах. |
| D13 | Онолын зураг, нөхөх тэмдэглэл = PDF | Эзэн 2026-10-18: сурагч ≤10 зураг сонгоно, ХӨТӨЧ дээр JPEG болгон шахаад (урт тал ≤1600px, q≈0.72; HEIC-ийг `<img>`/canvas-аар, iOS Safari өөрөө JPEG болгодог) `@cantoo/pdf-lib`-ээр нэг PDF (≤10 хуудас) болгож `POST /uploads`-аар нэг файл илгээнэ. `imageKeys[]` дотор PDF-ийн key хадгална. Дахин илгээж солих боломжтой. Сан суусан: `@cantoo/pdf-lib`, `html-to-image` (web/package.json — бүү дахин суулга). |

## API гэрээ (зэрэг ажиллах агентууд үүнд найдна — хэлбэрийг бүү өөрчил)

```
# Төлөвлөгөө ба замын зураг (Агент 2)
GET  /classrooms/:id/roadmap
     → { books: [{ code, title, topics: [{ name, chapters: [{ chapterId, order, title,
          tests: [{ testId, title, short, variant, problemCount,
                    status: 'DONE'|'REMOVED'|'SKIPPED'|'TODO', doneOn?: 'YYYY-MM-DD',
                    excludedNumbers?: number[] }] }] }] }],
         next: string[] /* санал болгох testId-ууд, дарааллаар */ }
PUT  /schedule/:scheduleId/plan   { date, testIds: string[], dismissMode: 'DISMISS'|'STAY'|null,
                                    photoStudentId: string|null }            (TEACHER_PLUS, ADMIN)
PUT  /classrooms/:id/tests/:testId/status { status: 'REMOVED'|null }        (TEACHER_PLUS, ADMIN)
PUT  /lesson-records/:scheduleId/confirm  { date, tests?: [{ testId, excludedProblemIds: string[] }] }
                                                                             (TEACHER_PLUS, ADMIN)
# Нөхөх, онолын зураг (Агент 4) — модуль бэлэн: api/src/lesson-day
GET  /makeup/classrooms/:classroomId?date=YYYY-MM-DD | ?from&to   (ажилтан)
     → [{ studentId, studentName, date, reason: 'ABSENT'|'EXCUSED'|'LATE',
          status: 'PENDING'|'PARTIAL'|'DONE'|'WAIVED', photos: number,
          tests: [{ testId, title, variant, done: boolean }] }]
GET  /makeup/me                                                   (STUDENT) — нөхөөгүй хичээлүүд
POST /makeup/me/:classroomId/:date/photos { imageKeys }           (STUDENT)
PUT  /makeup/:classroomId/:studentId/:date { action: 'CONFIRM'|'WAIVE'|'REOPEN', note? } (ажилтан)
GET  /lesson-day/:classroomId/:date/photos                        (ажилтан + тэр ангийн сурагч)
POST /lesson-day/:classroomId/:date/photos { imageKeys }          (томилогдсон сурагч эсвэл ажилтан)
GET  /lesson-day/me/photos?from&to                                (STUDENT)
```

## Агентуудын эзэмшил (өөр агентын файлд ХҮРЭХГҮЙ)

| Агент | Хэсэг | Эзэмших файлууд |
|---|---|---|
| 1 | Ирц ба даалгаврын самбар (`/app/teacher`) | `web/src/app/app/teacher/*`, `web/src/components/TeacherDashboard/*` (+ шинэ `TeacherDashboard/board/*`), `api/src/attendance/*`, `api/src/assignments/homework-marks*`, `api/src/presence/*` |
| 2 | Өдрийн хуваарь + замын зураг | `api/src/schedule/*` (week-pattern засвараас бусад), `api/src/lesson-records/*`, `api/src/class-sessions/*`, `web/src/components/schedule/*` (доорх Агент 3-ынхаас бусад), `web/src/components/ClassDidTest.tsx` |
| 3 | 7 хоногийн тогтмол хуваарь | `web/src/components/schedule/PatternOverview.tsx`, `StaffScheduleBuilder.tsx`, `RoomShape.tsx`, шинэ `web/src/components/schedule/pattern/*` |
| 4 | Нөхөх хичээл + онолын зураг + lesson-flow засвар | `api/src/lesson-day/*`, `api/src/lesson-flow/*`, `api/src/storage/file-authorization.service.ts`, шинэ `web/src/app/app/makeup/*`, `web/src/components/makeup/*`, `web/src/components/nav/nav-data.ts` (сурагчийн цэс л) |
| 5 | Анги, сурагчийн үйлдэл | `api/src/classrooms/*`, `api/src/users/*` (archive/unarchive), `web/src/components/students/*`, `web/src/components/classes/*` |

Хуваалцах, ХҮРЭХГҮЙ (би эзэмшинэ): `api/prisma/*` (шинэ migration хийхгүй — хэрэгтэй бол тайландаа бич),
`api/src/app.module.ts`, `api/test/smoke/*` (шинэ маршрутыг тайландаа жагсаа), `web/src/app/globals.css`,
`web/src/components/schedule/RoomBadge.tsx`, `web/src/components/attendance/marks.tsx` (ирц/даалгаврын дүрс, өнгө —
ХЭРЭГЛЭ, бүү өөрчил), `web/src/components/demo/*`, `STATUS.md`. Шалгуур: `Classroom.riskCriteria` (Json, бэлэн).

## Шалгалтын дүрэм

- **Жинхэнэ өгөгдөл.** Жинхэнэ сан дээр QA анги, зохиомол сурагч, хичээл ҮҮСГЭХГҮЙ (эзэн 2026-10-18: нийтийн линкээр
  багш нар бүгдийг шууд хардаг — «зөвхөн албан ёсны мэдээлэл харагдана»). Бичих тест хэрэгтэй бол `pg_dump`-ээс тусдаа
  сан үүсгээд тусдаа API портоор ажиллуул; эс бөгөөс зөвхөн уншиж шалга, логикийг jest/mock-оор.
- API нь `nest start --watch`-аар ажиллаж байгаа (3380) — `npm run build` хэрэггүй; вэб dev сервер 3381. Серверийг асаах/унтраахгүй.
- `cd api && npx tsc --noEmit && npx jest <өөрийн хэсэг>`; `cd web && npx tsc --noEmit && npx eslint <өөрийн файлууд>`.
  `.next/types/validator.ts`-ийн хуучин 2 алдааг тоохгүй. Бусдын файлын алдааг засахгүй — тайландаа бич.
- Playwright (`/Users/mr.buus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`,
  Chrome `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`): 390×844 (isMobile) ба 1280×900,
  цагаан + хар. Багш+ токен: `.runtime/plus.tok` (О. Баасанжав). Бусад эрхийн токеныг `api/node_modules/jsonwebtoken` + `api/.env`-ийн `JWT_SECRET`-ээр
  бодит хэрэглэгчийн id-д үүсгэ (`{sub, role}`). `**/api/consent/my`-г stub хий. Консолын алдаа, hydration анхааруулга 0, хэвтээ гүйлгээ 0.
- Дизайн: `STATUS.md` §6. Зөвхөн lucide (+ `RoomBadge`, демогийн төлөвийн дүрсийн гэр бүл), «·» тэмдэгт гараар бичихгүй (`Meta`),
  гарчигт цэг тавихгүй, тайлбар (legend) хамгийн доор, монгол бичвэр, товч, цэвэрхэн. Хоосон/ачаалж буй/алдааны төлөв бүрэн.
- `git`-ийн өөрчлөх команд (checkout, stash, reset, commit) ХОРИОТОЙ — өөр session зэрэг ажиллаж байгаа.
