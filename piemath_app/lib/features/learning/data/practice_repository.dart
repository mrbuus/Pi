import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'json.dart';
import 'practice_models.dart';

/// Дасгалын API (`docs/api-contract/learning.md` §3). Зөв/буруугийн дүгнэлтийг СЕРВЕР гаргана.
class PracticeRepository {
  const PracticeRepository(this._api);

  final ApiClient _api;

  /// [хүнд] 1-2 сек — дахин бүү дууд, кэшлэ.
  Future<List<Recommendation>> next({int limit = 10}) => _api.get(
    '/recommend/next',
    query: {'limit': limit},
    parse: (j) => [for (final r in asList(j)) Recommendation.fromJson(r)],
  );

  Future<PracticeProblem> problem(String id) {
    if (!isSafeId(id)) throw const ApiError(ApiErrorKind.notFound, 'Бодлого олдсонгүй.');
    return _api.get('/problems/$id', parse: PracticeProblem.fromJson);
  }

  /// `autoCorrect`-ыг илгээхгүй — сервер өөрөө дүгнэнэ. Илгээлт давтагдахгүй.
  Future<AttemptResult> attempt(String problemId, Object answer) =>
      _api.post('/recommend/attempt', body: {'problemId': problemId, 'givenAnswer': answer}, parse: AttemptResult.fromJson);
}

final practiceRepositoryProvider = Provider<PracticeRepository>((ref) => PracticeRepository(ref.watch(apiClientProvider)));

final recommendationsProvider = FutureProvider.autoDispose<List<Recommendation>>(
  (ref) => ref.watch(practiceRepositoryProvider).next(),
);

final practiceProblemProvider = FutureProvider.autoDispose.family<PracticeProblem, String>(
  (ref, id) => ref.watch(practiceRepositoryProvider).problem(id),
);
