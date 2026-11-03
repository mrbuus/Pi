import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'json.dart';
import 'problem_review_models.dart';

/// Алдсан бодлогын хугацаатай давталт (`api/src/mistakes/problem-review.*`). Хариуг СЕРВЕР шалгана.
class ProblemReviewRepository {
  const ProblemReviewRepository(this._api);

  final ApiClient _api;

  /// Хугацаа нь болсон бодлогууд (1–30).
  Future<DueReviews> due({int limit = 10}) =>
      _api.get('/review/problems/due', query: {'limit': limit}, parse: DueReviews.fromJson);

  /// Хариулт. Илгээх хүсэлт ХЭЗЭЭ Ч давтагдахгүй. [answer] нь алдааны дэвтрийн retry-тай ижил хэлбэр.
  Future<ReviewAnswerResult> answer(String id, Object answer) {
    if (!isSafeId(id)) throw const ApiError(ApiErrorKind.notFound, 'Давтах бодлого олдсонгүй.');
    return _api.post('/review/problems/$id/answer', body: {'answer': answer}, parse: ReviewAnswerResult.fromJson);
  }
}

final problemReviewRepositoryProvider = Provider<ProblemReviewRepository>(
  (ref) => ProblemReviewRepository(ref.watch(apiClientProvider)),
);

/// Төв, төлөвлөгөө, давталтын дэлгэц нэг жагсаалтыг хуваалцана.
final dueProblemsProvider = FutureProvider.autoDispose<DueReviews>(
  (ref) => ref.watch(problemReviewRepositoryProvider).due(),
);
