# Мэдэгдэл, төлбөрийн төлөв, санал хүсэлт, тусламж, бусад

Эх: `api/src/notification-center/{notification-center.controller.ts,notification-center.service.ts}`,
`api/src/jobs/notification-preferences.controller.ts`, `api/src/payments/payments.controller.ts` + `payments.service.ts`
(`my`), `api/src/tuition/tuition.controller.ts` + `tuition.service.ts` (`getPaidUntil`), `api/src/feedback/*`,
`api/src/centre-help/*`, `api/src/lesson-flow/lesson-flow.controller.ts`, `api/src/auth/login-text.*`,
`api/prisma/schema.prisma` (`Notification`, `NotificationPreference`, `Payment`, `Feedback`); вэб
`web/src/components/notifications/NotificationBell.tsx`, `web/src/app/app/notifications/**`,
`web/src/app/app/student/payments/StudentPaymentsClient.tsx`, `web/src/components/payments/{PayInfo,PaidUntilCard}.tsx`,
`web/src/lib/orgInfo.ts`, `web/src/components/feedback/FeedbackWorkspace.tsx`, `web/src/components/support/CentreHelp.tsx`.

---

## Мэдэгдэл (апп доторх) — `/notifications/*`

Guard: JWT + Roles (ADMIN, TEACHER_PLUS, TEACHER, STUDENT, PARENT, BUYER). Глобал throttle.
Push (FCM) ОДООГООР БАЙХГҮЙ — M6-д `DeviceToken` + FCM [A]. Одоохондоо апп poll хийнэ.

### GET /notifications/my?cursor=&limit=

- `limit` 1–50, өгөгдмөл 10 (400 `Хуудасны хэмжээ 1–50 байх ёстой.`). `cursor` = өмнөх хуудасны `nextCursor` (өөрийнх
  биш бол 404 `Мэдэгдэл олдсонгүй.`).
- Response:

```ts
{
  notifications: {              // createdAt desc, id desc
    id: string;
    kind: 'PAYMENT_DUE' | 'HOMEWORK' | 'SCHEDULE_CHANGE' | 'ANNOUNCEMENT' | 'SYSTEM';
    title: string;
    body: string | null;
    link: string | null;        // ВЭБИЙН дотоод зам (ж: "/app/homework", "/app/tests/<id>") — апп өөрийн маршрут руу хөрвүүлнэ
    readAt: string | null;      // ISO
    createdAt: string;          // ISO
  }[];
  nextCursor: string | null;    // limit-тэй тэнцүү тоо ирвэл сүүлийн id, эс бөгөөс null
}
```

### GET /notifications/my/unread-count (мөн `/notifications/unread-count`)

`{ count: number }`. Вэбийн хонх 60 секунд тутам (хуудас харагдаж байх үед л) + хуудас дахин харагдахад асууна
(`NotificationBell.tsx`). Апп: foreground үед л 60с, resume үед нэг удаа.

### POST /notifications/:id/read

`{ read: true }`. 404 `Мэдэгдэл олдсонгүй.` (өөрийнх биш ч 404).

### POST /notifications/read-all

`{ updated: number }`.

### GET /notifications/settings, PATCH /notifications/settings

- Бүх 6 эрх. GET → `{ userId: string, emailWeekly: boolean, emailReminders: boolean, updatedAt?: string }`
  (мөр байхгүй бол хоёулаа `true`, `updatedAt` байхгүй).
- PATCH body: `{ emailWeekly?: boolean, emailReminders?: boolean }` → хадгалсан мөр. Эдгээр нь ИМЭЙЛИЙН тохиргоо
  (апп доторх мэдэгдэлд нөлөөгүй). Ихэнх сурагч имэйлгүй — апп-д хоёрдугаар зэргийн дэлгэц.

---

## Төлбөрийн төлөв (сурагч)

Вэб `/app/student/payments`: (1) «Хэзээ хүртэл төлсөн» карт, (2) төлбөр төлөх данс (хуулах товчтой), (3) төлбөрийн түүх.
**Апп тооцохгүй:** өр, хоцролт, багц, «бүтэн жил» — бүгд серверийн ledger (STATUS §7.23). Энгийн багш нийт дүн харахгүй.

### GET /tuition/paid-until/my

- Roles: STUDENT. Response `{ paidUntil: string | null }` — ISO `DateTime`. Сервер (`tuition.service.ts` `getPaidUntil`)
  CONFIRMED төлбөрийн `forMonth` дараалсан гинжээс + БҮХ ангийн HOLIDAY өдрүүдээр (`computePaidUntil`) тооцно; төлбөргүй
  бол null. Огнооны утгаар (УБ өдөр) харуул. 404 `Сурагч олдсонгүй`. ⚠ Энэ нь STATUS §7.23-ийн ledger-ээс тусдаа
  хуучин тооцоо — вэб ижил картыг харуулдаг тул апп ч ижил.
- Эцэг эх: `GET /tuition/paid-until/:studentId` — PARENT (зөвхөн БАТАЛГААЖСАН хүүхэд), ажилтан. Ижил хэлбэр.

### GET /payments/my

- Guard: JWT л (эрхгүй шалгалт — өөрийн мөрүүд). Response: `Payment` мөр бүхэлдээ, `createdAt` desc. Апп хэрэглэх талбар:

```ts
{
  id: string;
  amount: number;               // ₮, бүхэл
  method: 'QPAY' | 'BANK_TRANSFER' | 'CASH';
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'REVERSED';
  description: string | null;
  forMonth: string | null;      // "2026-09"
  paidAt: string | null;        // ISO
  createdAt: string;            // ISO
  // дотоод талбарууд ирнэ (qpayInvoiceId, clientRequestId, normalizedRequestHash, qpayCheckoutSnapshot,
  // providerPaymentId, confirmedById, storePurchaseId, invoiceAttemptedAt, userId) — апп бүү харуул, бүү кэшлэ
}[]
```

- Вэб: «Нийт төлсөн» = CONFIRMED-ийн нийлбэр, «Баталгаажихыг хүлээж буй» = PENDING-ийн нийлбэр (зөвхөн харуулах
  нийлбэр — өрийн тооцоо БИШ). Сараар бүлэглэнэ (`forMonth` эсвэл `createdAt`).
- Монгол нэр: PENDING «Хүлээгдэж буй», CONFIRMED «Баталгаажсан», REJECTED «Татгалзсан», REVERSED «Буцаасан».

### Төлбөр төлөх данс (API БИШ — вэбийн тогтмол)

- Дансны мэдээлэл `web/src/lib/orgInfo.ts` `BANK` (банк, данс, IBAN, хүлээн авагч) + `TUITION` (ангийн түвшний үнэ),
  `tierForGrade()`. Апп ижил утгыг `lib/core/config/org_info.dart` гэх мэт НЭГ газарт тогтмол болгон хадгална
  (эзэн өөрчлөхөд хоёуланг шинэчил) — эсвэл ирээдүйд API [A]. Хувийн мэдээлэл биш (нийтэд зарласан данс).
- «Гүйлгээний утга» = `"<Овог> <Нэр>, <утас>, 2027"` (`/auth/me`-ээс). Мөр бүрт «Хуулах», бас «Бүгдийг хуулах».
- ⚠ Вэб үнийг сургуулийн ангиар (`grade`, `/assignments/my-classrooms` IN_PERSON анги) харуулдаг, харин серверийн
  ledger нь суудаг ангийн 7 хоногийн өдрөөр (STATUS §7.23) — зөрж болно (`ТОДРУУЛАХ`, эзэнтэй). Апп вэбтэй ижил байлга.
- QPay төлөлт апп-д — эзний шийдвэр (одоогоор вэб ч данс руу шилжүүлэх зааварт төвлөрсөн).

---

## Санал хүсэлт — `/feedback`

Guard: JWT + RolesGuard (class-д `@Roles` байхгүй → бүх нэвтэрсэн хэрэглэгч). **`forbidNonWhitelisted: true`** — DTO-д
байхгүй талбар илгээвэл 400.

### POST /feedback

- Body (`CreateFeedbackDto`):

```ts
{
  clientRequestId: string;      // UUID — давтан илгээлтийг (сүлжээ) нэг болгоно; ижил id + өөр агуулга → 409
  kind: 'BUG' | 'SUGGESTION' | 'QUESTION';
  subject: string;              // trim, 3–120
  body: string;                 // trim, 10–10000
  contextPath?: string;         // ^\/(?:[A-Za-z0-9_-]+\/?)*$ ≤200 — вэбийн зам (апп дэлгэцийн нэрийг вэб замаар өг)
  attachmentKeys?: string[];    // ≤3, ≤100 тэмдэгт, өөрийн байршуулсан JPG/PNG/GIF/WEBP л (HEIC, PDF болохгүй)
}
```

- Response: `Feedback` мөр `{ id, authorId, clientRequestId, kind, subject, body, contextPath, attachmentKeys, state: 'OPEN',
  response: null, respondedById: null, createdAt, updatedAt }`.
- Алдаа: 409 `Энэ илгээлтийн дугаараар өөр мэдээлэл хадгалагдсан байна. Шинэ хүсэлтээр илгээнэ үү.`; 400 `Хавсралт давхардсан
  байна.`; 400 `Зөвхөн өөрийн байршуулсан JPG, PNG, GIF, WEBP зураг хавсаргана.`

### GET /feedback?cursor=

- Өөрийн хүсэлтүүд, `id` desc, **51 хүртэл** мөр (`author: { id, firstName, lastName, role }`-тэй). Вэб: 50-аас их
  ирвэл «дахин» бий, эхний 50-ыг харуулж, дараагийн хуудсанд 50 дахь мөрийн id-г `cursor` болгоно.
- `state`: `'OPEN' | 'IN_REVIEW' | 'RESOLVED'`; `response` — админы хариу.

### GET /feedback/:id

Өөрийнх (эсвэл админ). 404 `Хүсэлт олдсонгүй.`, 403 `Энэ хүсэлтийг харах эрхгүй.`

---

## Тусламж (FAQ) — `/centre-help/*` (нийтийн, нэвтрэлтгүй)

AI биш — урьдчилан бичсэн хариултаас үгээр хайна.

- `GET /centre-help/topics` → `{ version: string, topics: { id: string, question: string }[] }`
- `POST /centre-help/ask` body `{ question: string (2–400) }` →
  `{ version, mode: 'authored-retrieval', matches: { id, question, answer, terms: string[], source: { label, href } }[] (≤3),
  fallback: string | null }`. `source.href` — вэбийн зам.

---

## Хичээлийн урсгал — `/lesson-flow/my`

- Вэб `/app/lesson-flow/my` → **`/app/my-class` руу redirect** (СУРАГЧ V2, 2026-10-31). Апп-д тусдаа дэлгэц ХИЙХГҮЙ —
  `/student-hub/days` ашигла. Endpoint (`GET /lesson-flow/my`, STUDENT) хэвээр байгаа ч хуучирсан.

## Нэвтрэх хуудасны зарлал

`GET /auth/login-text` — [auth.md](auth.md#нэвтрэх-хуудасны-зарлал--authlogin-text).
