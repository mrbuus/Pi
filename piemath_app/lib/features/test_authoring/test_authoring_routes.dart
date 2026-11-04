import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/edit_test_screen.dart';
import 'ui/new_test_screen.dart';

/// `test_authoring` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - fullscreen `/app/tests/new` — тест үүсгэх (`?subject=SOCIAL_STUDIES` номын сангаас).
/// - fullscreen `/app/tests/:id/edit` — тест засах (бодлогын засварлагч, сангаас нэмэх).
///
/// АНХААР: `examRoutes`-ийн `/app/tests/:id` (шалгалт өгөх) нь `/app/tests/new`-г барьж авахгүйн тулд
/// `allFeatureRoutes`-д энэ жагсаалтыг `examRoutes`-ЭЭС ӨМНӨ тавина.
///
/// Эрх: Админ, Багш+, Багш — бусдад төвийг сахисан «нээгдээгүй» дэлгэц, API дуудахгүй.
final testAuthoringRoutes = FeatureRoutes(
  fullscreen: [
    GoRoute(
      path: '/app/tests/new',
      builder: (_, state) => NewTestScreen(subject: state.uri.queryParameters['subject'] ?? ''),
    ),
    GoRoute(
      path: '/app/tests/:id/edit',
      builder: (_, state) => EditTestScreen(testId: state.pathParameters['id'] ?? ''),
    ),
  ],
);
