import '../../../core/time/ub_time.dart';

/// Сурагчдын удирдлагын (Багш+, Админ) хариунууд. Жижиг, тогтворгүй бүтэцтэй тул freezed-гүй, гараар задална.
/// Эх: `api/src/users/users.service.ts` (listUsers, getUserDetail, student import),
/// `api/src/tuition/withdrawal.*`, `api/src/payments/payments.service.ts` (outstanding, studentHistory),
/// `api/src/classrooms/classrooms.service.ts` (list, attentionStudents). Вэб: `web/src/components/students/types.ts`.

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) => [
  for (final e in (j as List?) ?? const [])
    if (e is Map) f(_map(e)),
];

int _int(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) ?? 0 : 0);

int? _intOrNull(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) : null);

String? _str(Object? v) => v is String && v.trim().isNotEmpty ? v.trim() : null;

String _fullName(Object? first, Object? last) => [_str(last), _str(first)].whereType<String>().join(' ');

/// Төлбөрийн багц (`TuitionPlan`).
enum TuitionPlan {
  fullYear('FULL_YEAR', 'Бүтэн жил'),
  installment('INSTALLMENT', 'Хуваан төлөх'),
  monthly('MONTHLY', 'Сар бүр'),
  unknown('UNKNOWN', 'Тодорхойгүй');

  const TuitionPlan(this.api, this.label);

  final String api;
  final String label;

  static TuitionPlan? fromApi(Object? v) {
    for (final p in values) {
      if (p.api == v) return p;
    }
    return null;
  }
}

/// Ангийн чиглэл (вэбийн `lib/classTrack.ts` = `api/src/common/class-track.ts`, эзэн 2026-11-12): сурагч
/// чиглэл тус бүрт нэг ангид — математикийн анги + Нийгмийн ангид ЗЭРЭГ сууж болно. `subject` хоосон бол нэрээр.
enum ClassTrack { math, socialStudies, sat }

ClassTrack classTrack(String name, [String? subject]) => switch (subject) {
  'MATH' => ClassTrack.math,
  'SOCIAL_STUDIES' => ClassTrack.socialStudies,
  'SAT' => ClassTrack.sat,
  _ => name.toLowerCase().contains('нийгэм') ? ClassTrack.socialStudies : ClassTrack.math,
};

/// «12-4 (Баруун 4) + НИЙГЭМ (Зүүн 4)» — үндсэн анги эхэнд; ангигүй бол null.
String? classNames(ClassroomRef? main, List<ClassroomRef> others) {
  final names = [
    if (main != null && main.name.isNotEmpty) main.name,
    for (final o in others)
      if (o.name.isNotEmpty) o.name,
  ];
  return names.isEmpty ? null : names.join(' + ');
}

/// Ангийн товч (жагсаалтын мөрийн анги, сүүлийн анги).
class ClassroomRef {
  const ClassroomRef({required this.id, required this.name, this.grade, this.students, this.subject});

  factory ClassroomRef.fromJson(Map<String, Object?> j) => ClassroomRef(
    id: (j['id'] as String?) ?? '',
    name: (j['name'] as String?) ?? '',
    grade: _intOrNull(j['grade']),
    students: j['_count'] is Map ? _intOrNull(_map(j['_count'])['enrollments']) : null,
    subject: _str(j['subject']),
  );

  static ClassroomRef? maybe(Object? j) => j is Map ? ClassroomRef.fromJson(_map(j)) : null;

  final String id;
  final String name;
  final int? grade;

  /// `GET /classrooms`-ийн `_count.enrollments` (сонгох жагсаалтад).
  final int? students;

  /// `MATH`, `SOCIAL_STUDIES`, `SAT` эсвэл null (нэрээр таних).
  final String? subject;

  ClassTrack get track => classTrack(name, subject);
}

/// `GET /users?role=STUDENT[&archived=true]` — жагсаалтын нэг мөр.
/// Багшид сервер `tuitionPlan`, `tuitionAmount`-ийг null болгож илгээнэ.
class AdminStudent {
  const AdminStudent({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.studentCode,
    this.phone,
    this.archivedAt,
    this.archiveReason,
    this.lastSeenAt,
    this.grade,
    this.school,
    this.branch,
    this.section,
    this.tuitionPlan,
    this.tuitionAmount,
    this.fatherPhone,
    this.motherPhone,
    this.joinedOn,
    this.currentClassroom,
    this.lastClassroom,
    this.otherClassrooms = const [],
    this.username,
    this.parentPhones = const [],
  });

  factory AdminStudent.fromJson(Map<String, Object?> j) {
    final p = _map(j['studentProfile']);
    return AdminStudent(
      id: (j['id'] as String?) ?? '',
      firstName: (j['firstName'] as String?) ?? '',
      lastName: (j['lastName'] as String?) ?? '',
      studentCode: _str(j['studentCode']),
      phone: _str(j['phone']),
      archivedAt: _str(j['archivedAt']),
      archiveReason: _str(j['archiveReason']),
      lastSeenAt: _str(j['lastSeenAt']),
      grade: _intOrNull(p['grade']),
      school: _str(p['school']),
      branch: _str(p['branch']),
      section: _str(p['section']),
      tuitionPlan: TuitionPlan.fromApi(p['tuitionPlan']),
      tuitionAmount: _intOrNull(p['tuitionAmount']),
      fatherPhone: _str(p['fatherPhone']),
      motherPhone: _str(p['motherPhone']),
      joinedOn: _str(p['joinedOn']),
      currentClassroom: ClassroomRef.maybe(j['currentClassroom']),
      lastClassroom: ClassroomRef.maybe(j['lastClassroom']),
      otherClassrooms: _list(j['otherClassrooms'], ClassroomRef.fromJson),
      username: _str(j['username']),
      parentPhones: [
        for (final p in (j['parentPhones'] is List ? j['parentPhones']! as List : const []))
          if (p is String && p.trim().isNotEmpty) p.trim(),
      ],
    );
  }

  final String id;
  final String firstName;
  final String lastName;
  final String? studentCode;
  final String? phone;
  final String? archivedAt;
  final String? archiveReason;
  final String? lastSeenAt;
  final int? grade;
  final String? school;
  final String? branch;
  final String? section;
  final TuitionPlan? tuitionPlan;
  final int? tuitionAmount;
  final String? fatherPhone;
  final String? motherPhone;
  final String? joinedOn;
  final ClassroomRef? currentClassroom;
  final ClassroomRef? lastClassroom;

  /// Зэрэг сууж буй бусад анги (математик + Нийгэм, вэб 2026-11-12) — үндсэн анги [currentClassroom].
  final List<ClassroomRef> otherClassrooms;
  final String? username;

  /// Аппад холбогдсон эцэг эхийн утас (ParentLink) — хайлтад.
  final List<String> parentPhones;

  /// «Овог Нэр» (вэбийн `fullName`).
  String get fullName => _fullName(firstName, lastName);

  bool get archived => archivedAt != null;

  /// Жагсаалтад харуулах ангийн нэр: идэвхтэй бол «12-4 + НИЙГЭМ (Зүүн 4)», архивт сүүлийн анги.
  String? get shownClassNames => archived ? lastClassroom?.name : classNames(currentClassroom, otherClassrooms);

  /// Идэвхтэй бол одоогийн, архивт бол сүүлийн анги.
  ClassroomRef? get shownClassroom => archived ? lastClassroom : currentClassroom;
}

/// `GET /payments/outstanding?month=` — тухайн сард дутуу төлсөн танхимын сурагч.
class OutstandingRow {
  const OutstandingRow({required this.studentId, required this.shortfall});

  factory OutstandingRow.fromJson(Map<String, Object?> j) =>
      OutstandingRow(studentId: (j['studentId'] as String?) ?? '', shortfall: _int(j['shortfall']));

  final String studentId;
  final int shortfall;
}

class UnassignedRow {
  const UnassignedRow({required this.id, required this.name, this.code, this.waitingSince});

  factory UnassignedRow.fromJson(Map<String, Object?> j) => UnassignedRow(
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

class NotAttendingRow {
  const NotAttendingRow({
    required this.id,
    required this.name,
    required this.classroomId,
    required this.classroomName,
    this.code,
    this.lastAttended,
    this.missedCount = 0,
  });

  factory NotAttendingRow.fromJson(Map<String, Object?> j) => NotAttendingRow(
    id: (j['id'] as String?) ?? '',
    name: _fullName(j['firstName'], j['lastName']),
    code: _str(j['studentCode']),
    classroomId: (j['classroomId'] as String?) ?? '',
    classroomName: (j['classroomName'] as String?) ?? '',
    lastAttended: _str(j['lastAttended']),
    missedCount: _int(j['missedCount']),
  );

  final String id;
  final String name;
  final String? code;
  final String classroomId;
  final String classroomName;
  final String? lastAttended;
  final int missedCount;
}

/// `GET /classrooms/attention-students` (Багш+, Админ): ангигүй, ирэхгүй сурагчид.
class AttentionData {
  const AttentionData({this.unassigned = const [], this.notAttending = const []});

  factory AttentionData.fromJson(Map<String, Object?> j) => AttentionData(
    unassigned: _list(j['unassigned'], UnassignedRow.fromJson),
    notAttending: _list(j['notAttending'], NotAttendingRow.fromJson),
  );

  final List<UnassignedRow> unassigned;
  final List<NotAttendingRow> notAttending;

  bool get isEmpty => unassigned.isEmpty && notAttending.isEmpty;

  Set<String> get unassignedIds => {for (final u in unassigned) u.id};
  Set<String> get absentIds => {for (final a in notAttending) a.id};
}

/// `GET /users/:id` — удирдлагын хэсэгт хэрэгтэй талбарууд (архив, анги, бүртгэл, төлбөрийн багц).
class AdminStudentDetail {
  const AdminStudentDetail({
    required this.id,
    required this.role,
    required this.firstName,
    required this.lastName,
    this.studentCode,
    this.archivedAt,
    this.archiveReason,
    this.createdAt,
    this.currentClassroom,
    this.lastClassroom,
    this.otherClassrooms = const [],
    this.grade,
    this.school,
    this.branch,
    this.section,
    this.joinedOn,
    this.leftOn,
    this.tuitionPlan,
    this.tuitionAmount,
    this.tuitionNote,
  });

  factory AdminStudentDetail.fromJson(Map<String, Object?> j) {
    final p = _map(j['studentProfile']);
    return AdminStudentDetail(
      id: (j['id'] as String?) ?? '',
      role: (j['role'] as String?) ?? '',
      firstName: (j['firstName'] as String?) ?? '',
      lastName: (j['lastName'] as String?) ?? '',
      studentCode: _str(j['studentCode']),
      archivedAt: _str(j['archivedAt']),
      archiveReason: _str(j['archiveReason']),
      createdAt: _str(j['createdAt']),
      currentClassroom: ClassroomRef.maybe(j['currentClassroom']),
      lastClassroom: ClassroomRef.maybe(j['lastClassroom']),
      otherClassrooms: _list(j['otherClassrooms'], ClassroomRef.fromJson),
      grade: _intOrNull(p['grade']),
      school: _str(p['school']),
      branch: _str(p['branch']),
      section: _str(p['section']),
      joinedOn: _str(p['joinedOn']),
      leftOn: _str(p['leftOn']),
      tuitionPlan: TuitionPlan.fromApi(p['tuitionPlan']),
      tuitionAmount: _intOrNull(p['tuitionAmount']),
      tuitionNote: _str(p['tuitionNote']),
    );
  }

  final String id;
  final String role;
  final String firstName;
  final String lastName;
  final String? studentCode;
  final String? archivedAt;
  final String? archiveReason;
  final String? createdAt;
  final ClassroomRef? currentClassroom;
  final ClassroomRef? lastClassroom;

  /// Зэрэг сууж буй бусад анги (ж: Нийгэм).
  final List<ClassroomRef> otherClassrooms;
  final int? grade;
  final String? school;
  final String? branch;
  final String? section;
  final String? joinedOn;
  final String? leftOn;
  final TuitionPlan? tuitionPlan;
  final int? tuitionAmount;
  final String? tuitionNote;

  String get fullName => _fullName(firstName, lastName);

  bool get archived => archivedAt != null;
}

/// `GET /payments/student/:id` — нэг сурагчийн төлбөрийн хураангуй + түүх (Админ, санхүүтэй Багш+).
class StudentPaymentHistory {
  const StudentPaymentHistory({
    required this.expected,
    required this.totalPaid,
    required this.outstanding,
    this.tuitionPlan,
    this.tuitionNote,
    this.payments = const [],
  });

  factory StudentPaymentHistory.fromJson(Map<String, Object?> j) {
    final s = _map(j['summary']);
    return StudentPaymentHistory(
      expected: _int(s['expected']),
      totalPaid: _int(s['totalPaid']),
      outstanding: _int(s['outstanding']),
      tuitionPlan: TuitionPlan.fromApi(j['tuitionPlan']),
      tuitionNote: _str(j['tuitionNote']),
      payments: _list(j['payments'], PaymentLine.fromJson),
    );
  }

  final int expected;
  final int totalPaid;
  final int outstanding;
  final TuitionPlan? tuitionPlan;
  final String? tuitionNote;
  final List<PaymentLine> payments;
}

class PaymentLine {
  const PaymentLine({
    required this.id,
    required this.amount,
    required this.method,
    required this.status,
    this.forMonth,
    this.createdAt,
    this.paidAt,
  });

  factory PaymentLine.fromJson(Map<String, Object?> j) => PaymentLine(
    id: (j['id'] as String?) ?? '',
    amount: _int(j['amount']),
    method: (j['method'] as String?) ?? '',
    status: (j['status'] as String?) ?? 'PENDING',
    forMonth: _str(j['forMonth']),
    createdAt: _str(j['createdAt']),
    paidAt: _str(j['paidAt']),
  );

  final String id;
  final int amount;
  final String method;
  final String status;
  final String? forMonth;
  final String? createdAt;
  final String? paidAt;

  static const statusLabel = {
    'PENDING': 'Хүлээгдэж буй',
    'CONFIRMED': 'Баталгаажсан',
    'REJECTED': 'Татгалзсан',
    'REVERSED': 'Буцаасан',
  };
}

// ───────── Сургалтаас хасах (`/tuition/withdrawal`) ─────────

class WithdrawalCycle {
  const WithdrawalCycle({
    required this.start,
    required this.end,
    required this.full,
    required this.lessons,
    required this.counted,
    required this.charge,
    this.leaveDay,
    this.extraDays = const [],
    this.assumed = 0,
  });

  factory WithdrawalCycle.fromJson(Map<String, Object?> j) => WithdrawalCycle(
    start: (j['start'] as String?) ?? '',
    end: (j['end'] as String?) ?? '',
    full: j['full'] == true,
    lessons: _int(j['lessons']),
    leaveDay: _str(j['leaveDay']),
    extraDays: [
      for (final d in (j['extraDays'] as List?) ?? const [])
        if (d is String) d,
    ],
    counted: _int(j['counted']),
    charge: _int(j['charge']),
    assumed: _int(j['assumed']),
  );

  final String start;
  final String end;
  final bool full;
  final int lessons;
  final String? leaveDay;
  final List<String> extraDays;
  final int counted;
  final int charge;

  /// Вэбд ирц бүртгэхээс өмнөх (суусан гэж үзсэн) хичээл — 2026-11-08-аас өмнө хадгалсанд 0.
  final int assumed;
}

class WithdrawalLessonDay {
  const WithdrawalLessonDay({
    required this.date,
    this.status,
    this.note,
    this.leave = false,
    this.excluded = false,
    this.assumed = false,
  });

  factory WithdrawalLessonDay.fromJson(Map<String, Object?> j) => WithdrawalLessonDay(
    date: (j['date'] as String?) ?? '',
    status: _str(j['status']),
    note: _str(j['note']),
    leave: j['leave'] == true,
    excluded: j['excluded'] == true,
    assumed: j['assumed'] == true,
  );

  final String date;
  final String? status;
  final String? note;

  /// Сард 1 чөлөө автоматаар хасагдсан өдөр.
  final bool leave;

  /// Гараар «тооцохгүй» болгосон өдөр.
  final bool excluded;

  /// Вэбд ирц бүртгэхээс өмнөх — суусан гэж үзнэ, хасах боломжгүй.
  final bool assumed;
}

/// `GET /tuition/withdrawal/preview` — тооцоог СЕРВЕР бодно, апп зөвхөн харуулна.
class WithdrawalPreview {
  const WithdrawalPreview({
    required this.classroomName,
    required this.planKind,
    required this.autoFull,
    required this.settled,
    required this.monthlyFee,
    required this.lessonsPerMonth,
    required this.countFrom,
    required this.leftOn,
    required this.cycles,
    required this.perLesson,
    required this.owed,
    required this.paid,
    required this.refund,
    this.payments = const [],
    this.lastCycleDays = const [],
    this.historyLessons = 0,
    this.attendance = const {},
    this.homework = const {},
    this.refundedBefore = 0,
    this.webStart,
    this.noSchedule = false,
  });

  factory WithdrawalPreview.fromJson(Map<String, Object?> j) {
    final plan = _map(j['plan']);
    final r = _map(j['result']);
    final h = _map(j['history']);
    Map<String, int> counts(Object? v) => {for (final e in _map(v).entries) e.key: _int(e.value)};
    return WithdrawalPreview(
      classroomName: (_map(j['classroom'])['name'] as String?) ?? '',
      planKind: TuitionPlan.fromApi(plan['kind']) ?? TuitionPlan.unknown,
      autoFull: plan['autoFull'] == true,
      settled: plan['settled'] == true,
      monthlyFee: _int(j['monthlyFee']),
      lessonsPerMonth: _int(j['lessonsPerMonth']),
      countFrom: (j['countFrom'] as String?) ?? '',
      leftOn: (j['leftOn'] as String?) ?? '',
      cycles: _list(r['cycles'], WithdrawalCycle.fromJson),
      perLesson: _int(r['perLesson']),
      owed: _int(r['owed']),
      paid: _int(r['paid']),
      refund: _int(r['refund']),
      payments: [
        for (final p in _list(j['payments'], (m) => m))
          (amount: _int(p['amount']), label: _str(p['paidOn']) ?? _str(p['forMonth']) ?? 'огноогүй'),
      ],
      lastCycleDays: _list(j['lastCycleDays'], WithdrawalLessonDay.fromJson),
      historyLessons: _int(h['lessons']),
      attendance: counts(h['attendance']),
      homework: counts(h['homework']),
      refundedBefore: _int(r['refundedBefore']),
      webStart: _str(j['webStart']),
      noSchedule: j['noSchedule'] == true,
    );
  }

  final String classroomName;
  final TuitionPlan planKind;
  final bool autoFull;
  final bool settled;
  final int monthlyFee;
  final int lessonsPerMonth;
  final String countFrom;
  final String leftOn;
  final List<WithdrawalCycle> cycles;
  final int perLesson;
  final int owed;
  final int paid;
  final int refund;
  final List<({int amount, String label})> payments;
  final List<WithdrawalLessonDay> lastCycleDays;
  final int historyLessons;
  final Map<String, int> attendance;
  final Map<String, int> homework;

  /// Өмнө нь гаргасан буцаалт (төлсөн дүнгээс хассан).
  final int refundedBefore;

  /// Ангид вэбд ирц бүртгэж эхэлсэн өдөр.
  final String? webStart;

  /// Хуваарьгүй анги — хичээлийн тоо мэдэгдэхгүй.
  final bool noSchedule;
}

/// `GET /tuition/withdrawal/student/:id` — хадгалсан тооцоо (хадгалсан агшнаараа).
class SavedWithdrawal {
  const SavedWithdrawal({
    required this.id,
    required this.leftOn,
    required this.reason,
    required this.createdAt,
    required this.detail,
    this.createdBy,
    this.refundStatus,
  });

  factory SavedWithdrawal.fromJson(Map<String, Object?> j) => SavedWithdrawal(
    id: (j['id'] as String?) ?? '',
    leftOn: (j['leftOn'] as String?) ?? '',
    reason: (j['reason'] as String?) ?? '',
    createdAt: (j['createdAt'] as String?) ?? '',
    createdBy: _str(j['createdBy']),
    refundStatus: _str(_map(j['refundStatus'])['status']),
    detail: WithdrawalPreview.fromJson(_map(j['detail'])),
  );

  final String id;
  final String leftOn;
  final String reason;
  final String createdAt;
  final String? createdBy;
  final String? refundStatus;
  final WithdrawalPreview detail;

  static const refundLabel = {
    'DRAFT': 'Буцаалт: ноорог',
    'PENDING_APPROVAL': 'Буцаалт: батлуулахаар',
    'APPROVED': 'Буцаалт: батлагдсан',
    'PAID': 'Буцаалт: шилжүүлсэн',
    'CANCELLED': 'Буцаалт: цуцалсан',
  };
}

const attendanceLabel = {'PRESENT': 'Ирсэн', 'LATE': 'Хоцорсон', 'ABSENT': 'Тасалсан', 'EXCUSED': 'Чөлөөтэй'};
const homeworkLabel = {'DONE': 'Хийсэн', 'PARTIAL': 'Дутуу', 'NOT_DONE': 'Хийгээгүй'};

/// «2026-11-03» → «11.03».
String monthDay(String d) => d.length >= 10 ? '${d.substring(5, 7)}.${d.substring(8, 10)}' : d;

// ───────── Excel импорт (`/users/students/import/*`) ─────────

enum ImportRowStatus {
  create('NEW', 'Шинэ'),
  update('UPDATE', 'Шинэчлэх'),
  error('ERROR', 'Алдаа');

  const ImportRowStatus(this.api, this.label);

  final String api;
  final String label;

  static ImportRowStatus fromApi(Object? v) => switch (v) {
    'NEW' => create,
    'UPDATE' => update,
    _ => error,
  };
}

class ImportRow {
  const ImportRow({
    required this.rowNumber,
    required this.lastName,
    required this.firstName,
    required this.phone,
    required this.status,
    this.guardianPhone = '',
    this.classroomLabel = '',
    this.reason,
  });

  factory ImportRow.fromJson(Map<String, Object?> j) => ImportRow(
    rowNumber: _int(j['rowNumber']),
    lastName: (j['lastName'] as String?) ?? '',
    firstName: (j['firstName'] as String?) ?? '',
    phone: (j['phone'] as String?) ?? '',
    guardianPhone: (j['guardianPhone'] as String?) ?? '',
    classroomLabel: (j['classroomLabel'] as String?) ?? '',
    status: ImportRowStatus.fromApi(j['status']),
    reason: _str(j['reason']),
  );

  final int rowNumber;
  final String lastName;
  final String firstName;
  final String phone;
  final String guardianPhone;
  final String classroomLabel;
  final ImportRowStatus status;
  final String? reason;

  String get name => '$lastName $firstName'.trim();
}

class ImportPreview {
  const ImportPreview({required this.previewId, required this.rows});

  factory ImportPreview.fromJson(Map<String, Object?> j) =>
      ImportPreview(previewId: (j['previewId'] as String?) ?? '', rows: _list(j['rows'], ImportRow.fromJson));

  final String previewId;
  final List<ImportRow> rows;

  int count(ImportRowStatus s) => rows.where((r) => r.status == s).length;

  /// Анхдагч сонголт: алдаагүй бүх мөр (вэбтэй ижил).
  List<int> get selectable => [
    for (final r in rows)
      if (r.status != ImportRowStatus.error) r.rowNumber,
  ];
}

/// Хугацааны ISO-г UB огноо болгоно (харуулахад).
UbDateTime? ubDay(String? iso) {
  final at = parseApiInstant(iso);
  return at == null ? null : UbDateTime.fromInstant(at);
}
