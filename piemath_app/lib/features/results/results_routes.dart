import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/student_attempt_screen.dart';
import 'ui/test_results_screen.dart';

/// `results` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/tests/:id/results` — шалгалтын дүн: ангиар, эрэмбэ, бодлогын анализ, цаасан дүн оруулах
///   (`extra` = шалгалтын нэр, `?tab=analysis|entry` — эхлэх таб). Багш, Багш+, Админ.
/// - `/app/tests/:id/results/:studentId` — нэг сурагчийн задаргаа (`extra` = нэр).
final resultsRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: '/app/tests/:id/results',
      builder: (_, s) => TestResultsScreen(
        testId: s.pathParameters['id'] ?? '',
        title: s.extra is String ? s.extra! as String : null,
        initialTab: switch (s.uri.queryParameters['tab']) {
          'analysis' => 1,
          'entry' => 2,
          _ => 0,
        },
      ),
    ),
    GoRoute(
      path: '/app/tests/:id/results/:studentId',
      builder: (_, s) => StudentAttemptScreen(
        testId: s.pathParameters['id'] ?? '',
        studentId: s.pathParameters['studentId'] ?? '',
        name: s.extra is String ? s.extra! as String : null,
      ),
    ),
  ],
);
