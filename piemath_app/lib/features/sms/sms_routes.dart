import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/sms_screen.dart';

/// `sms` feature-ийн маршрут. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/sms` — Дугаарлуу мессеж: төлөв, илгээх (Админ), түүх, загвар. Харах нь Админ, Багш+.
final smsRoutes = FeatureRoutes(
  shell: [GoRoute(path: SmsScreen.path, builder: (_, _) => const SmsScreen())],
);
