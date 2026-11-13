import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';

// Гэрийн даалгаврыг ангид богино шалгалтаар шалгах (эзэн 2026-11-08) — `api/src/homework-quiz`.
// ADMIN / TEACHER_PLUS / TEACHER, самбарын тэмдэглэх эрхтэй ижил (сервер `assertMarkAccess`).

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};
String _enc(String v) => Uri.encodeComponent(v);

/// Нэг анги, нэг өдрийн шалгалт.
@immutable
class QuizInfo {
  const QuizInfo({required this.id, required this.problemCount, this.updatedBy});

  factory QuizInfo.fromJson(Map<String, Object?> j) => QuizInfo(
    id: j['id'] as String? ?? '',
    problemCount: (j['problemCount'] as num?)?.toInt() ?? 0,
    updatedBy: j['updatedBy'] as String?,
  );

  final String id;
  final int problemCount;
  final String? updatedBy;
}

/// `GET/PUT/DELETE /classrooms/:id/homework-quiz` хариу.
@immutable
class QuizPayload {
  const QuizPayload({this.quiz, this.scores = const {}});

  factory QuizPayload.fromJson(Object? json) {
    final j = _map(json);
    return QuizPayload(
      quiz: j['quiz'] is Map ? QuizInfo.fromJson(_map(j['quiz'])) : null,
      scores: {
        for (final s in (j['scores'] as List?) ?? const [])
          if (s is Map && s['studentId'] is String && s['score'] is num) s['studentId'] as String: s['score'] as num,
      },
    );
  }

  final QuizInfo? quiz;

  /// Сурагч → оноо (бутархай байж болно).
  final Map<String, num> scores;
}

/// Сурагчийн сарын шалгалтын нэг өдөр (`.../students/:studentId?month=`).
@immutable
class QuizDayRow {
  const QuizDayRow({required this.date, required this.score, required this.problemCount});

  factory QuizDayRow.fromJson(Map<String, Object?> j) => QuizDayRow(
    date: j['date'] as String? ?? '',
    score: j['score'] as num? ?? 0,
    problemCount: (j['problemCount'] as num?)?.toInt() ?? 0,
  );

  final String date;
  final num score;
  final int problemCount;
}

class HomeworkQuizRepository {
  const HomeworkQuizRepository(this._api);

  final ApiClient _api;

  String _base(String classId) => '/classrooms/${_enc(classId)}/homework-quiz';

  /// Самбар бүрт шинээр (кэшээс биш) — хоёр багш зэрэг оноо оруулж болно.
  Future<QuizPayload> get(String classId, String date) =>
      _api.get(_base(classId), query: {'date': date}, parse: QuizPayload.fromJson, cache: false);

  /// Эхлүүлэх эсвэл бодлогын тоог засах.
  Future<QuizPayload> setProblemCount(String classId, String date, int problemCount) =>
      _api.put(_base(classId), body: {'date': date, 'problemCount': problemCount}, parse: QuizPayload.fromJson);

  /// Шалгалтыг устгах (сервер зөөлөн устгана, оноо хамт).
  Future<QuizPayload> remove(String classId, String date) =>
      _api.delete('${_base(classId)}?date=$date', parse: QuizPayload.fromJson);

  /// Нэг сурагчийн оноо; null = цэвэрлэх.
  Future<void> setScore(String classId, String studentId, String date, num? score) =>
      _api.put<Object?>('${_base(classId)}/scores/${_enc(studentId)}', body: {'date': date, 'score': score});

  /// Сурагчийн тухайн сарын шалгалтууд (`YYYY-MM`).
  Future<List<QuizDayRow>> studentMonth(String classId, String studentId, String month) => _api.get(
    '${_base(classId)}/students/${_enc(studentId)}',
    query: {'month': month},
    parse: (j) => [
      for (final e in (j as List?) ?? const [])
        if (e is Map) QuizDayRow.fromJson(e.cast<String, Object?>()),
    ],
  );
}

final homeworkQuizRepositoryProvider = Provider<HomeworkQuizRepository>(
  (ref) => HomeworkQuizRepository(ref.watch(apiClientProvider)),
);
