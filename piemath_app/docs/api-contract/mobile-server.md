# Гар утасны аппад зориулж серверт нэмсэн endpoint (2026-11-02, branch `app/api`)

Эх: `api/src/devices/`, `api/src/auth/native/`, `api/src/account-deletion/`, `api/src/tests/integrity-events.ts`.
Миграци: `api/prisma/migrations/20261102120000_mobile_app_support` (зөвхөн шинэ хүснэгт: `DeviceToken`,
`AppleIdentity`, `AccountDeletionRequest`). Эрх бүрийг `api/src/auth/access-control.spec.ts` шалгана.
«6 role» = STUDENT, PARENT, BUYER, TEACHER, TEACHER_PLUS, ADMIN.

## 1. Шалгалтын бүрэн бүтэн байдлын үйл явдал

`PATCH /tests/:id/session` ба `POST /tests/:id/submit`-ийн `event` талбар одоо:
`LEAVE | RETURN | FULLSCREEN_EXIT | SCREENSHOT | RECORDING_START | RECORDING_STOP`.

- `leaveCount`-ийг зөвхөн `LEAVE`, `FULLSCREEN_EXIT` нэмнэ. `SCREENSHOT`, `RECORDING_*` нь зөвхөн session-ий
  `events`-д (сүүлийн 100) бичигдэнэ — сурагчийг «гарсан» гэж тооцохгүй.
- Нэг хүсэлтэд НЭГ event. Олон event-ийг дараалуулж явуул (autosave-тай хамт байж болно).
- Багшийн `GET /tests/:id/results` мөр бүрд нэмэгдсэн: `screenshotCount`, `recordingCount`
  (`number | null` — session байхгүй бол `null`). `recordingCount` = `RECORDING_START`-ийн тоо.

## 2. Push токен — `DeviceToken`

| Метод, зам | Эрх | Body | Хариу |
|---|---|---|---|
| `POST /devices` | 6 role, минутад 20 | `{ token, platform: "ios"\|"android", appVersion? }` | `{ registered: true, device: { id, platform, lastSeenAt }, pushEnabled }` |
| `DELETE /devices/:token` | 6 role | — | `{ registered: false }`; өөрийн биш/байхгүй бол `404 Төхөөрөмж олдсонгүй` |

- Нэвтэрсний дараа болон FCM токен шинэчлэгдэх бүрд `POST /devices` (идэмпотент upsert). Ижил токен өөр
  хэрэглэгчид байсан бол одоогийн хэрэглэгч рүү шилжинэ. Гарахдаа `DELETE` (токеныг URL-encode хий).
- «Устгах» = `revokedAt` (мөр үлдэнэ). Хэрэглэгч бүрд идэвхтэй 10 хүртэл токен; хуучин нь автоматаар идэвхгүй.
- `pushEnabled: false` = сервер дээр Firebase тохируулаагүй (FCM_* env) — бүртгэл амжилттай, push ирэхгүй.
- Сервер талд: `DevicesService.sendToUsers(userIds, { title, body, data? })` (DevicesModule экспортолдог).
  Мэдэгдлийн урсгалд (даалгавар, ирц, төлбөр, «бодолт нээгдлээ») холбох ажил ҮЛДСЭН.

## 3. Native нэвтрэлт

| Метод, зам | Эрх | Body |
|---|---|---|
| `POST /auth/google/native` | нээлттэй, минутад 10 | `{ idToken, remember? }` |
| `POST /auth/apple` | нээлттэй, минутад 10 | `{ identityToken, nonce?, remember? }` |
| `POST /auth/google/native/link` | 6 role, минутад 10 | `{ idToken }` → `{ result: "linked"\|"taken" }` |
| `POST /auth/apple/link` | 6 role, минутад 10 | `{ identityToken, nonce? }` → `{ result: "linked"\|"taken" }` |

Нэвтрэх хариу (200):

```json
{ "status": "ok", "accessToken": "…", "userId": "…", "role": "STUDENT" }
{ "status": "signup", "ticket": "…" }      // зөвхөн Google: бүртгэлгүй Gmail → POST /auth/register { googleTicket }
{ "status": "not_linked" }                  // утсаараа нэвтэрч профайлаас холбох
```

- Сервер бүртгэл ҮҮСГЭХГҮЙ (вэбтэй ижил дүрэм). Холбогдсон эсвэл баталгаажсан имэйл нь `User.email`-тэй
  таарсан (өөр Google/Apple-д холбогдоогүй) хүн л нэвтэрнэ. Apple privaterelay имэйлээр автоматаар холбохгүй.
- Google: гарын үсэг, `aud` ∈ `GOOGLE_NATIVE_CLIENT_IDS` (+ `GOOGLE_CLIENT_ID`), `email_verified` шалгана.
  Android-д `serverClientId` = вэб client ID өгвөл `aud` нь тэр болно.
- Apple: Apple JWKS-ээр RS256 гарын үсэг, `iss`, `aud` ∈ `APPLE_CLIENT_IDS`. `nonce` илгээвэл токены `nonce`
  нь түүхий утга эсвэл түүний SHA-256 hex-тэй таарах ёстой.
- Алдаа: `401 Google/Apple токен хүчингүй байна…`, `401 …имэйл баталгаажаагүй…`, `401 …архивлагдсан…`,
  `503 … тохируулагдаагүй байна` (env хоосон — апп товчоо нууна), `429`.

## 4. Бүртгэл устгах ХҮСЭЛТ (App Store 5.1.1(v))

| Метод, зам | Эрх | Body | Хариу |
|---|---|---|---|
| `POST /me/deletion-request` | 6 role, минутад 5 | `{ reason? }` (≤1000) | `{ created, request: { id, status, reason, createdAt, reviewedAt, reviewNote } }` |
| `GET /me/deletion-request` | 6 role | — | `{ request: {…} \| null }` (хамгийн сүүлийнх) |
| `GET /admin/deletion-requests?status=` | ADMIN | — | хүсэлт + `user { id, firstName, lastName, phone, email, role, archivedAt }`; анхдагч нээлттэй (PENDING, IN_REVIEW) |
| `PATCH /admin/deletion-requests/:id` | ADMIN | `{ status: PENDING\|IN_REVIEW\|RESOLVED\|REJECTED, note? }` | шинэчилсэн хүсэлт |

- Сервер өгөгдлийг ХЭЗЭЭ Ч устгахгүй, дарж бичихгүй (прод өгөгдлийн дүрэм) — зөвхөн хүсэлтийн мөр. Нээлттэй
  хүсэлт байвал `POST` давхар үүсгэхгүй (`created: false`). Апп: «Хүсэлт хүлээн авлаа, төв холбогдоно» гэж харуул.
