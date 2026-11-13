import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/book_money_screen.dart';

/// `book_money` feature-ийн маршрут. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/book-money` — «Дотоод, Номын мөнгө» самбар (Админ, Багш+, Багш).
final bookMoneyRoutes = FeatureRoutes(
  shell: [GoRoute(path: BookMoneyScreen.path, builder: (_, _) => const BookMoneyScreen())],
);
