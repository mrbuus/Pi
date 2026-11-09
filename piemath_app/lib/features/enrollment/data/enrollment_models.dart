/// Элсэлтийн удирдлагын өгөгдөл (вэбийн `components/enrollment/types.ts`, `ExternalTeachersPanel.tsx`,
/// `UnassignedStudents.tsx`). Аль хичээл нээлттэйг код руу бичихгүй — бүгд серверийн мөрөөс (эзэн 2026-07-27).
library;

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

String? _str(Object? v) => v is String && v.isNotEmpty ? v : null;

String _name(Object? last, Object? first) => [last, first].whereType<String>().where((s) => s.isNotEmpty).join(' ');

/// Хичээл (`Subject` enum). Дэлгэцийн дараалал нь [values]-ийн дараалал.
enum EnrollmentSubject {
  math('MATH', 'Математик'),
  socialStudies('SOCIAL_STUDIES', 'Нийгэм судлал'),
  sat('SAT', 'SAT');

  const EnrollmentSubject(this.api, this.label);

  final String api;
  final String label;

  static EnrollmentSubject? parse(Object? v) {
    for (final s in values) {
      if (s.api == v) return s;
    }
    return null;
  }
}

/// Элсэлтийн төлөв. Сонголтын дараалал нь вэбийн `STATUS_OPTIONS`-той ижил.
enum EnrollmentStatus {
  open('OPEN', 'Нээлттэй'),
  comingSoon('COMING_SOON', 'Удахгүй'),
  closed('CLOSED', 'Дууссан');

  const EnrollmentStatus(this.api, this.label);

  final String api;
  final String label;

  static EnrollmentStatus parse(Object? v) {
    for (final s in values) {
      if (s.api == v) return s;
    }
    return closed;
  }
}

/// Хамрах хэлбэр. Дараалал нь вэбийн `AVAILABILITY_OPTIONS`-той ижил.
enum SubjectAvailability {
  both('BOTH', 'Танхим ба онлайн'),
  classroomOnly('CLASSROOM_ONLY', 'Зөвхөн танхим'),
  onlineOnly('ONLINE_ONLY', 'Зөвхөн онлайн');

  const SubjectAvailability(this.api, this.label);

  final String api;
  final String label;

  static SubjectAvailability parse(Object? v) {
    for (final s in values) {
      if (s.api == v) return s;
    }
    return both;
  }
}

/// `GET /enrollment-windows` мөр (нийтэд нээлттэй), `PATCH /enrollment-windows/:subject`-ийн хариу.
class EnrollmentWindow {
  const EnrollmentWindow({required this.subject, required this.status, required this.availability, this.note});

  static EnrollmentWindow? tryParse(Map<String, Object?> j) {
    final subject = EnrollmentSubject.parse(j['subject']);
    if (subject == null) return null;
    return EnrollmentWindow(
      subject: subject,
      status: EnrollmentStatus.parse(j['status']),
      availability: SubjectAvailability.parse(j['availability']),
      note: j['note'] is String ? j['note']! as String : null,
    );
  }

  final EnrollmentSubject subject;
  final EnrollmentStatus status;
  final SubjectAvailability availability;
  final String? note;

  EnrollmentWindow copyWith({EnrollmentStatus? status}) =>
      EnrollmentWindow(subject: subject, status: status ?? this.status, availability: availability, note: note);
}

/// `GET /classrooms/unassigned-students` — танхимын, идэвхжсэн боловч ангигүй сурагч.
class WaitingStudent {
  const WaitingStudent({required this.id, required this.name, this.phone, this.grade, this.school, this.waitingSince});

  factory WaitingStudent.fromJson(Map<String, Object?> j) {
    final p = _map(j['studentProfile']);
    return WaitingStudent(
      id: (j['id'] as String?) ?? '',
      name: _name(j['firstName'], j['lastName']),
      phone: _str(j['phone']),
      grade: p['grade'] is num ? (p['grade']! as num).toInt() : null,
      school: _str(p['school']),
      waitingSince: _str(j['waitingSince']),
    );
  }

  final String id;
  final String name;
  final String? phone;
  final int? grade;
  final String? school;
  final String? waitingSince;
}

/// Гадны багшийн хүсэлтийн төлөв (`GET /teacher-groups/unverified` + `/verified`).
enum ExternalTeacherState { pending, rejected, verified }

/// Гадны багш. Хүлээгдэж буй, татгалзсан нь `unverified`-ээс (татгалзсан нь [rejectionReason]-тай),
/// баталгаажсан нь `verified`-ээс.
class ExternalTeacher {
  const ExternalTeacher({
    required this.id,
    required this.name,
    required this.email,
    required this.state,
    this.organization,
    this.createdAt,
    this.rejectionReason,
    this.verifiedAt,
    this.note,
    this.groupCount = 0,
  });

  factory ExternalTeacher.unverified(Map<String, Object?> j) {
    final reason = _str(j['rejectionReason']);
    return ExternalTeacher(
      id: (j['id'] as String?) ?? '',
      name: _name(j['lastName'], j['firstName']),
      email: (j['email'] as String?) ?? '',
      organization: _str(j['organization']),
      createdAt: _str(j['createdAt']),
      rejectionReason: reason,
      state: reason == null ? ExternalTeacherState.pending : ExternalTeacherState.rejected,
    );
  }

  factory ExternalTeacher.verified(Map<String, Object?> j) => ExternalTeacher(
    id: (j['id'] as String?) ?? '',
    name: _name(j['lastName'], j['firstName']),
    email: (j['email'] as String?) ?? '',
    organization: _str(j['organization']),
    verifiedAt: _str(j['verifiedAt']),
    note: _str(j['note']),
    groupCount: j['groupCount'] is num ? (j['groupCount']! as num).toInt() : 0,
    state: ExternalTeacherState.verified,
  );

  final String id;
  final String name;
  final String email;
  final String? organization;
  final ExternalTeacherState state;
  final String? createdAt;
  final String? rejectionReason;
  final String? verifiedAt;
  final String? note;
  final int groupCount;
}

/// Гадны багшийн хоёр жагсаалт нэг дор.
class ExternalTeachers {
  const ExternalTeachers({this.unverified = const [], this.verified = const []});

  final List<ExternalTeacher> unverified;
  final List<ExternalTeacher> verified;

  List<ExternalTeacher> get pending => [
    for (final t in unverified)
      if (t.state == ExternalTeacherState.pending) t,
  ];

  List<ExternalTeacher> get rejected => [
    for (final t in unverified)
      if (t.state == ExternalTeacherState.rejected) t,
  ];

  List<ExternalTeacher> of(ExternalTeacherState s) => switch (s) {
    ExternalTeacherState.pending => pending,
    ExternalTeacherState.rejected => rejected,
    ExternalTeacherState.verified => verified,
  };
}

/// Олгож болох эрх (`GET /catalog/passes` — идэвхтэй л).
class PassOption {
  const PassOption({required this.id, required this.name, required this.durationDays, this.price});

  factory PassOption.fromJson(Map<String, Object?> j) => PassOption(
    id: (j['id'] as String?) ?? '',
    name: (j['name'] as String?) ?? '',
    durationDays: j['durationDays'] is num ? (j['durationDays']! as num).toInt() : 0,
    price: j['price'] is num ? (j['price']! as num).toInt() : null,
  );

  final String id;
  final String name;
  final int durationDays;
  final int? price;
}
