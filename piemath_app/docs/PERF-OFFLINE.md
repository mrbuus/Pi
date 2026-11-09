# Хурд ба офлайн: кэш, SWR, эхлэлт (2026-11-10)

Зорилго: 2 GB RAM, Android 8, удаан 3G дээр ч дэлгэц хүлээлгүйгээр нээгдэх, интернэт тасарсан үед
хоосон дэлгэц биш сүүлд мэдэгдсэн мэдээлэл харагдах. Ерөнхий дүрэм — `PERFORMANCE.md`.

## 1. Юу хийсэн (feature код өөрчлөхгүйгээр ажилладаг хэсэг)

| Хэсэг | Хаана | Юу |
|---|---|---|
| GET кэш | `core/cache/response_cache.dart` | Санах ой (LRU, байтаар: 4MB, сул утсанд 1.5MB) + диск (24MB / 12MB). Хэрэглэгч бүр тусдаа хавтас (userId-ийн хэш). 14 хоногоос хуучин хариуг хэрэглэхгүй |
| Офлайн | `core/network/api_client.dart` | Сүлжээгүй, timeout, 502–504 → сүүлд мэдэгдсэн хариу + офлайн тууз. Кэштэй бол 60с-ийн «сэрээх» давталтыг хүлээлгэхгүй |
| ETag | `ApiClient` | Express өгөгдмөлөөр weak ETag өгдөг (`api/src/main.ts`, `compression()` асаалттай). Дараагийн GET `If-None-Match` илгээнэ → өөрчлөгдөөгүй бол 304, бие татахгүй |
| Давхардал | `ApiClient` | Ижил GET зэрэг дуудагдвал нэг хүсэлт (өмнө нь бий байсан, кэштэй замд ч) |
| Mutation | `ApiClient` | POST/PATCH/PUT/DELETE хэзээ ч кэшлэгдэхгүй, автоматаар давтагдахгүй. Амжилттай бол замын эхний хэсгийн (`/assignments/...`) кэш устна |
| Гарах | `core/cache/cache_providers.dart` | `SignedOut` (гарах, 401) → санах ой + диск бүрэн устна. Апп нэвтрээгүй асахад ч үлдэгдлийг цэвэрлэнэ |
| Кэшлэхгүй | `kNoCachePrefixes` | `/auth/*` (токен, профайл), `/files/*` (тусдаа кэш), `/devices`, `/presence`, `/me/deletion-request`, `/schedule/me/ics` |
| JSON | `core/cache/json_bytes.dart` | 50KB-аас том хариуг isolate-д задална (сүлжээ, диск хоёуланд). Дискэнд түүхий байт — дахин encode хийхгүй |
| Зураг | `core/files/*` | `/files/:key` санах ой + диск (24/120MB, сул утсанд 10/80MB), S3 302-д `Authorization` дамжуулахгүй (өмнө нь бий). Диск шахалт одоо async, 20 бичилт тутамд (өмнө нь бичилт бүрт sync `listSync` — гүйлгэхэд гацдаг байсан) |
| imageCache | `core/perf/memory.dart` | Decode хийсэн зураг: сул утсанд 48MB / 300 (өгөгдмөл 100MB / 1000) |
| Санах ойн дарамт | `MemoryPressureObserver` | OS анхааруулахад GET болон файлын санах ойн кэшийг суллана (диск үлдэнэ) |
| Эхлэлт | `app/bootstrap.dart` | Кэшийн хавтсыг prefs, түвшинтэй зэрэг тодорхойлно. Push (Firebase) бүртгэлийг эхний кадраас 1.5с дараа |
| Томьёо | `core/math/tex_engine.dart`, `math_text.dart` | Аль хэдийн кэштэй байсан (ижил LaTeX дахин parse хийхгүй) — өөрчлөөгүй |

## 2. Feature хэрхэн нэгдэх (opt-in, нэг мөр)

### 2.1 SWR — «кэшээс шууд, дараа нь шинэ»

```dart
import '../../../core/cache/swr.dart';

final hubOverviewProvider = FutureProvider<HubOverview>(
  (ref) => swr(ref, () => _repo(ref).overview()),
);
```

- Анхны бүтээлт (апп асах, autoDispose дахин үүсэх, хамаарал өөрчлөгдөх) — кэш байвал ШУУД, арын
  төлөвт сервер рүү; өөр хариу ирвэл провайдер өөрөө шинэчлэгдэнэ (`.when` хуучныг харуулсаар байна,
  skeleton анивчихгүй).
- `ref.refresh`/`invalidate` (pull-to-refresh, «Дахин оролдох») — эхлээд сүлжээ; офлайн бол кэш.
- Repository-г өөрчлөх шаардлагагүй — body доторх бүх GET zone-оор хамрагдана.
- Арын шинэчлэл 403/404 авбал кэш устаж дэлгэц алдаа/«эрхгүй» төлвөө харуулна.
- **Хэрэглэхгүй газар:** шууд төлөв чухал дэлгэц (шалгалт өгөх, багшийн ирц тэмдэглэх самбар) —
  тэнд өгөгдмөл «эхлээд сүлжээ» хангалттай.

Одоо нэгдсэн: сурагчийн нүүр (`my_class_repository.dart`: overview, days, attendance, makeup,
paidUntil, announcements, myClassrooms), эцэг эхийн нүүр (`parentChildrenProvider`).

### 2.2 Таб руу буцахад шууд — `cacheFor`

```dart
final classroomsProvider = FutureProvider.autoDispose<List<ClassroomSummary>>((ref) {
  ref.cacheFor(const Duration(minutes: 5)); // сул утсанд 2.5 мин
  return ref.watch(teacherRepositoryProvider).classrooms();
});
```

Widget тестэд (`FLUTTER_TEST`) таймер үүсгэхгүй — «Timer is still pending» гарахгүй.

### 2.3 Дараагийн дэлгэцийг урьдчилж ачаалах — `prefetch`

```dart
@override
void initState() {
  super.initState();
  ref.prefetch([hubTestsProvider(''), myAttendanceProvider]);
}
```

0.6с-ийн дараа, зөвхөн хүчтэй утас + онлайн + Wi-Fi үед (мобайл дата хэрэглэгчийн мөнгө).
45с амьд байлгана. Зөвхөн GET провайдер өгнө.

### 2.4 Бусад

- Өөр бүлгийн кэшийг mutation-ий дараа устгах: `api.invalidateCache('/student-hub')`
  (жишээ: `POST /tests/:id/submit` → `/student-hub/tests`). Өөрийн бүлэг автоматаар устдаг.
- Нэг GET-ийг кэшээс гаргах: `api.get(path, parse: ..., cache: false)`.

## 3. Хэмжилт

Төхөөрөмж дээр хэмжээгүй (энэ орчинд build хийхгүй) — `test/core/cache/api_cache_test.dart`-ийн
синтетик хэмжилт (Mac, debug VM):

| Тохиолдол | Өмнө | Одоо |
|---|---|---|
| Апп дахин асахад нүүрний хариу (сүлжээ 300ms) | 300ms + (skeleton) | ~3ms (дискнээс), дараа нь арын шинэчлэл |
| Өөрчлөгдөөгүй хариуг дахин татах | бүтэн бие | 304, биегүй (толгой л) |
| Офлайн, кэштэй GET | 2 оролдлого, алдааны дэлгэц | 1 оролдлого, сүүлийн өгөгдөл + тууз |
| 3G stall, кэштэй | 12с + 60с хүлээлт | 12с (default) / 0с (SWR) |
| Зургийн дискний шахалт | бичилт бүрт sync `listSync` + `stat` | 20 бичилт тутамд async |

Утсан дээр шалгах (`PERFORMANCE.md` §3): `flutter run --profile`, нүүр дэлгэцийн эхний бодит
өгөгдөлтэй кадр хүртэлх хугацаа (онгоцны горимд ч өгөгдөл харагдах ёстой).

## 4. Урхи

- Widget тестийн FakeAsync-д дискний I/O дуусдаггүй — `apiCacheDirectoryProvider` өгөгдмөл null
  (санах ой л). Прод-д `bootstrap` override хийнэ.
- `responseCacheProvider` session-ийг СОНСОХГҮЙ: `SessionController` нь `apiClientProvider`-ийг
  уншдаг тул Riverpod circular dependency өгнө. Тиймээс хүрээг `ApiClient.cacheScope` (lazy read),
  гаралтыг `responseCacheSessionSyncProvider` (bootstrap уншина).
- Mutation-ий бүлгийн устгал нь замын эхний хэсгээр — өөр бүлэгт нөлөөлдөг mutation-д
  `invalidateCache` гараар. SWR провайдер ямар ч байсан арын төлөвт шинэчилдэг тул удаан хуучирахгүй.
