import 'dart:async';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../auth/session.dart';
import '../perf/perf_tier.dart';
import 'response_cache.dart';

/// GET хариуны дискний кэшийн суурь хавтас. Өгөгдмөл нь null (зөвхөн санах ой — тест, widget
/// тестийн FakeAsync-д platform channel хүлээж гацахгүй). Прод-д `app/bootstrap.dart`
/// [resolveApiCacheDirectory]-оор override хийнэ.
final apiCacheDirectoryProvider = Provider<Future<Directory?> Function()?>((ref) => null);

/// Апп-ын кэшийн хавтас (`getApplicationCacheDirectory`). Алдаа гарвал null (зөвхөн санах ой).
Future<Directory?> resolveApiCacheDirectory() async {
  try {
    return await getApplicationCacheDirectory();
  } catch (_) {
    return null;
  }
}

/// Санах ойн/дискний төсөв — түвшнээр (2 GB утсанд бага).
({int memory, int disk}) responseCacheBudget(PerfTier tier) =>
    tier.isLow ? (memory: 1536 * 1024, disk: 12 * 1024 * 1024) : (memory: 4 * 1024 * 1024, disk: 24 * 1024 * 1024);

/// Апп-ын цорын ганц GET кэш ([ResponseCache]). Хэрэглэгчээр хүрээлэгдэнэ (`ApiClient.cacheScope`),
/// гарахад [responseCacheSessionSyncProvider] санах ой + дискийг бүрэн устгана (SECURITY §3).
///
/// Session-ийг энд СОНСОХГҮЙ: `SessionController` нь `apiClientProvider`-ийг уншдаг тул
/// давхар хамаарал (circular dependency) үүснэ.
final responseCacheProvider = Provider<ResponseCache>((ref) {
  final budget = responseCacheBudget(ref.watch(perfTierProvider));
  return ResponseCache(
    directory: ref.watch(apiCacheDirectoryProvider),
    memoryBudget: budget.memory,
    diskBudget: budget.disk,
  );
});

/// Session ↔ кэш: нэвтэрсэн хэрэглэгчийн хавтсыг эрт нээх, гарах/токен хүчингүй болоход
/// (мөн апп нэвтрээгүй асахад өмнөх үлдэгдлийг) бүрэн устгах. `app/bootstrap.dart` уншина.
final responseCacheSessionSyncProvider = Provider<void>((ref) {
  final cache = ref.watch(responseCacheProvider);
  ref.listen<SessionState>(sessionProvider, (prev, next) {
    switch (next) {
      case SignedIn(:final auth):
        cache.setScope(auth.userId);
      case SignedOut():
        cache.setScope(null);
        unawaited(cache.clearAll());
      case SessionRestoring():
        break;
    }
  }, fireImmediately: true);
});
