# Хэрхэн хийсэн, хэрхэн үргэлжлүүлэх (2026-11-01 cloud session-ий хүлээлгэн өгөх баримт)

Энэ баримт нь өмнөх session ажлыг ЯАЖ зохион байгуулсан, кодын конвенц, тестийн арга, урхи, дараагийн agent-д
өгөх заавар (prompt)-ын загварыг агуулна. Унших дараалал: `../PROGRESS.md` → `RULES.md` → ЭНЭ файл →
`api-contract/00-overview.md` → тухайн feature-ийн гэрээ.

---

## 1. Орчин бэлдэх (cloud, Linux)

```bash
git fetch origin piemath-app && git checkout piemath-app
git clone --depth 1 -b stable https://github.com/flutter/flutter.git ~/flutter   # 3.47.9 дээр хийсэн
export PATH=~/flutter/bin:$PATH
cd piemath_app && flutter pub get
flutter analyze && flutter test          # 0 асуудал, бүгд ногоон байх ёстой
```

- **Android SDK татагдахгүй** (agent proxy `dl.google.com`-ийг хаадаг) → APK-г GitHub CI
  (`.github/workflows/piemath-app.yml`) дээр барина. Kotlin кодыг kotlinc + Maven Central-ийн android jar-аар
  compile хийж шалгаж болно (платформын agent ингэж шалгасан).
- **iOS build боломжгүй** → Swift-ийг бичээд «Mac дээр шалгах» жагсаалтад (PROGRESS.md) нэм.
- Фонт дахин үүсгэх: `pip install fonttools brotli && python3 tool/build_fonts.py ../web/public/fonts assets/fonts`.
- freezed/json код: `dart run build_runner build --delete-conflicting-outputs` (≈1 мин). Үүсгэсэн `*.g.dart`,
  `*.freezed.dart`-ыг **commit хийнэ** (analyze build_runner-гүй ажиллахын тулд).
- LaTeX аудит (удаан, санаатайгаар `test/`-ээс гадуур): `flutter test tool/latex_audit/latex_audit_test.dart`.

## 2. Ажлын арга — зэрэгцээ agent (эзний хүсэлт)

Эзэн «хүндрэлд нь тохирсон agent зэрэг ажиллуулж, бүгд эвтэйхэн ажиллах» гэж хүссэн. Ингэж хийсэн:

1. **Суурийг эхлээд үндсэн session өөрөө** (M0: дизайны систем, сүлжээ, нэвтрэлт, router/shell). Feature-ууд
   үүн дээр тулгуурладаг тул нэг гараас гарах ёстой.
2. **Судалгааг тусад нь:** API гэрээг 2 agent кодоос уншиж `docs/api-contract/`-д бичсэн. Дэлгэцийн agent-ууд
   API-г дахин уншихгүй, таамаглахгүй.
3. **Feature бүр нэг agent, тусдаа git worktree** (`isolation: worktree`, fork төрөл — бүх контекстыг өвлөнө).
   Эзэмшлийг хавтсаар хатуу хуваасан:
   - agent ЗӨВХӨН `lib/features/<x>/**`, `test/features/<x>/**`, `test/goldens/<x>_*`-ийг засна
   - маршрут ЗӨВХӨН `lib/features/<x>/<x>_routes.dart`-д (`FeatureRoutes(public/shell/fullscreen)`) —
     төв router (`lib/app/router.dart`) бүгдийг аль хэдийн импортолсон, тиймээс зөрчил гарахгүй
   - `pubspec.yaml`-д зөвхөн мөр НЭМЭХ (цагаан толгойн дарааллаар)
   - нийтлэг файл (`lib/app/**`, `lib/core/**`, `PROGRESS.md`, `PARITY.md`, одоо байгаа `test/helpers/*`) —
     зөвхөн үндсэн session; agent хүсэлтээ тайландаа бичнэ
   - шинэ дүрс → feature доторх `*_icons.dart` (дараа нь `AppIcons` руу нэгтгэнэ)
   - олон feature-д хэрэгтэй widget → `lib/shared/<нэр>/` нэг agent-д оноосон (marks, payment_status)
4. **Worktree хуучин `main`-аас үүсдэг** → agent эхлээд `git reset --hard <piemath-app HEAD>`.
5. Agent push хийхгүй: commit → тайлан. Үндсэн session `git merge <branch>` → `flutter pub get` →
   analyze + test → push → PROGRESS/PARITY шинэчилнэ.
6. Кредит дуусах үед: agent бүрт «одоо байгаагаа ногоон болгоод commit» гэж мессеж илгээж, ирснийг нэгтгэнэ.

### Agent-д өгөх заавар (prompt)-ын загвар

```
You are a FORK building <milestone/feature> of the Piemath Flutter app, in parallel with other agents.
## Setup and coordination (strict)
- FIRST `git reset --hard <piemath-app HEAD>`. App is ./piemath_app. Never touch the main checkout.
- export PATH=~/flutter/bin:$PATH; cd piemath_app; flutter pub get
- You OWN: lib/features/<x>/**, test/features/<x>/**, test/goldens/<x>_*. Routes ONLY in <x>_routes.dart.
  May ADD pubspec deps. Do NOT edit lib/app/**, lib/core/**, PROGRESS.md, PARITY.md, existing test/helpers.
- Read FIRST: docs/api-contract/00-overview.md + <гэрээ>.md, then web/src/app/app/<x>/** for wording/flow.
- Rules: Mongolian only (no Russian), no emoji/glyphs, tokens via context.colors, MathText for math,
  skeleton/empty/error+retry, weekday via core/time/weekday.dart, dates via UbDateTime/DateMn.
- Finish: flutter analyze 0 + full flutter test green; git commit (Mongolian + attribution). Do NOT push.
## Task ...
## Final report: branch + commit; files; tests; PARITY rows; shared-file requests; Mac/device checks.
```

## 3. Кодын бүтэц ба конвенц

```
lib/
  main.dart → app/bootstrap.dart      ProviderContainer(retry: null), session.restore()
  app/        app.dart (MaterialApp.router, mn locale, офлайн тууз), router.dart, redirect.dart (цэвэр функц),
              feature_routes.dart, nav/nav_data.dart (= вэбийн nav-data.ts), shell/ (AppShell, MoreScreen,
              PendingScreen, SplashScreen, AppBackButton), theme_mode.dart
  core/
    ui/       ui.dart-аар нэг импорт: AppColors (ThemeExtension), AppTheme, AppSpace/Radius/Motion/Sizes,
              AppIcons (Lucide wrapper), AppStrings, AppCard, SectionHeader, PageHeader, InfoHint,
              Dot/Meta/MetaTitle, Skeleton*, LoadingState, ErrorState, EmptyState, ConnectionBanner, BrandMark
    network/  ApiClient (get/post/patch/put/delete, parse:), ApiError (kind + монгол message),
              network_providers.dart (apiClientProvider, reachabilityProvider, httpClientAdapterProvider)
    auth/     SessionController (sessionProvider: SessionRestoring/SignedOut/SignedIn), TokenStore,
              TokenHolder, CurrentUser (freezed), UserRole
    time/     UbDateTime (UTC+8), weekday.dart (mnWeekdayFromJs/jsWeekdayFromMn), date_mn.dart (DateMn)
    format/   person_name.dart (shortName, staffName «+», rosterNames)
    math/     math.dart: MathText, ChoiceGrid, ProblemFigure, tex_normalize
    files/    fileImageProvider (`ref.watch(fileImageProvider).image(key)`) — гарын үсэг ӨӨРЧЛӨХГҮЙ
    integrity/ ExamGuard, MethodChannelExamGuard, LeaveTracker, LifecycleEventMapper
  features/<x>/{data,domain,ui}/ + <x>_routes.dart
  shared/<нэр>/   олон feature-ийн нийтлэг widget
```

- **Дэлгэц бичих жишээ:** `features/auth/` (M1), `features/scan/`, `features/books/` (M5) — repository
  (`apiClientProvider` ашиглана) → Riverpod provider → ConsumerWidget, төлөв бүрт Loading/Error/Empty.
- **Алдаа:** `ApiError.message` нь үргэлж хэрэглэгчид харуулж болох монгол бичвэр. 403 ихэнхдээ хэвийн
  («эрхгүй/нээгдээгүй») — тайлбар харуул, эвдрэл гэж бүү харуул.
- **Retry:** ApiClient зөвхөн GET-ийг (эсвэл `retry: true`) нэг удаа давтана. Илгээх (submit) хэзээ ч давтагдахгүй.
- **Буцах:** гүн рүү `context.push`, таб солих `context.go`; deep link-ээр нээгдэх дэлгэцэд `AppBackButton`.
- **Хийгдээгүй зам** `/app/...` → shell автоматаар PendingScreen («удахгүй» + вэбээр нээх). Функц хасахгүй.

## 4. Тест

- Mock API: `test/helpers/fake_http.dart` (`FakeHttp..json('GET','/path', body)`, `.error(...)`,
  `FakeResponse.network()/timeout()`), `test/helpers/test_container.dart` (`testOverrides`, `testContainer`,
  `fakeMe`). Жинхэнэ сервер, прод сан руу ХЭЗЭЭ Ч холбогдохгүй, зохиомол нэр/утас.
- **Урхи:** `testWidgets` дотор HTTP-тэй future-ийг шууд `await` хийвэл FakeAsync-д гацна (pumpAndSettle
  10 минут хүлээнэ). Widget мод дотор ачаалж `pump()` хий, эсвэл `tester.runAsync(() => ...)`.
- Бүтэн апп-ын тест: `test/app/app_shell_test.dart` (`pumpApp`), `test/features/auth/auth_test_helpers.dart`.
- Golden: `@Tags(['golden'])`, `setUpAll(loadAppFonts)`, `pumpThemed(..., dark:)`, зурагтай бол
  `precacheImages(tester)`. Linux дээр үүсгэсэн — Mac дээр `flutter test -x golden`. Шинэчлэх:
  `flutter test --update-goldens <файл>` → PNG-г Read хэрэгслээр нүдээр шалга.
- Эзний дүрмийн автомат тест (ҮРГЭЛЖ ногоон байх): `test/no_russian_test.dart` (lib/-д орос үг),
  `test/content_rules_test.dart` (emoji/глиф, «Pimath», `Color(0x..)`/`Colors.x` зөвхөн tokens.dart-д),
  `test/core/ui/tokens_test.dart` (WCAG контраст, шар/алтан үгүй).

## 5. Цаг иддэг урхи (бодит тохиолдлоос)

1. Хуваарийн API-ийн `weekday` бүгд JS (0=Ням) — зөвхөн `core/time/weekday.dart`-аар хөрвүүл.
2. `"YYYY-MM-DD"` ба `…T00:00:00.000Z` — сүүлийнхийн эхний 10 тэмдэгт; цагийн бүс бүү хөрвүүл (`parseDateKey`).
3. `/files/:key` S3 дээр 302 → presigned URL — Authorization толгойг S3 руу бүү дамжуул.
4. `StudentProfile.type` = `CLASSROOM | ONLINE` (`Classroom.type` = `IN_PERSON | ONLINE`).
5. Нууц үг сольсны дараа сервер шинэ токен өгнө → `SessionController.replaceToken`.
6. Шалгалт: вэб `heartbeat`-ийг дууддаггүй, PATCH session-ээр keepalive; A/B хувилбарын hash вэбтэй яг ижил;
   хугацаа дууссан шалгалтыг сервер зөвхөн дараагийн дуудлагаар илгээдэг; event зөвхөн LEAVE/RETURN/FULLSCREEN_EXIT.
7. `/schedule/days` цуцалсан/зөөсөн хичээлийг тооцдоггүй → өнөөдрийн хичээл `/attendance/board`.
8. Inline томьёог `IntrinsicWidth/Height` дотор бүү хий (flutter_math_fork assert).
9. Unbounded фонтод Ө/Ү байхгүй → theme-д Onest fallback тохируулсан.
10. Riverpod 3 өөрөө алдаатай provider-ийг давтдаг → bootstrap/тестэд `retry: (_, _) => null`.
11. `ApiClient` dio-гийн timeout-ыг хүсэлт бүрт (`Options`) өгнө — глобал `dio.options` бүү өөрчил (зэрэг хүсэлт).
12. Вэб CI (`web — typecheck, build`, `e2e`) `pi-mn-v2-test` дээр аль хэдийн улаан (вэбийн lint) — апп-аас биш.

## 6. Git

- Ажлын branch: `piemath-app` (суурь прод `4d3b648`). `main`, `pi-mn-v2-test` руу ХЭЗЭЭ Ч push хийхгүй, force push үгүй.
- Ноорог PR #53 (суурь `pi-mn-v2-test`) — зөвхөн CI харах, merge хийхгүй.
- Commit монголоор, төгсгөлд attribution мөрүүд. Дэд алхам бүр: analyze + test → commit → push → PROGRESS.
- `.claude/worktrees/` нь `.git/info/exclude`-д (commit-д орохгүй).
