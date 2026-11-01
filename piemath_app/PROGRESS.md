# Явц ба хүлээлгэн өгөх тэмдэглэл

**Дараагийн agent эндээс эхэлнэ.** Хамгийн сүүлийн бичлэг ДЭЭД талд. Бичлэг бүрт: огноо, юу хийсэн (commit), шалгалтын үр дүн,
дутуу зүйл, мэдэгдэж буй алдаа, **дараагийн яг алхам** (файл, функцийн нэртэй).

## Одоогийн төлөв

- Milestone: **M0** — M0.1–M0.3 дууссан, дараагийнх M0.4
- Branch: `piemath-app` (суурь: прод `4d3b648` + номын QR S1)
- Flutter 3.47.9 stable / Dart 3.13.7 (cloud: `~/flutter`, `export PATH=~/flutter/bin:$PATH`)
- Шалгалт: `flutter analyze` 0 асуудал, `flutter test` бүгд ногоон

## Mac дээр шалгах (Linux cloud-д боломжгүй)

- [ ] `flutter build ios --debug --no-codesign` амжилттай (bundle `mn.piemath.app`, нэр «Piemath»)
- [ ] Golden тест Linux-д үүсгэсэн — Mac дээр `flutter test -x golden`, эсвэл тусдаа `--update-goldens`

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
