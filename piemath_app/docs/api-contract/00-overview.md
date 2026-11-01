# API гэрээ — ерөнхий дүрэм (1-р хэсэг)

Эх: `api/src/**` controller + service кодыг уншиж гаргасан (2026-11-01, branch `piemath-app`, `af94a7c`).
Nest-ийн OpenAPI нь ихэнх хариуны бүтцийг агуулдаггүй тул Dart моделийг ЭНД бичсэн бүтцээр гараар бич.
Зөрчил олдвол код давамгайлна — энд засаад, ямар файлаас шалгаснаа бич. `ТОДРУУЛАХ` = кодоос бүрэн
тодорхой биш, миний уншлага.

## Бүх endpoint-д хамаарах

- **Суурь хаяг:** сервер `app.setGlobalPrefix('api')` (`api/src/main.ts`) — бүх зам `/api/...`. Вэб
  `NEXT_PUBLIC_API_URL` (ж: `https://api.pimath.mn/api`) + `/auth/login` гэж дууддаг. Апп: `API_BASE_URL` = `…/api`,
  зам нь `/auth/login`. Энэ баримтын бүх зам `/api`-гүй бичигдсэн.
- **Нэвтрэлт:** `Authorization: Bearer <accessToken>` (`JwtStrategy` — зөвхөн header). Токен query-д ЗӨВХӨН
  `/files/:key`-д зөвшөөрөгдөнө — апп header ашиглана ([files-uploads.md](files-uploads.md)).
- **Body:** JSON, `ValidationPipe({ whitelist: true, transform: true })` — DTO-д байхгүй талбарыг сервер
  чимээгүй хаяна (алдаа өгөхгүй). Body-ийн дээд хэмжээ 10MB. Хариу gzip/brotli шахагдана (`compression()`).
- **Алдааны хэлбэр (Nest стандарт):**
  `{ "statusCode": 400, "message": "…" | ["…", "…"], "error": "Bad Request" }`.
  `message` массив байж болно (class-validator) — вэб `join(", ")` хийдэг (`web/src/lib/api.ts` `api()`).
  Монгол (кирилл) үсэг агуулсан бол шууд харуул; англи бол статусаар өөрийн монгол мессеж (вэбийн
  `formatErrorMessage`-тэй ижил: 401, 403, 404, 429, 503, 5xx).
- **Prisma алдаа:** `PrismaExceptionFilter` (глобал) 500-ыг 400/404/409/503 болгож буулгана.
- **Rate limit:** `ThrottlerGuard` (APP_GUARD) — глобал минутад 300 (нэвтэрсэн бол JWT sub-ээр, үгүй бол IP).
  Зарим маршрут илүү чанга (`@Throttle`) — endpoint бүрт бичсэн. Хэтэрвэл `429`. Retry-г хязгаартай,
  jitter-тэй хий.
- **Хүсэлтийн timeout:** сервер талд `REQUEST_TIMEOUT_MS` (main.ts) — өлгөөтэй хүсэлтийг таслана.
- **Problem.token хасагдана:** `StripProblemTokenInterceptor` (глобал, `api/src/common/strip-problem-token.interceptor.ts`)
  нь ажилтан БИШ (STUDENT/PARENT/BUYER/нэвтрээгүй) хэрэглэгчийн хариунаас бодлого хэлбэртэй объект
  (`token` + `statementText|statement|format|chapterId|chapter|imageKey|choices|problemId|correctAnswer`-ийн
  аль нэг)-ын `token`, мөн бүх `problemToken` түлхүүрийг хасна. Апп эдгээр талбарт ХЭЗЭЭ Ч бүү найд.
- **Эрүүл мэнд / ping:** `GET /health/live` → `{ "status": "ok", "service": "pi.mn-v2" }` (throttle-гүй);
  `GET /health/ready` → ӨС шалгана, `503 Үйлчилгээ түр бэлэн биш байна`. Вэбийн `pingApi()` нь `GET /api`
  (үндэс) дууддаг — апп `GET /health/live` ашиглах нь цэвэр.
- **Огноо, цаг:**
  - Prisma `DateTime` → ISO 8601 UTC (`2026-11-01T07:30:00.000Z`) → UB (UTC+8) цагаар харуул.
  - `@db.Date` талбар (ж: `Attendance.date`, `joinedOn`) → `YYYY-MM-DDT00:00:00.000Z`. Энэ нь «огноо» л —
    UB руу хөрвүүлбэл 08:00 болно, гэхдээ өдөр нь өөрчлөгдөхгүй. Эхний 10 тэмдэгтийг (`YYYY-MM-DD`) ав.
  - Олон service өөрөө `YYYY-MM-DD` мөр (UB-ийн өдөр) буцаадаг — файл бүрт талбараар тэмдэглэсэн.
- **Гараг:** талбар бүрт **JS (0=Ням…6=Бямба)** эсвэл **Монгол (1=Даваа…7=Ням)** гэж тэмдэглэсэн.
  Dart `DateTime.weekday` нь 1=Даваа…7=Ням (Монголтой ижил). Хөрвүүлэлт апп-д НЭГ функцэд.
- **Бизнесийн дүрэм серверт:** оноо, эрх, бодолт нээгдэх, төлбөрийн төлөв, хуваарийн тооцоо — апп ДАВХАРДУУЛЖ
  тооцохгүй, зөвхөн серверийн утгыг харуулна. Файл бүрт «Апп тооцохгүй» гэж тэмдэглэсэн.

## Файлууд (1-р хэсэг)

| Файл | Хамрах хүрээ |
|---|---|
| [auth.md](auth.md) | нэвтрэх, `/auth/me`, нууц үг солих/сэргээх, зөвшөөрөл, бүртгэл, login-text, эрх → нүүр |
| [files-uploads.md](files-uploads.md) | `/files/:key`, `/uploads`, `/uploads/presign`, `/uploads/complete` |
| [student-hub.md](student-hub.md) | сурагчийн нүүр, өдөр бүр, ангийн тест, онол |
| [schedule-attendance.md](schedule-attendance.md) | хуваарь, ирц, нөхөх хичээл |
| [homework.md](homework.md) | гэрийн даалгавар (танхим/онлайн/зураг), дадлага |
| [notifications-payments-misc.md](notifications-payments-misc.md) | мэдэгдэл, төлбөрийн төлөв, санал хүсэлт, хичээлийн урсгал |

2-р хэсэг (шалгалт өгөх, эргэн харалт, ном, QR, эцэг эх, багш) — өөр agent, өөр файлууд.
