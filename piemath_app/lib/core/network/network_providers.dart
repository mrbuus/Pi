import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/session.dart';
import '../cache/cache_providers.dart';
import '../config/env.dart';
import 'api_client.dart';

/// Төхөөрөмжийн сүлжээний төлөв (connectivity_plus). Тестэд override.
final connectivityChangesProvider = Provider<Stream<List<ConnectivityResult>>>(
  (ref) => Connectivity().onConnectivityChanged,
);

/// Сервертэй холбогдож байгаа эсэх (true = онлайн). Сүлжээний карт унтарсан ЭСВЭЛ
/// сүүлийн хүсэлт сүлжээний алдаагаар бүтэлгүйтвэл офлайн; амжилттай хүсэлт ирмэгц онлайн.
final reachabilityProvider = NotifierProvider<ReachabilityNotifier, bool>(ReachabilityNotifier.new);

class ReachabilityNotifier extends Notifier<bool> {
  @override
  bool build() {
    final sub = ref.watch(connectivityChangesProvider).listen((results) {
      final none = results.isEmpty || results.every((r) => r == ConnectivityResult.none);
      // Карт асахад шууд «онлайн» гэж үзнэ — дараагийн хүсэлт баталгаажуулна.
      state = !none;
    });
    ref.onDispose(sub.cancel);
    return true;
  }

  void report(bool reachable) {
    if (state != reachable) state = reachable;
  }
}

/// Сүлжээний төрөл — урьдчилж ачаалах (prefetch) эсэхийг шийдэхэд.
enum ConnectionKind {
  /// Хараахан мэдэгдээгүй (апп дөнгөж асаж байна) — хэмнэлттэй гэж үзнэ.
  unknown,

  /// Wi-Fi, кабель — урьдчилж ачаалж болно.
  unmetered,

  /// Мобайл дата (хэмжээгээр төлбөртэй) — урьдчилж ачаалахгүй.
  metered,

  /// Сүлжээгүй.
  none;

  static ConnectionKind of(List<ConnectivityResult> results) {
    if (results.isEmpty || results.every((r) => r == ConnectivityResult.none)) return none;
    if (results.any((r) => r == ConnectivityResult.mobile || r == ConnectivityResult.bluetooth)) return metered;
    if (results.any((r) => r == ConnectivityResult.wifi || r == ConnectivityResult.ethernet)) return unmetered;
    return metered;
  }
}

/// Одоогийн сүлжээний төрлийг нэг удаа асуух (тестэд override).
final connectivityCheckProvider = Provider<Future<List<ConnectivityResult>> Function()>(
  (ref) => () => Connectivity().checkConnectivity(),
);

final connectionKindProvider = NotifierProvider<ConnectionKindNotifier, ConnectionKind>(ConnectionKindNotifier.new);

class ConnectionKindNotifier extends Notifier<ConnectionKind> {
  @override
  ConnectionKind build() {
    var changed = false;
    final sub = ref.watch(connectivityChangesProvider).listen((results) {
      changed = true;
      state = ConnectionKind.of(results);
    });
    ref.onDispose(sub.cancel);
    unawaited(() async {
      try {
        final results = await ref.read(connectivityCheckProvider)();
        if (!changed && ref.mounted) state = ConnectionKind.of(results);
      } catch (_) {
        // Plugin байхгүй (тест) — unknown хэвээр.
      }
    }());
    return ConnectionKind.unknown;
  }
}

final apiBaseUrlProvider = Provider<String>((ref) => Env.apiBaseUrl);

/// Тестэд хуурамч adapter (`test/helpers/fake_http.dart`) өгөхөд. Прод-д null (dio-гийн өгөгдмөл).
final httpClientAdapterProvider = Provider<HttpClientAdapter?>((ref) => null);

/// Апп-ын цорын ганц [ApiClient].
final apiClientProvider = Provider<ApiClient>((ref) {
  final adapter = ref.watch(httpClientAdapterProvider);
  return ApiClient(
    baseUrl: ref.watch(apiBaseUrlProvider),
    dio: adapter == null ? null : (Dio()..httpClientAdapter = adapter),
    tokens: ref.watch(tokenHolderProvider),
    onUnauthorized: (message) => unawaited(ref.read(sessionProvider.notifier).expire(message)),
    onReachability: (ok) => ref.read(reachabilityProvider.notifier).report(ok),
    // GET кэш: санах ой + диск, хэрэглэгч тус бүр, гарахад устна (docs/PERF-OFFLINE.md).
    cache: ref.watch(responseCacheProvider),
    cacheScope: () {
      try {
        final s = ref.read(sessionProvider);
        return s is SignedIn ? s.auth.userId : null;
      } catch (_) {
        return null; // Хуучирсан клиент (провайдер дахин бүтээгдсэн) — кэшгүй.
      }
    },
  );
});
