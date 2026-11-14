# Файл үзэх ба байршуулах

Эх: `api/src/storage/uploads.controller.ts`, `files-auth.guard.ts`, `file-authorization.service.ts`, `file-store.ts`,
`file-retention.service.ts`; вэб `web/src/lib/api.ts` (`uploadFile`, `uploadDirect`, `fileUrl`, `apiUrl`),
`web/src/lib/photosToPdf.ts`.

## GET /files/:key — файл үзэх

- Guard: `FilesAuthGuard` (JwtAuthGuard БИШ). Токеныг `Authorization: Bearer …` header-ээс, байхгүй бол `?token=`
  query-ээс уншина. **Апп: зөвхөн header** (query log-д үлдэнэ, SECURITY.md). Глобал throttle (минутад 300).
- `key` нь `^[\w][\w.-]*$`, ≤200 — эс бөгөөс 400 `Буруу түлхүүр`. Ж: `3f1c…-….jpg`, `…pdf`.
- Хариу:
  - **S3-д хадгалсан файл → `302` redirect** S3-ийн 5 минутын (DOWNLOAD_URL_TTL=300с) presigned URL руу. ⚠ Redirect-ийг
    дагахдаа **Authorization header-ийг S3 руу ДАМЖУУЛАХГҮЙ** (presigned URL дээр нэмэлт Authorization header
    байвал S3 татгалздаг; хөтөч cross-origin redirect-д header хасдаг). Апп: `/files/:key`-г `followRedirects: false`
    (эсвэл `maxRedirects: 0`)-оор дуудаж, `Location`-ийг header-гүй татах нь хамгийн найдвартай. Presigned URL-ийг
    5 минутаас удаан кэшлэхгүй (байтыг нь дискэнд кэшлэ).
  - Диск/ӨС-д хадгалсан (хуучин) файл → `200` байт, `Content-Type` = файлын mime, `X-Content-Type-Options: nosniff`.
  - Үргэлж `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`.
- Алдаа:

| Статус | Мессеж | Утга |
|---|---|---|
| 401 | (хоосон) | токен байхгүй/буруу/хугацаа дууссан, нууц үг солигдсон, архивлагдсан |
| 403 | `Энэ файлыг үзэх эрхгүй.` | **ХЭВИЙН хариу** — жишээ: тест эхлээгүй сурагчид шалгалтын зураг, бусдын гэрийн даалгавар. Эвдэрсэн зураг биш, тайлбартай placeholder харуул |
| 404 | `Файл олдсонгүй` | ӨС-д ч байхгүй (гэрийн даалгаврын 7 хоногийн дараа гэх мэт) |
| 503 | `Файлыг уншиж чадсангүй. Дахин оролдоно уу.` | диск/S3 алдаа |

### Эрхийн дүрэм (`FileAuthorizationService.allowed`) — апп ДАВХАРДУУЛЖ тооцохгүй, зөвхөн 403-ыг зөв харуул

Товчоор: ADMIN бүгд; файл эзэмшигч (`StoredFile.ownerId`) өөрийн файл; гэрийн даалгаврын зураг (`HomeworkPhoto`)
ХУВИЙН — эзэн, тэр ангийн тэр өдрийн багш (14 хоног), баталгаажсан эцэг эх; нөхөх тэмдэглэл хувийн; онолын зураг —
тухайн ангийн сурагч; бодлогын/сонголтын зураг — тухайн бодлоготой тест ЭХЛҮҮЛСЭН сурагч (session), гэрийн
даалгаврын дадлага (31 хоног, идэвхтэй элсэлт), эсвэл ангид нээгдсэн бодлого (`canAccessProblem`); номын нүүр
(архивлаагүй) хүн бүр; аватар; бусад нь 403.

### Нийтийн (токенгүй) зураг

Вэбийн `apiUrl(path)` — үнэгүй тестийн бодлогын зураг гэх мэт нийтийн маршрут (2-р хэсэг: books). `/files/:key` нь
ҮРГЭЛЖ токен шаардана.

---

## Байршуулах — 2 зам (вэб `uploadFile`)

Апп ч ижил дараалал: **1) S3 шууд (presign → PUT → complete)**, бүтэлгүйтвэл (404 эсвэл сүлжээ) **2) multipart**.
Серверийн шалгалтын алдаа (400 төрөл/хэмжээ) бол шууд хэрэглэгчид харуул, 2-р зам руу шилжихгүй.

Зориулалт (`purpose`) — хадгалах хугацаа:

| purpose | Дээд хэмжээ | Хадгалах | Хэзээ |
|---|---|---|---|
| `homework` | **12 МБ** | **7 хоног** (`expiresAt`, cron өдөр бүр 03:30 УБ устгана) | гэрийн даалгаврын PDF/зураг |
| `theory` | 25 МБ | байнга | онолын зураг (ажилтан) |
| `general` | 25 МБ | байнга | аватар, бусад (өгөгдмөл; үл таних утга → general) |

Зөвшөөрөгдсөн төрөл: `.jpg .jpeg .png .gif .webp .heic` (mime `image/*`) эсвэл `.pdf` (mime `application/pdf`).
Сервер magic bytes-ийг шалгадаг — нэр/mime хуурвал 400. HEIC зөвшөөрөгдөнө (гэхдээ гэрийн даалгаврыг апп PDF болгоно).

Хязгаар: бүгдэд **хэрэглэгчээр минутад 30** (`UPLOAD_THROTTLE`). Хүсэлтийн timeout: вэб multipart 30с, S3 PUT 120с.

### POST /uploads/presign

- Guard: JWT. Body: `{ name: string (≤200 тэмдэгт таслана), mime: string, size: number (байт), purpose?: 'homework'|'theory'|'general' }`
- Response:
  - S3 тохируулаагүй: `{ direct: false }` → 2-р зам.
  - S3: `{ direct: true, key: string, url: string, ticket: string, headers: { 'Content-Type': string } }` —
    `url` 10 минут (UPLOAD_URL_TTL=600с) хүчинтэй.
- Алдаа: 400 `Зөвхөн зураг (jpg, png, gif, webp, heic) эсвэл PDF оруулна`; 400 `Файл 12 МБ-аас их байна`
  (`Файл {N} МБ-аас их байна`); 503 `Файл хадгалах сан түр ажиллахгүй байна. Дахин оролдоно уу.`

### PUT {url} (S3, API биш)

- Header: хариуны `headers` (`Content-Type` ЯГ presign-ийн `mime`-тэй ижил — гарын үсэгт орсон). **Authorization header БҮҮ нэм.**
- Body: файлын байт. 2xx биш бол вэб `Файл байршуулахад алдаа гарлаа.`

### POST /uploads/complete

- Guard: JWT. Body: `{ ticket: string, pages?: number }` — `pages` нь сервер PDF-ийг задалж чадаагүй үед л ашиглагдана
  (≤50 хүртэл хавчина). Апп өөрөө угсарсан PDF-ийн хуудасны тоог өгч болно.
- Response: `{ key: string, size: number, mime: string }`. Давтан complete (сүлжээ давтсан) — ижил хариу (upsert).
- Алдаа: 400 `Шууд илгээлт идэвхгүй`; 400 `Илгээлтийн хугацаа дууссан. Дахин илгээнэ үү.` (ticket хүчингүй эсвэл
  өөр хэрэглэгчийнх); 400 magic bytes; 400 хэмжээ; 400 `Файл ирсэнгүй. Дахин илгээнэ үү.`; 503.

### POST /uploads (multipart, хуучин зам)

- Guard: JWT. `multipart/form-data`: **`purpose` талбарыг `file`-ээс ӨМНӨ** нэм (multer body-г файлын өмнөх
  талбараас уншина), `file` = файл. Дээд тал 25 МБ (multer), дараа нь purpose-ийн хязгаар.
- Response: `{ key: string, size: number, mime: string }`.
- Алдаа: 400 `Файл ирсэнгүй`; 400 төрөл/magic bytes/хэмжээ; 503 `Файл хадгалах сан тохируулагдаагүй байна. Админд хандана уу.`;
  503 `Файл хадгалахад алдаа гарлаа. Дахин оролдоно уу.`

## Апп-д анхаарах

- Байршуулсан `key`-г дараагийн endpoint-д (даалгавар илгээх, аватар) өгнө — key өөрөө юуг ч нээхгүй.
- Гэрийн даалгавар: утсан дээр зургуудыг ≤6 хуудас PDF болгож (`photosToPdf.ts`-тэй ижил, 12 МБ хязгаар),
  `purpose: 'homework'`. «PDF» гэдэг үгийг хүүхдэд харуулахгүй (PLAN M3). Илгээсний дараа түр файлыг устга (SECURITY.md).
- Хадгалах хугацаа, эрх, устгал — серверт. Апп 7 хоногийн дараах 404-ийг «Хадгалах хугацаа дууссан» гэж харуулж болно.
