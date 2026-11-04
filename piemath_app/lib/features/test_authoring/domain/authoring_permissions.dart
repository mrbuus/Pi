import 'package:flutter/foundation.dart';

import '../../../core/auth/user_role.dart';
import '../data/authoring_models.dart';

/// Тест зохиох эрх — вэбтэй ЯГ ижил (эрхийн жинхэнэ шийдвэр серверт):
///
/// - `/app/tests/new`, `/app/tests/:id/edit`: Админ, Багш+, Багш (`RequireRole`). API: `POST /tests`,
///   `PATCH /tests/:id` мөн эдгээр гурав; Багш зөвхөн өөрийн үүсгэсэн тестийг (`findEditableTest`).
/// - Байгаа бодлогын агуулга (текст, сонголт, хариу, зураг): Админ, Багш+ (`canEditContent`,
///   API `PATCH /problems/:id`). Шинэ бодлогыг Багш ч бичнэ (`POST /problems`).
/// - Тестийн төлбөр: зөвхөн Админ.
/// - Жагсаалтын «Засах», «Хуулах»: Админ, Багш+ бүгдэд; Багш өөрийн үүсгэсэнд (`ExamsBoard`).
@immutable
class AuthoringPermissions {
  const AuthoringPermissions(this.role, {this.userId});

  final UserRole role;
  final String? userId;

  /// Тест үүсгэх, засварлагч нээх.
  bool get canAuthor => role.isStaff;

  bool get isAdmin => role == UserRole.admin;

  /// Админ, Багш+ — бүх тест.
  bool get staffAll => role == UserRole.admin || role == UserRole.teacherPlus;

  /// Байгаа бодлогын агуулгыг засах.
  bool get canEditContent => staffAll;

  /// Тестийн төлбөр.
  bool get canEditPrice => isAdmin;

  /// Жагсаалтаас энэ тестийг засах эсэх.
  bool canEditTest(String? createdById) =>
      canAuthor && (staffAll || (userId != null && userId!.isNotEmpty && createdById == userId));
}

/// Засварлагчийн түгжээ (`edit-info`, тестийн төрөл).
@immutable
class EditorLocks {
  const EditorLocks({required this.limited, required this.thousand});

  factory EditorLocks.of(TestDetails test, EditInfo info) =>
      EditorLocks(limited: info.limited, thousand: test.isThousand);

  /// Сурагч өгсөн — дараалал, оноо, нэмэх, хасах түгжээтэй; зөвхөн нэр, хугацаа, бодлогын агуулга.
  final bool limited;

  /// 1000 бодлого — төрөл түгжээтэй, анги «Шалгалт → Тохиргоо»-оос.
  final bool thousand;

  bool get structureLocked => limited;

  bool get canPickClasses => !limited && !thousand;
}
