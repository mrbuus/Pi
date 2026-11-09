import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/ub_time.dart';
import '../data/finance_models.dart';
import '../data/finance_repository.dart';
import '../data/reconcile_models.dart';
import '../data/reconcile_repository.dart';

/// «Өнөөдөр» (UB) — эхний сар, зарлагын огнооны өгөгдмөл. Тестэд override.
final financeTodayProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

/// Санхүүгийн тайлан: вэбийн `admin/finance/layout.tsx` нь `RequireRole allow={["ADMIN"]}` —
/// Багш+ санхүүгийн эрхтэй ч энэ хуудсыг ХАРАХГҮЙ (сервер зөвшөөрдөг ч вэбийн хуудас Админых).
/// Эрхгүй хэрэглэгчид хүсэлт ч илгээхгүй.
final financeAccessProvider = Provider<bool>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedIn && s.role == UserRole.admin;
});

/// Банкны тулгалтад хандах эрх.
enum ReconcileAccess { denied, admin, manager }

/// Вэбийн цэс: Админ, Багш+ (`nav-data.ts`); сервер: `RolesGuard(ADMIN, TEACHER_PLUS)` + `finance.manage`.
/// Багш+-д `finance.manage`-ийг урьдчилан шалгана — эрхгүй бол гүйлгээний API огт дуудахгүй.
final reconcileAccessProvider = FutureProvider<ReconcileAccess>((ref) async {
  final s = ref.watch(sessionProvider);
  if (s is! SignedIn) return ReconcileAccess.denied;
  switch (s.role) {
    case UserRole.admin:
      return ReconcileAccess.admin;
    case UserRole.teacherPlus:
      try {
        final ok = await ref.read(reconcileRepositoryProvider).hasFinanceCapability();
        return ok ? ReconcileAccess.manager : ReconcileAccess.denied;
      } on ApiError catch (e) {
        if (e.kind == ApiErrorKind.forbidden) return ReconcileAccess.denied;
        rethrow;
      }
    default:
      return ReconcileAccess.denied;
  }
});

/// Сонгосон сар (санхүүгийн тайлан).
class FinanceMonth extends Notifier<YearMonth> {
  @override
  YearMonth build() => YearMonth.of(ref.watch(financeTodayProvider));

  void set(YearMonth month) => state = month;

  void previous() => state = state.previous;

  void next() => state = state.next;
}

final financeMonthProvider = NotifierProvider<FinanceMonth, YearMonth>(FinanceMonth.new);

final financeReportProvider = FutureProvider.autoDispose.family<FinanceReport, YearMonth>(
  (ref, month) => ref.watch(financeRepositoryProvider).report(month),
);

final financeExpensesProvider = FutureProvider.autoDispose.family<List<ExpenseRecord>, YearMonth>(
  (ref, month) => ref.watch(financeRepositoryProvider).expenses(month),
);

/// Тулгалтын дээд талын тоонууд.
final reconcileSummaryProvider = FutureProvider.autoDispose<ReconcileSummary>(
  (ref) => ref.watch(reconcileRepositoryProvider).summary(),
);
