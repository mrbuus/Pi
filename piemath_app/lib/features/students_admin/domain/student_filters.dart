import 'package:flutter/foundation.dart';

import '../../../shared/payment_status/money.dart';
import '../data/students_admin_models.dart';

/// Сурагчийн кодоос хичээл: `SIE-<жил>-<M|N|B>-<дугаар>` (вэбийн `subjectFromCode`).
String? subjectFromCode(String? code) {
  if (code == null) return null;
  final m = RegExp(r'^SIE-\d{2}-([MNB])-\d+$').firstMatch(code);
  return m?.group(1);
}

const subjectLabel = {'M': 'Математик', 'N': 'Нийгэм судлал', 'B': 'Аль аль'};

/// Жагсаалтын дээд талын шүүлтүүрүүд (чипээс гадна). `==`-тэй — `DataListScreen.reloadKey`.
@immutable
class StudentFilters {
  const StudentFilters({this.archived = false, this.classroomId, this.grade, this.branch, this.subject});

  final bool archived;
  final String? classroomId;
  final int? grade;
  final String? branch;

  /// `M`, `N`, `B`.
  final String? subject;

  bool get narrowed => classroomId != null || grade != null || branch != null || subject != null;

  StudentFilters copyWith({
    bool? archived,
    ValueGetter<String?>? classroomId,
    ValueGetter<int?>? grade,
    ValueGetter<String?>? branch,
    ValueGetter<String?>? subject,
  }) => StudentFilters(
    archived: archived ?? this.archived,
    classroomId: classroomId == null ? this.classroomId : classroomId(),
    grade: grade == null ? this.grade : grade(),
    branch: branch == null ? this.branch : branch(),
    subject: subject == null ? this.subject : subject(),
  );

  /// Архив/идэвхтэйг хадгалж бусдыг цэвэрлэнэ.
  StudentFilters cleared() => StudentFilters(archived: archived);

  bool accepts(AdminStudent s) {
    if (classroomId != null &&
        s.shownClassroom?.id != classroomId &&
        !(!s.archived && s.otherClassrooms.any((c) => c.id == classroomId))) {
      return false;
    }
    if (grade != null && s.grade != grade) return false;
    if (branch != null && s.branch != branch) return false;
    if (subject != null && subjectFromCode(s.studentCode) != subject) return false;
    return true;
  }

  @override
  bool operator ==(Object other) =>
      other is StudentFilters &&
      other.archived == archived &&
      other.classroomId == classroomId &&
      other.grade == grade &&
      other.branch == branch &&
      other.subject == subject;

  @override
  int get hashCode => Object.hash(archived, classroomId, grade, branch, subject);
}

/// Ачаалсан жагсаалтаас гарсан шүүлтүүрийн сонголтууд (тусдаа endpoint-гүй, вэбтэй ижил).
class StudentFacets {
  const StudentFacets({this.classrooms = const [], this.grades = const [], this.branches = const []});

  factory StudentFacets.of(Iterable<AdminStudent> all) {
    final rooms = <String, String>{};
    final grades = <int>{};
    final branches = <String>{};
    for (final s in all) {
      final c = s.shownClassroom;
      if (c != null && c.id.isNotEmpty) rooms[c.id] = c.name;
      if (!s.archived) {
        for (final o in s.otherClassrooms) {
          if (o.id.isNotEmpty) rooms[o.id] = o.name;
        }
      }
      if (s.grade != null) grades.add(s.grade!);
      if (s.branch != null) branches.add(s.branch!);
    }
    return StudentFacets(
      classrooms: [for (final e in rooms.entries) (id: e.key, name: e.value)]..sort((a, b) => a.name.compareTo(b.name)),
      grades: grades.toList()..sort(),
      branches: branches.toList()..sort(),
    );
  }

  final List<({String id, String name})> classrooms;
  final List<int> grades;
  final List<String> branches;
}

/// Чипийн шүүлтүүрүүд (`DataFilter.id`).
abstract final class StudentChip {
  static const unassigned = 'unassigned';
  static const absent = 'absent';
  static const debt = 'debt';
  static const paidOk = 'ok';
}

enum PaymentTone { debt, ok }

/// Мөрийн төлбөрийн төлөв (вэбийн `paymentStatusOf`): энэ сарын дутуу жагсаалтад байвал «Дутуу — дүн»,
/// эс бөгөөс төлбөрийн багцтай бол «Хэвийн», үгүй бол харуулахгүй.
({String text, PaymentTone tone})? paymentStatusOf(AdminStudent s, Map<String, int> outstanding) {
  final shortfall = outstanding[s.id];
  if (shortfall != null) return (text: 'Дутуу ${formatMnt(shortfall)}', tone: PaymentTone.debt);
  if (s.tuitionPlan != null) return (text: 'Хэвийн', tone: PaymentTone.ok);
  return null;
}

/// Нэг удаагийн ачааллын өгөгдөл: сурагчид + (эрхтэй бол) дутуу төлбөр + анхаарах сурагчид.
@immutable
class StudentDirectory {
  const StudentDirectory({required this.students, this.outstanding = const {}, this.attention});

  final List<AdminStudent> students;

  /// studentId → энэ сарын дутуу дүн.
  final Map<String, int> outstanding;
  final AttentionData? attention;

  Set<String> get unassignedIds => attention?.unassignedIds ?? const {};
  Set<String> get absentIds => attention?.absentIds ?? const {};

  StudentDirectory withStudents(List<AdminStudent> next) =>
      StudentDirectory(students: next, outstanding: outstanding, attention: attention);

  /// Утасны зөвхөн цифрүүд; урд талын +976 / 976-г хасна (вэбийн `phoneDigits`).
  static String phoneDigits(String v) {
    final d = v.replaceAll(RegExp(r'\D'), '');
    return d.length > 8 && d.startsWith('976') ? d.substring(3) : d;
  }

  /// Хайлт: код, нэр, овог, нэвтрэх нэр, сурагч болон эцэг эхийн утас (аав, ээж, аппын холбоос) — вэбтэй ижил
  /// (2026-11-10). Утсыг зай, зураас, +976-тай бичсэн ч олно (3+ орон бичсэн үед).
  static bool matches(AdminStudent s, String q) {
    final query = q.trim().toLowerCase();
    final phones = [s.phone, s.fatherPhone, s.motherPhone, ...s.parentPhones].whereType<String>();
    final hay = [
      s.studentCode,
      s.firstName,
      s.lastName,
      s.username,
      ...phones,
    ].whereType<String>().join(' ').toLowerCase();
    if (hay.contains(query)) return true;
    final digits = phoneDigits(query);
    return digits.length >= 3 && phones.any((p) => phoneDigits(p).contains(digits));
  }

  bool inChip(AdminStudent s, String chip) => switch (chip) {
    StudentChip.unassigned => unassignedIds.contains(s.id),
    StudentChip.absent => absentIds.contains(s.id),
    StudentChip.debt => paymentStatusOf(s, outstanding)?.tone == PaymentTone.debt,
    StudentChip.paidOk => paymentStatusOf(s, outstanding)?.tone == PaymentTone.ok,
    _ => true,
  };

  /// Гаднын шүүлтүүрээр шүүж, нэрээр эрэмбэлсэн.
  List<AdminStudent> filtered(StudentFilters f) => [
    for (final s in students)
      if (f.accepts(s)) s,
  ];
}

/// Шүүсэн жагсаалтын CSV (вэбийн `exportCsv`): нэрээр эрэмбэлсэн, Excel-д зориулсан BOM-той.
String studentsCsv(List<AdminStudent> rows, {required bool withMoney}) {
  String cell(Object? v) {
    final s = v?.toString() ?? '';
    return RegExp(r'[",\n\r]').hasMatch(s) ? '"${s.replaceAll('"', '""')}"' : s;
  }

  final headers = [
    'Код',
    'Овог',
    'Нэр',
    'Утас',
    'Эцэг эхийн утас',
    'Сургууль',
    'Түвшин',
    'Бүлэг',
    'Салбар',
    'Анги',
    'Элссэн огноо',
    if (withMoney) ...['Төлбөрийн багц', 'Төлбөрийн дүн'],
    'Төлөв',
    'Архивын шалтгаан',
  ];
  final sorted = [...rows]
    ..sort((a, b) {
      final c = a.firstName.compareTo(b.firstName);
      return c != 0 ? c : a.lastName.compareTo(b.lastName);
    });
  final lines = [
    headers.map(cell).join(','),
    for (final s in sorted)
      [
        s.studentCode,
        s.lastName,
        s.firstName,
        s.phone,
        s.fatherPhone ?? s.motherPhone,
        s.school,
        s.grade,
        s.section,
        s.branch,
        s.shownClassroom?.name,
        ubDay(s.joinedOn)?.dateKey ??
            (s.joinedOn != null && s.joinedOn!.length >= 10 ? s.joinedOn!.substring(0, 10) : null),
        if (withMoney) ...[s.tuitionPlan?.label, s.tuitionAmount],
        s.archived ? 'Архивласан' : 'Идэвхтэй',
        s.archiveReason,
      ].map(cell).join(','),
  ];
  return '\u{FEFF}${lines.join('\r\n')}\r\n';
}
