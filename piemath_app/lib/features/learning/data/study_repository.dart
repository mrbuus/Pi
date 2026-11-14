import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'json.dart';
import 'study_models.dart';

/// Хугацаатай давтлагын API (`docs/api-contract/learning.md` §2).
/// `clientRequestId` нь idempotency түлхүүр тул илгээх хүсэлтийг ижил id-тай аюулгүй давтаж болно.
class StudyRepository {
  const StudyRepository(this._api);

  final ApiClient _api;

  Future<StudyOptions> options() => _api.get('/study-review/options', parse: StudyOptions.fromJson);

  Future<StudyRun> create({required int budgetMinutes, required List<String> chapterIds, required String requestId}) =>
      _api.post(
        '/study-review',
        body: {'clientRequestId': requestId, 'budgetMinutes': budgetMinutes, 'chapterIds': chapterIds},
        parse: StudyRun.fromJson,
        retry: true,
      );

  Future<StudyRun> run(String id) => _api.get('/study-review/${_id(id)}', parse: StudyRun.fromJson);

  /// [kind]: `FIRST` | `CORRECTION`.
  Future<StudyRun> respond(
    String runId,
    String itemId, {
    required String requestId,
    required String answer,
    required List<String> flags,
    required String kind,
  }) => _api.post(
    '/study-review/${_id(runId)}/items/${_id(itemId)}/response',
    body: {'clientRequestId': requestId, 'answer': answer, 'flags': flags, 'kind': kind},
    parse: StudyRun.fromJson,
    retry: true,
  );

  Future<StudyRun> submit(String id) =>
      _api.post('/study-review/${_id(id)}/submit', parse: StudyRun.fromJson, retry: true);

  Future<HistoryPage> history({required int year, String? cursor, int take = 20}) => _api.get(
    '/study-review/history',
    query: {'year': year, 'take': take, 'cursor': cursor},
    parse: HistoryPage.fromJson,
  );

  static String _id(String id) {
    if (!isSafeId(id)) throw const ApiError(ApiErrorKind.notFound, 'Давтлага олдсонгүй.');
    return id;
  }
}

final studyRepositoryProvider = Provider<StudyRepository>((ref) => StudyRepository(ref.watch(apiClientProvider)));
