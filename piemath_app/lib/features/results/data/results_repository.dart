import '../../../core/network/api_client.dart';
import 'results_models.dart';

String _enc(String v) => Uri.encodeComponent(v);

/// Шалгалтын дүнгийн API. Эрх (Багш — өөрийн анги, Багш+/Админ — бүгд), түгжээ, аудит — бүгд серверт.
class ResultsRepository {
  const ResultsRepository(this._api);

  final ApiClient _api;

  /// `GET /tests/:id/results` — Багш өөрийн ангийн сурагчдыг л авна (сервер шүүнэ).
  Future<List<ResultRow>> results(String testId) =>
      _api.get('/tests/${_enc(testId)}/results', parse: (j) => [for (final r in jsonList(j)) ResultRow.fromJson(r)]);

  /// `GET /tests/:id` — нэр, оноосон ангиуд (бодлого, хариуг уншихгүй).
  Future<TestMeta> meta(String testId) =>
      _api.get('/tests/${_enc(testId)}', parse: (j) => TestMeta.fromJson(jsonMap(j)));

  /// `GET /classrooms` — ажилтны ангиуд (Багш — өөрийнх).
  Future<List<ClassOption>> classrooms() =>
      _api.get('/classrooms', parse: (j) => [for (final c in jsonList(j)) ClassOption.fromJson(c)]);

  /// `GET /classrooms/:id/attendance?date=` — тухайн өдрийн идэвхтэй бүртгэл (вэбийн `BulkScoreEntry`).
  Future<List<RosterStudent>> roster(String classId, String dateKey) => _api.get(
    '/classrooms/${_enc(classId)}/attendance',
    query: {'date': dateKey},
    parse: (j) => [
      for (final r in jsonList(j))
        if (r['student'] is Map) RosterStudent.fromJson(jsonMap(r['student'])),
    ],
  );

  /// `GET /users/search?q=` — код, нэр, нэвтрэх нэрээр.
  Future<List<StudentHit>> searchStudents(String q) =>
      _api.get('/users/search', query: {'q': q}, parse: (j) => [for (final s in jsonList(j)) StudentHit.fromJson(s)]);

  /// `POST /tests/:id/results` — гараар дүн. Онлайн дүнг засахад [reason] заавал (Багш+/Админ).
  Future<void> enterResult(
    String testId, {
    required String studentId,
    required double totalScore,
    required double maxScore,
    String? reason,
  }) => _api.post<void>(
    '/tests/${_enc(testId)}/results',
    body: {
      'studentId': studentId,
      'totalScore': totalScore,
      'maxScore': maxScore,
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
    },
    parse: (_) {},
  );

  /// `GET /exams/:id/analytics?classroomId=` — бодлогын анализ. [classId] null = «Бүгд».
  Future<ExamAnalytics> analytics(String testId, {String? classId}) => _api.get(
    '/exams/${_enc(testId)}/analytics',
    query: {'classroomId': classId ?? 'all'},
    parse: (j) => ExamAnalytics.fromJson(jsonMap(j)),
  );

  /// `GET /exams/:testId/students/:studentId` — сурагчийн задаргаа (Багш — өөрийн ангийн сурагч).
  Future<StudentAttempt> studentAttempt(String testId, String studentId) =>
      _api.get('/exams/${_enc(testId)}/students/${_enc(studentId)}', parse: (j) => StudentAttempt.fromJson(jsonMap(j)));
}
