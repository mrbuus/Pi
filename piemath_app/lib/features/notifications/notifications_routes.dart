import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/notification_settings_screen.dart';
import 'ui/notifications_screen.dart';

/// `notifications` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
final notificationsRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/notifications', builder: (_, _) => const NotificationsScreen()),
    GoRoute(path: '/app/notifications/settings', builder: (_, _) => const NotificationSettingsScreen()),
  ],
);
