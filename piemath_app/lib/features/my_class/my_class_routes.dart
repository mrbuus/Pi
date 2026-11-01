import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import '../../app/shell/pending_screen.dart';
import 'ui/day_screen.dart';
import 'ui/makeup_photos_screen.dart';
import 'ui/makeup_view.dart';
import 'ui/my_class_screen.dart';
import 'ui/test_detail_screen.dart';

final _dateKey = RegExp(r'^\d{4}-\d{2}-\d{2}$');

/// `my_class` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: /app/my-class (?tab=lessons|attendance|tests|makeup|schedule),
/// /app/my-class/day/:date/:classroomId, /app/my-class/tests/:testId, /app/makeup,
/// /app/makeup/photos/:classroomId/:date (дэвтрийн зураг авч, тайрч илгээх).
final myClassRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: '/app/my-class',
      builder: (context, state) => MyClassScreen(
        key: ValueKey(state.uri.queryParameters['tab']),
        initialTab: MyClassTab.parse(state.uri.queryParameters['tab']),
      ),
    ),
    GoRoute(
      path: '/app/my-class/day/:date/:classroomId',
      builder: (context, state) {
        final date = state.pathParameters['date'] ?? '';
        final classroomId = state.pathParameters['classroomId'] ?? '';
        if (!_dateKey.hasMatch(date) || classroomId.isEmpty) return const PendingScreen(path: '/app/my-class');
        return DayScreen(date: date, classroomId: classroomId);
      },
    ),
    GoRoute(
      path: '/app/my-class/tests/:testId',
      builder: (context, state) => TestDetailScreen(testId: state.pathParameters['testId'] ?? ''),
    ),
    GoRoute(path: '/app/makeup', builder: (context, state) => const MakeupScreen()),
    GoRoute(
      path: '/app/makeup/photos/:classroomId/:date',
      builder: (context, state) => MakeupPhotosScreen(
        classroomId: state.pathParameters['classroomId']!,
        date: state.pathParameters['date']!,
      ),
    ),
  ],
);
