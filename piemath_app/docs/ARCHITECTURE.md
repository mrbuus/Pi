# Архитектур

## 1. Зарчим

1. **Апп = харуулах давхарга.** Оноо, эрх, бодолт нээгдэх, төлбөр, хуваарийн тооцоо бүгд API-д (`../../api/src`).
   Апп логикийг давхардуулж бичвэл вэб, апп хоёр өөр дүн гаргана — бүү хий.
2. **Нэг API.** Шинэ endpoint хэрэгтэй бол `../../api`-д тесттэй нэмнэ (§6), вэб ч ашиглаж болохуйц ерөнхий байдлаар.
3. **Сул утас тэргүүнд.** 2 GB RAM, Android 8–9, удаан 3G — `PERFORMANCE.md`.
4. **Офлайнд тэсвэртэй.** Сүлжээ тасрахад хоосон дэлгэц биш — кэш + «холболт тасарсан» тууз + дахин оролдох.

## 2. Хавтасны бүтэц

```
piemath_app/
  lib/
    main.dart                  # bootstrap: env, error zone, ProviderScope
    app/                       # MaterialApp.router, theme, router, shell (доод таб / rail)
    core/
      config/env.dart          # API_BASE_URL (--dart-define), build flavor
      network/                 # dio, AuthInterceptor, RetryInterceptor, ApiError (монгол мессеж)
      auth/                    # TokenStore (flutter_secure_storage), Session (Riverpod)
      storage/                 # drift DB (кэш), migrations
      time/                    # UB цаг, гарагийн хөрвүүлэлт (монгол 1–7 ↔ JS 0–6), тесттэй
      math/                    # MathText (flutter_math_fork + SVG fallback), ChoiceGrid
      files/                   # зураг ачаалах (Authorization header), зураг → PDF
      integrity/               # шалгалтын хамгаалалт (EXAM-INTEGRITY.md), platform channel
      ui/                      # дизайны систем: токен, Card, Meta/Dot, LoadingState, ErrorState, EmptyState
    features/
      auth/  home/  my_class/  homework/  tests/  exam/  review/  books/  sorils/  placement/
      scan/  theory/  schedule/  attendance/  payments/  notifications/  profile/  parent/  teacher/
        data/        # repository + DTO (freezed)
        domain/      # цэвэр логик (I/O-гүй, тесттэй) — шаардлагатай үед л
        ui/          # screens, widgets
  test/                        # unit + widget + golden
  integration_test/            # e2e (mock API)
  android/  ios/
  tool/                        # скриптүүд (LaTeX golden шалгалт гэх мэт)
```

## 3. Сангууд (шинэ сан нэмэхээс өмнө `PERFORMANCE.md` §2-ыг уншиж хэмжээг нь бод)

| Хэрэгцээ | Сан | Тайлбар |
|---|---|---|
| Төлөв | `flutter_riverpod` (Notifier/AsyncNotifier) | codegen заавал биш |
| Навигаци | `go_router` | deep link `/q/:code`, `/app/...` вэбийн замтай ижил бүтэц |
| HTTP | `dio` | timeout, retry (jitter), 401 → гаргах |
| Модель | `freezed` + `json_serializable` | |
| Кэш | `drift` (SQLite) | бодлого, онол, хуваарь, офлайн autosave дараалал |
| Токен | `flutter_secure_storage` | Keychain / Keystore |
| Томьёо | `flutter_math_fork` + `flutter_svg` | `MOBILE-SCAN.md` §1.1, PLAN M2 |
| Томьёо бичих | `math_keyboard` | дараагийн шат |
| Зураг/камер | `image_picker` (+ шаардвал `camera`), `flutter_image_compress` | |
| Зураг → PDF | `pdf` (dart) | вэбийн `web/src/lib/photosToPdf.ts`-тэй ижил үр дүн: 6 хуудас хүртэл |
| Push | `firebase_messaging` | Firebase төсөл эзэн үүсгэнэ — тэр хүртэл interface + stub |
| Дүрс | Lucide (`lucide_icons_flutter`) | emoji хориотой |
| Холбоос | `url_launcher` | YouTube гаднаа нээх эсвэл nocookie WebView |

## 4. API холболт

- Суурь хаяг: `--dart-define=API_BASE_URL`, өгөгдмөл `https://api.pimath.mn/api`. Хөгжүүлэлтэд локал/mock.
- Нэвтрэлт: `POST /auth/login` → `{ accessToken, userId, role }`. Бусад бүх хүсэлт `Authorization: Bearer`.
  `GET /auth/me` — профайл. 401 → токен устгаад нэвтрэх дэлгэц (нууц үг солигдсон бол сервер хуучин токенг хүчингүй болгодог).
- **Файл/зураг:** `GET /files/:key`. Вэб `?token=` query ашигладаг (`web/src/lib/api.ts` `fileUrl`) — апп-д
  `Authorization` header-ээр (JwtStrategy header-ийг уншдаг). Query-д токен бүү тавь (log-д үлдэнэ).
  403 нь «эрхгүй» гэсэн хэвийн хариу (жишээ: тест эхлээгүй сурагчид шалгалтын зураг) — эвдэрсэн хайрцаг биш, тайлбар харуул.
- **Модель:** Nest-ийн OpenAPI нь ихэнх хариуны бүтцийг агуулдаггүй (controller-ууд service-ийн объектыг шууд буцаадаг).
  Тиймээс endpoint бүрийн Dart моделийг **service-ийн кодыг уншиж** гараар бич, `docs/API-CONTRACT.md`-д
  «endpoint → service функц → Dart класс» гэж тэмдэглэ. Вэбийн TypeScript interface-ууд (`web/src/**`) сайн эх сурвалж.
- Алдаа: API монгол `message` буцаадаг — түүнийг харуул; сүлжээний алдаанд өөрийн монгол мессеж.
- Throttle: API-д rate limit бий (жишээ: `/scan/:code` минутад 30, нэвтрэлт 10). Retry-г хязгаартай хий.

## 5. Гол урсгалууд (одоо байгаа endpoint)

| Урсгал | Endpoint (жишээ) | Вэбийн эх |
|---|---|---|
| Сурагчийн нүүр, өдөр бүр | `GET /student-hub/overview`, `/student-hub/days?month=` | `web/src/app/app/my-class` |
| Ангийн тест | `/student-hub/tests`, `/student-hub/tests/:testId` | `app/my-class/tests/[testId]` |
| Онол | `/student-hub/theory?q=` | `app/theory` |
| Шалгалт өгөх | `POST /tests/:id/start` (session буцаана, дахин дуудахад үргэлжилнэ), `POST /tests/:id/heartbeat`, `PATCH /tests/:id/session` (autosave: хариу, төлөв, хугацаа, `leaveCount`, `events`), `POST /tests/:id/submit` | `app/tests/[id]` |
| Эргэн харалт | `/tests/:id/review`, 1000: `/thousand/tests/:id/review` | `app/tests/[id]/review` |
| Номын QR | `GET /scan/:code` | `app/scan/[code]` |
| Гэрийн даалгавар | `api/src/assignments`, `homework-practice` | `app/homework` |
| Мэдэгдэл | `api/src/notification-center` | `app/notifications` |

Endpoint-ын яг зам, DTO-г controller файлаас шалга — энэ хүснэгт чиглүүлэг л.

## 6. API-д шинээр нэмэх зүйл (milestone тус бүрт, `../../api`-д)

| Юу | Яагаад | Шаардлага |
|---|---|---|
| `DeviceToken` загвар + `POST/DELETE /devices` | Push мэдэгдэл | Миграци `IF NOT EXISTS`, зөвхөн нэмэлт |
| Мэдэгдэл → FCM илгээгч | Даалгавар, ирц, төлбөр, «бодолт нээгдлээ» | FCM service account нь env-д (эзэн) |
| `POST /auth/google/native` (idToken шалгах) | Google WebView OAuth-г хориглодог | `google-auth-library` аль хэдийн бий |
| `POST /auth/apple` | Apple 4.8: Google байвал Apple нэвтрэлт заавал | |
| Бүртгэл устгах **хүсэлт** | Apple 5.1.1(v) | Зөөлөн: хүсэлт → админ шийднэ, прод өгөгдлийн дүрэм зөрчихгүй |
| Шалгалтын бүрэн бүтэн байдлын үйл явдал (`screenshot`, `background`) | EXAM-INTEGRITY.md | Одоо байгаа `events`/`leaveCount`-ийг өргөтгөх |

API-ийн өөрчлөлт бүрд: `cd api && npx tsc --noEmit && npx jest` цэвэр, шинэ маршрут `src/auth/access-control.spec.ts`-д,
`STATUS.md` §8.1 урхи (модулийн экспорт, давхар `api/` префикс).
