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

  /// [хүнд] 1-2 сек — дахин бүү дууд, кэшлэ. [chapterIds] өгвөл зөвхөн тэр бүлгүүдээс (сэдвээр дасгал).
  Future<List<Recommendation>> next({int limit = 10, List<String>? chapterIds}) => _api.get(
    '/recommend/next',
    query: {
      'limit': limit,
      if (chapterIds != null && chapterIds.isNotEmpty) 'chapterId': chapterIds.where(isSafeId).take(12).join(','),
    },
    parse: (j) => [for (final r in asList(j)) Recommendation.fromJson(r)],
  );

  /// Хичээлийн чөлөөт сэдэв → бүлэг (яг гарчгаар; эргэлзээтэй бол null).
  Future<ChapterMatch?> chapterMatch(String topic) =>
      _api.get('/recommend/chapter-match', query: {'topic': topic}, parse: ChapterMatch.tryParse);

  Future<PracticeProblem> problem(String id) {
    if (!isSafeId(id)) throw const ApiError(ApiErrorKind.notFound, 'Бодлого олдсонгүй.');
    return _api.get('/problems/$id', parse: PracticeProblem.fromJson);
  }

  /// `autoCorrect`-ыг илгээхгүй — сервер өөрөө дүгнэнэ. Илгээлт давтагдахгүй.
  Future<AttemptResult> attempt(String problemId, Object answer) =>
      _api.post('/recommend/attempt', body: {'problemId': problemId, 'givenAnswer': answer}, parse: AttemptResult.fromJson);
}

final practiceRepositoryProvider = Provider<PracticeRepository>(
  (ref) => PracticeRepository(ref.watch(apiClientProvider)),
);

final recommendationsProvider = FutureProvider.autoDispose<List<Recommendation>>(
  (ref) => ref.watch(practiceRepositoryProvider).next(),
);

/// Сэдвээр дасгал — түлхүүр нь таслалаар нийлүүлсэн бүлгийн ID (`practiceTopicPath`).
final topicRecommendationsProvider = FutureProvider.autoDispose.family<List<Recommendation>, String>(
  (ref, chapters) => ref.watch(practiceRepositoryProvider).next(chapterIds: chapters.split(',')),
);

/// [chapters] байвал сэдвийн, үгүй бол ерөнхий санал.
FutureProvider<List<Recommendation>> recommendationsFor(String? chapters) =>
    chapters == null || chapters.isEmpty ? recommendationsProvider : topicRecommendationsProvider(chapters);

/// Хичээлийн сэдвийн бүлэг. Алдаа/таарахгүй бол null (төлөвлөгөө ерөнхий давтлага руу хөтөлнө).
final lessonTopicChapterProvider = FutureProvider.autoDispose.family<ChapterMatch?, String>((ref, topic) async {
  try {
    return await ref.watch(practiceRepositoryProvider).chapterMatch(topic);
  } catch (_) {
    return null;
  }
});

final practiceProblemProvider = FutureProvider.autoDispose.family<PracticeProblem, String>(
  (ref, id) => ref.watch(practiceRepositoryProvider).problem(id),
);
