/// Ангийн удирдлагын өгөгдөл (`api/src/classrooms/*`). Эрх, тооцоо — сервер; апп зөвхөн харуулна.
/// Төлбөрийн мөнгөн дүн энд ЗОРИУД байхгүй (Багш мөнгө харахгүй).
library;

import '../../../core/format/person_name.dart';
import '../../../core/time/ub_time.dart';

Map<String, Object?> asMap(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

String _str(Object? v) => v is String ? v : '';

String? _strOrNull(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

int? _intOrNull(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) : null);

DateTime? _instant(Object? v) => v is String ? parseApiInstant(v) : null;

/// Ангийн төрөл (`ClassroomType`).
enum ClassroomKind {
  inPerson('IN_PERSON', 'Танхим'),
  online('ONLINE', 'Онлайн');

  const ClassroomKind(this.api, this.label);
  final String api;
  final String label;

  static ClassroomKind fromApi(Object? v) => v == 'ONLINE' ? online : inPerson;
}

/// Хичээл (`Subject`). `null`/`MATH` = математик (анхдагч).
enum ClassSubject {
  math('MATH', 'Математик'),
  social('SOCIAL_STUDIES', 'Нийгмийн ухаан');

  const ClassSubject(this.api, this.label);
  final String api;
  final String label;

  static ClassSubject fromApi(Object? v) => v == 'SOCIAL_STUDIES' ? social : math;

  /// Серверт: математик бол `null` (одоо байгаа бүх анги шиг).
  String? get apiOrNull => this == math ? null : api;
}

/// Ажилтны товч мэдээлэл. Нэр нь «Б. Нэр», Багш+ бол «+».
class StaffRef {
  const StaffRef({required this.id, required this.firstName, required this.lastName, this.role});

  static StaffRef? fromJson(Object? j) {
    final m = asMap(j);
    final id = _str(m['id']);
    if (id.isEmpty) return null;
    return StaffRef(id: id, firstName: _str(m['firstName']), lastName: _str(m['lastName']), role: m['role'] as String?);
  }

  final String id;
  final String firstName;
  final String lastName;
  final String? role;

  String get name => staffName(firstName: firstName, lastName: lastName, role: role);
}

/// `GET /classrooms` мөр.
class AdminClassroom {
  const AdminClassroom({
    required this.id,
    required this.name,
    this.kind = ClassroomKind.inPerson,
    this.grade,
    this.subject = ClassSubject.math,
    this.teacher,
    this.assistantTeacher,
    this.studentCount = 0,
  });

  factory AdminClassroom.fromJson(Map<String, Object?> j) => AdminClassroom(
    id: _str(j['id']),
    name: _str(j['name']),
    kind: ClassroomKind.fromApi(j['type']),
    grade: _intOrNull(j['grade']),
    subject: ClassSubject.fromApi(j['subject']),
    teacher: StaffRef.fromJson(j['teacher']),
    assistantTeacher: StaffRef.fromJson(j['assistantTeacher']),
    studentCount: _intOrNull(asMap(j['_count'])['enrollments']) ?? 0,
  );

  final String id;
  final String name;
  final ClassroomKind kind;
  final int? grade;
  final ClassSubject subject;
  final StaffRef? teacher;
  final StaffRef? assistantTeacher;
  final int studentCount;

  String? get gradeLabel => grade == null ? null : '$grade-р анги';

  /// Картын мета: төрөл, анги, хичээл (математик бол үгүй), багш, туслах, сурагчийн тоо.
  List<String> meta({bool withCount = true}) => [
    kind.label,
    ?gradeLabel,
    if (subject != ClassSubject.math) subject.label,
    teacher?.name ?? 'Багш сонгоогүй',
    if (assistantTeacher != null) 'Туслах: ${assistantTeacher!.name}',
    if (withCount) '$studentCount сурагч',
  ];

  /// Хайлт: ангийн нэр, багшийн нэр (жижиг үсгээр ирнэ).
  bool matches(String q) {
    if (q.isEmpty) return true;
    final hay = [
      name,
      teacher?.firstName,
      teacher?.lastName,
      assistantTeacher?.firstName,
      assistantTeacher?.lastName,
    ].whereType<String>().join(' ').toLowerCase();
    return hay.contains(q);
  }

  AdminClassroom copyWith({
    String? name,
    ClassroomKind? kind,
    int? Function()? grade,
    ClassSubject? subject,
    StaffRef? Function()? teacher,
    StaffRef? Function()? assistantTeacher,
    int? studentCount,
  }) => AdminClassroom(
    id: id,
    name: name ?? this.name,
    kind: kind ?? this.kind,
    grade: grade == null ? this.grade : grade(),
    subject: subject ?? this.subject,
    teacher: teacher == null ? this.teacher : teacher(),
    assistantTeacher: assistantTeacher == null ? this.assistantTeacher : assistantTeacher(),
    studentCount: studentCount ?? this.studentCount,
  );
}

/// Ангийн идэвхтэй сурагч (`GET /classrooms/:id` → `students`).
class ClassStudent {
  const ClassStudent({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.studentCode,
    this.joinedAt,
  });

  factory ClassStudent.fromJson(Map<String, Object?> j) => ClassStudent(
    id: _str(j['id']),
    firstName: _str(j['firstName']),
    lastName: _str(j['lastName']),
    studentCode: _strOrNull(j['studentCode']),
    joinedAt: _instant(j['joinedAt']),
  );

  final String id;
  final String firstName;
  final String lastName;
  final String? studentCode;
  final DateTime? joinedAt;

  String get fullName => '$lastName $firstName'.trim();
}

/// `GET /classrooms/:id` — анги, сурагчид, эрх.
class ClassroomDetail {
  const ClassroomDetail({required this.classroom, required this.students, required this.canManageStudents});

  factory ClassroomDetail.fromJson(Map<String, Object?> j) {
    final c = asMap(j['classroom']);
    final students = [for (final s in (j['students'] as List?) ?? const []) ClassStudent.fromJson(asMap(s))];
    return ClassroomDetail(
      classroom: AdminClassroom(
        id: _str(c['id']),
        name: _str(c['name']),
        kind: ClassroomKind.fromApi(c['type']),
        grade: _intOrNull(c['grade']),
        // Сервер дэлгэрэнгүйд `subject` буцаадаггүй (API-ийн дутуу) — ирвэл уншина.
        subject: ClassSubject.fromApi(c['subject']),
        teacher: StaffRef.fromJson(c['teacher']),
        assistantTeacher: StaffRef.fromJson(c['assistantTeacher']),
        studentCount: students.length,
      ),
      students: students,
      canManageStudents: asMap(j['permissions'])['canManageStudents'] == true,
    );
  }

  final AdminClassroom classroom;
  final List<ClassStudent> students;

  /// Сурагч нэмэх, хасах, шилжүүлэх (вэбтэй ижил): Админ эсвэл эрх нээгдсэн Багш+.
  final bool canManageStudents;
}

/// `GET /classrooms/unassigned-students` — ангигүй, идэвхжсэн танхимын сурагч (удаан хүлээсэн нь эхэнд).
class UnassignedStudent {
  const UnassignedStudent({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.studentCode,
    this.grade,
    this.school,
    this.waitingSince,
  });

  factory UnassignedStudent.fromJson(Map<String, Object?> j) {
    final p = asMap(j['studentProfile']);
    return UnassignedStudent(
      id: _str(j['id']),
      firstName: _str(j['firstName']),
      lastName: _str(j['lastName']),
      studentCode: _strOrNull(j['studentCode']),
      grade: _intOrNull(p['grade']),
      school: _strOrNull(p['school']),
      waitingSince: _instant(j['waitingSince']),
    );
  }

  final String id;
  final String firstName;
  final String lastName;
  final String? studentCode;
  final int? grade;
  final String? school;
  final DateTime? waitingSince;

  String get fullName => '$lastName $firstName'.trim();
}

/// `GET /users/search` мөр.
class StudentHit {
  const StudentHit({required this.id, required this.firstName, required this.lastName, this.studentCode});

  factory StudentHit.fromJson(Map<String, Object?> j) => StudentHit(
    id: _str(j['id']),
    firstName: _str(j['firstName']),
    lastName: _str(j['lastName']),
    studentCode: _strOrNull(j['studentCode']),
  );

  final String id;
  final String firstName;
  final String lastName;
  final String? studentCode;

  String get fullName => '$lastName $firstName'.trim();
}

/// Багшийн сонголт (`/users/teachers` — Админ, `/schedule/teachers` — хичээл заадаг багш).
class TeacherOption {
  const TeacherOption({required this.id, required this.name});

  factory TeacherOption.fromJson(Map<String, Object?> j) {
    final display = _strOrNull(j['displayName']);
    final role = j['role'] as String?;
    return TeacherOption(
      id: _str(j['id']),
      name: display == null
          ? staffName(firstName: j['firstName'] as String?, lastName: j['lastName'] as String?, role: role)
          : withPlus(display, role),
    );
  }

  final String id;
  final String name;
}

/// Бүртгэлийн сурагч.
class RegistryStudent {
  const RegistryStudent({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.studentCode,
    this.school,
    this.grade,
  });

  factory RegistryStudent.fromJson(Map<String, Object?> j) {
    final p = asMap(j['studentProfile']);
    return RegistryStudent(
      id: _str(j['id']),
      firstName: _str(j['firstName']),
      lastName: _str(j['lastName']),
      studentCode: _strOrNull(j['studentCode']),
      school: _strOrNull(p['school']),
      grade: _intOrNull(p['grade']),
    );
  }

  final String id;
  final String firstName;
  final String lastName;
  final String? studentCode;
  final String? school;
  final int? grade;

  String get fullName => '$lastName $firstName'.trim();
}

/// Нэг элсэлтийн бичилт (идэвхтэй бол `leftAt == null`).
class RegistryEntry {
  const RegistryEntry({
    required this.id,
    required this.student,
    required this.classroomId,
    required this.classroomName,
    this.joinedAt,
    this.leftAt,
  });

  factory RegistryEntry.fromJson(Map<String, Object?> j) {
    final c = asMap(j['classroom']);
    return RegistryEntry(
      id: _str(j['id']),
      student: RegistryStudent.fromJson(asMap(j['student'])),
      classroomId: _str(c['id']),
      classroomName: _str(c['name']),
      joinedAt: _instant(j['joinedAt']),
      leftAt: _instant(j['leftAt']),
    );
  }

  final String id;
  final RegistryStudent student;
  final String classroomId;
  final String classroomName;
  final DateTime? joinedAt;
  final DateTime? leftAt;

  bool get active => leftAt == null;
}

/// Бүртгэлийн жагсаалтын мөр: идэвхтэй элсэлт эсвэл ангигүй сурагч.
class RegistryRow {
  const RegistryRow({required this.student, this.classroomId, this.classroomName, this.since, this.historyCount = 0});

  final RegistryStudent student;
  final String? classroomId;
  final String? classroomName;

  /// Элссэн (эсвэл ангигүй болсон) өдөр.
  final DateTime? since;
  final int historyCount;

  bool get unassigned => classroomId == null;

  bool matches(String q) {
    if (q.isEmpty) return true;
    final hay = [
      student.studentCode,
      student.firstName,
      student.lastName,
      student.school,
      classroomName,
    ].whereType<String>().join(' ').toLowerCase();
    return hay.contains(q);
  }
}

/// `/app/admin/registry` — ангиуд, элсэлтүүд (түүхтэй бол), ангигүй сурагчид.
class RegistryData {
  const RegistryData({
    required this.classrooms,
    required this.entries,
    required this.unassigned,
    this.hasHistory = true,
  });

  final List<AdminClassroom> classrooms;
  final List<RegistryEntry> entries;
  final List<UnassignedStudent> unassigned;

  /// `GET /classrooms/registry` ажиллаж түүх ирсэн эсэх (эс бөгөөс зөвхөн идэвхтэй бүрэлдэхүүн).
  final bool hasHistory;

  static const unassignedFilter = 'unassigned';

  List<RegistryEntry> get active => [
    for (final e in entries)
      if (e.active) e,
  ];

  /// Сурагч бүрийн түүх (шинэ нь эхэнд).
  Map<String, List<RegistryEntry>> get histories {
    final map = <String, List<RegistryEntry>>{};
    for (final e in entries) {
      (map[e.student.id] ??= []).add(e);
    }
    for (final rows in map.values) {
      rows.sort((a, b) => (b.joinedAt ?? DateTime(0)).compareTo(a.joinedAt ?? DateTime(0)));
    }
    return map;
  }

  Map<String, int> get activeCounts {
    final counts = <String, int>{};
    for (final e in active) {
      counts[e.classroomId] = (counts[e.classroomId] ?? 0) + 1;
    }
    return counts;
  }

  /// Бүх мөр (идэвхтэй элсэлт + ангигүй), нэрээр эрэмбэлсэн.
  List<RegistryRow> get rows {
    final h = histories;
    final out = [
      for (final e in active)
        RegistryRow(
          student: e.student,
          classroomId: e.classroomId,
          classroomName: e.classroomName,
          since: e.joinedAt,
          historyCount: h[e.student.id]?.length ?? 0,
        ),
      for (final u in unassigned)
        RegistryRow(
          student: RegistryStudent(
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            studentCode: u.studentCode,
            school: u.school,
            grade: u.grade,
          ),
          since: u.waitingSince,
          historyCount: h[u.id]?.length ?? 0,
        ),
    ];
    out.sort((a, b) => a.student.fullName.toLowerCase().compareTo(b.student.fullName.toLowerCase()));
    return out;
  }
}

/// Ангийн дэлгэрэнгүйг засах (`PATCH /classrooms/:id`, Админ). `null` талбар = илгээхгүй.
class ClassroomPatch {
  const ClassroomPatch({
    this.name,
    this.kind,
    this.grade,
    this.clearGrade = false,
    this.subject,
    this.teacherId,
    this.assistantTeacherId,
  });

  final String? name;
  final ClassroomKind? kind;
  final int? grade;

  /// Ангийн түвшинг хоослох (`grade: null`, вэбтэй ижил).
  final bool clearGrade;
  final ClassSubject? subject;

  /// Хоосон мөр = багшгүй болгох.
  final String? teacherId;
  final String? assistantTeacherId;

  Map<String, Object?> toJson() => {
    if (name != null) 'name': name!.trim(),
    if (kind != null) 'type': kind!.api,
    if (grade != null) 'grade': grade else if (clearGrade) 'grade': null,
    if (subject != null) 'subject': subject!.apiOrNull,
    if (teacherId != null) 'teacherId': teacherId,
    if (assistantTeacherId != null) 'assistantTeacherId': assistantTeacherId,
  };
}

/// Анги архивлах баталгаажуулах код — өнөөдрийн UB огноо «ЖЖЖЖССӨӨ» (серверийн `todayCodeUB`).
String todayCodeUB(UbDateTime now) => now.dateKey.replaceAll('-', '');

/// «2026.11.04» (UB). Огноогүй бол null.
String? ubDay(DateTime? instant) {
  if (instant == null) return null;
  final t = UbDateTime.fromInstant(instant);
  String two(int n) => n.toString().padLeft(2, '0');
  return '${t.year}.${two(t.month)}.${two(t.day)}';
}

// ───────── CSV (вэбийн `components/registry/csv.ts`-тэй ижил) ─────────

const csvBom = '﻿';

/// Нүд: тоо хашилтгүй; бичвэр хашилттай, `= + - @` ба tab/CR-ээр эхэлбэл `'` залгаж томьёо болохоос хамгаална.
String csvCell(Object? value) {
  if (value is num) return value.isFinite ? '$value' : '';
  final raw = value == null ? '' : '$value';
  final safe = RegExp(r'^[=+\-@\t\r]').hasMatch(raw) ? "'$raw" : raw;
  return '"${safe.replaceAll('"', '""')}"';
}

/// UTF-8 BOM + CRLF (Excel кирилл үсгийг зөв нээнэ).
String buildCsv(List<String> headers, List<List<Object?>> rows) {
  final lines = [headers.map(csvCell).join(','), for (final r in rows) r.map(csvCell).join(',')];
  return '$csvBom${lines.join('\r\n')}\r\n';
}

/// Бүртгэлийн CSV — дэлгэц дээрх (шүүсэн) мөрүүд.
String registryCsv(List<RegistryRow> rows) => buildCsv(
  const ['Код', 'Овог', 'Нэр', 'Сургууль', 'Түвшин', 'Анги', 'Элссэн огноо', 'Төлөв'],
  [
    for (final r in rows)
      [
        r.student.studentCode,
        r.student.lastName,
        r.student.firstName,
        r.student.school,
        r.student.grade,
        r.classroomName,
        r.since == null ? '' : UbDateTime.fromInstant(r.since!).dateKey,
        r.unassigned ? 'Ангид хуваарилагдаагүй' : 'Идэвхтэй',
      ],
  ],
);
