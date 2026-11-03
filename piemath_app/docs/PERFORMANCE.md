# Сул, хуучин утсан дээр гацахгүй байх

Зорилтот хамгийн сул төхөөрөмж: **2 GB RAM, Android 8–9, 4 цөмт хямд процессор, удаан 3G.**
Тэр дээр жагсаалт гүйлгэх, шалгалтын бодлого солих 60fps, апп хүйтэн эхлэлт 3 сек дотор.

## 1. Дүрэм

- Урт жагсаалт бүр `ListView.builder` / `SliverList` (зөвхөн харагдаж буйг зурна). `shrinkWrap: true` урт жагсаалтад хориотой.
- `const` constructor аль болох; том `build()`-ийг жижиг widget болго (rebuild хүрээ багасна).
- Riverpod-д `select`-ээр зөвхөн хэрэгтэй талбарыг сонсох.
- Зураг: `cacheWidth`/`cacheHeight` (дэлгэцийн хэмжээгээр decode), дискийн кэш, placeholder skeleton. Том зургийг бүтэн хэмжээгээр decode хийхгүй.
- Томьёо: зурагдсан томьёог key-ээр кэшлэх (ижил LaTeX дахин layout хийхгүй), `RepaintBoundary`.
- JSON 100KB-аас том бол `compute()`/isolate-д parse.
- `Opacity`, `ClipPath`, `BackdropFilter` анимацыг шалгалтын дэлгэцэд бүү хэрэглэ. Зөвхөн transform/opacity transition, `MediaQuery.disableAnimations` үед унтраана.
- Шалгалтын autosave: debounce (вэб ~1.2 сек), өөрчлөлт байхгүй бол илгээхгүй, давхардсан хүсэлт цуцлах.
- Сүлжээ: gzip, жижиг хуудаслалт, retry jitter-тэй (сервер ачааллыг бөөнөөр бүү нэм).

## 2. Хэмжээ

- Android App Bundle + ABI split; `--split-debug-info --obfuscate`; ашиглагдаагүй дүрс tree-shake.
- Шинэ сан нэмэхээс өмнө: хэмжээ, нативаар юу татдаг, хадгалагдаж байгаа эсэх. Firebase-ийн зөвхөн messaging.
- Фонт: зөвхөн хэрэгтэй жин (Onest 400/600/700, Unbounded 600).
- Зорилт: APK (arm64) 25 MB-аас бага. Хэмжилт (2026-11-03, `--release --split-per-abi --obfuscate`): 27.9 → 26.6 MB.
  Үлдсэн нь бараг бүгд native: libflutter.so 11.8 + libapp.so 11.6 MB (APK-д шахаагүй хадгалагддаг).
- Lucide дүрс: `tool/icon_font/lucide_icons_flutter` — апп-д хэрэглэсэн глифээр л (148, 56KB) орлуулагч багц,
  `LucideIcons`/`AppIcons` API ижил. Шинэ дүрс нэмбэл `python3 tool/icon_font/build_icon_font.py`
  (эс тэгвэл `test/core/ui/icon_font_test.dart` унана).

## 3. Хэмжих

- `flutter run --profile` + DevTools (Performance, Memory). Raster/UI thread 16ms-ээс бага.
- Android эмулятор: 2 GB RAM, API 26–28 profile (cloud-д эмулятор болохгүй бол integration тестийг дараагийн орчинд — `PROGRESS.md`-д тэмдэглэ).
- Гол дэлгэц бүрт benchmark integration тест (`integration_test/perf_*.dart`, `traceAction`) — хугацааг `docs/PERF-LOG.md`-д.
  Утсан дээр: `flutter drive --profile --no-dds --driver=test_driver/perf_driver.dart --target=integration_test/perf_test.dart`
  → `build/perf_*.timeline_summary.json` (гүйлгэх, бодолт нээх, таб солих).
- Түвшин: `core/perf/perf_tier.dart` (`DevicePerf.tier`, `perfTierProvider`) — low бол гулсах шилжилт, шатлалгүй жагсаалт.
