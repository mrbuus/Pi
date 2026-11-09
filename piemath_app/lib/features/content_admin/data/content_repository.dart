import '../../../core/network/api_client.dart';
import 'content_models.dart';

String _enc(String v) => Uri.encodeComponent(v);

List<T> _list<T>(Object? j, T Function(Object?) f) => [for (final e in asList(j)) f(e)];

/// Агуулгын удирдлагын API: онол (`api/src/lessons`), жишиг сорил (`api/src/mock-exams`), түвшин тогтоох
/// (`api/src/placement`), нэвтрэх бичиг (`api/src/auth`). Эрхийг сервер шалгана — апп зөвхөн товч нуухад.
class ContentRepository {
  const ContentRepository(this._api);

  final ApiClient _api;

  // ---- Онол ----

  Future<List<ContentBook>> books(ContentSubject subject) =>
      _api.get('/books', query: {'subject': subject.api}, parse: (j) => _list(j, ContentBook.fromJson));

  Future<List<ContentChapter>> chapters(String bookId) =>
      _api.get('/chapters', query: {'bookId': bookId}, parse: (j) => _list(j, ContentChapter.fromJson));

  Future<List<TheoryItem>> theories(String chapterId) => _api.get('/lessons/${_enc(chapterId)}', parse: parseTheories);

  /// [requestId] — давхардал арилгах түлхүүр (ижил агуулгыг дахин илгээхэд ижил id).
  Future<void> createTheory(
    String chapterId, {
    required String title,
    required String content,
    required List<String> imageKeys,
    required String requestId,
  }) => _api.post<Object?>(
    '/lessons/${_enc(chapterId)}/theory',
    body: {'title': title, 'content': content, 'imageKeys': imageKeys, 'clientRequestId': requestId},
  );

  Future<void> updateTheory(
    String id, {
    required String title,
    required String content,
    required List<String> imageKeys,
  }) => _api.patch<Object?>(
    '/lessons/theory/${_enc(id)}',
    body: {'title': title, 'content': content, 'imageKeys': imageKeys},
  );

  /// Архивлах (зөөлөн, `archivedAt`) — Админ, Багш+. [restoreTheory]-ээр буцаана.
  Future<void> archiveTheory(String id) => _api.delete<Object?>('/lessons/theory/${_enc(id)}');

  Future<void> restoreTheory(String id) =>
      _api.post<Object?>('/lessons/theory/${_enc(id)}/restore', body: const <String, Object?>{});

  Future<void> reorderTheory(String chapterId, List<String> ids) =>
      _api.patch<Object?>('/lessons/${_enc(chapterId)}/theory/reorder', body: {'ids': ids});

  // ---- Жишиг сорил ----

  Future<List<MockEvent>> mockEvents() => _api.get('/mock-exams/admin', parse: (j) => _list(j, MockEvent.fromJson));

  Future<List<MockTestOption>> mockTests() =>
      _api.get('/mock-exams/tests', parse: (j) => _list(j, MockTestOption.fromJson));

  Future<void> createMock({
    required String title,
    required String testId,
    required DateTime startsAt,
    int? lateMin,
    String? note,
  }) => _api.post<Object?>(
    '/mock-exams',
    body: {
      'title': title,
      'testId': testId,
      'startsAt': startsAt.toUtc().toIso8601String(),
      'lateMin': ?lateMin,
      if (note != null && note.isNotEmpty) 'note': note,
    },
  );

  /// Нийтлэх / нийтлэлийг хаах. Сорилыг устгах үйлдэл апп-д байхгүй (сервер бүр мөсөн устгадаг).
  Future<void> setMockPublished(String id, bool published) =>
      _api.patch<Object?>('/mock-exams/${_enc(id)}', body: {'published': published});

  Future<List<MockRegistration>> mockRegistrations(String id) =>
      _api.get('/mock-exams/${_enc(id)}/registrations', parse: (j) => _list(j, MockRegistration.fromJson));

  // ---- Түвшин тогтоох ----

  Future<List<PlacementAttempt>> placements() =>
      _api.get('/placement', parse: (j) => _list(j, PlacementAttempt.fromJson));

  Future<PlacementDetail> placement(String id) => _api.get('/placement/${_enc(id)}', parse: PlacementDetail.fromJson);

  Future<void> reviewPlacement(
    String id, {
    required PlacementStatus status,
    required String level,
    required String note,
  }) =>
      _api.patch<Object?>('/placement/${_enc(id)}', body: {'status': status.api, 'level': level, 'teacherNote': note});

  Future<PlacementConfig> placementConfig() => _api.get('/placement/config', parse: PlacementConfig.fromJson);

  Future<void> savePlacementConfig(PlacementConfig c) => _api.put<Object?>('/placement/config', body: c.toJson());

  // ---- Нэвтрэх хуудасны бичиг ----

  Future<String> loginText() => _api.get('/auth/login-text', auth: false, parse: (j) => asStr(asMap(j)['body']) ?? '');

  Future<String> saveLoginText(String body) =>
      _api.put('/auth/login-text', body: {'body': body}, parse: (j) => asStr(asMap(j)['body']) ?? body);
}
