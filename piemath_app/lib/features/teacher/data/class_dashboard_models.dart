/// `GET /class-dashboard` ба `GET /class-dashboard/classes/:id` (вэбийн `components/classes/types.ts`).
/// Тоо, төлөв, анхаарах сурагчийг СЕРВЕР тооцно; апп зөвхөн харуулна. Мөнгөн дүн (`tuitionAmount`,
/// `paidThisMonth`) зориуд уншигдахгүй — зөвхөн төлбөрийн төлөв (RULES §6).
library;

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();

int _int(Object? v, [int fallback = 0]) => v is num ? v.toInt() : fallback;

int? _intOrNull(Object? v) => v is num ? v.round() : null;

String? _str(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

String? _personName(Object? v) => v is Map ? _str(v['name']) : null;

String? _personId(Object? v) => v is Map ? _str(v['id']) : null;

/// Төлбөрийн төлөв (сурагч бүр, эсвэл ангийн тоо).
enum PayState {
  paid('PAID', 'Төлсөн'),
  partial('PARTIAL', 'Дутуу'),
  pending('PENDING', 'Хүлээгдэж буй'),
  none('NONE', 'Бүртгэлгүй');

  const PayState(this.api, this.label);

  final String api;
  final String label;

  static PayState? parse(Object? v) {
    for (final s in values) {
      if (s.api == v) return s;
    }
    return null;
  }
}

/// Эрсдэлийн шошго (вэбийн `RISK_META`).
String dashRiskLabel(String kind) => switch (kind) {
  'LOW_ATTENDANCE' => 'Ирц сул',
  'LOW_HOMEWORK' => 'Даалгавар сул',
  'LOW_SCORE' => 'Дүн сул',
  'FALLING' => 'Буурч байна',
  'MISSED_EXAMS' => 'Шалгалт алгассан',
  _ => 'Анхаарах',
};

/// Зан төлөвийн шошго (вэбийн `FLAG_META`; `concern` = санаа зовох).
({String label, bool concern}) dashFlagMeta(String kind) => switch (kind) {
  'GUESSES' => (label: 'Буудаж боддог', concern: true),
  'COPIES' => (label: 'Хуулдаг', concern: true),
  'ATTENTION' => (label: 'Анхаарал', concern: true),
  'IMPROVED' => (label: 'Сайжирсан', concern: false),
  _ => (label: kind, concern: false),
};

class DashPermissions {
  const DashPermissions({this.money = false, this.manageClass = false, this.manageClasses = false, this.isAdmin = false});

  factory DashPermissions.fromJson(Object? j) {
    final m = j is Map ? j.cast<String, Object?>() : const <String, Object?>{};
    return DashPermissions(
      money: m['money'] == true,
      manageClass: m['manageClass'] == true,
      manageClasses: m['manageClasses'] == true,
      isAdmin: m['isAdmin'] == true,
    );
  }

  final bool money;
  final bool manageClass;
  final bool manageClasses;
  final bool isAdmin;
}

/// Ангийн жагсаалтын нэг мөр.
class DashClass {
  const DashClass({
    required this.id,
    required this.name,
    required this.type,
    this.grade,
    this.classTeacher,
    this.classTeacherId,
    this.assistantTeacher,
    this.assistantTeacherId,
    this.teachers = const [],
    this.students = 0,
    this.attendanceRate,
    this.homeworkRate,
    this.examAvg,
    this.examCount = 0,
    this.riskCount = 0,
    this.lastLessonDate,
    this.lastLessonTopic,
    this.payment,
  });

  factory DashClass.fromJson(Map<String, Object?> j) {
    final last = j['lastLesson'];
    final pay = j['payment'];
    return DashClass(
      id: (j['id'] as String?) ?? '',
      name: (j['name'] as String?) ?? '',
      type: (j['type'] as String?) ?? 'IN_PERSON',
      grade: _intOrNull(j['grade']),
      classTeacher: _personName(j['classTeacher']),
      classTeacherId: _personId(j['classTeacher']),
      assistantTeacher: _personName(j['assistantTeacher']),
      assistantTeacherId: _personId(j['assistantTeacher']),
      teachers: [for (final t in (j['teachers'] as List?) ?? const []) if (t is String) t],
      students: _int(j['students']),
      attendanceRate: _intOrNull(j['attendanceRate']),
      homeworkRate: _intOrNull(j['homeworkRate']),
      examAvg: _intOrNull(j['examAvg']),
      examCount: _int(j['examCount']),
      riskCount: _int(j['riskCount']),
      lastLessonDate: last is Map ? _str(last['date']) : null,
      lastLessonTopic: last is Map ? _str(last['topic']) : null,
      payment: pay is Map ? _paymentCounts(pay) : null,
    );
  }

  final String id;
  final String name;
  final String type;
  final int? grade;
  final String? classTeacher;
  final String? classTeacherId;
  final String? assistantTeacher;
  final String? assistantTeacherId;

  /// Ангийн багш нар + хуваарийн бусад багш (хайлтад).
  final List<String> teachers;
  final int students;
  final int? attendanceRate;
  final int? homeworkRate;
  final int? examAvg;
  final int examCount;
  final int riskCount;
  final String? lastLessonDate;
  final String? lastLessonTopic;

  /// Энэ сарын төлбөрийн төлөвөөр сурагчийн тоо. `finance.manage`-гүй бол null (мөнгө харагдахгүй).
  final Map<PayState, int>? payment;

  bool get isOnline => type == 'ONLINE';

  bool isMine(String userId) => classTeacherId == userId || assistantTeacherId == userId;

  /// Хуваарьт багш, ангийн багш аль нэг нь нэрээр таарах эсэх (хайлт).
  bool matches(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return true;
    return name.toLowerCase().contains(q) ||
        [classTeacher, assistantTeacher, ...teachers].any((t) => t != null && t.toLowerCase().contains(q));
  }
}

Map<PayState, int> _paymentCounts(Map<dynamic, dynamic> m) => {for (final s in PayState.values) s: _int(m[s.api])};

class DashList {
  const DashList({required this.windowDays, required this.permissions, required this.classes});

  factory DashList.fromJson(Map<String, Object?> j) => DashList(
    windowDays: _int(j['windowDays'], 30),
    permissions: DashPermissions.fromJson(j['permissions']),
    classes: [for (final c in (j['classes'] as List?) ?? const []) DashClass.fromJson(_map(c))],
  );

  final int windowDays;
  final DashPermissions permissions;
  final List<DashClass> classes;

  int get studentTotal => classes.fold(0, (s, c) => s + c.students);
  int get riskTotal => classes.fold(0, (s, c) => s + c.riskCount);
}

/// Сурагчийн зан төлөвийн шошго (`flags[]`).
class DashFlag {
  const DashFlag({required this.kind, this.note});

  factory DashFlag.fromJson(Map<String, Object?> j) => DashFlag(kind: (j['kind'] as String?) ?? '', note: _str(j['note']));

  final String kind;
  final String? note;
}

/// Ангийн самбар дахь сурагч.
class DashStudent {
  const DashStudent({
    required this.id,
    this.firstName = '',
    this.lastName,
    this.studentCode,
    this.attendanceRate,
    this.absent = 0,
    this.homeworkRate,
    this.examAvg,
    this.examTaken = 0,
    this.examMissed = 0,
    this.makeup,
    this.competencyScore,
    this.risk = const [],
    this.flags = const [],
    this.payment,
  });

  factory DashStudent.fromJson(Map<String, Object?> j) {
    Map<String, Object?> sub(String k) => j[k] is Map ? _map(j[k]) : const {};
    final att = sub('attendance');
    final hw = sub('homework');
    final exam = sub('exam');
    final comp = sub('competency');
    final pay = sub('payment');
    return DashStudent(
      id: (j['id'] as String?) ?? '',
      firstName: (j['firstName'] as String?) ?? '',
      lastName: _str(j['lastName']),
      studentCode: _str(j['studentCode']),
      attendanceRate: _intOrNull(att['rate']),
      absent: _int(att['absent']),
      homeworkRate: _intOrNull(hw['rate']),
      examAvg: _intOrNull(exam['avg']),
      examTaken: _int(exam['taken']),
      examMissed: _int(exam['missed']),
      makeup: _intOrNull(j['makeup']),
      competencyScore: _intOrNull(comp['score']),
      risk: [for (final r in (j['risk'] as List?) ?? const []) if (r is String) r],
      flags: [for (final f in (j['flags'] as List?) ?? const []) if (f is Map) DashFlag.fromJson(_map(f))],
      payment: PayState.parse(pay['state']),
    );
  }

  final String id;
  final String firstName;
  final String? lastName;
  final String? studentCode;
  final int? attendanceRate;
  final int absent;
  final int? homeworkRate;
  final int? examAvg;
  final int examTaken;
  final int examMissed;

  /// Нөхөөгүй хичээлийн тоо (сервер тооцно); null = мэдээлэл алга.
  final int? makeup;
  final int? competencyScore;

  /// `LOW_ATTENDANCE`, `LOW_HOMEWORK`, `LOW_SCORE`, `FALLING`, `MISSED_EXAMS`.
  final List<String> risk;
  final List<DashFlag> flags;

  /// Төлбөрийн төлөв (мөнгөгүй). Эрхгүй бол null.
  final PayState? payment;

  bool get needsAttention => risk.isNotEmpty || flags.any((f) => dashFlagMeta(f.kind).concern);
}

class DashSummary {
  const DashSummary({
    this.students = 0,
    this.attendanceRate,
    this.homeworkRate,
    this.examAvg,
    this.exams = 0,
    this.riskCount = 0,
    this.improvedCount = 0,
    this.makeupStudents = 0,
  });

  factory DashSummary.fromJson(Object? v) {
    final j = v is Map ? v.cast<String, Object?>() : const <String, Object?>{};
    return DashSummary(
      students: _int(j['students']),
      attendanceRate: _intOrNull(j['attendanceRate']),
      homeworkRate: _intOrNull(j['homeworkRate']),
      examAvg: _intOrNull(j['examAvg']),
      exams: _int(j['exams']),
      riskCount: _int(j['riskCount']),
      improvedCount: _int(j['improvedCount']),
      makeupStudents: _int(j['makeupStudents']),
    );
  }

  final int students;
  final int? attendanceRate;
  final int? homeworkRate;
  final int? examAvg;
  final int exams;
  final int riskCount;
  final int improvedCount;
  final int makeupStudents;
}

/// Ангийн самбар (нэг анги).
class DashDetail {
  const DashDetail({
    required this.id,
    required this.name,
    required this.type,
    this.grade,
    this.classTeacher,
    this.assistantTeacher,
    required this.permissions,
    required this.windowDays,
    required this.summary,
    this.payment,
    this.students = const [],
  });

  factory DashDetail.fromJson(Map<String, Object?> j) {
    final c = j['classroom'] is Map ? _map(j['classroom']) : const <String, Object?>{};
    final pay = j['payment'];
    return DashDetail(
      id: (c['id'] as String?) ?? '',
      name: (c['name'] as String?) ?? '',
      type: (c['type'] as String?) ?? 'IN_PERSON',
      grade: _intOrNull(c['grade']),
      classTeacher: _personName(c['classTeacher']),
      assistantTeacher: _personName(c['assistantTeacher']),
      permissions: DashPermissions.fromJson(j['permissions']),
      windowDays: _int(j['windowDays'], 30),
      summary: DashSummary.fromJson(j['summary']),
      payment: pay is Map ? _paymentCounts(pay) : null,
      students: [for (final s in (j['students'] as List?) ?? const []) DashStudent.fromJson(_map(s))],
    );
  }

  final String id;
  final String name;
  final String type;
  final int? grade;
  final String? classTeacher;
  final String? assistantTeacher;
  final DashPermissions permissions;
  final int windowDays;
  final DashSummary summary;

  /// Энэ сарын төлбөрийн төлөвөөр сурагчийн тоо; эрхгүй бол null.
  final Map<PayState, int>? payment;
  final List<DashStudent> students;

  bool get isOnline => type == 'ONLINE';
}
