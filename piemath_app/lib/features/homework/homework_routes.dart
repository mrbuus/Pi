import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/homework_screen.dart';
import 'ui/homework_solve_screen.dart';

/// `homework` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: `/app/homework` (жагсаалт), `/app/homework/:testId?date=&classroomId=` (B хувилбар бодох).
final homeworkRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: '/app/homework',
      builder: (context, state) => const HomeworkScreen(),
      routes: [
        GoRoute(
          path: ':testId',
          builder: (context, state) => HomeworkSolveScreen(
            testId: state.pathParameters['testId']!,
            date: state.uri.queryParameters['date'] ?? '',
          ),
        ),
      ],
    ),
  ],
);
