import 'package:json_annotation/json_annotation.dart';

/// Хэрэглэгчийн эрх (API `Role` enum + `GROUP_TEACHER` навигацийн горим).
/// Эрхийн шийдвэр СЕРВЕРТ — апп зөвхөн аль бүрхүүл (shell) харуулахыг үүгээр сонгоно.
enum UserRole {
  @JsonValue('ADMIN')
  admin,
  @JsonValue('TEACHER_PLUS')
  teacherPlus,
  @JsonValue('TEACHER')
  teacher,
  @JsonValue('STUDENT')
  student,
  @JsonValue('PARENT')
  parent,
  @JsonValue('BUYER')
  buyer,
  @JsonValue('GROUP_TEACHER')
  groupTeacher,

  /// Апп-ын хуучин хувилбарт байхгүй шинэ эрх — аюулгүй, хамгийн бага бүрхүүл.
  unknown;

  static UserRole fromApi(String? value) => switch (value) {
        'ADMIN' => admin,
        'TEACHER_PLUS' => teacherPlus,
        'TEACHER' => teacher,
        'STUDENT' => student,
        'PARENT' => parent,
        'BUYER' => buyer,
        'GROUP_TEACHER' => groupTeacher,
        _ => unknown,
      };

  String get apiValue => switch (this) {
        admin => 'ADMIN',
        teacherPlus => 'TEACHER_PLUS',
        teacher => 'TEACHER',
        student => 'STUDENT',
        parent => 'PARENT',
        buyer => 'BUYER',
        groupTeacher => 'GROUP_TEACHER',
        unknown => 'UNKNOWN',
      };

  /// Төвийн ажилтан (Багш, Багш+, Админ).
  bool get isStaff => this == admin || this == teacherPlus || this == teacher;

  /// Монгол нэр (профайлд).
  String get labelMn => switch (this) {
        admin => 'Админ',
        teacherPlus => 'Багш+',
        teacher => 'Багш',
        student => 'Сурагч',
        parent => 'Эцэг эх',
        buyer => 'Худалдан авагч',
        groupTeacher => 'Гадны багш',
        unknown => 'Хэрэглэгч',
      };
}
