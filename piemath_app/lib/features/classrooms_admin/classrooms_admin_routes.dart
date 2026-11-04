import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/classroom_detail_screen.dart';
import 'ui/classrooms_admin_screen.dart';
import 'ui/dismissal_screen.dart';
import 'ui/registry_screen.dart';

/// `classrooms_admin` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/admin/classrooms` — ангиуд (Админ, Багш+).
/// - `/app/admin/classrooms/:id` — ангийн удирдлага: бүрэлдэхүүн, сурагч нэмэх/хасах/шилжүүлэх, багш, засах, архивлах.
/// - `/app/admin/registry` — элсэлтийн бүртгэл (Админ, Багш+).
/// - `/app/dismissal` — анги тарах ойролцоо цаг (Админ, Багш+, Багш).
final classroomsAdminRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/admin/classrooms', builder: (_, _) => const ClassroomsAdminScreen()),
    GoRoute(
      path: '/app/admin/classrooms/:id',
      builder: (_, s) => ClassroomDetailScreen(classId: s.pathParameters['id'] ?? ''),
    ),
    GoRoute(path: '/app/admin/registry', builder: (_, _) => const RegistryScreen()),
    GoRoute(path: '/app/dismissal', builder: (_, _) => const DismissalScreen()),
  ],
);
