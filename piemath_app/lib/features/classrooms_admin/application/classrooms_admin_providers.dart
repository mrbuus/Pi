import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/time/ub_time.dart';
import '../data/classrooms_admin_models.dart';
import '../data/classrooms_admin_repository.dart';

final classroomsAdminRepositoryProvider = Provider<ClassroomsAdminRepository>(
  (ref) => ClassroomsAdminRepository(ref.watch(apiClientProvider)),
);

/// Ангийн удирдлагын эрх — вэбтэй яг ижил (UI нуух/харуулах; шийдвэр серверт).
///
/// | Үйлдэл | Админ | Багш+ | Багш |
/// |---|---|---|---|
/// | Ангиуд, дэлгэрэнгүй, бүртгэл нээх | тийм | тийм | үгүй |
/// | Сурагч нэмэх, хасах, шилжүүлэх (дэлгэрэнгүй) | тийм | `canManageStudents` | үгүй |
/// | Бүртгэлээс шилжүүлэх, анги заах | тийм | тийм | үгүй |
/// | Ангийн багш оноох, шинэ анги | тийм | тийм | үгүй |
/// | Ангийн мэдээлэл засах, архивлах | тийм | үгүй | үгүй |
/// | Тарах цаг | бүх анги | өөрийн анги | өөрийн анги |
class ClassroomsAccess {
  const ClassroomsAccess({this.role, this.userId});

  final UserRole? role;
  final String? userId;

  bool get isAdmin => role == UserRole.admin;
  bool get isPlus => role == UserRole.teacherPlus;

  /// `/app/admin/classrooms`, `/app/admin/registry` (вэбийн `RequireRole ADMIN, TEACHER_PLUS`).
  bool get canManage => isAdmin || isPlus;

  bool get canEditInfo => isAdmin;
  bool get canArchive => isAdmin;
  bool get canAssignTeachers => canManage;
  bool get canCreate => canManage;
  bool get canTransferInRegistry => canManage;

  bool get canOpenDismissal => isAdmin || isPlus || role == UserRole.teacher;

  /// Дэлгэрэнгүйд сурагч нэмэх, хасах, шилжүүлэх — серверийн `permissions.canManageStudents`.
  bool canManageStudents(ClassroomDetail d) => canManage && d.canManageStudents;

  /// Тарах цаг тэмдэглэх ангиуд (вэбийн `/app/dismissal`): Админ бүгд, бусад нь өөрийн ангийн багш.
  List<AdminClassroom> dismissalClasses(List<AdminClassroom> all) => isAdmin
      ? all
      : [
          for (final c in all)
            if (c.teacher?.id != null && c.teacher!.id == userId) c,
        ];
}

final classroomsAccessProvider = Provider<ClassroomsAccess>((ref) {
  final s = ref.watch(sessionProvider);
  if (s is! SignedIn) return const ClassroomsAccess();
  return ClassroomsAccess(role: s.role, userId: s.user?.id ?? s.auth.userId);
});

/// Идэвхтэй ангиуд (`GET /classrooms`).
final adminClassroomsProvider = FutureProvider.autoDispose<List<AdminClassroom>>(
  (ref) => ref.watch(classroomsAdminRepositoryProvider).list(),
);

final adminClassroomDetailProvider = FutureProvider.autoDispose.family<ClassroomDetail, String>(
  (ref, id) => ref.watch(classroomsAdminRepositoryProvider).detail(id),
);

final registryProvider = FutureProvider.autoDispose<RegistryData>(
  (ref) => ref.watch(classroomsAdminRepositoryProvider).registry(),
);

/// «Өнөөдөр» (UB) — архивлах код, тарах цагийн өдөр. Тестэд тогтмол.
final classroomsTodayProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

/// CSV түр хадгалах хавтас (тестэд солино).
final registryTempDirProvider = Provider<Future<Directory> Function()>((ref) => getTemporaryDirectory);
