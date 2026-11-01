import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/theory_day_screen.dart';
import 'ui/theory_screen.dart';

/// `theory` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: `/app/theory` (жагсаалт; вэбийн `?date=&c=` холбоос шууд өдөр рүү),
/// `/app/theory/:classroomId/:date` (өдрийн зураг).
final theoryRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: '/app/theory',
      builder: (context, state) {
        final date = state.uri.queryParameters['date'];
        final classroom = state.uri.queryParameters['c'];
        if (date != null && classroom != null && RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(date)) {
          return TheoryDayScreen(classroomId: classroom, date: date);
        }
        return const TheoryScreen();
      },
      routes: [
        GoRoute(
          path: ':classroomId/:date',
          builder: (context, state) => TheoryDayScreen(
            classroomId: state.pathParameters['classroomId']!,
            date: state.pathParameters['date']!,
          ),
        ),
      ],
    ),
  ],
);
