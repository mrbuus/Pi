// `api/src/tuition/tuition.controller.ts` (вэбийн `components/tuition/types.ts`).
// Мөнгөний тооцоо БҮГД серверт — энд зөвхөн задлана, нэг ч дүн тооцохгүй.

import '../../../core/time/ub_time.dart';

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const {};
String? _str(Object? v) => v is String && v.isNotEmpty ? v : null;
int _int(Object? v) => v is num ? v.round() : 0;

/// Буцаалтын төлөв (`TuitionRefund.status`).
enum RefundStatus {
  draft('DRAFT', 'Ноорог'),
  pendingApproval('PENDING_APPROVAL', 'Зөвшөөрөл хүлээж буй'),
  approved('APPROVED', 'Зөвшөөрсөн'),
  paid('PAID', 'Олгосон'),
  cancelled('CANCELLED', 'Цуцалсан'),
  unknown('', 'Тодорхойгүй');

  const RefundStatus(this.api, this.label);

  final String api;
  final String label;

  static RefundStatus fromApi(Object? v) => values.firstWhere((s) => s.api == v && s != unknown, orElse: () => unknown);

  /// Шүүлтүүрийн чипүүд (вэбийн `RefundList` FILTERS).
  static const filters = [draft, pendingApproval, approved, paid, cancelled];
}

/// Серверийн анхааруулга (вэбийн `REFUND_WARNING_TEXT`).
const refundWarningText = <String, String>{
  'NO_LESSON_DAYS': 'Энэ хугацаанд хичээлийн өдөр олдсонгүй. Ангийн хуваарь тохируулагдсан эсэхийг шалгана уу',
  'LEFT_BEFORE_JOINED': 'Гарах огноо орсон огнооноос өмнө байна. Огноог шалгана уу',
  'ZERO_TUITION': 'Сурагчийн сургалтын төлбөр тохируулагдаагүй байна. Бүртгэлээс төлбөрийн дүнг оруулна уу',
  'LEFT_AFTER_LAST_LESSON': 'Гарах огноо гэрээний сүүлийн хичээлээс хойш байна. Бүтэн хугацаагаар тооцов',
  'JOINED_BEFORE_FIRST_LESSON': 'Орсон огноо гэрээний эхний хичээлээс өмнө байна. Эхнээс нь тооцов',
};

/// Анхааруулгын код → монгол бичвэр (мэдэгдэхгүй код бол ерөнхий бичвэр, англи код харуулахгүй).
String refundWarningLabel(String code) => refundWarningText[code] ?? 'Тооцоонд анхаарах зүйл байна';

/// Буцаалтыг олгосон арга.
const refundPaymentMethods = <String, String>{'CASH': 'Бэлнээр', 'BANK_TRANSFER': 'Дансаар', 'QPAY': 'QPay'};

/// `{ id, firstName, lastName }`.
class RefundPerson {
  const RefundPerson({required this.id, required this.firstName, required this.lastName, this.role});

  factory RefundPerson.fromJson(Object? json) {
    final j = _map(json);
    return RefundPerson(
      id: _str(j['id']) ?? '',
      firstName: _str(j['firstName']) ?? '',
      lastName: _str(j['lastName']) ?? '',
      role: _str(j['role']),
    );
  }

  final String id;
  final String firstName;
  final String lastName;
  final String? role;

  /// «Овог Нэр» (вэбтэй ижил дараалал).
  String get fullName => '$lastName $firstName'.trim();
}

/// `{ id, name }`.
class RefundClassroom {
  const RefundClassroom({required this.id, required this.name, this.grade});

  factory RefundClassroom.fromJson(Object? json) {
    final j = _map(json);
    return RefundClassroom(
      id: _str(j['id']) ?? '',
      name: _str(j['name']) ?? '',
      grade: j['grade'] is num ? (j['grade']! as num).toInt() : null,
    );
  }

  final String id;
  final String name;
  final int? grade;
}

/// Төлбөрийн багц (`plan` — ledger-ээс). Бүтэн жил 45 хоногийн дүрмийг сервер шийднэ.
class RefundPlan {
  const RefundPlan({required this.kind, this.autoFull = false, this.settled = false});

  static RefundPlan? fromJson(Object? json) {
    if (json is! Map) return null;
    final j = _map(json);
    final kind = _str(j['kind']);
    if (kind == null) return null;
    return RefundPlan(kind: kind, autoFull: j['autoFull'] == true, settled: j['settled'] == true);
  }

  final String kind;

  /// Төлбөрөөр автоматаар бүтэн жил болсон.
  final bool autoFull;

  /// Багш+ гараар «Бүрэн» болгосон.
  final bool settled;

  /// «Бүтэн жил (төлбөрөөр)» — вэбийн `WithdrawalSummary`-тэй ижил.
  String get label {
    final base = switch (kind) {
      'FULL_YEAR' => 'Бүтэн жил',
      'INSTALLMENT' => 'Хуваан төлөх',
      'MONTHLY' => 'Сар бүр',
      _ => 'Тодорхойгүй',
    };
    return autoFull
        ? '$base (төлбөрөөр)'
        : settled
        ? '$base (гараар)'
        : base;
  }
}

/// `calculation` — серверийн тооцоо (утгыг ЯГ харуулна).
class RefundCalculation {
  const RefundCalculation({
    required this.totalLessonDays,
    required this.attendedLessonDays,
    required this.dailyRate,
    required this.owed,
    required this.totalPaid,
    required this.refundAmount,
    required this.shortfall,
    this.warnings = const [],
  });

  factory RefundCalculation.fromJson(Object? json) {
    final j = _map(json);
    return RefundCalculation(
      totalLessonDays: _int(j['totalLessonDays']),
      attendedLessonDays: _int(j['attendedLessonDays']),
      dailyRate: _int(j['dailyRate']),
      owed: _int(j['owed']),
      totalPaid: _int(j['totalPaid']),
      refundAmount: _int(j['refundAmount']),
      shortfall: _int(j['shortfall']),
      warnings: [
        for (final w in (j['warnings'] as List?) ?? const [])
          if (w is String) w,
      ],
    );
  }

  /// Гарсан сарын (мөчлөгийн) хичээл.
  final int totalLessonDays;

  /// Гарсан сард тоологдсон хичээл (чөлөө хассан).
  final int attendedLessonDays;

  /// Нэг хичээлийн үнэ (сарын төлбөр ÷ 16 эсвэл 12).
  final int dailyRate;

  /// Ногдох төлбөр (бүтэн сар + гарсан сарын хичээл).
  final int owed;
  final int totalPaid;
  final int refundAmount;
  final int shortfall;
  final List<String> warnings;
}

/// `GET /tuition/refund/preview`.
class RefundPreview {
  const RefundPreview({
    required this.student,
    required this.classroom,
    required this.joinedOn,
    required this.leftOn,
    required this.calculation,
    required this.explanation,
    this.plan,
  });

  factory RefundPreview.fromJson(Object? json) {
    final j = _map(json);
    if (j['calculation'] is! Map || j['student'] is! Map) throw const FormatException('preview');
    return RefundPreview(
      student: RefundPerson.fromJson(j['student']),
      classroom: RefundClassroom.fromJson(j['classroom']),
      joinedOn: _str(j['joinedOn']),
      leftOn: _str(j['leftOn']) ?? '',
      plan: RefundPlan.fromJson(j['plan']),
      calculation: RefundCalculation.fromJson(j['calculation']),
      explanation: [
        for (final l in (j['explanation'] as List?) ?? const [])
          if (l is String) l,
      ],
    );
  }

  final RefundPerson student;
  final RefundClassroom classroom;

  /// Тооцоо эхэлсэн өдөр (`YYYY-MM-DD`).
  final String? joinedOn;
  final String leftOn;
  final RefundPlan? plan;
  final RefundCalculation calculation;

  /// Серверийн тайлбарын мөрүүд — өөрчлөхгүй, дарааллаар нь харуулна.
  final List<String> explanation;
}

/// `GET /tuition/refunds` мөр ба `GET /tuition/refund/:id`.
class RefundRecord {
  const RefundRecord({
    required this.id,
    required this.status,
    required this.student,
    required this.classroom,
    required this.leftOn,
    required this.calculation,
    this.note,
    this.paymentMethod,
    this.cancelReason,
    this.createdAt,
    this.approvedAt,
    this.paidAt,
    this.cancelledAt,
    this.createdBy,
    this.approvedBy,
    this.paidBy,
    this.cancelledBy,
  });

  factory RefundRecord.fromJson(Object? json) {
    final j = _map(json);
    final id = _str(j['id']);
    if (id == null) throw const FormatException('refund');
    final rawWarnings = j['warnings'];
    final calc = RefundCalculation.fromJson({
      ...j,
      // Жагсаалтад `warnings` нь JSON мөр байж болно — дэлгэрэнгүйд массив.
      'warnings': rawWarnings is List ? rawWarnings : const <Object?>[],
    });
    RefundPerson? person(String key) => j[key] is Map ? RefundPerson.fromJson(j[key]) : null;
    return RefundRecord(
      id: id,
      status: RefundStatus.fromApi(j['status']),
      student: RefundPerson.fromJson(j['student']),
      classroom: RefundClassroom.fromJson(j['classroom']),
      leftOn: _str(j['leftOn']) ?? '',
      calculation: calc,
      note: _str(j['note']),
      paymentMethod: _str(j['paymentMethod']),
      cancelReason: _str(j['cancelReason']),
      createdAt: _str(j['createdAt']),
      approvedAt: _str(j['approvedAt']),
      paidAt: _str(j['paidAt']),
      cancelledAt: _str(j['cancelledAt']),
      createdBy: person('createdBy'),
      approvedBy: person('approvedBy'),
      paidBy: person('paidBy'),
      cancelledBy: person('cancelledBy'),
    );
  }

  final String id;
  final RefundStatus status;
  final RefundPerson student;
  final RefundClassroom classroom;

  /// ISO (`2026-11-03T00:00:00.000Z`) — эхний 10 тэмдэгт нь гарсан өдөр.
  final String leftOn;
  final RefundCalculation calculation;
  final String? note;
  final String? paymentMethod;
  final String? cancelReason;
  final String? createdAt;
  final String? approvedAt;
  final String? paidAt;
  final String? cancelledAt;
  final RefundPerson? createdBy;
  final RefundPerson? approvedBy;
  final RefundPerson? paidBy;
  final RefundPerson? cancelledBy;

  /// `YYYY-MM-DD`.
  String get leftOnKey => leftOn.length >= 10 ? leftOn.substring(0, 10) : leftOn;

  UbDateTime? get leftOnDate => parseDateKey(leftOnKey);
}

/// `GET /tuition/refunds`.
class RefundListPage {
  const RefundListPage({required this.refunds, required this.total});

  factory RefundListPage.fromJson(Object? json) {
    final j = _map(json);
    final list = j['refunds'];
    if (list is! List) throw const FormatException('refunds');
    return RefundListPage(refunds: [for (final r in list) RefundRecord.fromJson(r)], total: _int(j['total']));
  }

  final List<RefundRecord> refunds;
  final int total;
}

/// `GET /users/search` мөр.
class StudentHit {
  const StudentHit({required this.id, required this.firstName, required this.lastName, this.code});

  factory StudentHit.fromJson(Object? json) {
    final j = _map(json);
    return StudentHit(
      id: _str(j['id']) ?? '',
      firstName: _str(j['firstName']) ?? '',
      lastName: _str(j['lastName']) ?? '',
      code: _str(j['studentCode']) ?? _str(j['username']),
    );
  }

  final String id;
  final String firstName;
  final String lastName;

  /// Сурагчийн код, эсвэл нэвтрэх нэр.
  final String? code;

  String get fullName => '$lastName $firstName'.trim();
}

/// `GET /users/:id` — зөвхөн эрх ба идэвхтэй анги.
class StudentClassInfo {
  const StudentClassInfo({required this.isStudent, this.classroom});

  factory StudentClassInfo.fromJson(Object? json) {
    final j = _map(json);
    return StudentClassInfo(
      isStudent: j['role'] == 'STUDENT',
      classroom: j['currentClassroom'] is Map ? RefundClassroom.fromJson(j['currentClassroom']) : null,
    );
  }

  final bool isStudent;
  final RefundClassroom? classroom;
}

/// Буцаалт үүсгэсний үр дүн.
class RefundCreated {
  const RefundCreated(this.id, {this.existed = false});

  final String id;

  /// Сервер давхардлыг татгалзсан (эсвэл хариу тасарсан) — өмнө бүртгэгдсэн буцаалт руу шилжинэ.
  final bool existed;
}

/// Буцаалтын хэсэгт хандах эрх (вэб: ADMIN, TEACHER_PLUS; сервер: `finance.manage`).
enum TuitionAccess {
  /// Админ — бүх үйлдэл.
  admin,

  /// Багш+ санхүүгийн эрхтэй — тооцоо, ноорог, илгээх, цуцлах (зөвшөөрөх, олгох нь Админд).
  manager,

  /// Эрхгүй (Багш, сурагч, санхүүгийн эрхгүй Багш+).
  denied;

  bool get allowed => this != denied;
}
