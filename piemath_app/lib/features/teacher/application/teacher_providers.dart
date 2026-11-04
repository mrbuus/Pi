import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/ub_time.dart';
import '../data/staff_repository.dart';
import '../data/teacher_extras.dart';
import '../data/teacher_models.dart';
import '../data/teacher_repository.dart';
import '../data/teacher_today.dart';
import '../domain/test_run_row.dart';

/// «Өнөөдөр» (UB). Тестэд тогтмол огноогоор солино.
final teacherTodayProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

/// Нэвтэрсэн хүний id («Миний анги» шүүлтэд).
final teacherUserIdProvider = Provider<String?>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedIn ? (s.user?.id ?? s.auth.userId) : null;
});

/// Presence цохилт асаалттай эсэх. Тестэд унтраана (`dispose` дахь «гарлаа» хүсэлт FakeAsync-д таймер үлдээдэг).
final presenceEnabledProvider = Provider<bool>((ref) => true);

final dayBoardProvider = FutureProvider.autoDispose.family<DayBoard, String>(
  (ref, date) => ref.watch(teacherRepositoryProvider).dayBoard(date),
);

final classroomsProvider = FutureProvider.autoDispose<List<ClassroomSummary>>(
  (ref) => ref.watch(teacherRepositoryProvider).classrooms(),
);

final classroomDetailProvider = FutureProvider.autoDispose.family<ClassroomDetail, String>(
  (ref, id) => ref.watch(teacherRepositoryProvider).classroom(id),
);

typedef StudentRange = ({String studentId, String from, String to});

/// Ирц ба даалгаврын түүх (нэг дор — хоёулаа бэлэн болтол skeleton).
final studentProgressProvider = FutureProvider.autoDispose
    .family<({List<StudentAttendanceRow> attendance, List<StudentHomeworkRow> homework}), StudentRange>((ref, a) async {
      final repo = ref.watch(teacherRepositoryProvider);
      final res = await Future.wait<Object>([
        repo.studentAttendance(a.studentId, from: a.from, to: a.to),
        repo.studentHomework(a.studentId, from: a.from, to: a.to),
      ]);
      return (attendance: res[0] as List<StudentAttendanceRow>, homework: res[1] as List<StudentHomeworkRow>);
    });

final testResultsProvider = FutureProvider.autoDispose.family<List<StudentTestResult>, String>(
  (ref, id) => ref.watch(teacherRepositoryProvider).testResults(id),
);

final testRunProvider = FutureProvider.autoDispose.family<List<TestRunRow>, String>(
  (ref, testId) => ref.watch(teacherRepositoryProvider).testRun(testId),
);

/// Сурагчийн дэлгэрэнгүй: мэдээлэл, ангийн түүх (Мэдээлэл таб).
final studentDetailProvider = FutureProvider.autoDispose.family<StudentDetail, String>(
  (ref, id) => ref.watch(teacherRepositoryProvider).studentDetail(id),
);

/// Ангийн тухайн өдрийн тестүүдийн эх PDF. Эрхгүй/олдоогүй (403/404) бол хоосон — самбарт саад болохгүй;
/// сүлжээний алдаа бол карт дээр «Дахин оролдох» гарна.
final dayTestPdfsProvider = FutureProvider.autoDispose.family<List<DayTestPdf>, ClassDay>((ref, a) async {
  try {
    return await ref.watch(teacherRepositoryProvider).dayTestPdfs(a.classId, a.date);
  } on ApiError catch (e) {
    if (e.kind == ApiErrorKind.forbidden || e.kind == ApiErrorKind.notFound) return const <DayTestPdf>[];
    rethrow;
  }
});

/// Нийт багшийн цаг харах эсэх: Админ, эсвэл Багш+ дээр `time.review` (вэбийн `TeacherHoursClient`-тэй ижил).
/// Багш үргэлж зөвхөн өөрийнхийг. Эрхийн жагсаалт нээгдэхгүй бол өөрийнх рүү буцна.
final hoursAllScopeProvider = FutureProvider.autoDispose<bool>((ref) async {
  final s = ref.watch(sessionProvider);
  if (s is! SignedIn) return false;
  if (s.role == UserRole.admin) return true;
  if (s.role != UserRole.teacherPlus) return false;
  try {
    return (await ref.watch(staffRepositoryProvider).myCapabilities()).has('time.review');
  } on ApiError {
    return false;
  }
});

final teacherHoursProvider = FutureProvider.autoDispose.family<TeacherHours, String>((ref, month) async {
  final all = await ref.watch(hoursAllScopeProvider.future);
  return ref.watch(teacherRepositoryProvider).teacherHours(month, all: all);
});

final assignmentsProvider = FutureProvider.autoDispose.family<List<AssignmentSummary>, String>(
  (ref, classId) => ref.watch(teacherRepositoryProvider).assignments(classId),
);

final submissionsProvider = FutureProvider.autoDispose.family<List<Submission>, String>(
  (ref, id) => ref.watch(teacherRepositoryProvider).submissions(id),
);

typedef ActivityArgs = ({String studentId, int year});

/// Сурагчийн нэг жилийн идэвх (бие даасан явц).
final studentActivityProvider = FutureProvider.autoDispose.family<ActivityYear, ActivityArgs>(
  (ref, a) => ref.watch(teacherRepositoryProvider).studentActivity(a.studentId, a.year),
);

/// Өдрийн хичээлийн тэмдэглэлүүд (`scheduleId`-аар).
final lessonNotesProvider = FutureProvider.autoDispose.family<Map<String, LessonNote>, String>(
  (ref, date) => ref.watch(teacherRepositoryProvider).lessonNotes(date),
);

typedef ClassDay = ({String classId, String date});

/// Ангийн тарах цаг. null = тэмдэглээгүй. 403/404 = энэ ангид хамаарахгүй (UI нууна).
final dismissalProvider = FutureProvider.autoDispose.family<DismissalInfo?, ClassDay>(
  (ref, a) => ref.watch(teacherRepositoryProvider).dismissal(a.classId, a.date),
);

final criteriaProvider = FutureProvider.autoDispose.family<CriteriaPayload, String>(
  (ref, classId) => ref.watch(teacherRepositoryProvider).criteria(classId),
);

// ───────── Сурагчийн тэмдэглэл ─────────

final studentNotesProvider = AsyncNotifierProvider.autoDispose
    .family<StudentNotesController, List<StudentNote>, String>(StudentNotesController.new);

/// Сурагчийн тэмдэглэл (`/students/:id/notes`, зөвхөн GENERAL). Устгал серверт ХАТУУ — UI баталгаажуулна.
class StudentNotesController extends AsyncNotifier<List<StudentNote>> {
  StudentNotesController(this.studentId);

  final String studentId;

  TeacherRepository get _repo => ref.read(teacherRepositoryProvider);

  @override
  Future<List<StudentNote>> build() => _repo.notes(studentId);

  /// Алдааны бичвэр эсвэл null (амжилттай).
  Future<String?> add(String body) => _guard(() async {
    final note = await _repo.addNote(studentId, body.trim());
    state = AsyncData([note, ...?state.value]);
  }, 'Тэмдэглэл хадгалагдсангүй');

  Future<String?> edit(String id, String body) => _guard(() async {
    final note = await _repo.editNote(id, body.trim());
    state = AsyncData([
      for (final n in state.value ?? const <StudentNote>[])
        if (n.id == id) note.copyWith(authorName: note.authorName ?? n.authorName, canEdit: true) else n,
    ]);
  }, 'Тэмдэглэл засагдсангүй');

  Future<String?> remove(String id) => _guard(() async {
    await _repo.deleteNote(id);
    state = AsyncData([
      for (final n in state.value ?? const <StudentNote>[])
        if (n.id != id) n,
    ]);
  }, 'Тэмдэглэл устсангүй');

  Future<String?> _guard(Future<void> Function() fn, String fallback) async {
    try {
      await fn();
      return null;
    } catch (e) {
      return e is ApiError && e.message.trim().isNotEmpty ? e.message : fallback;
    }
  }
}

/// Хүснэгтийн алдааны бичвэр: ApiError бол түүний монгол мессеж, эс бөгөөс [fallback].
String errorText(Object e, String fallback) =>
    e is ApiError && e.kind != ApiErrorKind.unknown && e.message.trim().isNotEmpty ? e.message : fallback;

/// Нэвтэрсэн хүний эрх (UI нуух/харуулах; шийдвэр серверт).
final teacherRoleProvider = Provider<UserRole?>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedIn ? s.role : null;
});

/// Багш+ эсвэл Админ (Багшаас илүү өдөр тутмын үйлдэл харах).
final canManageProvider = Provider<bool>((ref) {
  final r = ref.watch(teacherRoleProvider);
  return r == UserRole.admin || r == UserRole.teacherPlus;
});

/// Админ эсэх — багшийн самбарт «Удирдлага» товч харуулна.
final isAdminProvider = Provider<bool>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedIn && s.role == UserRole.admin;
});
