import '../../../shared/marks/marks.dart';

// Сурагчийн бүтэн хуудасны «Хичээлийн түүх» хуанли, «Сэдэв хөтөлбөр», нөхөлтийн түүх, «Одоо гарвал
// буцаах дүн» (вэб 2026-11-08). Талбарын нэр ЯГ серверийнх:
//   GET /students/:id/lesson-days?from&to  → api/src/student-calendar (LessonDaysResponse, LessonDay)
//   GET /students/:id/syllabus             → api/src/student-calendar (SyllabusResponse)
//   GET /students/:id/makeup-visits        → api/src/makeup-visits (MakeupHistoryItem)
//   GET /tuition/refund-estimate/:id       → api/src/tuition/refund-estimate.ts
// Вэб: web/src/components/students/calendar/types.ts, makeup-visits/types.ts, students/RefundEstimate.tsx.
// Тогтворгүй бүтэцтэй тул freezed-гүй, гараар задална (танихгүй утга → null, апп унахгүй).

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

Map<String, Object?>? _mapOrNull(Object? j) => j is Map ? j.cast<String, Object?>() : null;

List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) => [
  for (final e in (j is List ? j : const []))
    if (e is Map) f(_map(e)),
];

String? _str(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

String _s(Object? v, [String fallback = '']) => v is String ? v : fallback;

int? _intOrNull(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) : null);

int _int(Object? v) => _intOrNull(v) ?? 0;

double _double(Object? v) => v is num ? v.toDouble() : (v is String ? double.tryParse(v) ?? 0 : 0);

/// `YYYY-MM-DD…` → эхний 10 тэмдэгт (цагийн бүс хөрвүүлэхгүй).
String _day(Object? v) {
  final s = _s(v);
  return s.length >= 10 ? s.substring(0, 10) : s;
}

String? _dayOrNull(Object? v) => _str(v) == null ? null : _day(v);

/// Шалгалтаар даалгавар шалгасан оноо (homework-quiz): бутархай байж болно (7,5).
class QuizMark {
  const QuizMark({required this.score, required this.problemCount});

  static QuizMark? maybe(Object? j) {
    final m = _mapOrNull(j);
    if (m == null || m['score'] is! num) return null;
    return QuizMark(score: _double(m['score']), problemCount: _int(m['problemCount']));
  }

  final double score;
  final int problemCount;
}

class LessonDayTest {
  const LessonDayTest({required this.title, this.testId, this.variant});

  factory LessonDayTest.fromJson(Map<String, Object?> j) =>
      LessonDayTest(testId: _str(j['testId']), title: _s(j['title']), variant: _str(j['variant']));

  final String? testId;
  final String title;
  final String? variant;
}

class LessonDayAttendance {
  const LessonDayAttendance({required this.status, this.lateRange, this.note, this.markedBy});

  static LessonDayAttendance? maybe(Object? j) {
    final m = _mapOrNull(j);
    final status = parseAttendanceStatus(m?['status'] as String?);
    if (m == null || status == null) return null;
    return LessonDayAttendance(
      status: status,
      lateRange: parseLateRange(m['lateRange'] as String?),
      note: _str(m['note']),
      markedBy: _str(m['markedBy']),
    );
  }

  final AttendanceStatus status;
  final LateRange? lateRange;
  final String? note;
  final String? markedBy;
}

class LessonDayHomework {
  const LessonDayHomework({this.status, this.comment, this.markedBy});

  static LessonDayHomework? maybe(Object? j) {
    final m = _mapOrNull(j);
    if (m == null) return null;
    return LessonDayHomework(
      status: parseHomeworkStatus(m['status'] as String?),
      comment: _str(m['comment']),
      markedBy: _str(m['markedBy']),
    );
  }

  final HomeworkStatus? status;
  final String? comment;
  final String? markedBy;
}

/// Хуанлийн нэг хичээлийн өдөр (нэг анги). Нэг өдөр 2 мөр байж болно (өөрийн анги + өөр ангид тэмдэглэсэн).
class LessonDay {
  const LessonDay({
    required this.key,
    required this.date,
    required this.classroomId,
    required this.classroomName,
    this.own = true,
    this.scheduled = true,
    this.startMinute,
    this.endMinute,
    this.room,
    this.movedFrom,
    this.topic,
    this.lead,
    this.assistant,
    this.scheduleTeacher,
    this.tests = const [],
    this.testsText,
    this.confirmed = false,
    this.confirmedDescription,
    this.confirmedProblems,
    this.confirmedBy,
    this.teacherNote,
    this.teacherNoteBy,
    this.attendance,
    this.homework,
    this.quiz,
    this.future = false,
  });

  factory LessonDay.fromJson(Map<String, Object?> j) {
    final confirmed = _mapOrNull(j['confirmed']);
    final note = _mapOrNull(j['teacherNote']);
    final date = _day(j['date']);
    final classroomId = _s(j['classroomId']);
    return LessonDay(
      key: _str(j['key']) ?? '$date|$classroomId',
      date: date,
      classroomId: classroomId,
      classroomName: _s(j['classroomName']),
      own: j['own'] != false,
      scheduled: j['scheduled'] != false,
      startMinute: _intOrNull(j['startMinute']),
      endMinute: _intOrNull(j['endMinute']),
      room: _str(j['room']),
      movedFrom: _dayOrNull(j['movedFrom']),
      topic: _str(j['topic']),
      lead: _str(j['lead']),
      assistant: _str(j['assistant']),
      scheduleTeacher: _str(j['scheduleTeacher']),
      tests: _list(j['tests'], LessonDayTest.fromJson),
      testsText: _str(j['testsText']),
      confirmed: confirmed != null,
      confirmedDescription: _str(confirmed?['description']),
      confirmedProblems: _str(confirmed?['problemNumbersText']),
      confirmedBy: _str(confirmed?['by']),
      teacherNote: _str(note?['body']),
      teacherNoteBy: _str(note?['by']),
      attendance: LessonDayAttendance.maybe(j['attendance']),
      homework: LessonDayHomework.maybe(j['homework']),
      quiz: QuizMark.maybe(j['quiz']),
      future: j['future'] == true,
    );
  }

  /// `${date}|${classroomId}`
  final String key;
  final String date;
  final String classroomId;
  final String classroomName;

  /// Тэр өдөр энэ ангид элссэн (өөр ангид тэмдэглэгдсэн бол false).
  final bool own;
  final bool scheduled;
  final int? startMinute;
  final int? endMinute;
  final String? room;

  /// Зөөгдөж ирсэн хичээлийн анхны огноо.
  final String? movedFrom;
  final String? topic;
  final String? lead;
  final String? assistant;
  final String? scheduleTeacher;
  final List<LessonDayTest> tests;
  final String? testsText;

  /// Хичээлийг баталсан эсэх (`confirmed` объект ирсэн).
  final bool confirmed;
  final String? confirmedDescription;
  final String? confirmedProblems;
  final String? confirmedBy;

  /// Багшийн тайлбар (LessonNote) — зөвхөн ажилтанд.
  final String? teacherNote;
  final String? teacherNoteBy;
  final LessonDayAttendance? attendance;
  final LessonDayHomework? homework;
  final QuizMark? quiz;
  final bool future;
}

/// Нөхөлтөөр хамрагдсан тест.
enum CoveredSource {
  /// Анги баталсан.
  confirmed,

  /// Төлөвлөгөө (батлаагүй) — «төлөвлөгөөгөөр».
  planned,

  /// 406-д багш сонгосон.
  recorded;

  static CoveredSource parse(Object? v) => switch (v) {
    'PLANNED' => planned,
    'RECORDED' => recorded,
    _ => confirmed,
  };
}

class CoveredTest {
  const CoveredTest({
    required this.title,
    this.id,
    this.testId,
    this.variant,
    this.source = CoveredSource.confirmed,
    this.result,
  });

  factory CoveredTest.fromJson(Map<String, Object?> j) {
    final r = _mapOrNull(j['result']);
    return CoveredTest(
      id: _str(j['id']),
      testId: _str(j['testId']),
      title: _s(j['title']),
      variant: _str(j['variant']),
      source: CoveredSource.parse(j['source']),
      result: r == null ? null : (score: _double(r['score']), max: _double(r['max'])),
    );
  }

  final String? id;
  final String? testId;
  final String title;
  final String? variant;
  final CoveredSource source;

  /// Онлайнаар өгсөн дүн; байхгүй бол null.
  final ({double score, double max})? result;
}

/// Нөхөлтийн газар: өөр анги эсвэл 406 өрөө.
class MakeupPlace {
  const MakeupPlace({required this.room406, required this.name, this.classroomId});

  factory MakeupPlace.fromJson(Map<String, Object?> j) => MakeupPlace(
    room406: j['kind'] == 'ROOM_406',
    classroomId: _str(j['classroomId']),
    name: _s(j['name'], j['kind'] == 'ROOM_406' ? '406' : ''),
  );

  final bool room406;
  final String? classroomId;
  final String name;
}

/// `GET /students/:id/makeup-visits` мөр — «12-6 ангид нөхөж суусан» / «406-д нөхөж хийсэн».
class MakeupHistoryItem {
  const MakeupHistoryItem({
    required this.id,
    required this.date,
    required this.place,
    required this.label,
    required this.teacherName,
    this.homeClassroomName,
    this.tests = const [],
    this.comment,
    this.attendance,
    this.lateRange,
    this.attendanceNote,
    this.homework,
    this.homeworkNote,
    this.createdAt,
  });

  factory MakeupHistoryItem.fromJson(Map<String, Object?> j) {
    final att = _map(j['attendance']);
    final hw = _map(j['homework']);
    return MakeupHistoryItem(
      id: _s(j['id']),
      date: _day(j['date']),
      place: MakeupPlace.fromJson(_map(j['place'])),
      label: _s(j['label']),
      homeClassroomName: _str(_mapOrNull(j['homeClassroom'])?['name']),
      tests: _list(j['tests'], CoveredTest.fromJson),
      comment: _str(j['comment']),
      attendance: parseAttendanceStatus(att['status'] as String?),
      lateRange: parseLateRange(att['lateRange'] as String?),
      attendanceNote: _str(att['note']),
      homework: parseHomeworkStatus(hw['status'] as String?),
      homeworkNote: _str(hw['note']),
      teacherName: _s(_map(j['teacher'])['name']),
      createdAt: _str(j['createdAt']),
    );
  }

  final String id;
  final String date;
  final MakeupPlace place;
  final String label;
  final String? homeClassroomName;
  final List<CoveredTest> tests;
  final String? comment;
  final AttendanceStatus? attendance;
  final LateRange? lateRange;
  final String? attendanceNote;
  final HomeworkStatus? homework;
  final String? homeworkNote;

  /// Бүртгэсэн багш (Багш+ бол «+»-ийг сервер залгасан).
  final String teacherName;
  final String? createdAt;
}

/// `GET /students/:id/lesson-days` хариу.
class LessonDaysResponse {
  const LessonDaysResponse({
    required this.from,
    required this.to,
    required this.today,
    this.firstDate,
    this.days = const [],
    this.makeups = const [],
  });

  factory LessonDaysResponse.fromJson(Map<String, Object?> j) => LessonDaysResponse(
    from: _day(j['from']),
    to: _day(j['to']),
    today: _day(j['today']),
    firstDate: _dayOrNull(j['firstDate']),
    days: _list(j['days'], LessonDay.fromJson),
    makeups: _list(j['makeups'], MakeupHistoryItem.fromJson),
  );

  final String from;
  final String to;
  final String today;

  /// Хамгийн эрт бичлэг — сарын навигацийн доод хил.
  final String? firstDate;
  final List<LessonDay> days;
  final List<MakeupHistoryItem> makeups;
}

/// Сэдвийн төлөв.
enum SyllabusStatus {
  done,
  missing,
  todo;

  static SyllabusStatus parse(Object? v) => switch (v) {
    'DONE' => done,
    'MISSING' => missing,
    _ => todo,
  };
}

enum SyllabusEventKind { classLesson, past, makeup, beforeJoin }

/// Сэдвийн нэг үйл явдал (ангид, өмнө үзсэн, нөхсөн, элсэхээс өмнө).
class SyllabusEvent {
  const SyllabusEvent({
    required this.kind,
    required this.done,
    this.date,
    this.classroomName,
    this.attendance,
    this.lead,
    this.description,
    this.teacherNote,
    this.place,
    this.teacher,
    this.comment,
  });

  factory SyllabusEvent.fromJson(Map<String, Object?> j) {
    final kind = switch (j['kind']) {
      'PAST' => SyllabusEventKind.past,
      'MAKEUP' => SyllabusEventKind.makeup,
      'BEFORE_JOIN' => SyllabusEventKind.beforeJoin,
      _ => SyllabusEventKind.classLesson,
    };
    return SyllabusEvent(
      kind: kind,
      done: j['done'] == true,
      date: _dayOrNull(j['date']),
      classroomName: _str(j['classroomName']),
      attendance: parseAttendanceStatus(j['attendance'] as String?),
      lead: _str(j['lead']),
      description: _str(j['description']),
      teacherNote: _str(j['teacherNote']),
      place: j['place'] is Map ? MakeupPlace.fromJson(_map(j['place'])) : null,
      teacher: _str(j['teacher']),
      comment: _str(j['comment']),
    );
  }

  final SyllabusEventKind kind;
  final bool done;
  final String? date;
  final String? classroomName;
  final AttendanceStatus? attendance;
  final String? lead;
  final String? description;
  final String? teacherNote;
  final MakeupPlace? place;
  final String? teacher;
  final String? comment;
}

class SyllabusTest {
  const SyllabusTest({
    required this.id,
    required this.title,
    required this.status,
    this.variant,
    this.doneOn,
    this.events = const [],
  });

  factory SyllabusTest.fromJson(Map<String, Object?> j) => SyllabusTest(
    id: _s(j['id']),
    title: _s(j['title']),
    variant: _str(j['variant']),
    status: SyllabusStatus.parse(j['status']),
    doneOn: _dayOrNull(j['doneOn']),
    events: _list(j['events'], SyllabusEvent.fromJson),
  );

  final String id;
  final String title;
  final String? variant;
  final SyllabusStatus status;
  final String? doneOn;
  final List<SyllabusEvent> events;
}

class SyllabusChapter {
  const SyllabusChapter({required this.id, required this.title, this.order = 0, this.tests = const []});

  factory SyllabusChapter.fromJson(Map<String, Object?> j) => SyllabusChapter(
    id: _s(j['id']),
    order: _int(j['order']),
    title: _s(j['title']),
    tests: _list(j['tests'], SyllabusTest.fromJson),
  );

  final String id;
  final int order;
  final String title;
  final List<SyllabusTest> tests;
}

class SyllabusBook {
  const SyllabusBook({required this.id, required this.title, this.code = '', this.chapters = const []});

  factory SyllabusBook.fromJson(Map<String, Object?> j) => SyllabusBook(
    id: _s(j['id']),
    code: _s(j['code']),
    title: _s(j['title']),
    chapters: _list(j['chapters'], SyllabusChapter.fromJson),
  );

  final String id;
  final String code;
  final String title;
  final List<SyllabusChapter> chapters;
}

/// `GET /students/:id/syllabus` хариу.
class SyllabusResponse {
  const SyllabusResponse({
    this.classroomName,
    this.done = 0,
    this.missing = 0,
    this.todo = 0,
    this.total = 0,
    this.books = const [],
    this.other = const [],
  });

  factory SyllabusResponse.fromJson(Map<String, Object?> j) {
    final s = _map(j['summary']);
    return SyllabusResponse(
      classroomName: _str(_mapOrNull(j['classroom'])?['name']),
      done: _int(s['done']),
      missing: _int(s['missing']),
      todo: _int(s['todo']),
      total: _int(s['total']),
      books: _list(j['books'], SyllabusBook.fromJson),
      other: _list(j['other'], SyllabusTest.fromJson),
    );
  }

  final String? classroomName;
  final int done;
  final int missing;
  final int todo;
  final int total;
  final List<SyllabusBook> books;

  /// Номын каталогт ороогүй хийсэн/дутуу сэдэв.
  final List<SyllabusTest> other;
}

/// «Одоо гарвал буцаах дүн» — `GET /tuition/refund-estimate/:id`. Багшид сервер [money]-г null болгоно.
class RefundEstimate {
  const RefundEstimate({
    required this.applicable,
    this.reason,
    this.refund = 0,
    this.countFrom = '',
    this.asOf = '',
    this.webStart,
    this.fullMonths = 0,
    this.lessonsHeld = 0,
    this.lessonsAssumed = 0,
    this.lessonsPerMonth = 0,
    this.current,
    this.money,
  });

  factory RefundEstimate.fromJson(Map<String, Object?> j) {
    if (j['applicable'] != true) return RefundEstimate(applicable: false, reason: _str(j['reason']));
    final b = _map(j['basis']);
    final cur = _mapOrNull(b['current']);
    final m = _mapOrNull(j['money']);
    return RefundEstimate(
      applicable: true,
      refund: _int(j['refund']),
      countFrom: _day(b['countFrom']),
      asOf: _day(b['asOf']),
      webStart: _dayOrNull(b['webStart']),
      fullMonths: _int(b['fullMonths']),
      lessonsHeld: _int(b['lessonsHeld']),
      lessonsAssumed: _int(b['lessonsAssumed']),
      lessonsPerMonth: _int(b['lessonsPerMonth']),
      current: cur == null
          ? null
          : (
              start: _day(cur['start']),
              lessons: _int(cur['lessons']),
              counted: _int(cur['counted']),
              leaveDay: _dayOrNull(cur['leaveDay']),
            ),
      money: m == null
          ? null
          : (owed: _int(m['owed']), paid: _int(m['paid']), refundedBefore: _int(m['refundedBefore'])),
    );
  }

  final bool applicable;

  /// `ARCHIVED`, `NO_CLASS`, `NO_SCHEDULE` (applicable = false үед).
  final String? reason;
  final int refund;
  final String countFrom;
  final String asOf;
  final String? webStart;
  final int fullMonths;
  final int lessonsHeld;
  final int lessonsAssumed;
  final int lessonsPerMonth;
  final ({String start, int lessons, int counted, String? leaveDay})? current;

  /// Зөвхөн Админ, Багш+ (Багшид null).
  final ({int owed, int paid, int refundedBefore})? money;
}

/// `GET /lesson-records/student/:id?limit=120` — батлагдсан хичээлийн жагсаалт («Жагсаалт» харагдац).
/// Эх: api/src/lesson-records/lesson-records.service.ts `studentHistory`.
class LessonRecordRow {
  const LessonRecordRow({
    required this.id,
    required this.date,
    required this.classroomName,
    this.startMinute = 0,
    this.endMinute = 0,
    this.room,
    this.topic,
    this.leadTeacherName,
    this.testCount = 0,
    this.attendance,
  });

  factory LessonRecordRow.fromJson(Map<String, Object?> j) => LessonRecordRow(
    id: _s(j['id']),
    date: _day(j['date']),
    classroomName: _s(j['classroomName']),
    startMinute: _int(j['startMinute']),
    endMinute: _int(j['endMinute']),
    room: _str(j['room']),
    topic: _str(j['topic']),
    leadTeacherName: _str(j['leadTeacherName']),
    testCount: _int(j['testCount']),
    attendance: parseAttendanceStatus(j['attendance'] as String?),
  );

  final String id;
  final String date;
  final String classroomName;
  final int startMinute;
  final int endMinute;
  final String? room;
  final String? topic;

  /// Багш+ бол «+»-ийг сервер залгасан.
  final String? leadTeacherName;
  final int testCount;
  final AttendanceStatus? attendance;
}
