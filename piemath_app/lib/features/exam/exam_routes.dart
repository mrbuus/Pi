import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/exam_screen.dart';
import 'ui/ranking_screen.dart';
import 'ui/result_screens.dart';
import 'ui/tests_list_screen.dart';

/// `exam` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - shell: `/app/tests` (жагсаалт: `?tab=give|done|rank`), `/app/tests/:id/result` (шалгалтын дүн), `/app/tests/:id/review` (эргэн харалт),
///   `/app/tests/:id/ranking` (өөрийн байр — зөвхөн хэрэглэгч товшиж нээнэ)
/// - fullscreen: `/app/tests/:id` (интро + шалгалт өгөх — доод табгүй, буцах товч = илгээх эсэхийг асууна)
/// - `/app/thousand/...` → `/app/tests`, `/app/results-ranking` → `/app/tests?tab=rank` (вэбтэй ижил redirect)
final examRoutes = FeatureRoutes(
  fullscreen: [
    GoRoute(
      path: '/app/tests/:id',
      builder: (context, state) => ExamScreen(testId: state.pathParameters['id']!),
    ),
  ],
  shell: [
    GoRoute(
      path: '/app/tests',
      builder: (context, state) => TestsListScreen(initialTab: state.uri.queryParameters['tab']),
    ),
    // Вэбийн `/app/results-ranking` → `/app/tests?tab=rank` (цэс, хуучин холбоос).
    GoRoute(path: '/app/results-ranking', redirect: (context, state) => '/app/tests?tab=rank'),
    GoRoute(
      path: '/app/tests/:id/result',
      builder: (context, state) => ExamResultScreen(testId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/app/tests/:id/review',
      builder: (context, state) => ReviewScreen(testId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/app/tests/:id/ranking',
      builder: (context, state) => TestRankingScreen(testId: state.pathParameters['id']!),
    ),
    GoRoute(path: '/app/thousand', redirect: (context, state) => '/app/tests'),
    GoRoute(path: '/app/thousand/tests/:id', redirect: (context, state) => '/app/tests/${state.pathParameters['id']}'),
    GoRoute(
      path: '/app/thousand/tests/:id/review',
      redirect: (context, state) => '/app/tests/${state.pathParameters['id']}/review',
    ),
  ],
);
