import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/time/ub_time.dart';
import '../../teacher/data/staff_repository.dart';
import '../data/students_admin_models.dart';
import '../data/students_admin_repository.dart';
import '../domain/student_filters.dart';
import '../domain/students_perms.dart';

/// Багш+-ийн `finance.manage` (бусад role-д `null`). Алдаа бол `null` — вэбтэй адил role-оор шийднэ.
final studentsFinanceCapProvider = FutureProvider.autoDispose<bool?>((ref) async {
  final s = ref.watch(sessionProvider);
  if (s is! SignedIn || s.role != UserRole.teacherPlus) return null;
  try {
    return (await ref.watch(staffRepositoryProvider).myCapabilities()).has('finance.manage');
  } catch (_) {
    return null;
  }
});

/// Нэвтэрсэн хүний сурагчдын удирдлагын эрх.
final studentsPermsProvider = Provider.autoDispose<StudentsPerms>((ref) {
  final s = ref.watch(sessionProvider);
  return StudentsPerms(
    role: s is SignedIn ? s.role : null,
    financeCapable: ref.watch(studentsFinanceCapProvider).value,
  );
});

/// Энэ сар (`YYYY-MM`, Улаанбаатар) — дутуу төлбөрийн жагсаалтад. Тестэд солино.
final studentsMonthProvider = Provider<String>((ref) => UbDateTime.now().dateKey.substring(0, 7));

/// Жагсаалтын өгөгдлийг ачаалж санах ойд барина: хайлт, шүүлтүүр, «Цааш үзэх» нь сүлжээ дуудахгүй,
/// зөвхөн эхний ачаалал, доош татаж шинэчлэх, үйлдлийн дараа ([invalidate]) серверээс дахин авна.
class StudentDirectoryLoader {
  StudentDirectoryLoader(this._repo, {required this.month});

  final StudentsAdminRepository _repo;
  final String month;
  final _cache = <bool, StudentDirectory>{};

  StudentDirectory? cached({required bool archived}) => _cache[archived];

  void invalidate() => _cache.clear();

  /// Нэг талын (идэвхтэй/архив) кэшийг хаяна.
  void drop({required bool archived}) => _cache.remove(archived);

  /// Санах ойд байгаа мөрийг солих (optimistic өөрчлөлтийн дараа).
  void replaceStudents(bool archived, List<AdminStudent> Function(List<AdminStudent>) change) {
    final d = _cache[archived];
    if (d != null) _cache[archived] = d.withStudents(change(d.students));
  }

  /// [force] эсвэл кэшгүй бол серверээс. Төлбөр, анхаарах сурагчдын алдаа чимээгүй (вэбтэй ижил).
  Future<StudentDirectory> load({required bool archived, required StudentsPerms perms, bool force = false}) async {
    final hit = _cache[archived];
    if (hit != null && !force) return hit;
    final studentsF = _repo.students(archived: archived);
    final outstandingF = !archived && perms.canSeeMoney ? _quiet(_repo.outstanding(month)) : Future.value(null);
    final attentionF = !archived && perms.canManage ? _quiet(_repo.attention()) : Future.value(null);
    final students = await studentsF;
    final outstanding = await outstandingF;
    final attention = await attentionF;
    final dir = StudentDirectory(
      students: students,
      outstanding: {for (final r in outstanding ?? const <OutstandingRow>[]) r.studentId: r.shortfall},
      attention: attention,
    );
    _cache[archived] = dir;
    return dir;
  }

  static Future<T?> _quiet<T>(Future<T> f) async {
    try {
      return await f;
    } catch (_) {
      return null;
    }
  }
}

final studentDirectoryLoaderProvider = Provider.autoDispose<StudentDirectoryLoader>(
  (ref) => StudentDirectoryLoader(ref.watch(studentsAdminRepositoryProvider), month: ref.watch(studentsMonthProvider)),
);

final adminStudentDetailProvider = FutureProvider.autoDispose.family<AdminStudentDetail, String>(
  (ref, id) => ref.watch(studentsAdminRepositoryProvider).detail(id),
);

final studentPaymentHistoryProvider = FutureProvider.autoDispose.family<StudentPaymentHistory, String>(
  (ref, id) => ref.watch(studentsAdminRepositoryProvider).paymentHistory(id),
);

final studentWithdrawalsProvider = FutureProvider.autoDispose.family<List<SavedWithdrawal>, String>(
  (ref, id) => ref.watch(studentsAdminRepositoryProvider).withdrawals(id),
);

final adminClassroomsProvider = FutureProvider.autoDispose<List<ClassroomRef>>(
  (ref) => ref.watch(studentsAdminRepositoryProvider).classrooms(),
);

/// Сурагчийн мэдээлэл өөр дэлгэцээс (дэлгэрэнгүй) өөрчлөгдөхөд жагсаалтыг серверээс дахин ачаалуулах тоолуур.
class StudentsListVersion extends Notifier<int> {
  @override
  int build() => 0;

  void bump() => state++;
}

final studentsListVersionProvider = NotifierProvider<StudentsListVersion, int>(StudentsListVersion.new);
