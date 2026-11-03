import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'formula_review_models.dart';
import 'json.dart';

class FormulaReviewRepository {
  const FormulaReviewRepository(this._api);

  final ApiClient _api;

  /// `GET /formulas/review/due?limit=` — вэб нүүрэнд 10, тоолуурт 1.
  Future<ReviewDue> due({int limit = 10}) =>
      _api.get('/formulas/review/due', query: {'limit': limit}, parse: ReviewDue.fromJson);

  Future<ReviewStats> stats() => _api.get('/formulas/review/stats', parse: ReviewStats.fromJson);

  /// `POST /formulas/review/{slug}`. Токен нэг удаагийн тул давтан илгээхэд давхар бүртгэгдэхгүй (сервер шийднэ).
  Future<ReviewReceipt> answer(String slug, ReviewAnswer body) {
    if (!isSafeId(slug)) throw const ApiError(ApiErrorKind.notFound, 'Томьёо олдсонгүй.');
    return _api.post('/formulas/review/$slug', body: body.toJson(), parse: ReviewReceipt.fromJson);
  }
}

final formulaReviewRepositoryProvider = Provider<FormulaReviewRepository>(
  (ref) => FormulaReviewRepository(ref.watch(apiClientProvider)),
);

/// Давталтын нүүр: өнөөдрийн карт + тоо.
typedef ReviewHome = ({ReviewDue due, ReviewStats stats});

final formulaReviewHomeProvider = FutureProvider.autoDispose<ReviewHome>((ref) async {
  final repo = ref.watch(formulaReviewRepositoryProvider);
  final r = await Future.wait([repo.due(), repo.stats()]);
  return (due: r[0] as ReviewDue, stats: r[1] as ReviewStats);
});

/// Өнөөдөр давтах томьёоны тоо (вэбийн `ReviewDueCard`: `limit=1`, `dueCount + newCount`).
final formulaReviewCountProvider = FutureProvider.autoDispose<int>(
  (ref) async => (await ref.watch(formulaReviewRepositoryProvider).due(limit: 1)).total,
);
