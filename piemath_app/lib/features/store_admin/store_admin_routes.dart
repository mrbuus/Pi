import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/store_admin_screen.dart';

/// `store_admin` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/admin/store` — дэлгүүрийн удирдлага (Админ, Багш+; орлогын нийт зөвхөн Админ).
/// - `/app/store/admin` — вэбийн хуучин зам → `/app/admin/store`.
final storeAdminRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: StoreAdminScreen.path, builder: (_, _) => const StoreAdminScreen()),
    GoRoute(path: '/app/store/admin', redirect: (_, _) => StoreAdminScreen.path),
  ],
);
