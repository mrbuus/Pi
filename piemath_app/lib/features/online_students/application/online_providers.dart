import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/network_providers.dart';
import '../data/online_models.dart';
import '../data/online_repository.dart';
import '../domain/online_logic.dart';

final onlineRepositoryProvider = Provider<OnlineRepository>((ref) => OnlineRepository(ref.watch(apiClientProvider)));

final onlineAccessProvider = Provider<OnlineAccess>((ref) {
  final s = ref.watch(sessionProvider);
  return OnlineAccess(s is SignedIn ? s.role : null);
});

/// Одоо (агшин) — эрхийн хоног, «өдрийн өмнө». Тестэд тогтмол.
final onlineNowProvider = Provider<DateTime>((ref) => DateTime.now());

final onlineDetailProvider = FutureProvider.autoDispose.family<OnlineDetail, String>(
  (ref, id) => ref.watch(onlineRepositoryProvider).detail(id),
);

/// Сүүлийн 30 хоногийн идэвх (вэбтэй ижил цонх; `to` = маргааш, өнөөдрийнх орно).
final onlineTimelineProvider = FutureProvider.autoDispose.family<List<TimelineItem>, String>((ref, id) {
  final now = ref.watch(onlineNowProvider).toUtc();
  String key(DateTime d) => d.toIso8601String().substring(0, 10);
  return ref
      .watch(onlineRepositoryProvider)
      .timeline(id, from: key(now.subtract(const Duration(days: 30))), to: key(now.add(const Duration(days: 1))));
});

/// Тест оноох сонголт (нэг удаа татна).
final onlineTestPicksProvider = FutureProvider.autoDispose<List<TestPick>>(
  (ref) => ref.watch(onlineRepositoryProvider).tests(),
);
