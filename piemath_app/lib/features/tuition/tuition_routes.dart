import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/refund_detail_screen.dart';
import 'ui/refund_list_screen.dart';
import 'ui/refund_start_screen.dart';

/// `tuition` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/tuition` — буцаалтын тооцоо (сурагч хайх, серверийн тооцоо, ноорог хадгалах).
/// - `/app/tuition/refunds` — буцаалтын жагсаалт (төлвөөр шүүх).
/// - `/app/tuition/refund/:id` — буцаалтын дэлгэрэнгүй, төлөв солих.
///
/// Эрх: Админ, санхүүгийн эрхтэй (`finance.manage`) Багш+. Бусдад төвийг сахисан «нээгдээгүй» дэлгэц.
final tuitionRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/tuition', builder: (_, _) => const RefundStartScreen()),
    GoRoute(path: '/app/tuition/refunds', builder: (_, _) => const RefundListScreen()),
    GoRoute(
      path: '/app/tuition/refund/:id',
      builder: (_, state) => RefundDetailScreen(refundId: state.pathParameters['id']!),
    ),
  ],
);
