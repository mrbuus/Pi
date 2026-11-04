import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/buyer_home_screen.dart';

/// `buyer` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: `/app/buyer` — «Миний эрхүүд» (Худалдан авагчийн нүүр, зөвхөн унших). Худалдан авалт вэбээр.
final buyerRoutes = FeatureRoutes(
  shell: [GoRoute(path: '/app/buyer', builder: (context, state) => const BuyerHomeScreen())],
);
