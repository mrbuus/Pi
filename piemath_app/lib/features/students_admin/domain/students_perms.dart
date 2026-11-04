import '../../../core/auth/user_role.dart';

/// Сурагчдын удирдлагын эрхийн матриц — вэбтэй ЯГ ижил (`StudentsDirectory.tsx`, `StudentProgress.tsx`,
/// `types.ts` `canEditProfile`/`canSeeGuardianPhones`), серверийн guard-тай тулгасан:
///
/// | Үйлдэл | Багш | Багш+ | Админ | Сервер |
/// |---|---|---|---|---|
/// | Идэвхтэй сурагчдын жагсаалт | тийм | тийм | тийм | `GET /users` (Багшид төлбөрийн багц null) |
/// | Архив, анхаарах сурагчид | үгүй | тийм | тийм | `archived=true` Багшид 403, `attention-students` |
/// | Анги солих, архивлах, сэргээх | үгүй | тийм | тийм | `enroll`, `archive`, `unarchive` |
/// | Төлбөрийн төлөв + дутуу дүн, сургалтаас хасах | үгүй | санхүүтэй бол | тийм | `finance.manage` |
/// | Бүртгэлийн Excel татах | үгүй | тийм | тийм | `students/export.xlsx` |
/// | Excel импорт | үгүй | үгүй | тийм | `users/students/import/*` (Админ) |
/// | Профайл засах | үгүй | сурагчийнх | бүгд | `PATCH /users/:id/profile` |
///
/// Багш+-д `finance.manage` одоогоор байнга (`TEACHER_PLUS_IMPLICIT`); эрх тодорхойгүй ([financeCapable] null)
/// бол вэбтэй адил role-оор шийднэ. Багш хэзээ ч сургалтын төлбөрийн дүн харахгүй.
class StudentsPerms {
  const StudentsPerms({required this.role, this.financeCapable});

  final UserRole? role;

  /// `/staff-capabilities/me`-ийн `finance.manage` (Багш+). `null` = мэдэгдээгүй.
  final bool? financeCapable;

  bool get isAdmin => role == UserRole.admin;
  bool get isTeacherPlus => role == UserRole.teacherPlus;
  bool get isStaff => isAdmin || isTeacherPlus || role == UserRole.teacher;

  /// Идэвхтэй сурагчдын жагсаалт харах.
  bool get canList => isStaff;

  /// Архив таб, анхаарах сурагчид, анги солих, архивлах, сэргээх.
  bool get canManage => isAdmin || isTeacherPlus;

  bool get canSeeArchive => canManage;

  /// Төлбөрийн төлөв, дутуу дүн, «Төлбөр» таб, сургалтаас хасах тооцоо.
  bool get canSeeMoney => isAdmin || (isTeacherPlus && (financeCapable ?? true));

  /// Сургалтаас хасах (тооцоотой) — санхүүгийн эрх.
  bool get canWithdraw => canSeeMoney;

  /// Бүртгэлийн Excel (`/students/export.xlsx`).
  bool get canExport => canManage;

  /// Шүүсэн жагсаалтын CSV (сургалтын төлбөрийн багана орно).
  bool get canExportCsv => canSeeMoney;

  bool get canImport => isAdmin;

  /// Эцэг эхийн утас харах.
  bool get canSeeGuardians => canManage;

  /// Профайл засах: Админ бүгдийг, Багш+ ажилтан биш хүнийг.
  bool canEditProfile(String? targetRole) {
    final staffTarget = targetRole == 'ADMIN' || targetRole == 'TEACHER_PLUS' || targetRole == 'TEACHER';
    return isAdmin || (isTeacherPlus && !staffTarget);
  }

  /// Төлбөрийн багц, дүн засах (бүртгэлийн маягтын төлбөрийн хэсэг).
  bool get canEditTuition => canSeeMoney;
}
