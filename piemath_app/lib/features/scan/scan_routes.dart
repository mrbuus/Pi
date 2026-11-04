import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/scan_result_screen.dart';
import 'ui/scanner_screen.dart';

/// `scan` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/scan` — бүтэн дэлгэцийн QR уншигч (камер).
/// - `/app/scan/:code` — номын QR-аар нээсэн бодлого (shell дотор). `/q/<код>` deep link-ийг
///   `lib/app/redirect.dart` энд шилжүүлдэг.
final scanRoutes = FeatureRoutes(
  fullscreen: [
    GoRoute(path: '/app/scan', builder: (_, _) => const ScannerScreen()),
  ],
  shell: [
    GoRoute(
      path: '/app/scan/:code',
      builder: (_, state) => ScanResultScreen(rawCode: state.pathParameters['code'] ?? ''),
    ),
  ],
);
