import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/feedback_screen.dart';
import 'ui/support_screen.dart';

/// `support` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/support` — төвийн туслах (урьдчилан бичсэн хариултаас хайх, AI биш).
/// - `/app/feedback` — санал хүсэлт илгээх + түүх.
/// - `/app/tools` — хэрэглэгдэхүүн, одоогоор PendingScreen (M5).
final supportRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/support', builder: (_, _) => const SupportScreen()),
    GoRoute(path: '/app/feedback', builder: (_, _) => const FeedbackScreen()),
  ],
);
