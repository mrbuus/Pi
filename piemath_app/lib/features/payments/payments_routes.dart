import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/student_payments_screen.dart';

/// `payments` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/student/payments` — сурагчийн төлбөр (хэдий хүртэл, данс, түүх).
/// - `/app/payments` — ажилтны төлбөрийн ledger (Багш+/Админ) одоогоор PendingScreen («вэбээр нээх», M9).
final paymentsRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/student/payments', builder: (_, _) => const StudentPaymentsScreen()),
  ],
);
