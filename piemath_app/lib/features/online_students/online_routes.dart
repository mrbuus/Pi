import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/online_student_screen.dart';
import 'ui/online_students_screen.dart';

/// `online_students` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/online` — онлайн сурагчид (Багш, Багш+, Админ).
/// - `/app/online/:id` — нэг сурагчийн явц, тестүүд, идэвх (`extra` = нэр). Засах нь Багш+, Админ.
final onlineRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/online', builder: (_, _) => const OnlineStudentsScreen()),
    GoRoute(
      path: '/app/online/:id',
      builder: (_, s) => OnlineStudentScreen(
        studentId: s.pathParameters['id'] ?? '',
        name: s.extra is String ? s.extra! as String : null,
      ),
    ),
  ],
);
