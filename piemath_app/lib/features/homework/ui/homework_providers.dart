import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/time/ub_time.dart';
import '../data/homework_models.dart';
import '../data/homework_repository.dart';

/// Танхимын загварын өдрүүд (14 хоног + ирэх 7 хоног).
final homeworkDaysProvider = FutureProvider.autoDispose<List<HwDay>>(
  (ref) => ref.watch(homeworkRepositoryProvider).myDays(),
);

/// Онлайн загварын даалгаврууд.
final assignmentsProvider = FutureProvider.autoDispose<List<Assignment>>(
  (ref) => ref.watch(homeworkRepositoryProvider).myAssignments(),
);

/// Онлайн ангийн сурагч эсэх (`studentProfile.type == ONLINE`, STATUS §7.11). `/auth/me`
/// ачаалагдаагүй бол танхимын загвар (вэбийн өгөгдмөл `/app/homework`).
final isOnlineStudentProvider = Provider<bool>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedIn && (s.user?.isOnlineStudent ?? false);
});

/// UB-ийн өнөөдөр (`YYYY-MM-DD`). Тестэд override.
final todayKeyProvider = Provider<String>((ref) => UbDateTime.now().dateKey);
