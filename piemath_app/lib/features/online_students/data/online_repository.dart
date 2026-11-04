import '../../../core/network/api_client.dart';
import '../../results/data/results_models.dart' show jsonList, jsonMap;
import 'online_models.dart';

String _enc(String v) => Uri.encodeComponent(v);

/// Онлайн сурагчдын API (`api/src/progress`). Харах — Багш, Багш+, Админ; засах (тест оноох, оролдлого
/// засах) — зөвхөн Багш+, Админ. Шийдвэр серверт.
class OnlineRepository {
  const OnlineRepository(this._api);

  final ApiClient _api;

  /// `GET /progress/online-students` — [passStatus] `ACTIVE`/`EXPIRED`, [activity] `ACTIVE`/`SLOWING`/`DORMANT`.
  Future<OnlinePage> roster({String? search, String? passStatus, String? activity, int page = 1, int pageSize = 50}) =>
      _api.get(
        '/progress/online-students',
        query: {
          if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
          'passStatus': ?passStatus,
          'activity': ?activity,
          'page': '$page',
          'pageSize': '$pageSize',
        },
        parse: (j) => OnlinePage.fromJson(jsonMap(j)),
      );

  /// `GET /progress/student/:id` — онлайн төрлийн сурагч биш бол 400.
  Future<OnlineDetail> detail(String studentId) =>
      _api.get('/progress/student/${_enc(studentId)}', parse: (j) => OnlineDetail.fromJson(jsonMap(j)));

  /// `GET /progress/student/:id/timeline?from=&to=` (`YYYY-MM-DD`), хамгийн ихдээ 300 мөр.
  Future<List<TimelineItem>> timeline(String studentId, {required String from, required String to}) => _api.get(
    '/progress/student/${_enc(studentId)}/timeline',
    query: {'from': from, 'to': to},
    parse: (j) => [for (final i in jsonList(jsonMap(j)['items'])) ?TimelineItem.fromJson(i)],
  );

  /// `GET /tests` — оноох тестийн сонголт.
  Future<List<TestPick>> tests() =>
      _api.get('/tests', parse: (j) => [for (final t in jsonList(j)) TestPick.fromJson(t)]);

  /// `POST /progress/student/:id/assign-test` (Багш+, Админ).
  Future<void> assignTest(String studentId, {required String testId, String? note}) => _api.post<void>(
    '/progress/student/${_enc(studentId)}/assign-test',
    body: {'testId': testId, if (note != null && note.trim().isNotEmpty) 'note': note.trim()},
    parse: (_) {},
  );

  /// `PATCH /progress/student/:id/attempt/:attemptId` (Багш+, Админ) — тэмдэглэгээ засах (устгахгүй).
  Future<void> adjustAttempt(String studentId, String attemptId, {required String selfState}) => _api.patch<void>(
    '/progress/student/${_enc(studentId)}/attempt/${_enc(attemptId)}',
    body: {'selfState': selfState},
    parse: (_) {},
  );
}
