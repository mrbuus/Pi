import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'teacher_models.dart';

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();

List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) => [
  for (final e in (j as List?) ?? const []) f(_map(e)),
];

String _enc(String v) => Uri.encodeComponent(v);

/// `PATCH /classrooms/:id/homework-marks/:studentId` хариу.
class HwPatchResult {
  const HwPatchResult({required this.applied, this.status, this.comment, this.markedBy, this.updatedAt});

  factory HwPatchResult.fromJson(Map<String, Object?> j) => HwPatchResult(
    applied: j['applied'] != false,
    status: homeworkFromApi(j['status']),
    comment: j['comment'] as String?,
    markedBy: j['markedBy'] as String?,
    updatedAt: j['updatedAt'] as String?,
  );

  final bool applied;
  final HomeworkStatus? status;
  final String? comment;
  final String? markedBy;
  final String? updatedAt;

  HwRow toRow(String studentId) =>
      HwRow(studentId: studentId, status: status, comment: comment, markedBy: markedBy, updatedAt: updatedAt);
}

/// Онлайн даалгаврын шалгалтын үйлдэл (`POST /assignments/:id/review`).
enum ReviewAction {
  approve('APPROVE'),
  giveBack('RETURN'),
  markInClass('MARK_IN_CLASS');

  const ReviewAction(this.api);
  final String api;
}

/// Багшийн API (`docs/api-contract/teacher.md`). Эрх, эрсдэл, тооцоо — сервер; апп зөвхөн харуулна.
/// Мөнгөн дүнтэй endpoint (`/payments/ledger/*`, `class-dashboard.payment`) энд ЗОРИУД байхгүй.
class TeacherRepository {
  const TeacherRepository(this._api);

  final ApiClient _api;

  // ───────── Өнөөдрийн хичээл, самбар ─────────

  Future<DayBoard> dayBoard(String date) =>
      _api.get('/attendance/board', query: {'date': date}, parse: (j) => DayBoard.fromJson(_map(j)));

  Future<BoardPayload> board(String classId, String date) => _api.get(
    '/attendance/classrooms/${_enc(classId)}/board',
    query: {'date': date},
    parse: (j) => BoardPayload.fromJson(_map(j)),
  );

  Future<MarksPayload> marks(String classId, String date) => _api.get(
    '/attendance/classrooms/${_enc(classId)}/marks',
    query: {'date': date},
    parse: (j) => MarksPayload.fromJson(_map(j)),
  );

  /// [entries] — `{studentId, status?, lateRange?, note?, onlyIf?}`. Ирүүлээгүй түлхүүр = өөрчлөхгүй,
  /// `null` = цэвэрлэх (гэрээ §2.3) — тиймээс бие нь Map.
  Future<AttMarkResponse> markAttendance(String classId, String date, List<Map<String, Object?>> entries) => _api.post(
    '/classrooms/${_enc(classId)}/attendance',
    body: {'date': date, 'entries': entries},
    parse: (j) => AttMarkResponse.fromJson(_map(j)),
  );

  /// [fields] — `status`, `comment`, `onlyIf`-ийн аль нь ч (ирүүлээгүй = өөрчлөхгүй).
  Future<HwPatchResult> patchHomework(String classId, String studentId, String date, Map<String, Object?> fields) =>
      _api.patch(
        '/classrooms/${_enc(classId)}/homework-marks/${_enc(studentId)}',
        body: {'date': date, ...fields},
        parse: (j) => HwPatchResult.fromJson(_map(j)),
      );

  Future<HwBulkResponse> bulkHomework(String classId, String date, List<Map<String, Object?>> entries) => _api.post(
    '/classrooms/${_enc(classId)}/homework-marks/bulk',
    body: {'date': date, 'entries': entries},
    parse: (j) => HwBulkResponse.fromJson(_map(j)),
  );

  // ───────── Анги ─────────

  Future<List<ClassroomSummary>> classrooms() =>
      _api.get('/classrooms', parse: (j) => _list(j, ClassroomSummary.fromJson));

  Future<ClassroomDetail> classroom(String id) =>
      _api.get('/classrooms/${_enc(id)}', parse: (j) => ClassroomDetail.fromJson(_map(j)));

  // ───────── Сурагч ─────────

  Future<List<StudentAttendanceRow>> studentAttendance(String id, {required String from, required String to}) =>
      _api.get(
        '/students/${_enc(id)}/attendance',
        query: {'from': from, 'to': to},
        parse: (j) => _list(j, StudentAttendanceRow.fromJson),
      );

  Future<List<StudentHomeworkRow>> studentHomework(String id, {required String from, required String to}) => _api.get(
    '/students/${_enc(id)}/homework-marks',
    query: {'from': from, 'to': to},
    parse: (j) => _list(j, StudentHomeworkRow.fromJson),
  );

  Future<List<StudentTestResult>> testResults(String id) =>
      _api.get('/students/${_enc(id)}/test-results', parse: (j) => _list(j, StudentTestResult.fromJson));

  /// Зөвхөн GENERAL — төлбөрийн тэмдэглэл энгийн багшид харагдахгүй (гэрээ §6.1).
  Future<List<StudentNote>> notes(String studentId) => _api.get(
    '/students/${_enc(studentId)}/notes',
    query: {'type': 'GENERAL'},
    parse: (j) => _list(j, StudentNote.fromJson),
  );

  Future<StudentNote> addNote(String studentId, String body) => _api.post(
    '/students/${_enc(studentId)}/notes',
    body: {'type': 'GENERAL', 'body': body},
    parse: (j) => StudentNote.fromJson(_map(j)),
  );

  Future<StudentNote> editNote(String noteId, String body) =>
      _api.patch('/notes/${_enc(noteId)}', body: {'body': body}, parse: (j) => StudentNote.fromJson(_map(j)));

  /// АНХААР: сервер ХАТУУ устгадаг — дуудахаас өмнө заавал баталгаажуул.
  Future<void> deleteNote(String noteId) => _api.delete<Object?>('/notes/${_enc(noteId)}');

  // ───────── Цаг ─────────

  Future<TeacherHours> teacherHours(String month) =>
      _api.get('/teacher-hours/me', query: {'month': month}, parse: (j) => TeacherHours.fromJson(_map(j)));

  // ───────── Онлайн даалгавар ─────────

  Future<List<AssignmentSummary>> assignments(String classId) =>
      _api.get('/classrooms/${_enc(classId)}/assignments', parse: (j) => _list(j, AssignmentSummary.fromJson));

  Future<List<Submission>> submissions(String assignmentId) =>
      _api.get('/assignments/${_enc(assignmentId)}/submissions', parse: (j) => _list(j, Submission.fromJson));

  Future<void> review(String assignmentId, {required String studentId, required ReviewAction action, String? note}) =>
      _api.post<Object?>(
        '/assignments/${_enc(assignmentId)}/review',
        body: {
          'studentId': studentId,
          'action': action.api,
          if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
        },
      );
}

final teacherRepositoryProvider = Provider<TeacherRepository>((ref) => TeacherRepository(ref.watch(apiClientProvider)));
