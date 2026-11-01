import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/student_home_screen.dart';

/// `student_home` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: /app/student (сурагчийн нүүр).
final studentHomeRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/student', builder: (context, state) => const StudentHomeScreen()),
  ],
);
