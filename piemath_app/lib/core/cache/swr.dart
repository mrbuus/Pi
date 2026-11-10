import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Stale-while-revalidate хүрээ. Энэ zone дотор дуудагдсан `ApiClient.get` кэштэй бол ШУУД
/// буцааж, арын төлөвт серверээс шинэчилнэ; шинэ хариу өөр байвал [onFresh] дуудна.
///
/// Feature код үүнийг шууд хэрэглэхгүй — [swr] туслахыг ашигла.
final class SwrScope {
  SwrScope({required this.onFresh, this.preferNetwork = false});

  /// Арын шинэчлэл өөр өгөгдөл авчирсан (эсвэл эрх хаагдсан) — провайдерыг дахин бүтээ.
  final void Function() onFresh;

  /// Хэрэглэгч өөрөө шинэчилсэн (pull-to-refresh, «Дахин оролдох») — эхлээд сүлжээ,
  /// сүлжээгүй бол л кэш.
  final bool preferNetwork;

  static const _zoneKey = #piemathSwrScope;

  /// Одоогийн zone-ийн хүрээ (ApiClient уншина).
  static SwrScope? get current => Zone.current[_zoneKey] as SwrScope?;

  R run<R>(R Function() body) => runZoned(body, zoneValues: {_zoneKey: this});
}

/// Провайдерыг «кэшээс шууд, дараа нь шинэ» горимд оруулна (нэг мөрийн opt-in):
///
/// ```dart
/// final hubOverviewProvider = FutureProvider<HubOverview>(
///   (ref) => swr(ref, () => _repo(ref).overview()),
/// );
/// ```
///
/// - Анх (апп асах, таб руу буцах) — диск/санах ойд хариу байвал хүлээлгүйгээр зурна,
///   сервер рүү арын төлөвт асууж, өөрчлөгдсөн бол провайдер өөрөө дахин бүтээгдэнэ.
/// - `ref.refresh`/`invalidate` (pull-to-refresh) — эхлээд сүлжээ; офлайн бол кэш + тууз.
/// - Body доторх БҮХ GET (repository-гоор дамжсан ч) хамрагдана — zone-оор дамждаг.
/// - Mutation (POST/PATCH/DELETE) хэзээ ч кэшлэгдэхгүй, давтагдахгүй.
Future<T> swr<T>(Ref ref, Future<T> Function() body) {
  var alive = true;
  var scheduled = false;
  ref.onDispose(() => alive = false);
  final scope = SwrScope(
    preferNetwork: ref.isRefresh,
    onFresh: () {
      // Хэд хэдэн GET зэрэг шинэчлэгдвэл нэг л удаа дахин бүтээнэ.
      if (!alive || scheduled) return;
      scheduled = true;
      scheduleMicrotask(() {
        if (alive) ref.invalidateSelf();
      });
    },
  );
  return scope.run(body);
}
