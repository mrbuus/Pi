import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'data/notification_models.dart';
import 'ui/notification_detail_screen.dart';
import 'ui/notification_settings_screen.dart';
import 'ui/notifications_screen.dart';

/// `notifications` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// `/app/notifications/:id` — апп-д тохирох хэсэггүй холбоостой мэдэгдлийн дэлгэрэнгүй (`extra: AppNotification`).
final notificationsRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/notifications', builder: (_, _) => const NotificationsScreen()),
    GoRoute(path: '/app/notifications/settings', builder: (_, _) => const NotificationSettingsScreen()),
    GoRoute(
      path: '/app/notifications/:id',
      builder: (_, s) => NotificationDetailScreen(
        id: s.pathParameters['id'] ?? '',
        initial: s.extra is AppNotification ? s.extra! as AppNotification : null,
      ),
    ),
  ],
);
