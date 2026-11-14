import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/analytics_screen.dart';
import 'ui/audit_screen.dart';
import 'ui/deletion_requests_screen.dart';

/// `admin_oversight` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/admin/audit` — аудит (Админ, Багш+).
/// - `/app/admin/analytics` — сурагчдын идэвх, анги, сэдэв, анхаарах сурагчид (Админ, Багш+).
/// - `/app/admin/usage` — хэрэглээний бүртгэл (Админ).
/// - `/app/admin/deletion-requests` — бүртгэл устгах хүсэлт (Админ).
final adminOversightRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: AuditScreen.path, builder: (_, _) => const AuditScreen()),
    GoRoute(path: AnalyticsScreen.path, builder: (_, _) => const AnalyticsScreen()),
    GoRoute(path: UsageScreen.path, builder: (_, _) => const UsageScreen()),
    GoRoute(path: DeletionRequestsScreen.path, builder: (_, _) => const DeletionRequestsScreen()),
  ],
);
