import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../perf/perf_tier.dart';

/// `autoDispose` провайдерыг хэн ч сонсохгүй болсны дараа хэсэг хугацаанд хадгалах тохиргоо.
abstract final class KeepAliveTtl {
  /// Widget тестэд хүлээгдэж буй Timer үлдээхгүйн тулд унтраалттай (`FLUTTER_TEST`).
  /// Тест өөрөө асааж шалгаж болно.
  static bool enabled = !_inFlutterTest;

  static bool get _inFlutterTest {
    if (kIsWeb) return false;
    try {
      return Platform.environment.containsKey('FLUTTER_TEST');
    } catch (_) {
      return false;
    }
  }

  /// Сул төхөөрөмжид санах ой хэмнэхийн тулд хагас хугацаа.
  static Duration scaled(Duration d) => DevicePerf.tier.isLow ? d ~/ 2 : d;
}

extension CacheForRef on Ref {
  /// Таб руу буцахад шууд харагдуулах: сонсогчгүй болсноос хойш [duration] хадгалаад дараа нь
  /// чөлөөлнө (сул утсанд хагас). Буцаж ирвэл таймер цуцлагдана.
  ///
  /// ```dart
  /// final classroomsProvider = FutureProvider.autoDispose<List<ClassroomSummary>>((ref) {
  ///   ref.cacheFor(const Duration(minutes: 5));
  ///   return ref.watch(teacherRepositoryProvider).classrooms();
  /// });
  /// ```
  void cacheFor(Duration duration) {
    if (!KeepAliveTtl.enabled) return;
    final link = keepAlive();
    Timer? timer;
    onCancel(() {
      timer?.cancel();
      timer = Timer(KeepAliveTtl.scaled(duration), link.close);
    });
    onResume(() => timer?.cancel());
    onDispose(() => timer?.cancel());
  }
}
