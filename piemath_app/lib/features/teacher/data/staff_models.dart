/// Багш, Багш+, Админы өдөр тутмын нэмэлт хариунууд (самбарын нэмэлт, хүлээгдэж буй, зар, эрх).
/// Жижиг тул freezed-гүй, гараар задална. Эх: вэбийн `TeacherDashboard/**`, `makeup/types.ts`,
/// `AnnouncementCompose.tsx`, `PendingApprovalList.tsx`, `leads/LeadCard.tsx`.
library;

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();

int _int(Object? v, [int fallback = 0]) => v is num ? v.toInt() : fallback;

String? _str(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) => [
  for (final e in (j as List?) ?? const []) if (e is Map) f(_map(e)),
];

String _fullName(Object? first, Object? last) =>
    [last, first].whereType<String>().map((s) => s.trim()).where((s) => s.isNotEmpty).join(' ');

// ───────── Эцэг эхийн холболтын хүсэлт ─────────

/// `GET /parent/links/pending` (Багш+, Админ).
class ParentLinkRequest {
  const ParentLinkRequest({
    required this.id,
    required this.parentName,
    this.parentPhone,
    required this.studentName,
    this.studentPhone,
    this.grade,
  });

  factory ParentLinkRequest.fromJson(Map<String, Object?> j) {
    final p = j['parent'] is Map ? _map(j['parent']) : const <String, Object?>{};
    final s = j['student'] is Map ? _map(j['student']) : const <String, Object?>{};
    final prof = s['studentProfile'] is Map ? _map(s['studentProfile']) : const <String, Object?>{};
    return ParentLinkRequest(
      id: (j['id'] as String?) ?? '',
      parentName: _fullName(p['firstName'], p['lastName']),
      parentPhone: _str(p['phone']),
      studentName: _fullName(s['firstName'], s['lastName']),
      studentPhone: _str(s['phone']),
      grade: prof['grade'] is num ? _int(prof['grade']) : null,
    );
  }

  final String id;
  final String parentName;
  final String? parentPhone;
  final String studentName;
  final String? studentPhone;
  final int? grade;
}

// ───────── Анхаарах сурагчид (ангийн) ─────────

class AttentionFlag {
  const AttentionFlag({required this.title, required this.detail, required this.danger});

  factory AttentionFlag.fromJson(Map<String, Object?> j) => AttentionFlag(
    title: (j['title'] as String?) ?? '',
    detail: (j['detail'] as String?) ?? '',
    danger: j['severity'] == 'danger',
  );

  final String title;
  final String detail;
  final bool danger;
}

class AttentionRow {
  const AttentionRow({required this.studentId, required this.name, required this.flags});

  factory AttentionRow.fromJson(Map<String, Object?> j) {
    final s = j['student'] is Map ? _map(j['student']) : const <String, Object?>{};
    return AttentionRow(
      studentId: (s['id'] as String?) ?? '',
      name: _str(s['name']) ?? _fullName(s['firstName'], s['lastName']),
      flags: _list(j['flags'], AttentionFlag.fromJson),
    );
  }

  final String studentId;
  final String name;
  final List<AttentionFlag> flags;
}

/// `GET /classrooms/:id/attention?date=` — ирц ба сүүлийн өдрүүдийн оройн тэмдэглэгээнээс.
class ClassAttention {
  const ClassAttention({required this.windowDays, required this.rows, required this.flagged, required this.students});

  factory ClassAttention.fromJson(Map<String, Object?> j) {
    final t = j['totals'] is Map ? _map(j['totals']) : const <String, Object?>{};
    return ClassAttention(
      windowDays: _int(j['windowDays'], 3),
      rows: _list(j['rows'], AttentionRow.fromJson),
      flagged: _int(t['flagged']),
      students: _int(t['students']),
    );
  }

  final int windowDays;
  final List<AttentionRow> rows;
  final int flagged;
  final int students;
}

/// `GET /classrooms/:id/daily-summary?date=` — зөвхөн вэбийн харуулдаг гол тоо. 400 = хараахан бодогдоогүй.
class DailySummary {
  const DailySummary({required this.marked, required this.total, required this.attempts});

  factory DailySummary.fromJson(Map<String, Object?> j) {
    final s = j['stats'] is Map ? _map(j['stats']) : const <String, Object?>{};
    return DailySummary(
      marked: _int(s['studentsMarked']),
      total: _int(s['studentsTotal']),
      attempts: _int(s['totalAttempts']),
    );
  }

  final int marked;
  final int total;
  final int attempts;
}

// ───────── Нөхөх хичээл ─────────

enum MakeupStatus {
  pending('PENDING', 'Нөхөөгүй'),
  partial('PARTIAL', 'Дутуу'),
  done('DONE', 'Нөхсөн'),
  waived('WAIVED', 'Чөлөөлсөн');

  const MakeupStatus(this.api, this.label);

  final String api;
  final String label;

  static MakeupStatus? parse(Object? v) {
    for (final s in values) {
      if (s.api == v) return s;
    }
    return null;
  }

  bool get isOpen => this == pending || this == partial;
}

/// `GET /makeup/classrooms/:id?date=` (ажилтны мөр).
class MakeupRow {
  const MakeupRow({required this.studentId, this.studentName = '', required this.date, required this.status, this.reason});

  factory MakeupRow.fromJson(Map<String, Object?> j) => MakeupRow(
    studentId: (j['studentId'] as String?) ?? '',
    studentName: (j['studentName'] as String?) ?? '',
    date: (j['date'] as String?) ?? '',
    status: MakeupStatus.parse(j['status']) ?? MakeupStatus.pending,
    reason: _str(j['reason']),
  );

  final String studentId;
  final String studentName;
  final String date;
  final MakeupStatus status;

  /// `ABSENT | EXCUSED | LATE`.
  final String? reason;
}

// ───────── Онлайн гэрийн даалгаврын оноо ─────────

/// Онлайн дүн: «9/12», «8,5/12» (вэбийн `scoreText`; аравтын таслал).
String scoreText(num score, num max) {
  String f(num n) {
    final r = (n * 10).round() / 10;
    return (r == r.roundToDouble() ? '${r.toInt()}' : '$r').replaceAll('.', ',');
  }

  return '${f(score)}/${f(max)}';
}

num? _num(Object? v) => v is num ? v : null;

class OnlineCell {
  const OnlineCell({required this.score, required this.max, required this.testId});

  final num score;
  final num max;
  final String testId;

  String get text => scoreText(score, max);
}

/// Өмнөх хичээлд ангид хийсэн тестийн нөгөө хувилбар = гэрийн даалгавар.
class OnlineTest {
  const OnlineTest({required this.testId, required this.title, this.variant, this.problems = 0, this.fromTestId});

  factory OnlineTest.fromJson(Map<String, Object?> j) => OnlineTest(
    testId: (j['testId'] as String?) ?? '',
    title: (j['title'] as String?) ?? '',
    variant: _str(j['variant']),
    problems: _int(j['problems']),
    fromTestId: _str(j['fromTestId']),
  );

  final String testId;
  final String title;
  final String? variant;
  final int problems;
  final String? fromTestId;
}

/// `GET /classrooms/:id/homework-marks/online?date=`.
class OnlineMarks {
  const OnlineMarks({this.tests = const [], this.students = const {}, this.previousLessonDate});

  factory OnlineMarks.fromJson(Map<String, Object?> j) {
    final students = <String, OnlineCell>{};
    final raw = j['students'];
    if (raw is Map) {
      for (final e in raw.entries) {
        final v = e.value;
        if (e.key is String && v is Map && v['score'] is num && v['max'] is num && v['testId'] is String) {
          students[e.key as String] = OnlineCell(
            score: v['score'] as num,
            max: v['max'] as num,
            testId: v['testId'] as String,
          );
        }
      }
    }
    return OnlineMarks(
      tests: _list(j['tests'], OnlineTest.fromJson),
      students: students,
      previousLessonDate: _str(j['previousLessonDate']),
    );
  }

  final List<OnlineTest> tests;
  final Map<String, OnlineCell> students;
  final String? previousLessonDate;

  /// Өмнөх хичээлд онлайн даалгаврын тест байсан эсэх.
  bool get hasTests => tests.isNotEmpty;
}

// ───────── Нэг сурагчийн онлайн даалгаврын дэлгэрэнгүй ─────────

/// Бодлого бүрийн дүн (`null` = шалгагдаагүй).
enum OnlineItemResult {
  correct('CORRECT'),
  wrong('WRONG'),
  blank('BLANK');

  const OnlineItemResult(this.api);

  final String api;

  static OnlineItemResult? parse(Object? v) {
    for (final r in values) {
      if (r.api == v) return r;
    }
    return null;
  }
}

/// Хариуны харагдац (вэбийн `show`): «A», «35», «a=3 b=5»; `null` = хариу байхгүй.
String? answerText(Object? v) {
  if (v == null) return null;
  if (v is String) return v;
  if (v is num) return '$v';
  if (v is Map) {
    return v.entries
        .map((e) {
          final x = e.value;
          return '${e.key}=${x == null || (x is String && x.isEmpty) ? '_' : x}';
        })
        .join(' ');
  }
  return null;
}

class OnlineItem {
  const OnlineItem({required this.n, required this.problemId, this.mine, this.correct, this.result});

  factory OnlineItem.fromJson(Map<String, Object?> j) => OnlineItem(
    n: _int(j['n']),
    problemId: (j['problemId'] as String?) ?? '',
    mine: answerText(j['mine']),
    correct: answerText(j['correct']),
    result: OnlineItemResult.parse(j['result']),
  );

  final int n;
  final String problemId;
  final String? mine;
  final String? correct;
  final OnlineItemResult? result;

  bool get wrong => result == OnlineItemResult.wrong;

  /// Хариулаагүй (вэб: `BLANK` эсвэл хариугүй, шалгагдаагүй).
  bool get blank => result == OnlineItemResult.blank || (mine == null && result == null);
}

class OnlineAttempt {
  const OnlineAttempt({
    required this.submitted,
    required this.startedAt,
    this.submittedAt,
    this.durationSec,
    this.activeSec = 0,
    this.awaySec = 0,
    this.leaveCount = 0,
    this.openCount = 0,
    this.checksUsed = 0,
    this.late = false,
    this.score,
    this.total,
    this.items = const [],
  });

  factory OnlineAttempt.fromJson(Map<String, Object?> j) => OnlineAttempt(
    submitted: j['status'] == 'SUBMITTED',
    startedAt: (j['startedAt'] as String?) ?? '',
    submittedAt: _str(j['submittedAt']),
    durationSec: j['durationSec'] is num ? _int(j['durationSec']) : null,
    activeSec: _int(j['activeSec']),
    awaySec: _int(j['awaySec']),
    leaveCount: _int(j['leaveCount']),
    openCount: _int(j['openCount']),
    checksUsed: _int(j['checksUsed']),
    late: j['late'] == true,
    score: _num(j['score']),
    total: _num(j['total']),
    items: _list(j['items'], OnlineItem.fromJson),
  );

  /// `SUBMITTED`; эс бөгөөс `IN_PROGRESS`.
  final bool submitted;
  final String startedAt;
  final String? submittedAt;
  final int? durationSec;
  final int activeSec;
  final int awaySec;
  final int leaveCount;
  final int openCount;
  final int checksUsed;
  final bool late;
  final num? score;
  final num? total;
  final List<OnlineItem> items;
}

class OnlineDetailTest {
  const OnlineDetailTest({
    required this.testId,
    required this.title,
    this.variant,
    this.problems = 0,
    this.attempt,
    this.exam,
  });

  factory OnlineDetailTest.fromJson(Map<String, Object?> j) {
    final e = j['exam'] is Map ? _map(j['exam']) : null;
    return OnlineDetailTest(
      testId: (j['testId'] as String?) ?? '',
      title: (j['title'] as String?) ?? '',
      variant: _str(j['variant']),
      problems: _int(j['problems']),
      attempt: j['attempt'] is Map ? OnlineAttempt.fromJson(_map(j['attempt'])) : null,
      exam: e != null && e['score'] is num && e['max'] is num
          ? (score: e['score']! as num, max: e['max']! as num)
          : null,
    );
  }

  final String testId;
  final String title;
  final String? variant;
  final int problems;
  final OnlineAttempt? attempt;

  /// Шалгалтын дүн (TestResult) — онлайн оролдлогогүй ч дүн байж болно.
  final ({num score, num max})? exam;
}

/// «Дахин бодох» (2-р оролдлого).
class OnlineRedo {
  const OnlineRedo({
    required this.attemptId,
    required this.testId,
    required this.title,
    this.variant,
    required this.inClass,
    required this.submitted,
    this.submittedAt,
    this.activeSec = 0,
    this.leaveCount = 0,
    this.score,
    this.total,
  });

  factory OnlineRedo.fromJson(Map<String, Object?> j) => OnlineRedo(
    attemptId: (j['attemptId'] as String?) ?? '',
    testId: (j['testId'] as String?) ?? '',
    title: (j['title'] as String?) ?? '',
    variant: _str(j['variant']),
    inClass: j['kind'] == 'CLASS',
    submitted: j['status'] == 'SUBMITTED',
    submittedAt: _str(j['submittedAt']),
    activeSec: _int(j['activeSec']),
    leaveCount: _int(j['leaveCount']),
    score: _num(j['score']),
    total: _num(j['total']),
  );

  final String attemptId;
  final String testId;
  final String title;
  final String? variant;

  /// `CLASS` = ангид бодсон тест (А), `HOME` = гэрийн тест (Б).
  final bool inClass;
  final bool submitted;
  final String? submittedAt;
  final int activeSec;
  final int leaveCount;
  final num? score;
  final num? total;
}

/// Илгээсэн дэвтрийн зураг (PDF).
class OnlinePhoto {
  const OnlinePhoto({required this.fileKey, required this.pages, required this.uploadedAt, this.late = false});

  factory OnlinePhoto.fromJson(Map<String, Object?> j) => OnlinePhoto(
    fileKey: (j['fileKey'] as String?) ?? '',
    pages: _int(j['pages'], 1),
    uploadedAt: (j['uploadedAt'] as String?) ?? '',
    late: j['late'] == true,
  );

  final String fileKey;
  final int pages;
  final String uploadedAt;
  final bool late;
}

/// `GET /classrooms/:id/homework-marks/online/:studentId?date=`. Бодлогын агуулга ирэхгүй.
class OnlineDetail {
  const OnlineDetail({
    required this.date,
    this.previousLessonDate,
    this.tests = const [],
    this.photo,
    this.redos = const [],
  });

  factory OnlineDetail.fromJson(Map<String, Object?> j) => OnlineDetail(
    date: (j['date'] as String?) ?? '',
    previousLessonDate: _str(j['previousLessonDate']),
    tests: _list(j['tests'], OnlineDetailTest.fromJson),
    photo: j['photo'] is Map ? OnlinePhoto.fromJson(_map(j['photo'])) : null,
    redos: _list(j['redos'], OnlineRedo.fromJson),
  );

  final String date;
  final String? previousLessonDate;
  final List<OnlineDetailTest> tests;
  final OnlinePhoto? photo;
  final List<OnlineRedo> redos;

  /// Харуулах тест: сонгосон, эс бөгөөс бодсон эхний тест, эс бөгөөс эхний тест (вэбтэй ижил).
  OnlineDetailTest? current(String? pick) =>
      tests.where((t) => t.testId == pick).firstOrNull ??
      tests.where((t) => t.attempt != null).firstOrNull ??
      tests.firstOrNull;
}

// ───────── Анхаарах сурагчид (ангигүй, ирэхгүй) — Багш+, Админ ─────────

class UnassignedStudent {
  const UnassignedStudent({required this.id, required this.name, this.code, this.waitingSince});

  factory UnassignedStudent.fromJson(Map<String, Object?> j) => UnassignedStudent(
    id: (j['id'] as String?) ?? '',
    name: _fullName(j['firstName'], j['lastName']),
    code: _str(j['studentCode']),
    waitingSince: _str(j['waitingSince']),
  );

  final String id;
  final String name;
  final String? code;
  final String? waitingSince;
}

class NotAttendingStudent {
  const NotAttendingStudent({
    required this.id,
    required this.name,
    required this.classroomName,
    this.lastAttended,
    this.missedCount = 0,
  });

  factory NotAttendingStudent.fromJson(Map<String, Object?> j) => NotAttendingStudent(
    id: (j['id'] as String?) ?? '',
    name: _fullName(j['firstName'], j['lastName']),
    classroomName: (j['classroomName'] as String?) ?? '',
    lastAttended: _str(j['lastAttended']),
    missedCount: _int(j['missedCount']),
  );

  final String id;
  final String name;
  final String classroomName;
  final String? lastAttended;
  final int missedCount;
}

/// `GET /classrooms/attention-students` (Багш+, Админ).
class AttentionStudents {
  const AttentionStudents({this.unassigned = const [], this.notAttending = const []});

  factory AttentionStudents.fromJson(Map<String, Object?> j) => AttentionStudents(
    unassigned: _list(j['unassigned'], UnassignedStudent.fromJson),
    notAttending: _list(j['notAttending'], NotAttendingStudent.fromJson),
  );

  final List<UnassignedStudent> unassigned;
  final List<NotAttendingStudent> notAttending;

  bool get isEmpty => unassigned.isEmpty && notAttending.isEmpty;
}

// ───────── Админы өдөр тутмын хөнгөн үйлдэл ─────────

/// `GET /payments?status=PENDING` (Админ, Багш+ дээр `finance.manage`).
class PendingPayment {
  const PendingPayment({
    required this.id,
    required this.userName,
    this.phone,
    required this.amount,
    this.method,
    this.forMonth,
    this.description,
  });

  factory PendingPayment.fromJson(Map<String, Object?> j) {
    final u = j['user'] is Map ? _map(j['user']) : const <String, Object?>{};
    return PendingPayment(
      id: (j['id'] as String?) ?? '',
      userName: _fullName(u['firstName'], u['lastName']),
      phone: _str(u['phone']),
      amount: _int(j['amount']),
      method: _str(j['method']),
      forMonth: _str(j['forMonth']),
      description: _str(j['description']),
    );
  }

  final String id;
  final String userName;
  final String? phone;
  final int amount;
  final String? method;
  final String? forMonth;
  final String? description;
}

/// `GET /users/students/pending-approval` (Админ, Багш+).
class PendingStudent {
  const PendingStudent({
    required this.id,
    required this.name,
    this.phone,
    this.grade,
    this.registeredAt,
    this.hasConfirmedPayment,
  });

  factory PendingStudent.fromJson(Map<String, Object?> j) => PendingStudent(
    id: (j['id'] as String?) ?? '',
    name: _fullName(j['firstName'], j['lastName']),
    phone: _str(j['phone']),
    grade: j['grade'] is num ? _int(j['grade']) : null,
    registeredAt: _str(j['registeredAt']),
    hasConfirmedPayment: j['hasConfirmedPayment'] is bool ? j['hasConfirmedPayment'] as bool : null,
  );

  final String id;
  final String name;
  final String? phone;
  final int? grade;
  final String? registeredAt;

  /// null = төлбөрийн эрх шаардлагатай (мэдэх боломжгүй).
  final bool? hasConfirmedPayment;
}

enum LeadStatus {
  newLead('NEW', 'Шинэ'),
  contacted('CONTACTED', 'Холбогдсон'),
  enrolled('ENROLLED', 'Элссэн'),
  lost('LOST', 'Алдагдсан');

  const LeadStatus(this.api, this.label);

  final String api;
  final String label;

  static LeadStatus parse(Object? v) {
    for (final s in values) {
      if (s.api == v) return s;
    }
    return newLead;
  }
}

String leadSubjectLabel(String? s) => switch (s) {
  'MATH' => 'Математик',
  'SOCIAL_STUDIES' => 'Нийгэм',
  'BOTH' => 'Аль аль нь',
  _ => '',
};

/// `GET /leads` (Админ, Багш+).
class Lead {
  const Lead({
    required this.id,
    required this.name,
    required this.phone,
    this.subject,
    this.grade,
    required this.status,
    this.createdAt,
  });

  factory Lead.fromJson(Map<String, Object?> j) => Lead(
    id: (j['id'] as String?) ?? '',
    name: (j['name'] as String?) ?? '',
    phone: (j['phone'] as String?) ?? '',
    subject: _str(j['subject']),
    grade: j['grade'] is num ? _int(j['grade']) : null,
    status: LeadStatus.parse(j['status']),
    createdAt: _str(j['createdAt']),
  );

  final String id;
  final String name;
  final String phone;
  final String? subject;
  final int? grade;
  final LeadStatus status;
  final String? createdAt;

  Lead withStatus(LeadStatus s) =>
      Lead(id: id, name: name, phone: phone, subject: subject, grade: grade, status: s, createdAt: createdAt);
}

// ───────── Эрх ─────────

/// `GET /staff-capabilities/me`.
class StaffCaps {
  const StaffCaps({this.administrator = false, this.grants = const []});

  factory StaffCaps.fromJson(Map<String, Object?> j) => StaffCaps(
    administrator: j['administrator'] == true,
    grants: [
      for (final g in (j['grants'] as List?) ?? const [])
        if (g is Map && g['capability'] is String) (capability: g['capability']! as String, scoped: _str(g['scopeKey']) != null),
    ],
  );

  final bool administrator;
  final List<({String capability, bool scoped})> grants;

  /// Бүх ангид (scope-гүй) олгогдсон эсвэл админ.
  bool has(String capability) => administrator || grants.any((g) => g.capability == capability && !g.scoped);
}

// ───────── Зар ─────────

enum AnnouncementAudience {
  allClassroom('ALL_CLASSROOM', 'Танхимын бүх анги'),
  allStudents('ALL_STUDENTS', 'Бүх сурагч'),
  allOnline('ALL_ONLINE', 'Онлайн сурагчид'),
  selected('SELECTED_CLASSROOMS', 'Сонгосон ангиуд');

  const AnnouncementAudience(this.api, this.label);

  final String api;
  final String label;
}

/// `GET /announcements/manage`.
class AnnouncementItem {
  const AnnouncementItem({
    required this.id,
    required this.title,
    required this.body,
    required this.pinned,
    required this.audience,
    this.classNames = const [],
    this.createdAt,
  });

  factory AnnouncementItem.fromJson(Map<String, Object?> j) => AnnouncementItem(
    id: (j['id'] as String?) ?? '',
    title: (j['title'] as String?) ?? '',
    body: (j['body'] as String?) ?? '',
    pinned: j['pinned'] == true,
    audience: (j['audience'] as String?) ?? '',
    classNames: [
      for (final t in (j['classroomTargets'] as List?) ?? const [])
        if (t is Map && t['classroom'] is Map && (t['classroom'] as Map)['name'] is String)
          (t['classroom'] as Map)['name'] as String,
    ],
    createdAt: _str(j['createdAt']),
  );

  final String id;
  final String title;
  final String body;
  final bool pinned;
  final String audience;
  final List<String> classNames;
  final String? createdAt;

  String get audienceLabel => switch (audience) {
    'ALL_STUDENTS' => 'Бүх сурагч',
    'ALL_ONLINE' => 'Онлайн',
    'SELECTED_CLASSROOMS' => classNames.isEmpty ? 'Сонгосон анги' : classNames.join(', '),
    'ONE_CLASSROOM' => 'Нэг анги',
    _ => 'Танхим',
  };
}
