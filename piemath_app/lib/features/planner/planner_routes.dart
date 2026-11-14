import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/planner_screen.dart';
import 'ui/workload_screen.dart';

/// `planner` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: /app/planner (Админ, Багш+, Багш — «Хуваарь» хэсгийн дэд таб), /app/planner/workload.
final plannerRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: PlannerScreen.path,
      builder: (context, state) => const PlannerScreen(),
      routes: [GoRoute(path: 'workload', builder: (context, state) => const WorkloadScreen())],
    ),
  ],
);
