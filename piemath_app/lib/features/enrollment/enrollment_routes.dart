import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/enrollment_screen.dart';

/// `enrollment` feature-ийн маршрут. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/admin/enrollment` — Элсэлтийн удирдлага: хичээл бүрийн элсэлтийн цонх, ангид ороогүй сурагчид,
///   зөвшөөрөл хүлээгч сурагчид, гадны багшийн баталгаажуулалт. Админ, Багш+.
final enrollmentRoutes = FeatureRoutes(
  shell: [GoRoute(path: EnrollmentScreen.path, builder: (_, _) => const EnrollmentScreen())],
);
