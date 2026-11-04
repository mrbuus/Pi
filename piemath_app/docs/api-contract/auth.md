# Нэвтрэлт, профайл, нууц үг, зөвшөөрөл

Эх: `api/src/auth/auth.controller.ts`, `auth.service.ts`, `jwt.strategy.ts`, `password-reset.service.ts`,
`password-reset.util.ts`, `password-policy.ts`, `session-ttl.ts`, `login-attempts.ts`, `consent.controller.ts`,
`consent.service.ts`, `login-text.controller.ts`, `dto/*.ts`; вэб `web/src/lib/api.ts`, `web/src/app/login/page.tsx`,
`web/src/app/forgot-password/page.tsx`, `web/src/app/app/layout.tsx`, `web/src/lib/navigation-role.ts`,
`web/src/components/profile/ChangePasswordSection.tsx`.

## Эрх (Role enum, `schema.prisma`)

`ADMIN`, `TEACHER_PLUS`, `TEACHER`, `STUDENT`, `PARENT`, `BUYER`

- `GROUP_TEACHER` нь **Role биш** — вэбийн ЗӨВХӨН навигацийн горим (`navigationRole`): `role` нь `TEACHER` эсвэл
  `TEACHER_PLUS` БА `/auth/me`-ийн `externalTeacherProfile != null` бол «Анги удирдах» (гадны багш) горим.
  API-ийн эрх үргэлж жинхэнэ `role`-оор.
- Монгол нэр (вэб `ROLE_LABEL`): ADMIN «Админ», TEACHER_PLUS «Багш+», TEACHER «Багш», STUDENT «Сурагч»,
  PARENT «Эцэг эх», BUYER «Худалдан авагч», GROUP_TEACHER «Анги удирдах». Багш+-ын нэрийн ард «+» (RULES §6).

### Эрх → нүүр зам (вэб `homeForRole`, `web/src/lib/api.ts`)

| Эрх | Вэб нүүр | Апп-ын харгалзаа |
|---|---|---|
| GROUP_TEACHER (горим) | `/app/groups` | гадны багшийн бүлэг |
| ADMIN | `/app/admin` | админ самбар |
| TEACHER, TEACHER_PLUS | `/app/teacher` | багшийн самбар |
| STUDENT | `/app/student` | сурагчийн нүүр |
| PARENT | `/app/parent` | эцэг эх |
| бусад (BUYER) | `/app/buyer` | худалдан авагч |

Нэвтэрсний дараа `?next=` байвал тэр рүү (вэб `safeNext`: зөвхөн `/`-ээр эхэлсэн дотоод зам, `//`, `\`, зай, `/login|/register|/forgot-password` хориотой).

---

## POST /auth/login

- Guard: байхгүй (нийтийн). **Throttle: IP-гээр минутад 10.**
- Нэмэлт түгжээ (`login-attempts.ts`, процессын санах ойд): нэг `identifier`-ээр 15 минутад **8 буруу** оролдлого →
  15 минут түгжинэ (429). Бүртгэлээр 3 удаа буруу бол эзний имэйл/Gmail руу НЭГ мэдэгдэл (хариунд нөлөөгүй).

Request (`LoginDto`):

```ts
{
  identifier?: string;   // утас (8 орон), имэйл ЭСВЭЛ нэвтрэх нэр — нэг талбар
  phone?: string;        // хуучин клиентийн нэр; identifier байхгүй бол үүнийг ав
  password: string;      // IsNotEmpty
  remember?: boolean;    // «Намайг сана»: true → токен 30 хоног, false → 12 цаг, ирээгүй → 7 хоног
}
```

- `identifier` нь `trim()` хийгдээд `phone == x OR email == x OR username == x` (том/жижиг үсэг ЯЛГАНА — имэйл
  нэвтрэлтэд case-sensitive; нууц үг сэргээхэд л case-insensitive). Апп: зөвхөн `trim()` хий, бусдыг өөрчлөхгүй.
- Апп-д санал: «Намайг сана» = `remember: true` (утсанд хадгална, 30 хоног). Чагтлаагүй бол `false` (12 цаг) —
  апп хаахад токен устах ёстой эсэхийг апп шийднэ (вэб sessionStorage ашигладаг).

Response 201:

```ts
{ accessToken: string; userId: string; role: Role }
```

JWT payload: `{ sub: userId, role, iat, exp }` (HS256). Апп `exp`-ийг уншиж болно, гэхдээ эрхийг шийдэхгүй.

Алдаа:

| Статус | Мессеж | Хэзээ |
|---|---|---|
| 401 | `Нэвтрэх мэдээлэл буруу байна` | identifier хоосон |
| 401 | `Нэвтрэх мэдээлэл эсвэл нууц үг буруу байна` | хэрэглэгч олдоогүй ЭСВЭЛ нууц үг буруу (санаатайгаар ялгахгүй) |
| 401 | `Энэ сурагчийн бүртгэл архивлагдсан байна. Сургалтын төвтэй холбогдоно уу.` | `archivedAt` |
| 429 | `Олон удаа буруу оролдсон тул 15 минутын дараа дахин оролдоно уу. Нууц үгээ мартсан бол «Нууц үг сэргээх»-ийг ашиглана уу.` | түгжээ |
| 429 | (Throttler, англи) | минутад 10-аас их |
| 400 | class-validator (`password should not be empty` гэх мэт, англи) | хоосон нууц үг — апп өөрөө урьдчилан шалга |

UX (вэб): алдааг маягтын ерөнхий хэсэгт (талбарт биш), «Нууц үг харах» товч бүх талбарт, өгөгдмөл хаалттай
(STATUS §7.2). Анхны нууц үг = 8 оронтой утасны дугаар.

---

## GET /auth/me

- Guard: `JwtAuthGuard` (бүх эрх). Глобал throttle.
- Response 200 — `prisma.user.findUnique({ select })` шууд (хэрэглэгч устсан бол JwtStrategy өмнө нь 401):

```ts
{
  id: string;
  phone: string | null;          // 8 оронтой үндэсний дугаар
  email: string | null;
  username: string | null;
  studentCode: string | null;     // сурагчийн дотоод код
  teacherCode: string | null;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl: string | null;       // ФАЙЛЫН KEY (URL биш!) → GET /files/:key
  mustChangePassword: boolean;    // одоогоор үргэлж false; апп ХҮЧЛЭХГҮЙ (эзэн)
  studentProfile: StudentProfile | null;   // STUDENT-д
  teacherProfile: TeacherProfile | null;   // TEACHER, TEACHER_PLUS, ADMIN-д байж болно
  externalTeacherProfile: { verifiedAt: string | null } | null;  // гадны багш л
}

interface StudentProfile {          // ӨС-ийн мөр бүхэлдээ (select: true)
  userId: string;
  type: 'CLASSROOM' | 'ONLINE';     // ⚠ enum StudentType — 'IN_PERSON' БИШ (анги нь IN_PERSON/ONLINE)
  grade: number | null;             // 1–12
  school: string | null;
  activatedAt: string | null;       // ISO
  activationCode: string | null;
  fatherPhone: string | null;       // ⚠ хувийн мэдээлэл — кэшлэхгүй, log-д бичихгүй
  motherPhone: string | null;
  guardianNote: string | null;
  branch: string | null;            // "Баруун 4" | "Зүүн 4"
  section: string | null;           // "12-2" ангийн шошго
  tuitionAmount: number | null;     // ⚠ төлбөрийн гэрээ БИШ (STATUS §7.23) — апп харуулахгүй
  tuitionPlan: 'FULL_YEAR' | 'INSTALLMENT' | 'MONTHLY' | 'UNKNOWN' | null;
  tuitionNote: string | null;
  joinedOn: string | null;          // @db.Date → 'YYYY-MM-DDT00:00:00.000Z'
  leftOn: string | null;            // @db.Date
  approvalPending: boolean;
  approvedAt: string | null;
  approvedById: string | null;
}

interface TeacherProfile {
  userId: string;
  canManageStudents: boolean;       // Багш+-д утгатай
  teachesLessons: boolean;
}
```

- Гэрийн даалгаврын загвар сонголт (STATUS §7.11): `studentProfile.type === 'ONLINE'` → онлайн загвар
  (Assignment/Submission), бусад үед танхимын тэмдэглэгээ (`homework-marks/my`). Дэлгэрэнгүй [homework.md](homework.md).
- `role`-ийг ҮРГЭЛЖ `/auth/me`-ээс ав (нэвтрэх хариуны `role`-оос биш) — эрх солигдож болно.
- Эцэг эхийн хүүхдүүд `/auth/me`-д БАЙХГҮЙ — `GET /parent/children` (2-р хэсэг). Вэбийн layout баталгаажсан
  (`verified: true`) хүүхдийн `student.firstName`-ийг цэсэнд давхар харуулдаг.

## POST /auth/me/avatar

- Guard: JWT. Body `{ key: string }` — `^[\w][\w.-]*$` (`Буруу файлын key`). Эхлээд `/uploads`-аар байршуулаад key-г өг.
- Response: `{ avatarUrl: string }` (key). Эрх шалгалт: key эзэмшигчийг шалгадаггүй — апп өөрийн байршуулсан key-г л өг.

---

## POST /auth/change-password

- Guard: JWT. Глобал throttle (тусгай хязгааргүй).
- Request (`ChangePasswordDto`):

```ts
{
  currentPassword: string;
  newPassword: string;  // 8–72 тэмдэгт, \p{L} (латин/кирилл үсэг) БА \d (цифр) заавал, утасны дугаартай ижил биш
}
```

- Response 201: `{ changed: true, accessToken: string, userId: string, role: Role }` — **ШИНЭ токен**. Апп
  хуучин токеныг ЗААВАЛ шинээр солих: `passwordChangedAt` шинэчлэгдсэн тул хуучин токен (энэ төхөөрөмжийнх ч) 401
  болно. Шинэ токен нь `remember`-гүй тул 7 хоногийн хугацаатай (`ТОДРУУЛАХ`: апп дахин нэвтрэлгүйгээр 30 хоног
  хүсвэл API өөрчлөлт хэрэгтэй).
- Алдаа: 400 `Одоогийн нууц үг буруу байна`; 400 `Нууц үг дор хаяж 8 тэмдэгт, үсэг ба тоо холилдсон байх ёстой`;
  400 `Шинэ нууц үг утасны дугаараас өөр байх ёстой`; 400 `Нууц үг хэт урт байна`.

### Нууц үгийн бодлого (`password-policy.ts` = `web/src/lib/passwordPolicy.ts`)

```
PASSWORD_MIN_LENGTH = 8, PASSWORD_MAX_LENGTH = 72
PASSWORD_LETTER_RE = /\p{L}/u     (Dart: RegExp(r'\p{L}', unicode: true))
PASSWORD_DIGIT_RE  = /\d/
isSameAsPhone: цифр/зай/+/-/() л бол цифрийг нь утастай (эсвэл 976+утас) тулгана
```

Зөвхөн СОЛИХ/СЭРГЭЭХ үед. Нэвтрэлт, бүртгэлийн анхны нууц үгэнд (= утас) хамаарахгүй (эзний дүрэм).

### Нууц үг солигдсоны дараах 401 (`jwt.strategy.ts`)

Хүсэлт бүрт `isTokenIssuedAfterPasswordChange(iat, passwordChangedAt)` — токен нууц үг солигдохоос ӨМНӨ олгогдсон бол
`401 Нууц үг өөрчлөгдсөн тул дахин нэвтэрнэ үү`. Мөн `archivedAt` бол `401 Энэ сурагчийн бүртгэл архивлагдсан байна…`.
Апп: аль ч 401 → токен устгаад нэвтрэх дэлгэц, серверийн мессежийг харуул.

---

## Нууц үг сэргээх (нэвтрээгүй)

Урсгал 2 алхам (STATUS §7.2): 1) identifier → код/холбоос илгээх, 2) код + шинэ нууц үг.
**Бүртгэл байгаа эсэхийг илчлэхгүй** — 1-р алхмын хариу ҮРГЭЛЖ ижил.

### POST /auth/forgot-password

- Guard: байхгүй. **Throttle: IP-гээр 15 минутад 5.** Бүртгэлээр 15 минутад 3 код/холбоос (давбал чимээгүй, хариу ижил).
- Request: `{ identifier: string }` (утас / имэйл / нэвтрэх нэр / холбосон Gmail; IsNotEmpty `Утасны дугаараа оруулна уу`, ≤120).
  Утсыг `toNationalMn`-ээр хэвийн болгоно (+976, зай гэх мэт OK). Имэйл case-insensitive.
- Response 201:

```ts
{
  maskedTo: string;              // хэрэглэгчийн БИЧСЭН мөрөөс: утас → "9911****", имэйл → "ba***@gmail.com", бусад "****"
  expiresInSeconds: number;      // SMS кодын хугацаа = 600
  linkExpiresInSeconds: number;  // имэйл холбоосын хугацаа = 1800
  channels: { sms: boolean; email: boolean };  // СИСТЕМИЙН тохиргоо (хэрэглэгчийнх биш)
}
```

- Сонголт (сервер): бүртгэлд имэйл эсвэл холбосон Gmail байвал → имэйлээр 30 минутын холбоос
  (`{WEB_ORIGIN}/forgot-password#t=<token>`); үгүй бол SMS 6 оронтой код (10 мин).
- Вэбийн логик: `channels.sms` true → «код оруулах» алхам (`verify`), false → «имэйлээ шалгана уу» (`sent`).
  ⚠ SMS ч, имэйл ч асаалттай үед имэйлтэй хэрэглэгчид холбоос очдог ч вэб `verify` алхамыг харуулдаг —
  тусламжид «Gmail-ээ шалгана уу» гэж бичсэн (`emailOn`). Апп ижил текстийг харуул.
- Алдаа: 503 `Нууц үг сэргээх үйлчилгээ одоогоор тохируулагдаагүй байна. Сургалтын төвтэй холбогдоно уу.`;
  429 (throttle). Илгээх бүтэлгүйтвэл «Код ирэхгүй байна уу?» тусламжийг ӨӨРӨӨ нээ (ажилтнаас код авах зам).
- Вэб дахин илгээхийн өмнө cooldown (`RESEND_COOLDOWN_SEC`) барьдаг.

### POST /auth/reset-password (SMS код)

- Throttle: IP-гээр 15 минутад 10.
- Request: `{ identifier: string (≤120), code: string (яг 6 цифр, ^\d{6}$ — "Код 6 оронтой тоо байх ёстой"), newPassword: string (бодлого) }`
- Response 201: `{ reset: true }`. Дараа нь хэрэглэгч ШИНЭ нууц үгээр нэвтэрнэ (токен буцаахгүй). Бүх сесс, идэвхтэй код хүчингүй.
- Алдаа: 400 `Код буруу эсвэл хугацаа нь дууссан байна. Шинээр код хүснэ үү.` (бүх бүтэлгүй тохиолдолд ИЖИЛ;
  нэг кодонд 5 буруу оролдлого → код үхнэ); бодлогын 400.

### POST /auth/reset-password/link (имэйл холбоос)

- Throttle: IP-гээр 15 минутад 10.
- Request: `{ token: string (^[A-Za-z0-9_-]+$, ≤200), newPassword: string }`.
- Response 201: `{ reset: true }`. Алдаа 400 `Холбоос хүчингүй эсвэл хугацаа нь дууссан байна. Нууц үг сэргээхийг дахин хүснэ үү.`
- Апп: холбоос `https://pimath.mn/forgot-password#t=…` хэлбэртэй — deep link-ээр барих бол fragment-ийг уншина
  (`ТОДРУУЛАХ`: апп энэ холбоосыг барих эсэх M1-д шийд; эс бөгөөс вэб рүү нээ).

---

## Зөвшөөрөл (consent) — `/consent/my`

- Guard: JWT + Roles (6 эрх бүгд).
- **Вэбийн шалгалт одоо УНТРААЛТТАЙ** (`NEXT_PUBLIC_CONSENT_GATE !== "1"`, эзэн 2026-10-22). Апп мөн адил өгөгдмөл
  унтраалттай байх ёстой (feature flag), API нь хэвээр.

### GET /consent/my

```ts
{
  termsAcceptedAt: string | null;
  privacyVersion: string | null;
  guardianConsentAt: string | null;
  currentVersion: string;        // одоо '2026-09-26-draft'
  needsConsent: boolean;         // !termsAcceptedAt || privacyVersion !== currentVersion
}
```

404 `Бүртгэл олдсонгүй`.

### POST /consent/my

Request (`ConsentDto`):

```ts
{
  acceptTerms: true;                 // Equals(true) — 'Үйлчилгээний нөхцөл, нууцлалын бодлогыг зөвшөөрнө үү'
  privacyVersion: string;            // GET-ийн currentVersion-той ЯГ ижил — эс бөгөөс 'Бодлогын шинэ хувилбарыг уншихын тулд хуудсаа шинэчилнэ үү'
  isMinor: boolean;                  // 'Насны сонголтоо хийнэ үү'
  guardianConsent?: true;            // isMinor=true үед заавал true — 'Эцэг эх, хууль ёсны төлөөлөгчийн зөвшөөрөл шаардлагатай'
}
```

Response = GET-тэй ижил (аль хэдийн зөвшөөрсөн бол өөрчлөхгүй буцаана). Ерөнхий 400:
`Нөхцөл болон шаардлагатай зөвшөөрлийг баталгаажуулна уу`.

---

## Нэвтрэх хуудасны зарлал — /auth/login-text

- `GET /auth/login-text` — нийтийн, throttle минутад 60. Response `{ body: string; updatedAt: string | null }`
  (энгийн текст, мөр шилжилттэй, HTML биш; хоосон байж болно). Вэб: `components/auth/LoginNotice.tsx`.
- `PUT /auth/login-text` — ADMIN л, body `{ body: string ≤ 1000 }`. Апп-д хэрэггүй.

---

## POST /auth/register (зөвхөн бүтэц — M1-д апп-д бүртгэл хийх эсэх эзний шийдвэр)

- Throttle: минутад 10. Body = `ConsentDto` + доорх:

```ts
{
  acceptTerms: true; privacyVersion: string; isMinor: boolean; guardianConsent?: true;  // ConsentDto
  phone?: string;           // ^\d{8}$ 'Утасны дугаар 8 оронтой байх ёстой'
  email?: string;           // IsEmail 'Имэйл хаяг буруу байна'
  username?: string;
  password?: string;        // MinLength 4 (утсаар бүртгүүлбэл ирээгүй → нууц үг = утас)
  googleTicket?: string;    // Gmail-ээр бүртгүүлэх тасалбар
  firstName: string; lastName: string;
  studentType?: 'CLASSROOM' | 'ONLINE';  // ONLINE хаалттай бол 400 CENTRE_ONLINE_CLOSED_MESSAGE
  subject?: 'MATH' | 'SOCIAL_STUDIES' | 'BOTH';   // 'Хичээл буруу байна'
  asParent?: boolean;
  grade?: number;           // 1–12
  school?: string;
  activationCode?: string;  // танхимын: тухайн өдрийн огноо УБ-аар ЖЖЖЖССӨӨ
}
```

- Response: `{ accessToken, userId, role, studentCode: string | null, teacherCode: string | null }`.
- 400 `Утас эсвэл имэйл хаяг шаардлагатай` гэх мэт. Дэлгэрэнгүй `auth.service.ts` `register()`.

---

## Google нэвтрэлт (вэб, сервер талын OAuth) — апп-д M6

`/auth/google/config` (`{ enabled }`), `/auth/google/url`, `/auth/google/callback`, `/auth/google/exchange`,
`/auth/google/link`, `/auth/google/status`, `/auth/google/signup-info` — бүгд вэбийн redirect урсгал.
**Google WebView OAuth-ийг хориглодог** тул апп-д `POST /auth/google/native` (idToken) API шинээр хэрэгтэй [A] (ARCHITECTURE §6).
Google-ээр шинэ бүртгэл ҮҮСГЭХГҮЙ (холбосон эсвэл User.email таарсан үед л).

---

## Апп тооцохгүй (серверт)

Нэвтрэх түгжээ, нууц үгийн бодлогын эцсийн шийдвэр, токены хугацаа, `needsConsent`, эрх → апп зөвхөн UX-ийн
урьдчилсан шалгалт хийнэ (ж: нууц үгийн бодлогыг шивэх үед харуулах), эцсийн үгийг сервер хэлнэ.
