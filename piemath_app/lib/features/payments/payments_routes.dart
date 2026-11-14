import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/ledger_screens.dart';
import 'ui/student_payments_screen.dart';

/// `payments` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/student/payments` — сурагчийн төлбөр (хэдий хүртэл, данс, түүх).
/// - `/app/payments` — ажилтны ledger унших (Админ, Багш+; эрх серверт): ангиуд.
/// - `/app/payments/class/:id` — ангийн сурагч бүрийн сарын төлөв.
/// - `/app/payments/student/:id` — нэг сурагчийн ledger (үнэ серверээс).
final paymentsRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/student/payments', builder: (_, _) => const StudentPaymentsScreen()),
    GoRoute(path: '/app/payments', builder: (_, _) => const LedgerOverviewScreen()),
    GoRoute(
      path: '/app/payments/class/:id',
      builder: (_, state) => LedgerClassScreen(classroomId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/app/payments/student/:id',
      builder: (_, state) => LedgerStudentScreen(studentId: state.pathParameters['id']!),
    ),
  ],
);
