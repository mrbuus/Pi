import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/homework_history_screen.dart';
import 'ui/homework_screen.dart';
import 'ui/homework_solve_screen.dart';

/// `homework` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: `/app/homework` (жагсаалт), `/app/homework/history` (жилийн түүх), `/app/homework/:testId?date=&classroomId=` (B хувилбар бодох).
final homeworkRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: '/app/homework',
      builder: (context, state) => const HomeworkScreen(),
      routes: [
        // ':testId'-аас ӨМНӨ (тогтмол зам эхэлж таарна).
        GoRoute(path: 'history', builder: (context, state) => const HomeworkHistoryScreen()),
        GoRoute(
          path: ':testId',
          builder: (context, state) => HomeworkSolveScreen(
            testId: state.pathParameters['testId']!,
            date: state.uri.queryParameters['date'] ?? '',
            classroomId: state.uri.queryParameters['classroomId'],
          ),
        ),
      ],
    ),
  ],
);
