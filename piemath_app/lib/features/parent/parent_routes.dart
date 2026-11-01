import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/history_screen.dart';
import 'ui/parent_home_screen.dart';
import 'ui/weekly_report_screen.dart';

/// `parent` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/parent` — хүүхдийн самбар (хүүхэд сонгох, дүн, ирц, даалгавар, төлбөр, холбох).
/// - `/app/parent/weekly?studentId=&week=` — 7 хоногийн тайлан.
/// - `/app/parent/history?studentId=&year=` — жилийн бүтэн түүх.
/// `/app/dismissal` нь эцэг эхийн чөлөө БИШ (багшийн «анги тарах цаг», api-contract/parent.md) — M8.
final parentRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/parent', builder: (_, _) => const ParentHomeScreen()),
    GoRoute(
      path: '/app/parent/history',
      builder: (_, state) => ParentHistoryScreen(
        initialStudentId: state.uri.queryParameters['studentId'],
        initialYear: int.tryParse(state.uri.queryParameters['year'] ?? ''),
      ),
    ),
    GoRoute(
      path: '/app/parent/weekly',
      builder: (_, state) => WeeklyReportScreen(
        initialStudentId: state.uri.queryParameters['studentId'],
        initialWeek: state.uri.queryParameters['week'],
      ),
    ),
  ],
);
