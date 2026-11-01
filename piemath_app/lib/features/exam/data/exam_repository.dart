import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'exam_models.dart';
import 'ranking_models.dart';

/// Шалгалтын API (`docs/api-contract/exam.md`). Бизнесийн дүрэм (оноо, нээгдэх, хаалт) серверт.
class ExamRepository {
  const ExamRepository(this._api);

  final ApiClient _api;

  /// «Өгөх» таб — дасгал тест (1000 бодлого орно). Шалгалтын төрлийг дуудагч шүүнэ.
  Future<List<TestRow>> tests() => _api.get(
    '/tests',
    query: const {'includeThousand': '1'},
    parse: (j) => [for (final r in (j as List? ?? const [])) TestRow.fromJson(r)],
  );

  /// Шалгалтууд (CHAPTER_EXAM / EESH_MOCK / THOUSAND) — оноосон, өгсөн, ирээгүй.
  Future<List<TestRow>> myExams() => _api.get(
    '/exam-results/my',
    parse: (j) => [for (final r in ((j as Map?)?['exams'] as List? ?? const [])) TestRow.fromJson(r)],
  );

  Future<TestMeta> meta(String testId) => _api.get('/tests/${_id(testId)}', parse: TestMeta.fromJson);

  /// Idempotent: дахин дуудахад ижил дараалал, хадгалсан хариу, үлдсэн хугацаа.
  /// POST боловч сервер давхар сесс үүсгэдэггүй тул сүлжээний алдаанд нэг удаа давтаж болно.
  Future<StartResult> start(String testId) =>
      _api.post('/tests/${_id(testId)}/start', parse: StartResult.fromJson, retry: true);

  /// Autosave — зөвхөн өөрчлөгдсөн талбар. Сервер бодлого бүрээр нэгтгэдэг (idempotent).
  Future<SaveResponse> save(String testId, Map<String, Object?> body) =>
      _api.patch('/tests/${_id(testId)}/session', body: body, parse: SaveResponse.fromJson, retry: true);

  /// Илгээх. 409 («аль хэдийн өгсөн») нь амжилт — дүн рүү шилжинэ (`null` буцаана).
  Future<ScorePair?> submit(String testId, Map<String, Object?> body) async {
    try {
      return await _api.post(
        '/tests/${_id(testId)}/submit',
        body: body,
        parse: (j) => ScorePair.fromJson((j as Map?)?['result']),
      );
    } on ApiError catch (e) {
      if (e.kind == ApiErrorKind.conflict) return null;
      rethrow;
    }
  }

  Future<ExamResultPage> examResult(String testId) =>
      _api.get('/exam-results/my/${_id(testId)}', parse: ExamResultPage.fromJson);

  /// Ангийн байр — ЗӨВХӨН хэрэглэгч өөрөө нээхэд дуудна (анхдагчаар харуулахгүй).
  Future<TestRanking> ranking(String testId) =>
      _api.get('/test-rankings/${_id(testId)}', parse: TestRanking.fromJson);

  Future<PracticeReview> review(String testId) =>
      _api.get('/tests/${_id(testId)}/review', parse: PracticeReview.fromJson);

  Future<ThousandReview> thousandReview(String testId) =>
      _api.get('/thousand/tests/${_id(testId)}/review', parse: ThousandReview.fromJson);

  /// «Сул сэдвээ давтах» — давтлага үүсгэж id буцаана.
  Future<String?> startPractice(List<String> chapterIds, String clientRequestId) => _api.post(
    '/study-review',
    body: {'clientRequestId': clientRequestId, 'budgetMinutes': 10, 'chapterIds': chapterIds},
    parse: (j) => (j as Map?)?['id'] as String?,
  );

  /// Замын параметрийг шалгах (deep link-ээр ирсэн id).
  static String _id(String id) {
    if (!RegExp(r'^[A-Za-z0-9_-]{1,64}$').hasMatch(id)) {
      throw const ApiError(ApiErrorKind.notFound, 'Тест олдсонгүй.');
    }
    return id;
  }
}

final examRepositoryProvider = Provider<ExamRepository>((ref) => ExamRepository(ref.watch(apiClientProvider)));
