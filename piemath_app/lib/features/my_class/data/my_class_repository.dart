import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'hub_models.dart';

/// Сурагчийн өдөр тутмын мэдээлэл — `/student-hub/*`, `/attendance/my`, `/makeup/me`,
/// `/lesson-day/*/photos`, `/tuition/paid-until/my`, `/announcements`, `/assignments/my-classrooms`.
class MyClassRepository {
  const MyClassRepository(this._api);

  final ApiClient _api;

  static Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();
  static List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) =>
      [for (final e in (j! as List)) f(_map(e))];

  Future<HubOverview> overview() => _api.get('/student-hub/overview', parse: (j) => HubOverview.fromJson(_map(j)));

  Future<HubDays> days(String month) =>
      _api.get('/student-hub/days', query: {'month': month}, parse: (j) => HubDays.fromJson(_map(j)));

  Future<List<HubTestRow>> tests({String? q}) => _api.get(
        '/student-hub/tests',
        query: {'q': (q == null || q.trim().isEmpty) ? null : q.trim()},
        parse: (j) => _list(j, HubTestRow.fromJson),
      );

  /// Тестийн бодлого. 403-ийг `code`-оор ялгаж [TestDetailResult] болгоно (алдаа биш, хэвийн төлөв).
  Future<TestDetailResult> testDetail(String testId) async {
    try {
      final d = await _api.get(
        '/student-hub/tests/${Uri.encodeComponent(testId)}',
        parse: (j) => HubTestDetail.fromJson(_map(j)),
      );
      return TestDetailReady(d);
    } on ApiError catch (e) {
      if (e.kind == ApiErrorKind.forbidden) return TestDetailLocked(lockReasonOf(e.body, e.message));
      if (e.kind == ApiErrorKind.notFound) return const TestDetailMissing();
      rethrow;
    }
  }

  Future<List<AttendanceRow>> myAttendance() =>
      _api.get('/attendance/my', parse: (j) => _list(j, AttendanceRow.fromJson));

  Future<List<MakeupItem>> myMakeup() => _api.get('/makeup/me', parse: (j) => _list(j, MakeupItem.fromJson));

  /// Нөхөх тестийг шалгалтын горимоор нээнэ → `testId` (шалгалтын дэлгэц рүү).
  Future<String> openMakeupTest({required String classroomId, required String date, required String testId}) =>
      _api.post(
        '/makeup/me/${Uri.encodeComponent(classroomId)}/$date/tests/${Uri.encodeComponent(testId)}/open',
        parse: (j) => (_map(j)['testId'] as String?) ?? testId,
      );

  /// Нөхөх хичээлийн тэмдэглэлийн зураг — БҮТЭН багцыг орлуулна (`imageKeys` 0–12). Шинэчлэгдсэн мөрийг буцаана.
  Future<MakeupItem> sendMakeupPhotos({required String classroomId, required String date, required List<String> imageKeys}) =>
      _api.post(
        '/makeup/me/${Uri.encodeComponent(classroomId)}/$date/photos',
        body: {'imageKeys': imageKeys},
        parse: (j) => MakeupItem.fromJson(_map(j)),
      );

  Future<TheoryDay> theoryDay({required String classroomId, required String date}) => _api.get(
        '/lesson-day/${Uri.encodeComponent(classroomId)}/$date/photos',
        parse: (j) => TheoryDay.fromJson(_map(j)),
      );

  /// `{ paidUntil: ISO | null }`
  Future<String?> paidUntil() => _api.get('/tuition/paid-until/my', parse: (j) => _map(j)['paidUntil'] as String?);

  Future<List<Announcement>> announcements() =>
      _api.get('/announcements', parse: (j) => _list(j, Announcement.fromJson));

  Future<List<MyClassroom>> myClassrooms() =>
      _api.get('/assignments/my-classrooms', parse: (j) => _list(j, MyClassroom.fromJson));
}

/// 403-ийн шалтгаан: `code` (NOT_OPEN_YET / NOT_CLASS_TEST), эс бөгөөс мессежээр (вэбийн `lockReason`).
TestLockReason lockReasonOf(Object? body, String message) {
  final code = body is Map ? body['code'] : null;
  if (code == 'NOT_OPEN_YET') return TestLockReason.tomorrow;
  if (code == 'NOT_CLASS_TEST') return TestLockReason.notDone;
  final serverMessage = body is Map && body['message'] is String ? body['message'] as String : '';
  final text = '$message $serverMessage'.toLowerCase();
  return RegExp('маргааш|tomorrow|not_open|өнөөдөр').hasMatch(text) ? TestLockReason.tomorrow : TestLockReason.notDone;
}

enum TestLockReason {
  /// Өнөөдөр ангид хийсэн — маргааш нээгдэнэ.
  tomorrow,

  /// Танай анги энэ тестийг хийгээгүй.
  notDone,
}

sealed class TestDetailResult {
  const TestDetailResult();
}

final class TestDetailReady extends TestDetailResult {
  const TestDetailReady(this.detail);
  final HubTestDetail detail;
}

final class TestDetailLocked extends TestDetailResult {
  const TestDetailLocked(this.reason);
  final TestLockReason reason;
}

final class TestDetailMissing extends TestDetailResult {
  const TestDetailMissing();
}

final myClassRepositoryProvider = Provider<MyClassRepository>((ref) => MyClassRepository(ref.watch(apiClientProvider)));

// Кэш: tab солих, буцаж ирэхэд дахин татахгүй (pull-to-refresh / «Дахин оролдох» → invalidate).
// Хэрэглэгч солигдвол (гарах/өөр хүн нэвтрэх) бүх кэш дахин ачаална — өөр хүний мэдээлэл үлдэхгүй.

/// Нэвтэрсэн хэрэглэгчийн id-г сонсоно.
String? watchUserId(Ref ref) => ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));

MyClassRepository _repo(Ref ref) {
  watchUserId(ref);
  return ref.watch(myClassRepositoryProvider);
}

final hubOverviewProvider = FutureProvider<HubOverview>((ref) => _repo(ref).overview());

final hubDaysProvider = FutureProvider.family<HubDays, String>(
  (ref, month) => _repo(ref).days(month),
);

final hubTestsProvider = FutureProvider.autoDispose.family<List<HubTestRow>, String>(
  (ref, q) => _repo(ref).tests(q: q),
);

final hubTestDetailProvider = FutureProvider.autoDispose.family<TestDetailResult, String>(
  (ref, id) => _repo(ref).testDetail(id),
);

final myAttendanceProvider = FutureProvider<List<AttendanceRow>>(
  (ref) => _repo(ref).myAttendance(),
);

final myMakeupProvider = FutureProvider<List<MakeupItem>>((ref) => _repo(ref).myMakeup());

final theoryDayProvider = FutureProvider.autoDispose.family<TheoryDay, ({String classroomId, String date})>(
  (ref, k) => _repo(ref).theoryDay(classroomId: k.classroomId, date: k.date),
);

final paidUntilProvider = FutureProvider<String?>((ref) => _repo(ref).paidUntil());

final announcementsProvider = FutureProvider<List<Announcement>>(
  (ref) => _repo(ref).announcements(),
);

final myClassroomsProvider = FutureProvider<List<MyClassroom>>(
  (ref) => _repo(ref).myClassrooms(),
);
