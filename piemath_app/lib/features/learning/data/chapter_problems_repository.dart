import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'chapter_problem_models.dart';
import 'json.dart';

class ChapterProblemsRepository {
  const ChapterProblemsRepository(this._api);

  final ApiClient _api;

  Future<List<ChapterProblem>> page(String chapterId, {int skip = 0, int take = chapterProblemsPageSize}) {
    if (!isSafeId(chapterId)) throw const ApiError(ApiErrorKind.notFound, 'Бүлэг олдсонгүй.');
    return _api.get(
      '/chapters/$chapterId/problems',
      query: {'skip': skip, 'take': take},
      parse: (j) => [for (final p in asList(j)) ChapterProblem.fromJson(p)],
    );
  }
}

final chapterProblemsRepositoryProvider = Provider<ChapterProblemsRepository>(
  (ref) => ChapterProblemsRepository(ref.watch(apiClientProvider)),
);
