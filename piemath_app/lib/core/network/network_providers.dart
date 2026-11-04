import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/session.dart';
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
  );
});
