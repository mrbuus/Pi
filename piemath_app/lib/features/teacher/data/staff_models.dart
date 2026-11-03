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

class OnlineCell {
  const OnlineCell({required this.score, required this.max, required this.testId});

  final num score;
  final num max;
  final String testId;

  String get text => '${_trim(score)}/${_trim(max)}';

  static String _trim(num n) => n == n.roundToDouble() ? '${n.toInt()}' : n.toStringAsFixed(1);
}

/// `GET /classrooms/:id/homework-marks/online?date=`.
class OnlineMarks {
  const OnlineMarks({this.hasTests = false, this.students = const {}});

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
    return OnlineMarks(hasTests: ((j['tests'] as List?) ?? const []).isNotEmpty, students: students);
  }

  /// Өмнөх хичээлд онлайн даалгаврын тест байсан эсэх.
  final bool hasTests;
  final Map<String, OnlineCell> students;
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
