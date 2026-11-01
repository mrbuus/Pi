# Явц ба хүлээлгэн өгөх тэмдэглэл

**Дараагийн agent эндээс эхэлнэ.** Хамгийн сүүлийн бичлэг ДЭЭД талд. Бичлэг бүрт: огноо, юу хийсэн (commit), шалгалтын үр дүн,
дутуу зүйл, мэдэгдэж буй алдаа, **дараагийн яг алхам** (файл, функцийн нэртэй).

## Одоогийн төлөв

- Milestone: **M0 дууссан, M2 дууссан.** Дараа нь M1, M3, M4, M5, M7, M8 — зэрэгцээ agent-уудаар (доор «Ажлын хэв маяг»)
- Branch: `piemath-app` (суурь: прод `4d3b648` + номын QR S1)
- Flutter 3.47.9 stable / Dart 3.13.7 (cloud: `~/flutter`, `export PATH=~/flutter/bin:$PATH`)
- Шалгалт: `flutter analyze` 0 асуудал, `flutter test` 338/338 ногоон
- Ноорог PR (зөвхөн CI, merge хийхгүй): https://github.com/mrbuus/Pi/pull/53

## Ажлын хэв маяг — зэрэгцээ agent (эзэн 2026-11-01)

Эзний хүсэлтээр ажлыг хүндрэлээр нь хувааж хэд хэдэн agent зэрэг ажиллуулна. Зөрчилдөхгүйн дүрэм:
- Agent бүр тусдаа git worktree-д (`.claude/worktrees/…`, `.git/info/exclude`-д), ЗӨВХӨН өөрт оноосон хавтсанд.
  Push хийхгүй — үндсэн session нэгтгэж (merge), analyze/test шалгаад push хийнэ.
- Нийтлэг файл (`PROGRESS.md`, `PARITY.md`, `lib/app/**`, `lib/core/ui/**`, `test/helpers/` дахь одоо байгаа файл)-ыг
  зөвхөн үндсэн session засна. Feature бүр маршрутаа өөрийн `lib/features/<x>/<x>_routes.dart`-д.
- Worktree хуучин `main` commit-оос үүсдэг тул agent эхлээд `git reset --hard <piemath-app HEAD>` хийнэ.
- Widget тестэд HTTP дуудлагыг шууд `await` хийвэл FakeAsync-д гацна — `pump()` хий, эсвэл `tester.runAsync`.

## Mac дээр шалгах (Linux cloud-д боломжгүй)

- [ ] `flutter build ios --debug --no-codesign` амжилттай (bundle `mn.piemath.app`, нэр «Piemath»)
- [ ] Golden тест Linux-д үүсгэсэн — Mac дээр `flutter test -x golden`, эсвэл тусдаа `--update-goldens`
- [ ] iOS: `AppDelegate.swift` доторх `ExamGuardPlugin` compile болно; скриншот → `screenshot`, Control Center бичлэг/AirPlay →
      `recordingStarted/Stopped`, шалгалт эхлэхэд аль хэдийн бичиж байвал мэдэгдэнэ
- [ ] iOS: апп background-д байхад гарах тоолуурын 2с таймер ажиллах уу, эсвэл буцаж ирэхэд тоологдох уу
- [ ] iOS: inline томьёоны baseline, KaTeX фонт; бүтэн дэлгэцийн зургийг чимхэж томруулах
- [ ] Android төхөөрөмж: шалгалтын үед скриншот/бичлэг хар, recent apps preview хоосон; `exit()`-ийн дараа хэвийн
- [ ] Android 14+: скриншот callback (FLAG_SECURE асаалттай үед), Android 15+: бичлэгийн callback
- [ ] Android release (minify) HTTPS-д хүрч, токен хадгална; Android 8/9 (API 26–28) дээр асна; debug нь `10.0.2.2`-ийн локал API-д
- [ ] Android 12+: төхөөрөмж шилжүүлэх/сэргээхэд токен үлдэхгүй (дахин нэвтэрнэ)
- [ ] Release APK (`--split-per-abi`) хэмжээ; Lucide variable фонт (~1.4MB APK дотор) багтсан эсэх
- [ ] 2 GB RAM Android дээр бодлогын жагсаалт гүйлгэх 60fps

## Эзний шийдвэр хүлээж буй зүйлс

| # | Асуулт | Хэзээ хэрэгтэй | Шийдвэр |
|---|---|---|---|
| 1 | Bundle ID `mn.piemath.app` зөв үү? (дэлгүүрт гарсны дараа солигдохгүй) | M10-аас өмнө | — |
| 2 | Firebase төсөл (push) үүсгэх | M6 | — |
| 3 | Apple Developer / Google Play байгууллагын бүртгэл (D-U-N-S) | M10 | — |
| 4 | iOS `AEAssessmentSession` entitlement-ийг Apple-аас хүсэх | M4 | — |
| 5 | QR уншуулсан хүнд шалгалт эхлээгүй ч бодлогын зургийг харуулах уу? | M5 | — |
| 6 | Шинэ домэйн (piemath) авах уу — `API_BASE_URL` солих | — | — |

## Бичлэгүүд

### 2026-11-01 — M5 QR, ном (agent, `877193a`)

- `/app/scan` (камер, гар оруулга, торч; зөвхөн `pimath.mn/q/<код>` эсвэл 8 тэмдэгт, 3с дотор давтсаныг алгасна),
  `/app/scan/:code` (бодлого, хариу, бодолт, YouTube, вэбийн яг ижил түгжээний бичвэр, 404/429/офлайн),
  `/books`, `/books/:code`, сэдэв, үнэгүй тест `/books/:code/try/:testId` (сервер дүгнэнэ), `/sorils`, `/placement`
  (мэдээлэл; бүртгэл/өгөх нь вэбээр). Апп дотор юу ч зарахгүй (Apple IAP).
- Сан: `mobile_scanner` 7.4.3; `android/gradle.properties`-д `useUnbundled=true` (Play Services, ~2–3MB хэмнэнэ).
- Native: iOS `NSCameraUsageDescription`; Android App Links intent filter `https://pimath.mn/q/` (autoVerify).
- **Эзэн/вэб [Э]:** bundle ID батлагдсаны дараа вэбд `/.well-known/assetlinks.json` (`mn.piemath.app` + release
  SHA-256), `/.well-known/apple-app-site-association` (`<TEAMID>.mn.piemath.app`, `/q/*`); iOS `Runner.entitlements`
  `applinks:pimath.mn` — Xcode-оор холбоно (Mac).
- Mac/төхөөрөмж: камер (iOS Vision, Android 8–14 ML Kit), `/q/` deep link, тоон гар.

### 2026-11-01 — M1 нэвтрэлт, профайл (agent, `3361d4b`)

- `/login` (нэг талбар, нууц үг харах, «Намайг сана» өгөгдмөл чагттай, 2 алдааны дараа «Нууц үгээ сэргээх» тод,
  login-text зарлал, сүүлийн нэвтрэх нэрийг secure storage-д), `/forgot-password` (2 алхам + имэйлийн `#t=` холбоос,
  60с дахин илгээх, «код ирэхгүй» тусламж), нууц үгийн бодлого (= `password-policy.ts`), `/app/profile`,
  `/app/password` (`replaceToken`), `/app/consent` (gate унтраалттай, вэбтэй ижил). 42 шинэ тест, 3 golden.
- Тест бичихэд: `loginPrefsProvider`-ийг `MemoryLoginPrefs`-ээр override; `test/features/auth/auth_test_helpers.dart`
  (`pumpAuthApp`, `settle`) бүтэн апп-ын тестэд дахин ашиглаж болно.
- Нээлттэй: нууц үг сольсны дараах токен 7 хоног (30 биш) — эзний шийдвэр; имэйлийн холбоосыг app link болгох;
  профайлын зураг солих (core/files-ийн дараа); Google холбох (M6).
- Mac/төхөөрөмж: autofill (нэвтрэх нэр, нууц үг, нэг удаагийн код), жижиг утсанд гар талбарыг хаахгүй, iOS Keychain.
- M8 багшийн agent эхэлсэн (`3361d4b` дээр).

### 2026-11-01 — M0.4, M0.5, M0.6, M2, API гэрээ (cloud session, зэрэгцээ agent)

- **M0.4** (`5280b2b`): `core/config/env.dart` (API_BASE_URL, release-д зөвхөн HTTPS), `core/time/` (UbDateTime UTC+8,
  `mnWeekdayFromJs`/`jsWeekdayFromMn`, `DateMn` = вэбийн dateMn/relativeTimeMn), `core/format/person_name.dart`
  (shortName, staffName «+», rosterNames), `core/network/` (ApiClient: Bearer, 12с→jitter→60с retry ЗӨВХӨН GET/
  `retry:true`, GET dedupe, токен солигдвол хариу хаях, 401 → session.expire; ApiError зөвхөн монгол мессеж;
  reachability), `core/auth/` (TokenStore secure/memory, SessionController, CurrentUser freezed, UserRole).
- **M0.5** (`d9f1165`): `lib/app/` — router (redirect цэвэр функц `appRedirect`, safeNext, `/q/<код>`), `FeatureRoutes`
  (public/shell/fullscreen), `lib/features/*/<x>_routes.dart` 15 feature-ийн хоосон файл, AppShell (доод таб / 768dp+
  rail), NavData (= вэбийн nav-data.ts), MoreScreen («Бусад», өнгөний горим, гарах), PendingScreen (хийгдээгүй зам →
  «вэбээр нээх»), AppBackButton, SplashScreen, bootstrap. `features/auth/ui/login_screen.dart` — ТҮР (M1 солино).
- **M0.6 + платформ** (agent, `1c9c014`): Android манифест (INTERNET main-д, cleartext хориг, allowBackup=false,
  network security config, DETECT_SCREEN_CAPTURE/RECORDING), release signing `key.properties`-оос (жишээ файл),
  minify. CI `.github/workflows/piemath-app.yml` (analyze, test, Android debug build; iOS зөвхөн гараар).
  `lib/core/integrity/` — ExamGuard, MethodChannelExamGuard (Android FLAG_SECURE + скриншот/бичлэгийн callback,
  iOS `AppDelegate.swift` дотор ExamGuardPlugin), LeaveTracker (2с-ээс богиныг тоолохгүй, LEAVE/RETURN, warn 1,
  auto-submit 3, серверийн leaveCount-оор синк). **Android SDK суулгаж чадаагүй** (proxy `dl.google.com`-ийг хаадаг) —
  APK-г CI дээр барина. Kotlin-ыг kotlinc-ээр compile хийж шалгасан.
- **M2** (agent, `1f6f31f`): `lib/core/math/` (`math.dart` нэг импорт) — MathText (вэбийн задлал, inline/display,
  wrap, parse-ийн pool, алдааны badge), tex_normalize, ChoiceGrid (5 / 3+2 / 1, өнчин үгүй), ProblemFigure (skeleton,
  403 тайлбар, retry, бүтэн дэлгэцийн zoom). **LaTeX аудит:** 19,352 томьёо, 99.97% → 100% (`docs/LATEX-AUDIT.md`,
  `flutter test tool/latex_audit/latex_audit_test.dart`). Сангийн 5 эвдэрсэн томьёо (200V3-ULAMJLALYN_HEREGLEE-10,
  200V2-UTGYN_MUJ-01-A-01) — ӨС-д засах. Inline томьёог IntrinsicWidth/Height дотор бүү хий.
- **API гэрээ** (2 agent): `docs/api-contract/` 12 файл (~130 endpoint) — дэлгэц бичихээс өмнө ЗААВАЛ унш.
  Гол урхи: хуваарийн бүх `weekday` JS (0=Ням); `"YYYY-MM-DD"` vs `…T00:00:00.000Z` (эхний 10 тэмдэгт);
  `/files` S3 дээр 302 → presigned (Authorization-ийг S3 руу бүү дамжуул); `StudentProfile.type` = `CLASSROOM|ONLINE`;
  нууц үг сольсны дараа шинэ токен (7 хоног); вэб `POST /tests/:id/heartbeat`-г дууддаггүй (PATCH session-ээр
  keepalive); A/B хувилбарын hash-ийг вэбтэй яг ижил; хугацаа дууссан шалгалтыг сервер зөвхөн дараагийн дуудлагаар
  илгээдэг; `/schedule/days` цуцалсныг тооцдоггүй — өнөөдрийн хичээл `/attendance/board`-оос.
- `core/files/file_image.dart` — `fileImageProvider` гэрээ (одоо NetworkImage stub; homework agent бүрэн болгоно).
- Тест 252/252, analyze 0.
- **[A] API-д дараа хэрэгтэй:** `SaveSessionDto`-ийн event-д `SCREENSHOT`, `RECORDING_START`, `RECORDING_STOP`
  (leaveCount өсгөхгүй), багшийн дүнгийн хуудсанд харуулах.
- **Дараагийн алхам:** feature agent-ууд — M1 нэвтрэлт/профайл, M3 сурагч (нүүр, хичээл, хуваарь), M3 даалгавар +
  онол + core/files, M4 шалгалт, M5 QR + ном, M7 эцэг эх + мэдэгдэл + төлбөр, M8 багш.

### 2026-11-01 — M0.1–M0.3 (cloud session)

- **M0.1** Flutter stable суулгав (сүлжээ нээлттэй, pub.dev ажиллана).
- **M0.2** `flutter create` (android, ios). Bundle ID `mn.piemath.app` (Android namespace/applicationId, iOS) —
  эзэн батлах хүртэл санал (хүснэгт #1). `analysis_options.yaml`: strict-casts/raw-types/inference + нэмэлт lint.
  Сангууд: riverpod 3, go_router 18, dio 5, freezed 3/4, json_serializable, flutter_secure_storage, flutter_math_fork,
  lucide_icons_flutter, shared_preferences, connectivity_plus, intl. Фонт: вэбийн woff2 → TTF
  (`tool/build_fonts.py`, Onest 400/500/600/700 ~82KB тус бүр, Unbounded 600 ~81KB, OFL лиценз `assets/fonts/`).
  Unbounded-д Ө/Ү глиф байхгүй → `fontFamilyFallback: [Onest]`.
- **M0.3** Дизайны систем `lib/core/ui/` (`ui.dart` нэг импорт): `AppColors` ThemeExtension (цагаан/хар, логоны
  `#273F74`-оос, шар/алтан үгүй), `AppSpace/AppRadius/AppMotion/AppSizes`, `AppTheme.light()/dark()`,
  `AppIcons` (Lucide wrapper), `AppStrings`, `AppCard` (өнгө зөвхөн зүүн зурвас), `SectionHeader`, `PageHeader`,
  `InfoHint`, `Dot`/`Meta`/`MetaTitle`, `SkeletonPulse/Line/Rows/Card`, `LoadingState`, `ErrorState`, `EmptyState`,
  `ConnectionBanner`, `BrandLogo`/`BrandMark`.
- Тест (61): эзний дүрэм (`no_russian_test`, emoji/глиф, «Pimath», өнгийг шууд бичихгүй), WCAG контраст бүх
  токенд, widget (Meta, төлөв, тууз, хүрэх талбай 44+, Material a11y guideline), golden (дизайны систем, төлөв ×
  2 горим, `@Tags(['golden'])`).
- Мэдэгдэж буй: `lucide_icons_flutter` нь 6 variable фонт (~3MB) багцалдаг, tree-shake хийгдэхгүй байж магадгүй —
  M10-д APK хэмжээг хэмжиж, шаардвал хэрэглэсэн глифээс өөрийн фонт үүсгэ (`AppIcons` л солигдоно).
- **Дараагийн алхам:** M0.4 — `lib/core/time/` (UB цаг, гараг 1–7 ↔ JS 0–6), `lib/core/config/env.dart`,
  `lib/core/network/` (dio, AuthInterceptor, RetryInterceptor, `ApiError` монгол мессеж), `lib/core/auth/`
  (`TokenStore`, `Session`).

### 2026-11-01 — төлөвлөлт (локал session «Flutter»)

- `piemath_app/` баримтууд: README, RULES, ARCHITECTURE, PLAN, PARITY, EXAM-INTEGRITY, PERFORMANCE, SECURITY, background/.
- API-д номын QR S1 (`api/src/scan/`, `GET /scan/:code`) — 2442/2442 тест ногоон. Апп M5-д ашиглана.
- **Дараагийн алхам:** PLAN.md M0.1 — Flutter суулгаж, M0.2 — `flutter create` энэ хавтас дотор.
