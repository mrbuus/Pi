// Ажилтны хуваарь (вэбийн `/app/schedule`, `components/schedule/*`) — API-ийн хариуны загвар.
// Гэрээ: `api/src/schedule/schedule.controller.ts`, `lesson-plan.service.ts#dayPlan`, `week-resolver.ts`.
//
// АНХААР: `weekday` талбар бүр JS дугаарлалт (0=Ням … 6=Бямба) — харуулахдаа ЗААВАЛ
// `core/time/weekday.dart`-ийн `mnWeekdayFromJs`-ээр хөрвүүл.
//
// Сервер шинэ талбар нэмбэл эвдрэхгүйн тулд гараар, зөөлөн задална (`_str`, `_int` …).

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

List<Object?> _list(Object? j) => j is List ? j : const <Object?>[];

String? _str(Object? v) => v is String && v.isNotEmpty ? v : null;

int _int(Object? v, [int fallback = 0]) => v is num ? v.toInt() : fallback;

bool _bool(Object? v) => v == true;

/// `2026-11-04T00:00:00.000Z` → `2026-11-04`.
String? _dateKey(Object? v) {
  final s = _str(v);
  return s == null || s.length < 10 ? s : s.substring(0, 10);
}

/// Ажилтны товч лавлагаа (`{ id, name, role }`).
class StaffRef {
  const StaffRef({required this.id, required this.name, this.role});

  factory StaffRef.fromJson(Map<String, Object?> j) =>
      StaffRef(id: _str(j['id']) ?? '', name: _str(j['name']) ?? '', role: _str(j['role']));

  static StaffRef? maybe(Object? j) => j is Map ? StaffRef.fromJson(_map(j)) : null;

  final String id;
  final String name;
  final String? role;
}

/// Зөөгдсөн хичээлийн мэдээлэл (`exception.kind == MOVED`).
class MovedInfo {
  const MovedInfo({required this.originalDate, this.note});

  final String originalDate;
  final String? note;
}

/// Батлагдсан хичээлийн товч (`record`).
class LessonRecordInfo {
  const LessonRecordInfo({
    required this.confirmedByName,
    this.presentCount = 0,
    this.absentCount = 0,
    this.enrolledCount = 0,
    this.topic,
    this.confirmedAt,
    this.description,
    this.problemNumbersText,
  });

  factory LessonRecordInfo.fromJson(Map<String, Object?> j) => LessonRecordInfo(
    confirmedByName: _str(j['confirmedByName']) ?? '',
    presentCount: _int(j['presentCount']),
    absentCount: _int(j['absentCount']),
    enrolledCount: _int(j['enrolledCount']),
    topic: _str(j['topic']),
    confirmedAt: _str(j['confirmedAt']),
    description: _str(j['description']),
    problemNumbersText: _str(j['problemNumbersText']),
  );

  final String confirmedByName;
  final int presentCount;
  final int absentCount;
  final int enrolledCount;
  final String? topic;

  /// ISO агшин (UTC).
  final String? confirmedAt;

  /// Батлахад бичсэн тайлбар, бодсон бодлогын дугаар («1-12, 15»).
  final String? description;
  final String? problemNumbersText;
}

/// Ангид бодитоор хийсэн тест (`done[]`, `ClassTestSession`).
class DoneTest {
  const DoneTest({required this.sessionId, this.testId, this.manualTitle, this.excludedProblemIds = const []});

  factory DoneTest.fromJson(Map<String, Object?> j) => DoneTest(
    sessionId: _str(j['sessionId']) ?? '',
    testId: _str(j['testId']),
    manualTitle: _str(j['manualTitle']),
    excludedProblemIds: [for (final p in _list(j['excludedProblemIds'])) ?_str(p)],
  );

  final String sessionId;
  final String? testId;

  /// Гараар бүртгэсэн (бодлогын сангүй) тестийн нэр.
  final String? manualTitle;
  final List<String> excludedProblemIds;
}

/// `GET /schedule/day-plan` — өдрийн нэг мөр (нэг хичээл).
class DayLesson {
  const DayLesson({
    required this.scheduleId,
    required this.classroomId,
    required this.classroomName,
    required this.startMinute,
    required this.endMinute,
    required this.occurrenceDate,
    this.teacherId,
    this.teacherName,
    this.teacherRole,
    this.room,
    this.subject,
    this.topic,
    this.lead,
    this.assistant,
    this.moved,
    this.students = 0,
    this.mine = false,
    this.planTestIds = const [],
    this.customTopics = const [],
    this.dismissMode,
    this.noteBody,
    this.noteBy,
    this.record,
    this.done = const [],
    this.photoStudentName,
  });

  factory DayLesson.fromJson(Map<String, Object?> j, String date) {
    final ex = _map(j['exception']);
    final plan = j['plan'] is Map ? _map(j['plan']) : null;
    final note = j['note'] is Map ? _map(j['note']) : null;
    return DayLesson(
      scheduleId: _str(j['scheduleId']) ?? '',
      classroomId: _str(j['classroomId']) ?? '',
      classroomName: _str(j['classroomName']) ?? '',
      startMinute: _int(j['startMinute']),
      endMinute: _int(j['endMinute']),
      occurrenceDate: _dateKey(j['occurrenceDate']) ?? _dateKey(ex['originalDate']) ?? date,
      teacherId: _str(j['teacherId']),
      teacherName: _str(j['teacherName']),
      teacherRole: _str(j['teacherRole']),
      room: _str(j['room']),
      subject: _str(j['subject']),
      topic: _str(j['topic']),
      lead: StaffRef.maybe(j['leadTeacher']),
      assistant: StaffRef.maybe(j['assistantTeacher']),
      moved: ex['kind'] == 'MOVED'
          ? MovedInfo(originalDate: _dateKey(ex['originalDate']) ?? date, note: _str(ex['note']))
          : null,
      students: _int(j['students']),
      mine: _bool(j['mine']),
      planTestIds: [for (final t in _list(plan?['testIds'])) ?_str(t)],
      customTopics: [for (final t in _list(plan?['customTopics'])) ?_str(t)],
      dismissMode: _str(plan?['dismissMode']),
      noteBody: _str(note?['body']),
      noteBy: _str(note?['updatedByName']),
      record: j['record'] is Map ? LessonRecordInfo.fromJson(_map(j['record'])) : null,
      done: [for (final d in _list(j['done'])) DoneTest.fromJson(_map(d))],
      photoStudentName: _str(_map(plan?['photoStudent'])['name']),
    );
  }

  final String scheduleId;
  final String classroomId;
  final String classroomName;
  final int startMinute;
  final int endMinute;

  /// Төлөвлөгөө, оноолт, өөрчлөлтийн түлхүүр огноо — зөөгдсөн бол АНХНЫ огноо.
  final String occurrenceDate;
  final String? teacherId;
  final String? teacherName;
  final String? teacherRole;
  final String? room;
  final String? subject;
  final String? topic;
  final StaffRef? lead;
  final StaffRef? assistant;
  final MovedInfo? moved;
  final int students;

  /// Нэвтэрсэн хүн энэ хичээлийн багш эсэх (сервер тооцно).
  final bool mine;
  final List<String> planTestIds;
  final List<String> customTopics;

  /// `DISMISS` = тарах, `STAY` = үлдэнэ.
  final String? dismissMode;
  final String? noteBody;
  final String? noteBy;
  final LessonRecordInfo? record;

  /// Ангид бодитоор хийсэн тестүүд (батлах цонхны эхний утга).
  final List<DoneTest> done;

  /// Онолын зураг илгээх сурагч (төлөвлөгөө).
  final String? photoStudentName;

  bool get planned => planTestIds.isNotEmpty || topic != null || customTopics.isNotEmpty;

  DayLesson withStaff({StaffRef? lead, StaffRef? assistant}) => DayLesson(
    scheduleId: scheduleId,
    classroomId: classroomId,
    classroomName: classroomName,
    startMinute: startMinute,
    endMinute: endMinute,
    occurrenceDate: occurrenceDate,
    teacherId: teacherId,
    teacherName: teacherName,
    teacherRole: teacherRole,
    room: room,
    subject: subject,
    topic: topic,
    lead: lead,
    assistant: assistant,
    moved: moved,
    students: students,
    mine: mine,
    planTestIds: planTestIds,
    customTopics: customTopics,
    dismissMode: dismissMode,
    noteBody: noteBody,
    noteBy: noteBy,
    record: record,
    done: done,
    photoStudentName: photoStudentName,
  );
}

/// Тестийн товч мэдээлэл (`tests[testId]`).
class PlanTest {
  const PlanTest({
    required this.id,
    required this.title,
    required this.short,
    this.variant,
    this.problemIds = const [],
    this.sourcePdfKey,
  });

  factory PlanTest.fromJson(Map<String, Object?> j) => PlanTest(
    id: _str(j['testId']) ?? '',
    title: _str(j['title']) ?? '',
    short: _str(j['short']) ?? _str(j['title']) ?? '',
    variant: _str(j['variant']),
    problemIds: [for (final p in _list(j['problemIds'])) ?_str(p)],
    sourcePdfKey: _str(j['sourcePdfKey']),
  );

  final String id;
  final String title;
  final String short;
  final String? variant;

  /// Бодлогын дараалал — хассан бодлогын дугаар (1-ээс) тэмдэглэхэд.
  final List<String> problemIds;

  /// Тестийн эх PDF (бүх багш татна).
  final String? sourcePdfKey;
}

/// `GET /schedule/day-plan?date=` — өдрийн хуваарь нэг дуудлагаар.
class DayPlan {
  const DayPlan({
    required this.date,
    required this.today,
    this.isHoliday = false,
    this.holidayTitle,
    this.restingClasses = const [],
    this.canPlan = false,
    this.canConfirm = false,
    this.rosterTeachers = const [],
    this.rosterInRange = true,
    this.lessons = const [],
    this.tests = const {},
  });

  factory DayPlan.fromJson(Map<String, Object?> j) {
    final date = _dateKey(j['date']) ?? '';
    final viewer = _map(j['viewer']);
    final roster = j['roster'] is Map ? _map(j['roster']) : null;
    final holiday = j['holiday'] is Map ? _map(j['holiday']) : null;
    return DayPlan(
      date: date,
      today: _dateKey(j['today']) ?? date,
      isHoliday: _bool(j['isHoliday']),
      holidayTitle: _str(holiday?['title']),
      restingClasses: [for (final r in _list(j['restingClasses'])) ?_str(_map(r)['classroomName'])],
      canPlan: _bool(viewer['canPlan']),
      canConfirm: _bool(viewer['canConfirm']),
      rosterTeachers: [for (final t in _list(roster?['teachers'])) StaffRef.fromJson(_map(t))],
      rosterInRange: roster == null || roster['inRange'] != false,
      lessons: [for (final e in _list(j['entries'])) DayLesson.fromJson(_map(e), date)],
      tests: {for (final MapEntry(:key, :value) in _map(j['tests']).entries) key: PlanTest.fromJson(_map(value))},
    );
  }

  final String date;
  final String today;
  final bool isHoliday;
  final String? holidayTitle;

  /// Зөвхөн зарим ангид хамаарах онцгой өдрөөр амарч буй ангиуд.
  final List<String> restingClasses;

  /// Багш+, Админ: багш оноох, сэдэв, нийтлэх (сервер `viewer.canPlan`).
  final bool canPlan;
  final bool canConfirm;

  /// «Багшийн ажлын өдөр» хүснэгтээр тухайн өдөр ажиллах багш нар.
  final List<StaffRef> rosterTeachers;
  final bool rosterInRange;
  final List<DayLesson> lessons;
  final Map<String, PlanTest> tests;

  DayPlan withLessons(List<DayLesson> next) => DayPlan(
    date: date,
    today: today,
    isHoliday: isHoliday,
    holidayTitle: holidayTitle,
    restingClasses: restingClasses,
    canPlan: canPlan,
    canConfirm: canConfirm,
    rosterTeachers: rosterTeachers,
    rosterInRange: rosterInRange,
    lessons: next,
    tests: tests,
  );
}

/// `GET /schedule/teachers` — хуваарьт ордог ажилтан (утасгүй).
class TeacherOption {
  const TeacherOption({required this.id, required this.firstName, this.lastName = '', this.displayName, this.role});

  factory TeacherOption.fromJson(Map<String, Object?> j) => TeacherOption(
    id: _str(j['id']) ?? '',
    firstName: _str(j['firstName']) ?? '',
    lastName: _str(j['lastName']) ?? '',
    displayName: _str(j['displayName']),
    role: _str(j['role']),
  );

  final String id;
  final String firstName;
  final String lastName;

  /// Сервер давхардсан нэрийг «Б. Нэр» болгосон.
  final String? displayName;
  final String? role;
}

/// `GET /classrooms` — архивлаагүй анги.
class ClassroomOption {
  const ClassroomOption({required this.id, required this.name, this.students, this.teacherId, this.teacherName});

  factory ClassroomOption.fromJson(Map<String, Object?> j) {
    final t = j['teacher'] is Map ? _map(j['teacher']) : null;
    return ClassroomOption(
      id: _str(j['id']) ?? '',
      name: _str(j['name']) ?? '',
      students: j['_count'] is Map ? _int(_map(j['_count'])['enrollments']) : null,
      teacherId: _str(t?['id']),
      teacherName: t == null ? null : _str(t['firstName']),
    );
  }

  final String id;
  final String name;
  final int? students;
  final String? teacherId;
  final String? teacherName;
}

/// `GET /schedule` — тогтмол хуваарийн нэг мөр (ClassSchedule).
class PatternSlot {
  const PatternSlot({
    required this.id,
    required this.classroomId,
    required this.classroomName,
    required this.weekday,
    required this.startMinute,
    required this.endMinute,
    required this.from,
    this.to,
    this.room,
    this.teacherId,
    this.teacherFirstName,
    this.teacherLastName,
    this.teacherRole,
    this.subject,
    this.students,
  });

  factory PatternSlot.fromJson(Map<String, Object?> j) {
    final c = _map(j['classroom']);
    final t = j['teacher'] is Map ? _map(j['teacher']) : null;
    return PatternSlot(
      id: _str(j['id']) ?? '',
      classroomId: _str(j['classroomId']) ?? _str(c['id']) ?? '',
      classroomName: _str(c['name']) ?? '',
      weekday: _int(j['weekday']),
      startMinute: _int(j['startMinute']),
      endMinute: _int(j['endMinute']),
      from: _dateKey(j['effectiveFrom']) ?? '',
      to: _dateKey(j['effectiveTo']),
      room: _str(j['room']),
      teacherId: _str(j['teacherId']),
      teacherFirstName: _str(t?['firstName']),
      teacherLastName: _str(t?['lastName']),
      teacherRole: _str(t?['role']),
      subject: _str(j['subject']),
      students: c['_count'] is Map ? _int(_map(c['_count'])['enrollments']) : null,
    );
  }

  final String id;
  final String classroomId;
  final String classroomName;

  /// JS 0=Ням.
  final int weekday;
  final int startMinute;
  final int endMinute;

  /// Хүчинтэй эхлэх/дуусах огноо (оролцуулсан, `YYYY-MM-DD`).
  final String from;
  final String? to;
  final String? room;
  final String? teacherId;
  final String? teacherFirstName;
  final String? teacherLastName;
  final String? teacherRole;
  final String? subject;
  final int? students;
}

/// Хуваарь засах эрх (`schedule.manage`): [all] = бүх анги, эс бөгөөс зөвхөн [classIds].
class ScheduleAccess {
  const ScheduleAccess({this.all = false, this.classIds = const {}});

  /// `GET /staff-capabilities/me` — scopeKey хоосон = бүх анги.
  factory ScheduleAccess.fromCapabilities(Map<String, Object?> j) {
    final grants = [
      for (final g in _list(j['grants']))
        if (_map(g)['capability'] == 'schedule.manage') _map(g),
    ];
    return ScheduleAccess(
      all: _bool(j['administrator']) || grants.any((g) => _str(g['scopeKey']) == null),
      classIds: {for (final g in grants) ?_str(g['scopeKey'])},
    );
  }

  static const none = ScheduleAccess();
  static const everything = ScheduleAccess(all: true);

  final bool all;
  final Set<String> classIds;

  bool canManage(String classroomId) => all || classIds.contains(classroomId);

  bool get any => all || classIds.isNotEmpty;
}

/// Багшийн ажлын өдрийн нэг мөр (`TeacherWorkDay`).
class WorkDayRow {
  const WorkDayRow({
    required this.teacherId,
    required this.weekday,
    this.parity = 0,
    this.sortOrder = 0,
    this.note,
    this.teacherName = '',
    this.teacherRole,
  });

  factory WorkDayRow.fromJson(Map<String, Object?> j) {
    final t = _map(j['teacher']);
    return WorkDayRow(
      teacherId: _str(j['teacherId']) ?? '',
      weekday: _int(j['weekday']),
      parity: _int(j['parity']),
      sortOrder: _int(j['sortOrder']),
      note: _str(j['note']),
      teacherName: _str(t['firstName']) ?? '',
      teacherRole: _str(t['role']),
    );
  }

  final String teacherId;

  /// JS 0=Ням.
  final int weekday;

  /// 0 = 7 хоног бүр, 1 = сондгой, 2 = тэгш.
  final int parity;
  final int sortOrder;
  final String? note;
  final String teacherName;
  final String? teacherRole;
}

/// Нэг өдрийн онцгой тохиолдол (`TeacherWorkException`).
class WorkException {
  const WorkException({
    required this.id,
    required this.teacherId,
    required this.date,
    required this.working,
    this.note,
    this.teacherFirstName = '',
    this.teacherLastName,
    this.teacherRole,
  });

  factory WorkException.fromJson(Map<String, Object?> j) {
    final t = _map(j['teacher']);
    return WorkException(
      id: _str(j['id']) ?? '',
      teacherId: _str(j['teacherId']) ?? '',
      date: _dateKey(j['date']) ?? '',
      working: _bool(j['working']),
      note: _str(j['note']),
      teacherFirstName: _str(t['firstName']) ?? '',
      teacherLastName: _str(t['lastName']),
      teacherRole: _str(t['role']),
    );
  }

  final String id;
  final String teacherId;
  final String date;
  final bool working;
  final String? note;
  final String teacherFirstName;
  final String? teacherLastName;
  final String? teacherRole;
}

/// Хүснэгтийн горим ба хүчинтэй хугацаа.
class RosterConfig {
  const RosterConfig({this.mode = 'ALTERNATING', this.validFrom, this.validTo});

  factory RosterConfig.fromJson(Map<String, Object?> j) => RosterConfig(
    mode: j['mode'] == 'FIXED' ? 'FIXED' : 'ALTERNATING',
    validFrom: _dateKey(j['validFrom']),
    validTo: _dateKey(j['validTo']),
  );

  /// `FIXED` = 7 хоног бүр ижил, `ALTERNATING` = сондгой/тэгш ээлж.
  final String mode;
  final String? validFrom;
  final String? validTo;

  bool get fixed => mode == 'FIXED';
}

/// `GET /schedule/teacher-workdays?from=&to=`.
class WorkDaysData {
  const WorkDaysData({this.rows = const [], this.exceptions = const [], this.config = const RosterConfig()});

  factory WorkDaysData.fromJson(Map<String, Object?> j) => WorkDaysData(
    rows: [for (final r in _list(j['workDays'])) WorkDayRow.fromJson(_map(r))],
    exceptions: [for (final x in _list(j['exceptions'])) WorkException.fromJson(_map(x))],
    config: j['config'] is Map ? RosterConfig.fromJson(_map(j['config'])) : const RosterConfig(),
  );

  final List<WorkDayRow> rows;
  final List<WorkException> exceptions;
  final RosterConfig config;
}

/// `GET /schedule/day/:date/publication`.
class DayPublication {
  const DayPublication({this.publishedAt, this.recipients = 0, this.publishedBy});

  factory DayPublication.fromJson(Map<String, Object?> j) => DayPublication(
    publishedAt: _str(j['publishedAt']),
    recipients: _int(j['recipients']),
    publishedBy: _str(j['publishedBy']),
  );

  /// ISO агшин (UTC). null = нийтлээгүй.
  final String? publishedAt;
  final int recipients;
  final String? publishedBy;
}

/// `GET /calendar` — онцгой өдөр (амралт, завсарлага, шалгалтын өдөр).
class SpecialDay {
  const SpecialDay({
    required this.id,
    required this.date,
    required this.type,
    required this.title,
    this.note,
    this.classroomIds = const [],
  });

  factory SpecialDay.fromJson(Map<String, Object?> j) => SpecialDay(
    id: _str(j['id']) ?? '',
    date: _dateKey(j['date']) ?? '',
    type: _str(j['type']) ?? 'HOLIDAY',
    title: _str(j['title']) ?? '',
    note: _str(j['note']),
    classroomIds: [for (final c in _list(j['classroomIds'])) ?_str(c)],
  );

  final String id;
  final String date;
  final String type;
  final String title;
  final String? note;

  /// Хоосон = БҮХ анги.
  final List<String> classroomIds;
}
