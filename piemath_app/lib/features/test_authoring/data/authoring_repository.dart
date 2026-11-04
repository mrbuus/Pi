import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'authoring_models.dart';

List<Object?> _rows(Object? j) => j is List ? j.cast<Object?>() : const [];

/// Тест зохиох, засах API (`api/src/tests`, `api/src/content`). Эрх: Админ, Багш+, Багш (серверт).
///
/// Хүсэлт бүр давтагдахгүй (`retry: false`) — тест, бодлого давхар үүсэхгүй.
class TestAuthoringRepository {
  TestAuthoringRepository(this._api);

  final ApiClient _api;

  static String _id(String id) => Uri.encodeComponent(id);

  // ---------------- Каталог ----------------

  /// `GET /classrooms` — Багшид өөрийн, Багш+/Админд бүх анги.
  Future<List<ClassroomOption>> classrooms() =>
      _api.get('/classrooms', parse: (j) => [for (final r in _rows(j)) ClassroomOption.fromJson(r)]);

  /// `GET /chapters?subject=` — хоосон бол бүх хичээл.
  Future<List<ChapterOption>> chapters({String subject = ''}) => _api.get(
    '/chapters',
    query: {'subject': subject.isEmpty ? null : subject},
    parse: (j) => [for (final r in _rows(j)) ChapterOption.fromJson(r)],
  );

  /// `GET /chapters/:id/problems?take=100` — ажилтанд хариутай (бодлогын сан).
  Future<List<ServerProblem>> chapterProblems(String chapterId) => _api.get(
    '/chapters/${_id(chapterId)}/problems',
    query: {'take': 100},
    parse: (j) => [for (final r in _rows(j)) ServerProblem.fromJson(r)],
  );

  /// `POST /chapters/for-subject` — номгүй хичээлд тестийн нэрээр бүлэг (ижил нэртэй байвал түүнийг).
  Future<String> ensureSubjectChapter({required String subject, required String title}) => _api.post(
    '/chapters/for-subject',
    body: {'subject': subject, 'title': title},
    parse: (j) {
      final id = j is Map ? j['id'] : null;
      if (id is! String || id.isEmpty) throw const FormatException('id');
      return id;
    },
  );

  // ---------------- Ноорог (`/tests/drafts`) ----------------

  Future<TestDraftSnapshot> createDraft(Map<String, Object?> state) =>
      _api.post('/tests/drafts', body: state, parse: TestDraftSnapshot.fromJson);

  Future<TestDraftSnapshot> draft(String id) => _api.get('/tests/drafts/${_id(id)}', parse: TestDraftSnapshot.fromJson);

  /// Зөрвөл 409 (өөр төхөөрөмжөөс шинэчлэгдсэн).
  Future<TestDraftSnapshot> updateDraft(String id, Map<String, Object?> state, {required int expectedRevision}) =>
      _api.patch(
        '/tests/drafts/${_id(id)}',
        body: {...state, 'expectedRevision': expectedRevision},
        parse: TestDraftSnapshot.fromJson,
      );

  // `DELETE /tests/drafts/:id` нь серверт ЖИНХЭНЭ устгал (soft биш) тул апп дуудахгүй — нооргийн
  // заагчийг л мартана (RULES §6: UI-аас жинхэнэ устгал хийхгүй).

  // ---------------- Тест ----------------

  /// `POST /tests`.
  Future<CreatedTest> createTest(Map<String, Object?> body) =>
      _api.post('/tests', body: body, parse: CreatedTest.fromJson);

  /// `GET /tests/:id` — ажилтны хувилбар (бодлого, хариу, хувилбар).
  Future<TestDetails> test(String id) => _api.get('/tests/${_id(id)}', parse: TestDetails.fromJson);

  /// `GET /tests/:id/edit-info` — Багш зөвхөн өөрийн тестэд (бусад нь 403).
  Future<EditInfo> editInfo(String id) => _api.get('/tests/${_id(id)}/edit-info', parse: EditInfo.fromJson);

  /// `PATCH /tests/:id` (`expectedVersion`, `overwrite`).
  Future<SaveResponse> updateTest(String id, Map<String, Object?> body) =>
      _api.patch('/tests/${_id(id)}', body: body, parse: SaveResponse.fromJson);

  /// `POST /tests/:id/duplicate` — хуулбар нь хувийн ноорог (анги сонгож хадгалахад нийтлэгдэнэ).
  Future<DuplicatedTest> duplicate(String id) =>
      _api.post('/tests/${_id(id)}/duplicate', parse: DuplicatedTest.fromJson);

  /// `GET /tests` — ажилтны жагсаалт (1000 бодлогогүй).
  Future<List<StaffTestRow>> staffTests() =>
      _api.get('/tests', parse: (j) => [for (final r in _rows(j)) StaffTestRow.fromJson(r)]);

  // ---------------- Бодлого ----------------

  /// `POST /problems` — шинэ бодлого (Багш ч бичнэ).
  Future<ServerProblem> createProblem(Map<String, Object?> body) =>
      _api.post('/problems', body: body, parse: ServerProblem.fromJson);

  /// `PATCH /problems/:id` — Админ, Багш+ (агуулга).
  Future<SaveResponse> updateProblem(String id, Map<String, Object?> body) =>
      _api.patch('/problems/${_id(id)}', body: body, parse: SaveResponse.fromJson);
}

final testAuthoringRepositoryProvider = Provider<TestAuthoringRepository>(
  (ref) => TestAuthoringRepository(ref.watch(apiClientProvider)),
);
