# Үе шатны төлөвлөгөө

Дараалал нь **эрсдэлийг эрт шалгах** зарчмаар: хамгийн хэцүү (LaTeX, сул утасны гүйцэтгэл, шалгалтын хамгаалалт)-ыг
эхэнд нь баталгаажуулна. Milestone бүр **дэд алхмуудтай** — алхам бүр дуусахад commit + push + `PROGRESS.md`.

Тэмдэглэгээ: **[A]** = API-д өөрчлөлт, **[Э]** = эзний шийдвэр/үйлдэл хэрэгтэй (хүлээж бүү зогс — stub хийгээд үргэлжлүүл).

---

## M0 — Орчин ба суурь

1. Flutter stable суулгах (cloud-д: `git clone --depth 1 -b stable https://github.com/flutter/flutter.git ~/flutter`,
   PATH, `flutter --version`). Хэрэв сүлжээ хаалттай бол `PROGRESS.md`-д тэмдэглээд Dart кодыг бичсээр, шалгалтыг дараагийн орчинд.
2. `flutter create --org mn.piemath --project-name piemath_app --platforms android,ios .` (энэ хавтас дотор),
   `analysis_options.yaml` — `flutter_lints` + strict (`strict-casts`, `strict-raw-types`).
3. Дизайны систем: токен (`ThemeExtension`), цагаан/хар горим, Onest/Unbounded фонт, Lucide, `Card`, `Meta`/`Dot`,
   `LoadingState` (skeleton), `ErrorState`, `EmptyState`, `ConnectionBanner`. Widget тест + golden.
4. `core/network` (dio + interceptors + ApiError), `core/auth` (TokenStore, Session), `core/time` (UB, гараг — тест заавал).
5. Router + shell: доод таб (утас) / NavigationRail (≥768dp). «Буцах» = өмнөх.
6. CI: `.github/workflows/piemath-app.yml` — `flutter analyze`, `flutter test`, Android debug build (ubuntu).
   iOS build нь macOS runner — эзэн зөвшөөрвөл.

**Шалгуур:** хоосон апп хоёр горимд асна, бүх тест ногоон, CI ногоон.

## M1 — Нэвтрэлт ба профайл

1. Нэвтрэх (утас + нууц үг, «Намайг сана»), алдааны монгол мессеж, нууц үг сэргээх (SMS урсгал — `/auth/forgot-password`).
2. `GET /auth/me` → role-оор shell (сурагч / эцэг эх / багш / Багш+ / админ). Багш+ нэрэнд «+».
3. Зөвшөөрлийн (consent) урсгал — вэбийн `app/consent`-тэй ижил.
4. Профайл, нууц үг солих (үсэг+тоо), гарах.

**Шалгуур:** mock API-тай widget/integration тест: амжилттай, буруу нууц үг, 401, сүлжээгүй.

## M2 — Томьёо (хамгийн том эрсдэл)

1. `MathText` widget: вэбийн `web/src/components/MathText.tsx`-тэй ижил задлал (`$...$`, `$$...$$`, кирилл бичвэр холилдсон).
2. **Бүх бодлогын golden шалгалт:** `tool/latex_audit` — зохиомол биш, репод байгаа контент
   (`../../api/prisma/data/**`, импортын JSON) эсвэл API-ийн нийтийн жишээнээс LaTeX мөрүүдийг уншиж
   `flutter_math_fork`-оор parse/render хийж, бүтэлгүйтсэнийг `docs/LATEX-AUDIT.md`-д жагсаана.
3. Fallback [A]: бүтэлгүйтсэн томьёонд серверт SVG үүсгэх (KaTeX → MathJax SVG эсвэл урьдчилан үүсгэсэн кэш) —
   эсвэл тухайн командуудад `flutter_math_fork`-д custom macro нэмэх. Аль нь бага ажилтайг хэмжиж сонго.
4. `ChoiceGrid` (A–E: 5 эсвэл 3+2, тэнцүү зай), `ProblemFigure` (зураг + 403 тайлбар).

**Шалгуур:** аудитын хувь `docs/LATEX-AUDIT.md`-д, ≥99% натив эсвэл fallback-тай; сул утасны профайлд жагсаалт 60fps.

## M3 — Сурагчийн өдөр тутам

1. Нүүр / Миний анги (`student-hub/overview`, `days`) — өдөр эрт нь ЗҮҮН, хожуу нь БАРУУН.
2. Онол (зураг, хайлт), ангийн тест жагсаалт.
3. Гэрийн даалгавар: камер / зургаас сонгох → шахах → **утсан дээр PDF угсрах** (6 хуудас хүртэл) → илгээх,
   устгаад дахин илгээх, урьдчилан 7 хоног. «PDF» гэдэг үгийг хүүхдэд харуулахгүй.
4. Хуваарь, ирцийн түүх, мэдэгдэл (апп доторх).

**Шалгуур:** вэбийн `/app/my-class` дээр харагдах бүх мэдээлэл апп-д бий (PARITY.md-ийн мөр бүр ✅).

## M4 — Шалгалт өгөх (EXAM-INTEGRITY.md)

1. Эхлүүлэх, бодлого хооронд шилжих, хариу, таймер (серверийн `deadlineAt`), autosave (офлайн дараалал → синк), илгээх.
2. Бүрэн бүтэн байдал: Android `FLAG_SECURE`, iOS дэлгэц бичлэг/скриншот илрүүлэх, апп-аас гарах → анхааруулга +
   серверт үйл явдал [A]. Шалгалтын үед мэдэгдэл (push) нуух.
3. Эргэн харалт: ердийн тест + 1000 бодлого (түвшин, нээгдэх огноо), YouTube бодолт.

**Шалгуур:** офлайн болоод буцаж ирэхэд хариу алдагдахгүй; хугацаа дуусахад сервер илгээнэ; гарах бүр бүртгэгдэнэ.

## M5 — Ном, сорил, түвшин, QR

1. Номын каталог, үнэгүй эхний тест (`/books`), жишиг сорил (`/sorils`), түвшин тогтоох (`/placement`).
2. **QR уншигч** (`mobile_scanner`) + deep link `https://pimath.mn/q/:code` → `GET /scan/:code` (S1 аль хэдийн API-д).
3. Алдааны дэвтэр (mistakes), давтлага (study-review), бие даасан дадлага.

## M6 — Push, нэвтрэлтийн нэмэлт [A] [Э]

1. `DeviceToken` + FCM илгээгч [A]; Firebase төсөл [Э].
2. Google native, Sign in with Apple [A]; Google Cloud / Apple Developer тохиргоо [Э].
3. Бүртгэл устгах хүсэлт [A].

## M7 — Эцэг эх

Хүүхэд сонгох, ирц, даалгавар, дүн, төлбөрийн төлөв (данс хуулах «Хуулах» товч), 7 хоногийн тойм (`app/parent/weekly`).

## M8 — Багш (утсанд тохирох хэсэг)

Өнөөдрийн хичээл, ирц тэмдэглэх («Бүгд ирсэн» доор тусдаа, автомат хадгалалт), даалгавар шалгах (PDF харах, Хийсэн/Дутуу/Хийгээгүй),
тэмдэглэл, ангийн самбар. Багш төлбөрийн нийт дүн харахгүй.

## M9 — Админ / Багш+ (таблет)

Хүнд хуудсууд (импорт, Excel, санхүүгийн тайлан, контент засвар) — таблетын rail layout-д эсвэл «вэбээр нээх» холбоосоор.
PARITY.md-д аль нь натив, аль нь вэб холбоос гэдгийг тэмдэглэ.

## M10 — Дэлгүүрт бэлдэх [Э]

App icon, splash, скриншот, нууцлалын бодлого (`pimath.mn/privacy`), App Privacy / Data safety маягт, хүүхдийн насны ангилал
(«Education», «Kids» биш), `--obfuscate --split-debug-info`, Android App Bundle (ABI split), TestFlight / Play internal testing.
