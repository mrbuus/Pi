# Явц ба хүлээлгэн өгөх тэмдэглэл

**Дараагийн agent эндээс эхэлнэ.** Хамгийн сүүлийн бичлэг ДЭЭД талд. Бичлэг бүрт: огноо, юу хийсэн (commit), шалгалтын үр дүн,
дутуу зүйл, мэдэгдэж буй алдаа, **дараагийн яг алхам** (файл, функцийн нэртэй).

## Одоогийн төлөв

- Milestone: **M0–M8 ✅, M6 (апп+сервер) ✅ Firebase/Google/Apple тохиргоо [Э] хүлээгдэж байна; M10 бэлтгэл ✅ (бүртгэл [Э]); M9 ↗ вэб**
- **Эхлээд унш:** `docs/HOW-TO-CONTINUE.md` — ажлын арга, конвенц, тест, урхи, agent-д өгөх загвар
- Branch: `piemath-app` (суурь: прод `4d3b648` + номын QR S1)
- Flutter 3.47.9 stable / Dart 3.13.7 (cloud: `~/flutter`; эзний Mac: `export PATH=~/Development/flutter-3.47/bin:$PATH` — хуучин 3.35 тусдаа)
- Шалгалт: `flutter analyze` 0, `flutter test -x golden` 1221/1221 (Mac), API 2554/2554, iOS debug build (Mac + CI) ✅, Android release/AAB ✅. Golden-ыг Mac дээр бүү үүсгэ —
  `gh workflow run "Piemath апп" --ref piemath-app -f update_goldens=true` → `gh run download <id> -n goldens -D test/goldens`
- Ноорог PR (зөвхөн CI, merge хийхгүй): https://github.com/mrbuus/Pi/pull/53

## 2026-11-14 — давалгаа 6: вэбийн 11-08…11-12-ны сайжруулалтыг апп-д

Таван Opus агент (A самбар, B сурагч, C хуваарь, D төлбөр, E номын мөнгө/нэгдсэн шалгалт) + нэгтгэгч. Хуваарилалт,
дүрэм: `docs/W6-BRIEF.md`. Нийлсэн: `a6226974` (piemath-app). `flutter analyze` 0, `flutter test -x golden` 2267/2267.

- Самбар: шалгалтаар даалгавар шалгах (QuizBar, бутархай оноо, өнгө, minQuiz), нөхөлт (өөр ангиас суусан, `/app/teacher/room406`),
  Чек (`/app/classes/:id/checks`, номын чекийн «⋯»), ангийн «Төлбөр» таб (Админ, Багш+), «Анги тараах» хасав.
- Сурагчийн хуудас: «Хичээлийн түүх» хуанли, «Сэдэв хөтөлбөр», «Ном», «Одоо гарвал буцаах дүн», нөхөлтийн түүх.
- Сурагч/эцэг эх: шалгалтын оноо, А хувилбарын хариу нуух, зураг 15/20 хуудас + 5 минут (`PhotoDocumentLimits`), профайл 512px,
  хоёр анги (математик + Нийгэм), «Нэгдсэн шалгалт» таб (`/app/tests?tab=paper`).
- Хуваарь: expectedUpdatedAt/expectedConfirmedAt 409, «Хийчихсэн», тестийн нэр товчлол, танхим «Өдөр»-өөс хасав, өдрийн зураг хуваалцах,
  «Ажилласан цаг» (Ажлын өдөр → «Хүснэгт | Ажилласан цаг»).
- Төлбөр: банкны хуулга шинэ API-аар дахин бичигдсэн (хуучин `/reconcile/transactions` серверээс устсан байсан), хугацаа сунгах, tuitionAgreed.
- Шинэ: `lib/features/book_money` (`/app/book-money`), `lib/features/paper_exams` (`/app/paper-exams`, Excel импорт).
- Нэг эх сурвалж: онооны хил `lib/shared/quiz_score`, зургийн хязгаар `lib/core/files/photo_document.dart`.

Дутуу / мэдэгдэж буй: нэгдсэн шалгалтын түлхүүр, агуулга засах (вэбээр); вэбийн шинэ `/tuition/withdrawal` урсгал апп-д үгүй;
эрхийн матрицын «Цаг бөглөх»; ажилтан нэг сурагчийн нэгдсэн шалгалтыг харах API байхгүй (`GET /paper-exams/students/:id` санал);
апп-д ерөнхий эрхийн маршрут хамгаалалт үгүй (серверийн 403 алдааны дэлгэцээр). Вэбийн алдаа (засаагүй): Багш+ багц засахад
tuitionAgreed null болж Админы хөнгөлөлт арилна.

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
| 7 | Санхүүгийн эрхтэй Багш+ төлбөрийн хуудсанд дүн харах уу? | — | **Тийм** (эзэн 2026-11-03): зөвхөн самбар/ledger дээр дүнгүй |

## Бичлэгүүд

### 2026-11-10 — давалгаа 3–5 (локал session «Flutter», 10 agent)

- Нийлсэн: санхүү/тулгалт, тасалбар, SMS, элсэлт (w3); хурд+офлайн кэш (`lib/core/cache`, docs/PERF-OFFLINE.md),
  вэб рүү гаргахгүй (бүртгэл, нөхцөл/нууцлал, түвшин тогтоох, сорил, тусламж натив; `test/no_web_exit_test.dart`),
  сурагч/эцэг эхийн дутуу функц, ажилтан/админы контент, дэлгүүр, ноорог, хяналт (w4); iOS зүүн захаас шудрах =
  буцах бүх хуудсанд (go_router NoTransitionPage-ийн шалтгааныг зассан), хуваарийн hub зөвхөн Хуваарь/Төлөвлөгч,
  дизайны нэгдсэн шинэчлэл + 4 нүүр (w5); серверийн зөөлөн устгал 2 (9 модель); флэш картад \lim томьёо орохгүй.
- Шалгалт: analyze 0, `flutter test -x golden` 2070/2070, API jest 2749/2749. Прод deploy ХИЙГЭЭГҮЙ (сервер өөрчлөлт: зөөлөн
  устгал 2-ын миграци, давтлагын \lim шүүлт — ачааллын тест + эзний зөвшөөрөл).
- Үлдсэн: /app/admin/content, capabilities (эзний шийдвэр), insights (problemToken), formulas print/widgets, solid
  хэрэгслийн нэмэлт, хатуу устгалтай endpoint-ууд (expenses, passes, pass grant, mock-exams, draft blocks) → зөөлөн
  болгох; my_class SectionCard → TitledCard; problem_figure, tools_back-д шудрах буцах. Дэлгэрэнгүй: docs/W4-RESUME.md.

### 2026-11-04 — гөлгөр навигаци, хэсгийн дэд табууд (agent, `app/nav-smooth`)

- Доод таб = `StatefulShellRoute` салбар (role бүрт `RoutingConfig`-оор): таб бүр өөрийн stack, гүйлгэлт, өгөгдлөө
  хадгална, анх ороход л зурагдана. Солих: 200ms fade-through (`BranchStack`), гулсдаг pill (`AppNavBar`), haptic.
  Идэвхтэй табыг дахин товшвол эхэнд буцна / дээш гүйлгэнэ. Андройдын «буцах» табын эхэнд → нүүр таб.
- Хэсэг бүрийн дээд дэд таб (`NavData.sections`, `SectionScreen`): хуруугаар гулгах, deep link, сүүлийн табыг санах.
  «Бусад»-д хэсэгт ороогүй цэс + хувийн л үлдэнэ. Хөдөлгөөн багасгах, сул төхөөрөмжид шууд.
- Тест: `test/app/app_shell_test.dart`, `shell_widgets_test.dart`, `nav_data_test.dart`.

### 2026-11-03 (орой) — үргэлжлүүлж дуусгав, 10 agent нийлэв

- **Өнөөдрийн вэб → апп:** багшийн «Код» таб, «Ангийн түүх», профайл засах эрх, «Эх PDF» (самбар + номын бүлэг); томьёоны
  энгийн өнгөт тайлбар, хойшлуулсан ачаалалт; график + бодогч (вэбийн тоон шулууны үйлдэлтэй ИЖИЛ); геометрийн нэмэлт
  (таслагдсан конус/пирамид, дэлгэмэл, огтлол, медиан/өндөр/биссектрис/тойрог).
- **Аудитын засвар (PARITY-AUDIT топ 15):** үнийг кодоос хасав — зөвхөн серверээс; **Багш+ зөвхөн төлөв, мөнгөн дүнг зөвхөн
  Админ** (сервер буцаасан ч); A/B хувилбар вэбтэй байт ижил (25 golden vector); дүн/эрэмбэ эх сурвалж нэгтгэв; багшийн
  «Ангиуд» `/class-dashboard`; самбарын нэмэлт, хүлээгдэж буй зөвшөөрөл, мэдэгдэл бичих; идэвх, бодлогын видео, томьёо SRS,
  профайл зураг, ICS, худалдан авагчийн нүүр. Үлдсэн: #1 сурагчийн 6 цэс «Тун удахгүй» [Э].
- **Гөлгөр байдал:** PerfTier, spring хөдөлгөөн, theme-ийн хуудасны шилжилт, skeleton, FileImageView, edge-to-edge,
  Lucide subset фонт (159 глиф, 60KB; шинэ дүрс → `python3 tool/icon_font/build_icon_font.py`), perf integration тест.
  arm64 release 26.6MB (native ~23MB тул <25MB-д хүрээгүй).
- **Backend:** submit 319→24 query, давхар submit хаав, ирц 71→40, кэш, Postgres унтарвал 503 (`docs/BACKEND-PERF.md`).
- **Дэлгүүр:** `PrivacyInfo.xcprivacy`, Apple sign-in entitlement, encryption flag, SDK 36, 16KB, зөвшөөрөл цэвэрлэв,
  Firebase хувилбар бууруулж iOS build засав; `docs/COMPLIANCE.md`. Үндсэн session: худалдан авалт руу хөтлөх бүх холбоос
  хасав (Apple 3.1.1), iOS-д Google зөвхөн Apple-тэй (4.8), sheet-д useSafeArea, ₮ тэмдэгтэд `PiemathSymbols` фонт.
- **Нэвтрэх hero:** `assets/login_hero/hero.mp4` + `poster.webp` хийхэд ажиллана (`docs/LOGIN-HERO.md`).
- **[Э] хүлээгдэж буй:** сурагчийн 6 цэс; Firebase, Google client ID, `GoogleSignIn.xcconfig`; Apple/Play бүртгэл, D-U-N-S,
  privacy/deletion URL, demo бүртгэл; bundle ID; багшийн тэмдэглэл, зорилгын серверийн hard delete.
- **Дараагийн алхам:** прод deploy (API миграци `20261101120000_problem_scan_code`, `20261102120000_mobile_app_support`;
  backend засвар; `pg_dump` эхлээд; 18–24 цагт биш), вэб `web/tools-input` deploy, дэлгүүрт TestFlight / Play internal.

### 2026-11-03 — ЗОГСООСОН (эзний хүсэлтээр), дараа үргэлжлүүлнэ

Нийлсэн (`piemath-app`, push хийгээгүй): прод `pi-mn-v2-test`-ийн 8 commit, нэвтрэх hero слот (`docs/LOGIN-HERO.md`),
томьёоны энгийн тайлбар + хойшлуулсан ачаалалт, `docs/PARITY-AUDIT.md` (топ 15 засвар). Тест 942/942.
Дутуу WIP (тест бүрэн шалгаагүй, нийлүүлээгүй) — worktree `~/Intern/piemath-wt/<нэр>`:
`app/smooth` 9d5d802 (хөдөлгөөн, шилжилт, PerfTier, Lucide subset, perf тест), `app/t-today` 808a27a (Код таб, ангийн түүх,
профайл засах, эх PDF), `app/geo-extra` 04f078e (дэлгэмэл, огтлол), `app/store2` 6f7baaa (PrivacyInfo, COMPLIANCE.md),
`app/backend` bc90a74 (TTL кэш, гүйцэтгэл), `app/graph` be1a1a6 (бодогч). Эхлээгүй: аудитын #2 (үнийг серверээс), #3 (A/B),
#4/7/8/12 (багш), #6/11/13/14/15. Эзний шийдвэр: сурагчийн 6 цэс «Тун удахгүй» вэбтэй ижил хаах уу.
Mac: Xcode лиценз зөвшөөрөөгүй → тест `xcrun` shim-тэй (`DEVELOPER_DIR=/Library/Developer/CommandLineTools`); эзэн
`sudo xcodebuild -license accept` ажиллуулна. Вэб `/tools` засвар: branch `web/tools-input` (push хийсэн, deploy хүлээгдэж байна).

### 2026-11-02 (2-р ээлж) — локал session, 9 agent

- **M8 үлдэгдэл** (`461c9f0`): «Бие даасан явц» таб, хичээлийн тэмдэглэл, тарах цаг, эрсдэлийн шалгуур (Багш+), presence.
  Багшийн тэмдэглэл устгах нь серверт HARD delete — эзний зөөлөн устгалын дүрэмтэй зөрнө [Э].
- **Суралцах** (`95962b9`): зорилго (устгалгүй — сервер hard delete), бэлэн байдал, идэвх, бүлгийн бодлого. «Төлөвлөгч» нь
  ажилтны самбар тул апп-д хийгээгүй. Апп `VIDEO_COMPLETED` илгээдэггүй.
- **M6 апп** (`8e394ee`): push (`--dart-define`-гүй бол унтраастай), Google/Apple товч, холбох/салгах, бүртгэл устгах хүсэлт;
  шалгалтын үед push дуугүй. **[Э]** Firebase төсөл, Google client ID, Xcode-д Sign in with Apple / Push capability, APNs key.
- **M6 сервер** (`379c10f`): `notify(push:)` — даалгавар дүгнэгдсэн (сурагч), тасалсан (эцэг эх); 21:00–08:00 сурагчид push үгүй.
- **M10** (`ab891d2`): апп дүрс, splash (цагаан/хар), `docs/STORE.md`. arm64 release 26.5MB (Lucide ~1.4MB — нэг subset фонт
  болговол ~1.3MB хэмнэнэ). **[Э]** Apple/Play байгууллагын бүртгэл, D-U-N-S, privacy URL, signing key, bundle ID.
- **Геометрийн хэрэгсэл** (`b525e45`, эзэн «маш чухал»): тусгай гар (`lib/shared/math_keyboard/`, системийн гар нээгдэхгүй),
  хавтгайн 9 загвар, чөлөөт байгуулалт (Цэг/Шулуун/Сонгох, хаахад шинэ дүрс, буцаах/давтах), 7 биет (далд ирмэг тасархай).
  Гулсуулагч БАЙХГҮЙ. Үлдсэн: таслагдсан конус/пирамид, дэлгэмэл, огтлол, медиан/багтсан тойрог.
- **Бодолт** (`8fe9ec2`): `lib/shared/solution/SolutionView` — алхам алхмаар, «Бүгдийг харах», урт алхам «Дэлгэрэнгүй», хайлт, томьёо.
- **Бүрэн бүтэн байдал** (`bda57fc`): багшид «Гарсан/Скриншот/Бичлэг» тоо (апп `/app/teacher/tests/:id/results` + вэб ResultsTable).
- **Дүрс** (`5c15574`): 13 feature-ийн дүрсийн файл → `AppIcons` (глиф өөрчлөгдөөгүй).
- **Үндсэн session:** API аюулгүй байдал (`c0c9f1d`), «Бусад» табын мэдэгдлийн тэмдэг, гарахад ноорог устгах, мэдэгдлийн
  асуулгыг тестэд унтраах, хэрэгслийн урт томьёо гүйлгэх, iOS CI build ✅.
- **Дараагийн алхам:** (1) [Э] шийдвэрүүд (Firebase, бүртгэл, bundle ID); (2) Lucide subset фонт (хэмжээ); (3) вэбийн
  `/tools`-д гулсуулагчийн оронд гараар оруулах (апп-ын `expr`/geometry логикийг ашиглана); (4) прод deploy (API миграци 2:
  `20261101120000_problem_scan_code`, `20261102120000_mobile_app_support` — `pg_dump`-ийн дараа, 18–24 цагт биш).

### 2026-11-02 — локал session (эзний Mac), 5 зэрэгцээ agent

Cloud кредит дууссан тул эзний Mac дээр үргэлжлүүлэв. Agent бүр тусдаа worktree (`~/Intern/piemath-wt/<нэр>`, branch `app/<нэр>`),
үндсэн session нэгтгэж шалгасан.

- **M8 багш** (`660f423`): өнөөдрийн хичээл, самбар (ирц шууд хадгалж бүтэлгүйтвэл буцаана, Хийсэн/Дутуу/Хийгээгүй, ⋯ тэмдэглэл,
  «Бүгд ирсэн/хийсэн» доор), ангиуд, онлайн даалгавар шалгах, сурагчийн хуудас (төлбөр зөвхөн «хэдий хүртэл»), тэмдэглэл, цаг.
  Үлдсэн: «Бие даасан явц» таб, хичээлийн тэмдэглэл, тарах цаг, эрсдэлийн шалгуур засах, presence.
- **Суралцах** (`b15002a`): алдааны дэвтэр, давтлага (review, history), дадлага, томьёо, бүлэг/номын сан/видео (nocookie, дарсны дараа).
  Үлдсэн: зорилго, бэлэн байдал, төлөвлөгч, learning-lab, номын сангийн бодлого үзэгч. Гэрээний залруулга: `learning.md`-д тэмдэглэх.
- **Сурагч M3** (`2a12552`): бүх дэлгэцийн widget тест, нөхөх зураг илгээх, шинэ `NotebookComposerScreen` (2/6, тайрах, бүдэг
  зөвлөмж, дахин авах, эрэмбэлэх, «PDF» үг үгүй), даалгаврын жилийн түүх. Бүдэг зургийн босго (45) утсан дээр шалгах.
- **Шалгалт/эцэг эх** (`ea59e57`): нууж болох таймер (5 мин-д буцна), «Дараа харах», илгээхийн өмнөх тойм, дүнгийн байр (сонголтоор),
  `clearExamDrafts`, эцэг эхийн жилийн түүх, санал хүсэлтэд зураг, төлбөр мөр бүр хуулах; дэлгэц уншигчийн 3 алдаа засав.
- **API** (`ade1aca` + аюулгүй байдлын засвар `c0c9f1d`): шалгалтын SCREENSHOT/RECORDING үйл явдал (+ дүнд тоо), `POST/DELETE /devices`
  (FCM env байхгүй бол no-op), `POST /auth/google/native`, `POST /auth/apple` (nonce заавал, токен нэг удаа, имэйлээр автомат
  холболтгүй), бүртгэл устгах ХҮСЭЛТ (`/me/deletion-request`, админ). Миграци `20261102120000_mobile_app_support` (3 шинэ хүснэгт).
  Env: `GOOGLE_NATIVE_CLIENT_IDS`, `APPLE_CLIENT_IDS`, `FCM_*`. Прод-д гаргаагүй.
- **Үндсэн session:** UX токен (брэнд рүү хазайсан саарал, 48dp, iOS Reduce Motion), CI golden шинэчлэх гар ажиллагаа,
  `signOutCleanupsProvider` (гарахад шалгалтын ноорог устгана), төлбөрийн картын 403 тайлбар, цэс.
- **Дараагийн алхам:** (1) апп-д push (`firebase_messaging`, `POST /devices`) — Firebase [Э]; (2) Google/Apple native товч;
  (3) M8 үлдсэн табууд; (4) «Нэгтгэх ажил» (feature-local дүрс → `AppIcons`, мэдэгдлийн badge); (5) M10 дэлгүүрт бэлдэх;
  (6) iOS build — Xcode суулгах эсвэл CI-ийн `ios` (workflow_dispatch).

### 2026-11-01 — ЭЦСИЙН ТАЙЛАН (cloud session, кредит дуусав)

**Бүгд нэгтгэгдэж push хийгдсэн** (`piemath-app` `51bec33`): тест 542/542, analyze 0. Ноорог PR #53 (суурь
`pi-mn-v2-test`, merge хийхгүй); `web`/`e2e` CI улаан нь `pi-mn-v2-test` дээр ч улаан (вэбийн lint) — апп-аас биш.
Апп-ын CI (Android debug build) push бүрт concurrency-оор цуцлагдсан — сүүлийн run-ийн үр дүнг шалга.

| Хэсэг | Төлөв | Юу ажилладаг | Дутуу (дараагийн яг алхам) |
|---|---|---|---|
| M0 суурь | ✅ | дизайн, сүлжээ, нэвтрэлтийн төлөв, router/shell, CI, Android хамгаалалт | Lucide variable фонт ~1.4MB (M10) |
| M1 нэвтрэлт | ✅ | `/login`, `/forgot-password`, `/app/profile`, `/app/password`, `/app/consent` | профайлын зураг солих (`FileUploader` бэлэн болсон) |
| M2 томьёо | ✅ | MathText, ChoiceGrid, ProblemFigure, аудит 100% | сангийн 5 эвдэрсэн томьёо (LATEX-AUDIT.md) |
| M3 сурагч | ◐ | `/app/student`, `/app/my-class` (5 таб, өдөр, ангийн тест), `/app/makeup`, `/app/schedule` (`/schedule/week`), `lib/shared/marks/` | widget тест: my-class табууд, өдөр, тест, хуваарь (`test/features/student_fixtures.dart`, `student_harness.dart`); golden `student_*`; нөхөх зураг илгээх `/app/makeup/photos/:c/:d` (одоо түр дэлгэц) → `POST /makeup/me/:c/:d/photos` |
| M3 даалгавар/онол | ◐ | `lib/core/files/` (S3 redirect, кэш, `FileUploader`, зураг → баримт), `/app/homework` (2 загвар), `/app/homework/:testId`, `/app/theory` | widget тест + golden (`test/features/homework/hw_fixtures.dart`, override: todayKeyProvider, isOnlineStudentProvider, fileCacheDirectoryProvider, photoSourceProvider, jpegCompressorProvider, documentRendererProvider); crop алхам; `homework-marks/my` жилийн түүх |
| M4 шалгалт | ◐ | `/app/tests`, intro, өгөх (бүх хариултын төрөл, autosave вэбтэй ижил, офлайн draft, таймер, гарах анхааруулга, хамгаалалт), дүн, эргэн харалт, 1000 | golden `exam_*`; дүнгийн хуудасны widget тест; `/test-rankings/:id`; **гарах үед `exam_draft:` SharedPreferences түлхүүрүүдийг устгах** (SECURITY §3 — `SessionController.signOut`-д hook) |
| M5 QR/ном | ✅ | `/app/scan`, `/app/scan/:code`, `/books`, үнэгүй тест, `/sorils`, `/placement` (мэдээлэл) | iOS Universal Links (Mac), вэбд `.well-known` файлууд [Э] |
| M7 эцэг эх | ◐ | `/app/parent`, `/app/parent/weekly`, `/app/notifications` (+settings), `/app/student/payments`, `/app/support`, `/app/feedback`, `lib/shared/payment_status/` | жилийн түүх (`ParentRepository.history()` + дэлгэц); санал хүсэлтэд хавсралт (`FileUploader`) |
| M8 багш | — (загвар) | `lib/features/teacher/data/teacher_models.dart` (бүх endpoint-ийн freezed загвар) | `data/teacher_repository.dart` → `domain/board_logic.dart` (вэбийн `useBoard.ts`) → `application/board_controller.dart` → дэлгэцүүд → `teacher_routes.dart` (дэлгэрэнгүй жагсаалт agent-ийн тайланд: board, ангиуд, сурагчийн 4 таб, тэмдэглэл, цаг, тарах цаг, онлайн даалгавар шалгах) |
| M6, M9, M10 | — | | push/Google/Apple [A][Э], таблет/админ (ихэнх ↗), дэлгүүр |

**Нэгтгэх ажил (нийтлэг файл, үндсэн session):**
1. Feature доторх түр тэмдгүүдийг `lib/shared/marks/`-ээр солих: `features/parent/ui/mark_chip.dart`,
   `features/homework/ui/homework_badges.dart` (HomeworkMarkBadge, StatusPill).
2. Feature-local дүрсийг (`ScanIcons`, `BooksIcons`, `FileIcons`, `HomeworkIcons`, `MyClassIcons`, `parent_icons`,
   `notifications_icons`, `support_icons`, `payment_icons`, `exam_icons`) `AppIcons` руу.
3. Мэдэгдлийн badge: `unreadNotificationsCountProvider` (features/notifications) → AppShell / «Бусад».
4. `ApiError`: 503-ийн монгол серверийн мессежийг ерөнхийд нь харуулах (M1 feature дотор тойрсон).
5. Нэвтрэлтийн widget тестэд `loginPrefsProvider` → `MemoryLoginPrefs` override.

**Эзний шийдвэр/тодруулга (шинэ):** нууц үг сольсны дараах токен 7 хоног; эцэг эх сарын төлбөрийн дэлгэрэнгүй харах эсэх;
вэб сургалтын төлбөрийг ангиар, сервер 7 хоногийн өдрөөр — зөрж болно; дүнтэй танилцах код хүүхдийн имэйлд очдог
(ихэнх нь имэйлгүй); багшийн тэмдэглэл устгах нь сервер дээр hard delete (зөөлөн устгалын дүрэмтэй зөрчилдөнө);
QR-аар төлбөртэй ном нээхийг апп дотор зарахгүй (Apple IAP) — вэб/төвөөр.

**Дараагийн session-ий яг алхам:** (1) `docs/HOW-TO-CONTINUE.md` унш; (2) M8 багшийг дуусга; (3) M3/M4/M7-ийн
дутуу тест, golden; (4) дээрх «Нэгтгэх ажил»; (5) сүүлийн CI run (Android APK) ногоон эсэх; (6) M6.

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
