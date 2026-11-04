import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/ub_time.dart';
import '../data/tuition_models.dart';
import '../data/tuition_repository.dart';

/// «Өнөөдөр» (UB) — гарсан огнооны өгөгдмөл, хамгийн хожуу сонгох өдөр. Тестэд override.
final tuitionTodayProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

/// Вэбийн `tuition/layout.tsx` (`RequireRole ADMIN, TEACHER_PLUS`) + серверийн `FinanceCapabilityGuard`.
/// Багш, сурагч, эцэг эх энэ хэсэгт хүрэхгүй (хүсэлт ч явуулахгүй); Багш+ `finance.manage`-тэй байх ёстой.
final tuitionAccessProvider = FutureProvider<TuitionAccess>((ref) async {
  final s = ref.watch(sessionProvider);
  if (s is! SignedIn) return TuitionAccess.denied;
  switch (s.role) {
    case UserRole.admin:
      return TuitionAccess.admin;
    case UserRole.teacherPlus:
      try {
        final ok = await ref.read(tuitionRepositoryProvider).hasFinanceCapability();
        return ok ? TuitionAccess.manager : TuitionAccess.denied;
      } on ApiError catch (e) {
        if (e.kind == ApiErrorKind.forbidden) return TuitionAccess.denied;
        rethrow;
      }
    default:
      return TuitionAccess.denied;
  }
});

/// Нэг буцаалтын дэлгэрэнгүй.
final refundDetailProvider = FutureProvider.autoDispose.family<RefundRecord, String>(
  (ref, id) => ref.watch(tuitionRepositoryProvider).get(id),
);
