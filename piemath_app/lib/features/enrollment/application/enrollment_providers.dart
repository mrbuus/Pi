import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../teacher/data/staff_models.dart';
import '../../teacher/data/staff_repository.dart';
import '../data/enrollment_models.dart';
import '../data/enrollment_repository.dart';

/// Элсэлтийн удирдлагын эрх — вэбтэй яг ижил (UI нуух/харуулах; шийдвэр серверт).
///
/// | Үйлдэл | Админ | Багш+ | Бусад |
/// |---|---|---|---|
/// | Дэлгэц нээх, цонх нээх/хаах, сурагч зөвшөөрөх | тийм | тийм | үгүй |
/// | Гадны багш баталгаажуулах, татгалзах, дахин шалгах | тийм | тийм | үгүй |
/// | Гадны багшийн баталгаажуулалт цуцлах | тийм | үгүй | үгүй |
/// | Эрх олгох (`finance.manage`) | тийм | эрхтэй бол | үгүй |
///
/// Эрх нь сессийн `/auth/me`-ээс (вэб ч `/auth/me`-ийн `role`-оор цуцлах товчийг харуулдаг).
class EnrollmentAccess {
  const EnrollmentAccess({this.role, this.financeCapable});

  final UserRole? role;

  /// Багш+-ийн `finance.manage` (`null` = мэдэгдэхгүй).
  final bool? financeCapable;

  bool get isAdmin => role == UserRole.admin;

  bool get canManage => isAdmin || role == UserRole.teacherPlus;

  bool get canUnverify => isAdmin;

  bool get canGrantPass => isAdmin || (role == UserRole.teacherPlus && financeCapable == true);
}

/// Багш+-ийн `finance.manage` (бусад role-д `null`). Алдаа бол `null` — эрх олгох товч нуугдана.
final enrollmentFinanceCapProvider = FutureProvider.autoDispose<bool?>((ref) async {
  final s = ref.watch(sessionProvider);
  if (s is! SignedIn || s.role != UserRole.teacherPlus) return null;
  try {
    return (await ref.watch(staffRepositoryProvider).myCapabilities()).has('finance.manage');
  } catch (_) {
    return null;
  }
});

final enrollmentAccessProvider = Provider.autoDispose<EnrollmentAccess>((ref) {
  final s = ref.watch(sessionProvider);
  return EnrollmentAccess(
    role: s is SignedIn ? s.role : null,
    financeCapable: ref.watch(enrollmentFinanceCapProvider).value,
  );
});

final enrollmentWindowsProvider = FutureProvider.autoDispose<List<EnrollmentWindow>>(
  (ref) => ref.watch(enrollmentRepositoryProvider).windows(),
);

final unassignedStudentsProvider = FutureProvider.autoDispose<List<WaitingStudent>>(
  (ref) => ref.watch(enrollmentRepositoryProvider).unassignedStudents(),
);

final pendingApprovalProvider = FutureProvider.autoDispose<List<PendingStudent>>(
  (ref) => ref.watch(staffRepositoryProvider).pendingStudents(),
);

final externalTeachersProvider = FutureProvider.autoDispose<ExternalTeachers>(
  (ref) => ref.watch(enrollmentRepositoryProvider).externalTeachers(),
);

final passOptionsProvider = FutureProvider.autoDispose<List<PassOption>>(
  (ref) => ref.watch(enrollmentRepositoryProvider).passes(),
);

/// «Одоо» — хүлээсэн өдөр, яаралтай хүсэлтийг тооцоход. Тестэд тогтмол.
final enrollmentNowProvider = Provider<DateTime Function()>((ref) => DateTime.now);
