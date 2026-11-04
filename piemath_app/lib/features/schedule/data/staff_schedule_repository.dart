import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'lesson_plan_models.dart';
import 'staff_schedule_models.dart';

/// Ажилтны хуваарийн бүх дуудлага (вэбийн `components/schedule/*`-тэй ижил зам, бие).
/// Эрхийн шийдвэр СЕРВЕРТ (`schedule.controller.ts`) — апп зөвхөн товчийг нууна.
class StaffScheduleRepository {
  const StaffScheduleRepository(this._api);

  final ApiClient _api;

  static Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const {};

  static List<T> _list<T>(Object? j, T Function(Map<String, Object?>) parse) =>
      j is List ? [for (final e in j) parse(_map(e))] : <T>[];

  // ---------- Унших ----------

  /// Өдрийн хуваарь: мөр бүрийн оноолт, төлөвлөгөө, батламж, ажиллах багш (ADMIN, TEACHER_PLUS, TEACHER).
  Future<DayPlan> dayPlan(String date) =>
      _api.get('/schedule/day-plan', query: {'date': date}, parse: (j) => DayPlan.fromJson(_map(j)));

  Future<List<TeacherOption>> teachers() =>
      _api.get('/schedule/teachers', parse: (j) => _list(j, TeacherOption.fromJson));

  Future<List<ClassroomOption>> classrooms() =>
      _api.get('/classrooms', parse: (j) => _list(j, ClassroomOption.fromJson));

  /// Тогтмол хуваарийн бүх мөр (түүх, ирээдүйн өөрчлөлттэй).
  Future<List<PatternSlot>> patternSlots() => _api.get('/schedule', parse: (j) => _list(j, PatternSlot.fromJson));

  /// `schedule.manage` эрх: Админ бүгд, Багш зөвхөн харна (дуудлагагүй), Багш+ олгогдсон эрхээрээ.
  Future<ScheduleAccess> access(UserRole role) async {
    if (role == UserRole.admin) return ScheduleAccess.everything;
    if (role != UserRole.teacherPlus) return ScheduleAccess.none;
    try {
      return await _api.get('/staff-capabilities/me', parse: (j) => ScheduleAccess.fromCapabilities(_map(j)));
    } catch (_) {
      // Вэбтэй адил: эрхийг уншиж чадаагүй бол зөвхөн харна.
      return ScheduleAccess.none;
    }
  }

  Future<WorkDaysData> workDays({required String from, required String to}) => _api.get(
    '/schedule/teacher-workdays',
    query: {'from': from, 'to': to},
    parse: (j) => WorkDaysData.fromJson(_map(j)),
  );

  Future<DayPublication> publication(String date) =>
      _api.get('/schedule/day/$date/publication', parse: (j) => DayPublication.fromJson(_map(j)));

  Future<List<SpecialDay>> specialDays({String? from}) =>
      _api.get('/calendar', query: {'from': ?from}, parse: (j) => _list(j, SpecialDay.fromJson));

  // ---------- Өдрийн хичээл ----------

  /// Тухайн өдрийн ахлах/туслах багш. `null` бол оноолтыг арилгана. Огноо = АНХНЫ (зөөгдсөн бол).
  Future<void> setStaffing(String scheduleId, {required String date, String? leadId, String? assistantId}) =>
      _api.put<void>(
        '/schedule/$scheduleId/staffing',
        body: {'date': date, 'leadTeacherId': leadId, 'assistantTeacherId': assistantId},
      );

  Future<void> setTopic(String scheduleId, {required String date, required String title}) =>
      _api.patch<void>('/schedule/$scheduleId/topic', body: {'date': date, 'title': title});

  Future<void> clearTopic(String scheduleId, {required String date}) =>
      _api.delete<void>('/schedule/$scheduleId/topic', body: {'date': date});

  /// Зөвхөн энэ өдрийн хичээлийг цуцлах.
  Future<void> cancelOccurrence(String scheduleId, {required String date}) =>
      _api.post<void>('/schedule/$scheduleId/exceptions', body: {'date': date, 'kind': 'CANCELLED'});

  /// Зөвхөн энэ өдрийн хичээлийг өөр огноо/цаг/танхим руу зөөх. [date] = анхны огноо.
  Future<void> moveOccurrence(
    String scheduleId, {
    required String date,
    String? newDate,
    required int startMinute,
    required int endMinute,
    String? room,
    String? note,
  }) => _api.post<void>(
    '/schedule/$scheduleId/exceptions',
    body: {
      'date': date,
      'kind': 'MOVED',
      'newDate': ?newDate,
      'newStartMinute': startMinute,
      'newEndMinute': endMinute,
      'newRoom': ?room,
      'note': ?note,
    },
  );

  /// «Энэ ба цаашдын бүх»: [from]-оос эхлэн шинэ утга, өнгөрсөн түүх хэвээр.
  /// `room`/`teacherId` null бол цэвэрлэнэ (вэбтэй адил үргэлж илгээнэ).
  Future<void> splitSeries(
    String scheduleId, {
    required String from,
    required int weekday,
    required int startMinute,
    required int endMinute,
    String? room,
    String? teacherId,
  }) => _api.post<void>(
    '/schedule/$scheduleId/split',
    body: {
      'from': from,
      'weekday': weekday,
      'startMinute': startMinute,
      'endMinute': endMinute,
      'room': room,
      'teacherId': teacherId,
    },
  );

  /// Бүх давтамжийг устгах (вэбийн «Бүх давтамжид нөлөөлнө — Устгах»).
  Future<void> deleteSeries(String scheduleId) => _api.delete<void>('/schedule/$scheduleId');

  /// «Шинэ цаг нэмэх» — сонгосон гарагуудад 7 хоног бүр. [weekdays] нь JS дугаарлалт.
  Future<void> bulkCreate({
    required String classroomId,
    required List<int> weekdays,
    required int startMinute,
    required int endMinute,
    required String effectiveFrom,
    String? effectiveTo,
    String? teacherId,
    String? room,
    String? subject,
  }) => _api.post<void>(
    '/schedule/bulk',
    body: {
      'classroomId': classroomId,
      'weekdays': weekdays,
      'startMinute': startMinute,
      'endMinute': endMinute,
      'teacherId': ?teacherId,
      'room': ?room,
      'subject': ?subject,
      'effectiveFrom': effectiveFrom,
      'effectiveTo': ?effectiveTo,
    },
  );

  /// Өдрийн хуваарь нийтлэх — тэр өдөр хичээлтэй багш, сурагчдад мэдэгдэл.
  Future<DayPublication> publishDay(String date) =>
      _api.post('/schedule/day/$date/publish', parse: (j) => DayPublication.fromJson(_map(j)));

  // ---------- Төлөвлөгөө, батламж (Багш+, Админ; батлах — бүх багш) ----------

  Future<PlanContext> planContext(String scheduleId, {required String date}) =>
      _api.get('/schedule/$scheduleId/plan', query: {'date': date}, parse: (j) => PlanContext.fromJson(_map(j)));

  /// Орох тест (номын дарааллаар), нэмэлт сэдэв, тарах/үлдэх, онолын зураг илгээх сурагч.
  Future<void> putPlan(
    String scheduleId, {
    required String date,
    required List<String> testIds,
    required List<String> customTopics,
    String? dismissMode,
    String? photoStudentId,
  }) => _api.put<void>(
    '/schedule/$scheduleId/plan',
    body: {
      'date': date,
      'testIds': testIds,
      'customTopics': customTopics,
      'dismissMode': dismissMode,
      'photoStudentId': photoStudentId,
    },
  );

  /// Ирцийн самбарын тэмдэглэлтэй НЭГ бичлэг. Хоосон бол сервер зөөлөн устгана (`deletedAt`).
  Future<void> putNote(String scheduleId, {required String date, required String body}) =>
      _api.put<void>('/lesson-records/$scheduleId/note', body: {'date': date, 'body': body});

  Future<Roadmap> roadmap(String classroomId, {required String date}) =>
      _api.get('/classrooms/$classroomId/roadmap', query: {'date': date}, parse: (j) => Roadmap.fromJson(_map(j)));

  /// «Энэ ангиас хасах» (`REMOVED`). Буцаах (`null`) нь серверт мөр устгадаг тул апп-д байхгүй.
  Future<void> removeTestFromClass(String classroomId, String testId) =>
      _api.put<void>('/classrooms/$classroomId/tests/$testId/status', body: {'status': 'REMOVED'});

  /// Өдрийн хариунд байхгүй тестийн нэр, бодлогын дараалал.
  Future<List<PlanTest>> planTests(List<String> ids) =>
      _api.get('/schedule/plan-tests', query: {'ids': ids.join(',')}, parse: (j) => _list(j, PlanTest.fromJson));

  /// Хичээлийн дараа батлах: хийсэн тест + хассан бодлого, сэдэв, тайлбар, бодсон бодлогын дугаар.
  Future<void> confirmLesson(
    String scheduleId, {
    required String date,
    required List<({String testId, List<String> excluded})> tests,
    String? topic,
    String? description,
    String? problemNumbers,
  }) => _api.put<void>(
    '/lesson-records/$scheduleId/confirm',
    body: {
      'date': date,
      'tests': [
        for (final t in tests) {'testId': t.testId, 'excludedProblemIds': t.excluded},
      ],
      'topic': topic,
      'description': description,
      'problemNumbers': problemNumbers,
    },
  );

  /// Батламж цуцлах — сервер `cancelledAt` бөглөнө (зөөлөн). `delete` query авдаггүй тул огноо замд.
  Future<void> unconfirmLesson(String scheduleId, {required String date}) =>
      _api.delete<void>('/lesson-records/$scheduleId/confirm?date=$date');

  // ---------- Багшийн ажлын өдөр ----------

  /// Багшийн тухайн ээлжийн БҮХ гарагийг солино. [weekdays] JS дугаарлалт.
  Future<void> putWorkDays({
    required String teacherId,
    required List<int> weekdays,
    required int parity,
    int? sortOrder,
  }) => _api.put<void>(
    '/schedule/teacher-workdays',
    body: {'teacherId': teacherId, 'weekdays': weekdays, 'parity': parity, 'sortOrder': ?sortOrder},
  );

  Future<RosterConfig> putRosterConfig({required String mode, String? validFrom, String? validTo}) => _api.put(
    '/schedule/teacher-workdays/config',
    body: {'mode': mode, 'validFrom': validFrom, 'validTo': validTo},
    parse: (j) => RosterConfig.fromJson(_map(j)),
  );

  Future<void> addWorkException({
    required String teacherId,
    required String date,
    required bool working,
    String? note,
  }) => _api.post<void>(
    '/schedule/teacher-workdays/exception',
    body: {'teacherId': teacherId, 'date': date, 'working': working, 'note': ?note},
  );

  // ---------- Онцгой өдөр ----------

  Future<void> createSpecialDay({
    required String date,
    required String type,
    required String title,
    String? note,
    List<String> classroomIds = const [],
  }) => _api.post<void>(
    '/calendar',
    body: {'date': date, 'type': type, 'title': title, 'note': note, 'classroomIds': classroomIds},
  );

  Future<void> updateSpecialDay(
    String id, {
    required String date,
    required String type,
    required String title,
    String? note,
    List<String> classroomIds = const [],
  }) => _api.patch<void>(
    '/calendar/$id',
    body: {'date': date, 'type': type, 'title': title, 'note': note, 'classroomIds': classroomIds},
  );

  Future<void> deleteSpecialDay(String id) => _api.delete<void>('/calendar/$id');
}

final staffScheduleRepositoryProvider = Provider<StaffScheduleRepository>(
  (ref) => StaffScheduleRepository(ref.watch(apiClientProvider)),
);

StaffScheduleRepository _repo(Ref ref) {
  // Хэрэглэгч солигдвол кэш шинэчлэгдэнэ.
  ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
  return ref.watch(staffScheduleRepositoryProvider);
}

UserRole _role(Ref ref) => ref.watch(sessionProvider.select((s) => s is SignedIn ? s.role : UserRole.unknown));

/// Түлхүүр = `YYYY-MM-DD`.
final dayPlanProvider = FutureProvider.family<DayPlan, String>((ref, date) => _repo(ref).dayPlan(date));

final scheduleAccessProvider = FutureProvider<ScheduleAccess>((ref) => _repo(ref).access(_role(ref)));

final teacherOptionsProvider = FutureProvider<List<TeacherOption>>((ref) => _repo(ref).teachers());

final classroomOptionsProvider = FutureProvider<List<ClassroomOption>>((ref) => _repo(ref).classrooms());

final patternSlotsProvider = FutureProvider<List<PatternSlot>>((ref) => _repo(ref).patternSlots());

/// Түлхүүр = 7 хоногийн Даваа (`YYYY-MM-DD`); онцгой өдрийг тэр 7 хоногоор.
final workDaysProvider = FutureProvider.family<WorkDaysData, String>((ref, monday) {
  final start = DateTime.parse(monday);
  final end = start.add(const Duration(days: 6));
  final to = '${end.year}-${end.month.toString().padLeft(2, '0')}-${end.day.toString().padLeft(2, '0')}';
  return _repo(ref).workDays(from: monday, to: to);
});

final publicationProvider = FutureProvider.family<DayPublication, String>((ref, date) => _repo(ref).publication(date));

/// Түлхүүр = өнөөдөр (`YYYY-MM-DD`) — удахгүй болох онцгой өдрүүд.
final specialDaysProvider = FutureProvider.family<List<SpecialDay>, String>(
  (ref, from) => _repo(ref).specialDays(from: from),
);

/// Түлхүүр = (анги, өдөр).
final roadmapProvider = FutureProvider.family<Roadmap, ({String classroomId, String date})>(
  (ref, k) => _repo(ref).roadmap(k.classroomId, date: k.date),
);

/// Түлхүүр = (хуваарь, өдөр).
final planContextProvider = FutureProvider.family<PlanContext, ({String scheduleId, String date})>(
  (ref, k) => _repo(ref).planContext(k.scheduleId, date: k.date),
);
