# Piemath — гар утасны апп (Flutter)

«Шинэ ирээдүйн эзэд» сургалтын төвийн сурагч, эцэг эх, багш нарт зориулсан iOS + Android апп.
Одоо ажиллаж буй вэб (`web/`) болон API (`api/`)-тай нэг репод, **API-г дахин ашиглана**.

> Хавтасны нэр `piemath_app` (`Piemath.app` биш): macOS `.app`-аар төгссөн хавтсыг програм гэж
> үзэж Finder-т нээгддэггүй, Flutter-ийн багцын нэр жижиг үсэг + доогуур зураастай байх ёстой.

## Agent-д: эхлэхээсээ өмнө ЭНЭ дарааллаар унш

1. [`PROGRESS.md`](PROGRESS.md) — **хаана хүрсэн, дараа нь юу хийх** (өмнөх agent-ын хүлээлгэн өгсөн тэмдэглэл)
2. [`docs/RULES.md`](docs/RULES.md) — эзний хатуу дүрэм (нэршил, дизайн, өгөгдөл). Зөрчвөл ажил хүчингүй
3. [`docs/PLAN.md`](docs/PLAN.md) — үе шат (milestone) бүр, хүлээн авах шалгуур
4. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — бүтэц, сан, API холболт
5. [`docs/PARITY.md`](docs/PARITY.md) — вэбийн хуудас бүр → апп-ын дэлгэц
6. Шаардлагатай үед: [`docs/EXAM-INTEGRITY.md`](docs/EXAM-INTEGRITY.md) · [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) · [`docs/SECURITY.md`](docs/SECURITY.md)
7. Репогийн ерөнхий мэдлэг: `../STATUS.md` (§3 хатуу дүрэм, §5 архитектур, §6 дизайны гэрээ, §7 дэд системүүд), `../CLAUDE.md`
8. Яагаад Flutter, яагаад ингэж шийдсэн: [`docs/background/`](docs/background/)

## Ажиллуулах (Flutter суусны дараа)

```bash
cd piemath_app
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # freezed/json/drift код
flutter analyze && flutter test
flutter run --dart-define=API_BASE_URL=https://api.pimath.mn/api
```

## Хүлээлгэн өгөх дүрэм (кредит хэзээ ч дуусаж болно)

- Milestone-ын **дэд алхам бүр** дуусахад: `flutter analyze` + `flutter test` цэвэр → commit → push →
  `PROGRESS.md` шинэчил. Commit хийгээгүй ажил 45 минутаас удаан бүү байлга.
- `PROGRESS.md`-д: юу хийсэн, юу дутуу, мэдэгдэж буй алдаа, дараагийн яг алхам (файл, функцийн нэртэй).
  Дараагийн agent энэ файлаас л эхэлнэ — өөрийн толгойд байгаа мэдлэгийг тэнд бич.
