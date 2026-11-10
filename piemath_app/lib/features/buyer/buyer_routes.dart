import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/buyer_home_screen.dart';
import 'ui/store_screen.dart';

/// `buyer` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: `/app/buyer` — «Миний эрхүүд» (Худалдан авагчийн нүүр, зөвхөн унших),
/// `/app/store` — «Дэлгүүр» (каталог + миний авсан; бүгд дижитал тул апп дотор худалдахгүй, гадагш хөтлөхгүй).
final buyerRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/buyer', builder: (context, state) => const BuyerHomeScreen()),
    GoRoute(path: '/app/store', builder: (context, state) => const StoreScreen()),
  ],
);
