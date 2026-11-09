import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/pass_detail_screen.dart';
import 'ui/passes_screen.dart';

/// `passes` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/admin/passes` — эрхийн жагсаалт (хайлт, идэвхийн шүүлтүүр, шинэ эрх).
/// - `/app/admin/passes/:id` — эрхийн дэлгэрэнгүй: засах, идэвхжүүлэх/идэвхгүй болгох, сурагчид олгох,
///   эзэмшигчид.
///
/// Эрх: зөвхөн Админ (вэбийн `admin/passes/layout.tsx`, сервер `GET /passes` ADMIN). Бусдад төвийг
/// сахисан «зөвхөн админ» дэлгэц, хүсэлтгүй.
final passesRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: PassesScreen.path, builder: (_, _) => const PassesScreen()),
    GoRoute(
      path: '${PassesScreen.path}/:id',
      builder: (_, state) => PassDetailScreen(passId: state.pathParameters['id']!),
    ),
  ],
);
