import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/login_text_screen.dart';
import 'ui/placement_admin_screen.dart';
import 'ui/placement_detail_screen.dart';
import 'ui/sorils_admin_screen.dart';
import 'ui/theory_admin_screen.dart';

/// `content_admin` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/admin/theory` — онолын агуулга (Админ, Багш+, Багш).
/// - `/app/admin/sorils` — жишиг сорил: хуваарь, бүртгэл, дүн; нэмэх, нийтлэх (Админ, Багш+).
/// - `/app/admin/placement`, `/app/admin/placement/:id` — түвшин тогтоох: хүүхдүүд, дүгнэлт, агуулга.
/// - `/app/admin/login-text` — нэвтрэх хуудасны бичиг (Админ).
final contentAdminRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: TheoryAdminScreen.path, builder: (_, _) => const TheoryAdminScreen()),
    GoRoute(path: SorilsAdminScreen.path, builder: (_, _) => const SorilsAdminScreen()),
    GoRoute(
      path: PlacementAdminScreen.path,
      builder: (_, _) => const PlacementAdminScreen(),
      routes: [
        GoRoute(
          path: ':id',
          builder: (_, s) => PlacementDetailScreen(id: s.pathParameters['id'] ?? ''),
        ),
      ],
    ),
    GoRoute(path: LoginTextScreen.path, builder: (_, _) => const LoginTextScreen()),
  ],
);
