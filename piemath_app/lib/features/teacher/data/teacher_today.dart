import '../../../core/time/ub_time.dart';

/// Вэбийн 2026-11-01..03-ны шинэ боломжууд: ангийн түүх, профайл засах, тестийн эх PDF.
/// Жижиг хариунууд тул freezed-гүй, гараар задална (`docs/api-contract/teacher.md` §10).

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();

int _int(Object? v) => v is num ? v.toInt() : 0;

String? _str(Object? v) => v is String && v.trim().isNotEmpty ? v.trim() : null;

/// Ажилтны эрх (Багш, Багш+, Админ) — профайлыг нь зөвхөн Админ засна.
bool isStaffRole(String? role) => role == 'ADMIN' || role == 'TEACHER_PLUS' || role == 'TEACHER';

/// Профайл засах эрх (вэбийн `canEditProfile`-той ижил): Админ бүгдийг, Багш+ зөвхөн ажилтан биш хүнийг.
/// Эцсийн шийдвэр серверт (403) — энэ нь зөвхөн товчийг харуулах эсэх.
bool canEditProfile(String? viewerRole, String? targetRole) =>
    viewerRole == 'ADMIN' || (viewerRole == 'TEACHER_PLUS' && !isStaffRole(targetRole));

/// Эцэг эхийн утсыг харах эрх (сервер Багшид хоосон илгээнэ).
bool canSeeGuardianPhones(String? viewerRole) => viewerRole == 'ADMIN' || viewerRole == 'TEACHER_PLUS';

/// Сурагчийн нэг ангид байсан хугацаа (`classHistory[]`).
class ClassHistoryRow {
  const ClassHistoryRow({
    required this.classroomId,
    required this.name,
    required this.joinedAt,
    required this.leftAt,
    required this.attendance,
    required this.homework,
  });

  factory ClassHistoryRow.fromJson(Map<String, Object?> j) => ClassHistoryRow(
    classroomId: (j['classroomId'] as String?) ?? '',
    name: (j['name'] as String?) ?? '',
    joinedAt: j['joinedAt'] as String?,
    leftAt: j['leftAt'] as String?,
    attendance: _int(j['attendance']),
    homework: _int(j['homework']),
  );

  final String classroomId;
  final String name;
  final String? joinedAt;

  /// null = одоо ч байгаа анги.
  final String? leftAt;
  final int attendance;
  final int homework;

  /// «11А (Зүүн 4)» -> «11А» (вэбтэй ижил).
  String get shortName => name.replaceAll(RegExp(r'\s*\([^)]*\)$'), '');

  DateTime? get joined => parseApiInstant(joinedAt);
  DateTime? get left => parseApiInstant(leftAt);
}

/// `GET /users/:id` — сурагчийн дэлгэрэнгүй (ажилтны харагдац). Утас нь Багшид null ирнэ.
class StudentDetail {
  const StudentDetail({
    required this.id,
    required this.role,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.email,
    this.studentCode,
    this.grade,
    this.school,
    this.fatherPhone,
    this.motherPhone,
    this.guardianNote,
    this.classHistory = const [],
  });

  factory StudentDetail.fromJson(Map<String, Object?> j) {
    final p = j['studentProfile'] is Map ? _map(j['studentProfile']) : const <String, Object?>{};
    return StudentDetail(
      id: (j['id'] as String?) ?? '',
      role: (j['role'] as String?) ?? '',
      firstName: (j['firstName'] as String?) ?? '',
      lastName: (j['lastName'] as String?) ?? '',
      phone: _str(j['phone']),
      email: _str(j['email']),
      studentCode: _str(j['studentCode']),
      grade: p['grade'] is num ? (p['grade']! as num).toInt() : null,
      school: _str(p['school']),
      fatherPhone: _str(p['fatherPhone']),
      motherPhone: _str(p['motherPhone']),
      guardianNote: _str(p['guardianNote']),
      classHistory: [for (final h in (j['classHistory'] as List?) ?? const []) ClassHistoryRow.fromJson(_map(h))],
    );
  }

  final String id;
  final String role;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? email;
  final String? studentCode;
  final int? grade;
  final String? school;
  final String? fatherPhone;
  final String? motherPhone;
  final String? guardianNote;

  /// Эрт нь эхэнд (сервер); дэлгэцэнд шинэ нь дээр харуулна.
  final List<ClassHistoryRow> classHistory;
}

/// `PATCH /users/:id/profile` хариу: утас солигдоход нууц үг дагасан эсэх (сервер шийднэ).
class ProfilePatchResult {
  const ProfilePatchResult({this.passwordFollowedPhone});

  factory ProfilePatchResult.fromJson(Object? j) =>
      ProfilePatchResult(passwordFollowedPhone: j is Map ? j['passwordFollowedPhone'] as bool? : null);

  final bool? passwordFollowedPhone;
}

/// Хичээлийн өдрийн нэг тестийн эх PDF (`GET /schedule/day-plan` -> `tests[id].sourcePdfKey`).
class DayTestPdf {
  const DayTestPdf({required this.testId, required this.title, required this.pdfKey, required this.previous});

  final String testId;
  final String title;
  final String pdfKey;

  /// true = өмнөх хичээлийн тест.
  final bool previous;
}

/// `day-plan` хариунаас [classId] ангийн тестүүдийн эх PDF. Файлгүй тестийг оруулахгүй.
/// Хийсэн тест байвал тэр, үгүй бол төлөвлөсөн тест (вэбийн `doneToday ? done : plan`).
List<DayTestPdf> parseDayTestPdfs(Object? json, String classId) {
  final root = _map(json);
  final tests = root['tests'] is Map ? _map(root['tests']) : const <String, Object?>{};
  final today = <String>[];
  final before = <String>[];
  void add(List<String> to, Object? id) {
    if (id is String && id.isNotEmpty && !to.contains(id)) to.add(id);
  }

  for (final e in (root['entries'] as List?) ?? const []) {
    final entry = _map(e);
    if (entry['classroomId'] != classId) continue;
    final done = [for (final d in (entry['done'] as List?) ?? const []) _map(d)['testId']];
    final List<Object?> plan = entry['plan'] is Map
        ? ((_map(entry['plan'])['testIds'] as List?) ?? const <Object?>[]).cast<Object?>()
        : const <Object?>[];
    for (final id in done.any((d) => d is String) ? done : plan) {
      add(today, id);
    }
    if (entry['previous'] is Map) {
      for (final t in (_map(entry['previous'])['tests'] as List?) ?? const []) {
        add(before, _map(t)['testId']);
      }
    }
  }
  before.removeWhere(today.contains);

  DayTestPdf? one(String id, bool previous) {
    final t = tests[id] is Map ? _map(tests[id]) : null;
    final key = t == null ? null : _str(t['sourcePdfKey']);
    if (t == null || key == null) return null;
    final title = [
      _str(t['title']) ?? _str(t['short']) ?? 'Тест',
      _str(t['bookTitle']),
      if (_str(t['variant']) case final v?) '$v хувилбар',
    ].whereType<String>().join(' — ');
    return DayTestPdf(testId: id, title: title, pdfKey: key, previous: previous);
  }

  return [
    for (final id in today) ?one(id, false),
    for (final id in before) ?one(id, true),
  ];
}
