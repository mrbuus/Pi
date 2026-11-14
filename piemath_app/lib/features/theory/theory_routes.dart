import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/theory_day_screen.dart';
import 'ui/theory_screen.dart';

/// `theory` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: `/app/theory` (жагсаалт; `?date=&c=` шууд өдөр рүү, `?date=` тэр өдрөөр шүүнэ),
/// `/app/theory/:classroomId/:date` (өдрийн зураг).
final theoryRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: '/app/theory',
      builder: (context, state) {
        final date = state.uri.queryParameters['date'];
        final classroom = state.uri.queryParameters['c'];
        final isDate = date != null && RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(date);
        if (isDate && classroom != null) return TheoryDayScreen(classroomId: classroom, date: date);
        // Зөвхөн `?date=` (самбарын «Онол илгээх») — тэр өдрөөр шүүж, ганц анги бол шууд нээнэ
        return TheoryScreen(initialDate: isDate ? date : null);
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
