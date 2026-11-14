import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/finance_screen.dart';
import 'ui/reconcile_screen.dart';

/// `finance` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/admin/finance` — сарын санхүүгийн тайлан (орлого, зарлага, цэвэр ашиг), зарлага нэмэх/засах.
///   Эрх: зөвхөн Админ (вэбийн `admin/finance/layout.tsx`). Багш+ төвийн нийт дүнг ХАРАХГҮЙ.
/// - `/app/admin/reconcile` — банкны тулгалт (гүйлгээ тус бүр, холбох, «Төлбөр биш», хуулга оруулах).
///   Эрх: Админ, санхүүгийн эрхтэй (`finance.manage`) Багш+. Бусдад төвийг сахисан «нээгдээгүй» дэлгэц.
final financeRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/admin/finance', builder: (_, _) => const FinanceScreen()),
    GoRoute(path: '/app/admin/reconcile', builder: (_, _) => const ReconcileScreen()),
  ],
);
