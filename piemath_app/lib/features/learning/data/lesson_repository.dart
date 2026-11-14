import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'json.dart';
import 'lesson_models.dart';

/// Хичээл, бүлэг, видео (`api/src/lessons`, `api/src/videos`).
class LessonRepository {
  const LessonRepository(this._api);

  final ApiClient _api;

  Future<List<LessonChapter>> chapters() =>
      _api.get('/lessons/chapters', parse: (j) => [for (final c in asList(j)) LessonChapter.fromJson(c)]);

  Future<Lesson> lesson(String chapterId) => _api.get('/lessons/${_id(chapterId)}', parse: Lesson.fromJson);

  /// Явцын тэмдэглэгээ. Алдаа гарвал чимээгүй (сурагчийн үзэлтийг эвдэхгүй). Үйлдэл: THEORY_READ, VIDEO_STARTED, VIDEO_COMPLETED.
  Future<void> progress(String chapterId, String action, {String? theoryId, String? videoId}) async {
    try {
      await _api.post<void>(
        '/lessons/${_id(chapterId)}/progress',
        body: {'action': action, 'theoryId': ?theoryId, 'videoId': ?videoId},
      );
    } catch (_) {}
  }

  Future<List<VideoChapter>> videoChapters() =>
      _api.get('/videos/chapters', parse: (j) => [for (final c in asList(j)) VideoChapter.fromJson(c)]);

  Future<List<LessonVideo>> chapterVideos(String chapterId) => _api.get(
    '/videos',
    query: {'chapterId': _id(chapterId)},
    parse: (j) => [for (final v in asList(j)) LessonVideo.fromJson(v)],
  );

  static String _id(String id) {
    if (!isSafeId(id)) throw const ApiError(ApiErrorKind.notFound, 'Бүлэг олдсонгүй.');
    return id;
  }
}

final lessonRepositoryProvider = Provider<LessonRepository>((ref) => LessonRepository(ref.watch(apiClientProvider)));

final lessonChaptersProvider = FutureProvider.autoDispose<List<LessonChapter>>(
  (ref) => ref.watch(lessonRepositoryProvider).chapters(),
);

final lessonProvider = FutureProvider.autoDispose.family<Lesson, String>(
  (ref, id) => ref.watch(lessonRepositoryProvider).lesson(id),
);

final videoChaptersProvider = FutureProvider.autoDispose<List<VideoChapter>>(
  (ref) => ref.watch(lessonRepositoryProvider).videoChapters(),
);

final chapterVideosProvider = FutureProvider.autoDispose.family<List<LessonVideo>, String>(
  (ref, id) => ref.watch(lessonRepositoryProvider).chapterVideos(id),
);

/// Видеог нээх үйлдэл — тестэд солино. Зөвхөн сурагч товшсон үед л дуудна (автоматаар ачаалахгүй).
abstract class VideoLauncher {
  Future<bool> open(Uri uri);
}

/// Тоглуулж болох хост — зөвхөн YouTube (nocookie embed, `domain/video_source.dart`). Манай вэб хуудас
/// болон бусад хаягийг апп ХЭЗЭЭ Ч хөтчөөр нээхгүй (эзэн 2026-11-10).
const videoHosts = {'www.youtube-nocookie.com', 'www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'};

bool isPlayableVideoUri(Uri uri) => uri.scheme == 'https' && videoHosts.contains(uri.host);

class SystemVideoLauncher implements VideoLauncher {
  const SystemVideoLauncher();

  @override
  Future<bool> open(Uri uri) async {
    if (!isPlayableVideoUri(uri)) return false;
    try {
      return await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
    } catch (_) {
      return false;
    }
  }
}

final videoLauncherProvider = Provider<VideoLauncher>((ref) => const SystemVideoLauncher());
