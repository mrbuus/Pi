import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'json.dart';
import 'lesson_models.dart';

/// Бодлого бүрийн бичлэг (`api/src/videos`) — вэбийн `ProblemVideoDisclosure`-тай ижил хоёр дуудлага.
class ProblemVideoRepository {
  const ProblemVideoRepository(this._api);

  final ApiClient _api;

  /// `GET /videos/problem?problemId=` — товч жагсаалт (`id`, `title`, `duration`).
  Future<List<LessonVideo>> forProblem(String problemId) {
    _check(problemId);
    return _api.get(
      '/videos/problem',
      query: {'problemId': problemId},
      parse: (j) => [for (final v in asList(j)) LessonVideo.fromJson(v)],
    );
  }

  /// `POST /videos/{id}/open` `{problemId}` — нээсэн үйлдлийг тусламжтай оролдлогын баримт болгож, тоглуулах хаяг буцаана.
  Future<LessonVideo> open(String videoId, String problemId) {
    _check(videoId);
    _check(problemId);
    return _api.post('/videos/$videoId/open', body: {'problemId': problemId}, parse: LessonVideo.fromJson);
  }

  static void _check(String id) {
    if (!isSafeId(id)) throw const ApiError(ApiErrorKind.notFound, 'Бичлэг олдсонгүй.');
  }
}

final problemVideoRepositoryProvider = Provider<ProblemVideoRepository>(
  (ref) => ProblemVideoRepository(ref.watch(apiClientProvider)),
);
