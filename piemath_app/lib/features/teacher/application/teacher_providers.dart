import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/ub_time.dart';
import '../data/teacher_models.dart';
import '../data/teacher_repository.dart';

/// «Өнөөдөр» (UB). Тестэд тогтмол огноогоор солино.
final teacherTodayProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

/// Нэвтэрсэн хүний id («Миний анги» шүүлтэд).
final teacherUserIdProvider = Provider<String?>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedIn ? (s.user?.id ?? s.auth.userId) : null;
});

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

final teacherHoursProvider = FutureProvider.autoDispose.family<TeacherHours, String>(
  (ref, month) => ref.watch(teacherRepositoryProvider).teacherHours(month),
);

final assignmentsProvider = FutureProvider.autoDispose.family<List<AssignmentSummary>, String>(
  (ref, classId) => ref.watch(teacherRepositoryProvider).assignments(classId),
);

final submissionsProvider = FutureProvider.autoDispose.family<List<Submission>, String>(
  (ref, id) => ref.watch(teacherRepositoryProvider).submissions(id),
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
