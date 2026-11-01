import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/schedule_screen.dart';

/// `schedule` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: /app/schedule (сурагч, эцэг эх; ажилтанд «вэбээр»).
final scheduleRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/schedule', builder: (context, state) => const ScheduleScreen()),
  ],
);
