import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderListenable;

import '../network/network_providers.dart';
import '../perf/perf_tier.dart';
import 'keep_alive.dart';

/// Урьдчилж ачаалах боломжтой эсэх: хүчтэй төхөөрөмж + онлайн + Wi-Fi (мобайл дата
/// хэмжээгээр төлбөртэй тул хэрэглэгчийн мөнгийг үрэхгүй). Тестэд override.
final prefetchAllowedProvider = Provider<bool>((ref) {
  if (ref.watch(perfTierProvider).isLow) return false;
  if (!ref.watch(reachabilityProvider)) return false;
  return ref.watch(connectionKindProvider) == ConnectionKind.unmetered;
});

extension PrefetchWidgetRef on WidgetRef {
  /// Таб/дэлгэц харагдахад дараагийн магадлалтай дэлгэцийн өгөгдлийг бага ач холбогдолтойгоор
  /// ачаална: [delay]-ийн дараа (эхний кадр, анимацын дараа), зөвхөн [prefetchAllowedProvider]
  /// үнэн үед. Провайдер [keepFor] хугацаанд амьд байна — хэрэглэгч тэр дэлгэц рүү орвол хүлээхгүй.
  ///
  /// ```dart
  /// @override
  /// void initState() {
  ///   super.initState();
  ///   ref.prefetch([hubTestsProvider(''), myAttendanceProvider]);
  /// }
  /// ```
  /// Зөвхөн GET-ээр ачаалдаг (FutureProvider) провайдерт. Mutation хийдэг юмыг ХЭЗЭЭ Ч бүү өг.
  void prefetch(
    List<ProviderListenable<Object?>> providers, {
    Duration delay = const Duration(milliseconds: 600),
    Duration keepFor = const Duration(seconds: 45),
  }) {
    // Widget тестэд хүлээгдэж буй Timer үлдээхгүй (KeepAliveTtl.enabled = false).
    if (!KeepAliveTtl.enabled) return;
    Timer(delay, () {
      try {
        if (!read(prefetchAllowedProvider)) return;
        for (final p in providers) {
          final sub = listenManual<Object?>(p, (_, _) {});
          Timer(keepFor, sub.close);
        }
      } catch (_) {
        // Widget аль хэдийн dispose болсон — урьдчилж ачаалах шаардлагагүй.
      }
    });
  }
}
