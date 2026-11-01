# Вэб → апп: хуудас бүрийн харгалзаа

Эх: `../../web/src/app/**/page.tsx` (2026-11-01, 127 зам). Шинэ хуудас нэмэгдвэл энд мөр нэм.

Төлөв: `—` хийгээгүй · `◐` хийгдэж байна · `✅` хийгдсэн (тесттэй) · `↗` вэб холбоосоор нээнэ (апп-д натив хийхгүй, шалтгаантай)

Хэн: С = сурагч · ЭЭ = эцэг эх · Б = багш · Б+ = Багш+ · А = админ · Х = худалдан авагч (BUYER) · Н = нэвтрээгүй

## Нийтийн / нэвтрэлт

| Вэб зам | Хэн | Апп | Milestone | Төлөв |
|---|---|---|---|---|
| `/login`, `/forgot-password` | Н | Нэвтрэх, сэргээх | M1 | ✅ |
| `/register`, `/teacher-register` | Н | Бүртгүүлэх — вэбээр (эзний шийдвэр хүлээгдэж буй) | M1 | ↗ |
| `/auth/google` | Н | Google native | M6 | — |
| `/app/consent`, `/terms`, `/privacy` | бүгд | Зөвшөөрөл (gate унтраалттай), нөхцөл/нууцлал вэбээр | M1 | ✅ |
| `/books`, `/books/[code]` | Н, С, Х | Номын каталог, үнэгүй тест (эрх нээх нь вэб/төвөөр — IAP) | M5 | ✅ |
| `/sorils` | Н, С | Жишиг сорил (бүртгэл вэбээр) | M5 | ◐ |
| `/placement` | Н, С | Түвшин тогтоох — мэдээлэл, өгөх нь вэбээр | M5 | ↗ |
| `/tools`, `/app/tools` | бүгд | Хэрэглэгдэхүүн | M5 | — |
| `/q/[code]`, `/app/scan/[code]` | С, ЭЭ, Б | QR уншигч + бодлого | M5 | ✅ |
| `/help`, `/offline` | бүгд | Тусламж, офлайн төлөв | M3 | — |
| `/`, `/preview`, `/demo/*` | Н | Маркетинг/демо — апп-д хэрэггүй | — | ↗ |

## Сурагч

| Вэб зам | Апп | Milestone | Төлөв |
|---|---|---|---|
| `/app` (нүүр), `/app/student` | Нүүр | M3 | ◐ |
| `/app/my-class`, `/app/my-class/tests/[testId]` | Миний анги, өдөр бүр, ангийн тест | M3 | ◐ |
| `/app/theory` | Онол | M3 | ◐ |
| `/app/homework`, `/app/homework/[testId]` | Гэрийн даалгавар (зураг → PDF, дадлага) | M3 | ✅ |
| `/app/schedule` | Хуваарь (сурагч, эцэг эх; ажилтанд вэбээр) | M3 | ◐ |
| `/app/notifications`, `/app/notifications/settings` | Мэдэгдэл (апп дотор; push M6) | M3 / M6 | ✅ |
| `/app/tests`, `/app/tests/[id]`, `/[id]/result`, `/[id]/review` | Шалгалт өгөх, дүн, эргэн харалт | M4 | ✅ |
| `/app/thousand/*` | → `/app/tests` (redirect) | M4 | ✅ |
| `/app/online`, `/app/online/[id]` | Онлайн хичээл | M5 | — |
| `/app/learn`, `/app/learn/[chapterId]`, `/app/library`, `/app/videos` | Бүлэг, номын сан, видео | M5 | ◐ |
| `/app/practice`, `/app/study`, `/app/study/history`, `/app/study/review` | Дадлага, давтлага | M5 | ✅ |
| `/app/mistakes` | Алдааны дэвтэр | M5 | ✅ |
| `/app/goals`, `/app/readiness`, `/app/planner`, `/app/insights` | Зорилго, бэлэн байдал, төлөвлөгч | M5 | ◐ |
| `/app/formulas`, `/app/formulas/[slug]` | Томьёоны сан | M5 | ✅ |
| `/app/results-ranking` | Дүнгийн жагсаалт | M5 | — |
| `/app/makeup` | Нөхөх хичээл (зураг илгээх дутуу) | M3 | ✅ |
| `/app/student/payments`, `/app/payments` (сурагчийн хэсэг) | Төлбөрийн төлөв, данс хуулах | M3 | ✅ |
| `/app/store`, `/app/buyer` | Дэлгүүр, худалдан авалт | M5 | — |
| `/app/profile`, `/app/password` | Профайл, нууц үг | M1 | ✅ |
| `/app/feedback`, `/app/support` | Санал хүсэлт, тусламж | M3 | ✅ |
| `/app/lesson-flow/my` | Хичээлийн урсгал | M3 | — |

## Эцэг эх

| Вэб зам | Апп | Milestone | Төлөв |
|---|---|---|---|
| `/app/parent`, `/app/parent/weekly` | Хүүхэд сонгох, 7 хоногийн тойм, ирц, дүн, төлбөр (жилийн түүх дутуу) | M7 | ✅ |
| `/app/dismissal` | Анги тарах цаг (БАГШИЙН хуудас — эцэг эхийн чөлөөний API байхгүй, api-contract/parent.md) | M8 | — |

## Багш / Багш+

| Вэб зам | Апп | Milestone | Төлөв |
|---|---|---|---|
| `/app/teacher`, `/app/classes`, `/app/classes/[id]` | Өнөөдрийн хичээл, ангийн самбар | M8 | ✅ |
| `/app/students/[id]` | Сурагчийн хуудас | M8 | ✅ |
| `/app/lesson-flow` | Хичээлийн урсгал | M8 | — |
| `/app/groups`, `/app/groups/[groupId]` | Гадны багшийн бүлэг | M8 | — |
| `/app/teacher-hours` | Цагийн бүртгэл | M8 | ✅ |
| `/app/tests/new`, `/app/tests/[id]/edit`, `/app/tests/[id]/results` | Тест үүсгэх/засах, дүн | M9 | — |
| `/app/internal`, `/app/internal/[id]`, `/[id]/solve` | Дотоод ноорог | M9 | ↗? |
| `/app/import` | Импорт (Word файл) | M9 | ↗ |
| `/app/formulas/review`, `/print`, `/widgets` | Томьёо засвар | M9 | ↗ |
| `/app/tuition`, `/app/tuition/refunds`, `/refund/[id]` | Сургалтын төлбөр (Б+) | M9 | — |
| `/app/payments/class/[id]`, `/app/payments/student/[id]` | Төлбөрийн төлөв (Б: зөвхөн сурагч тус бүр) | M8/M9 | — |
| `/app/sms` | SMS (А) | M9 | ↗ |
| `/app/store/admin` | Дэлгүүр удирдах | M9 | ↗ |

## Админ

| Вэб зам | Апп | Milestone | Төлөв |
|---|---|---|---|
| `/app/admin`, `/admin/v2`, `/admin/analytics`, `/admin/audit` | Хяналтын самбар (таблет) | M9 | — |
| `/admin/students`, `/admin/students/[id]`, `/admin/students/import` | Сурагч (импорт ↗) | M9 | — |
| `/admin/classrooms`, `/admin/classrooms/[id]`, `/admin/enrollment` | Анги, элсэлт | M9 | — |
| `/admin/finance`, `/admin/reconcile`, `/admin/passes`, `/admin/store` | Санхүү, тулгалт | M9 | ↗ |
| `/admin/content`, `/admin/theory`, `/admin/sorils`, `/admin/placement` | Контент | M9 | ↗ |
| `/admin/capabilities`, `/admin/registry`, `/admin/leads`, `/admin/login-text` | Эрх, бүртгэл, лид | M9 | ↗ |

`↗` сонгосон мөр бүрт шалтгааныг (том хүснэгт, Excel, файл импорт гэх мэт) энд бич.

## Суурь (бүх дэлгэцэд)

| Зүйл | Төлөв |
|---|---|
| Дизайны систем, цагаан/хар горим, офлайн тууз | ✅ (M0.3, golden) |
| Router, доод таб / таблетын rail, «Бусад», буцах = өмнөх | ✅ (M0.5) |
| Хийгдээгүй зам → «удахгүй» + вэбээр нээх | ✅ (PendingScreen) |
| MathText, ChoiceGrid, ProblemFigure | ✅ (M2, аудит 100%) |
| Шалгалтын хамгаалалтын суурь (FLAG_SECURE, iOS илрүүлэлт, LeaveTracker) | ◐ (M4-д холбоно, төхөөрөмж дээр шалгаагүй) |
