import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/admin_student_screen.dart';
import 'ui/student_import_screen.dart';
import 'ui/students_admin_screen.dart';

/// `students_admin` feature-ийн маршрутууд (Сурагчид удирдлага). Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/admin/students` — жагсаалт: хайлт, шүүлтүүр, анхаарах, архив, үйлдэл, Excel/CSV.
/// - `/app/admin/students/import` — Excel импорт (Админ). `:id`-ээс ӨМНӨ.
/// - `/app/admin/students/:id` — багшийн сурагчийн хуудас + удирдлага (`extra` = харуулах нэр).
final studentsAdminRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/admin/students', builder: (_, _) => const StudentsAdminScreen()),
    GoRoute(path: '/app/admin/students/import', builder: (_, _) => const StudentImportScreen()),
    GoRoute(
      path: '/app/admin/students/:id',
      builder: (_, s) => AdminStudentScreen(
        studentId: s.pathParameters['id'] ?? '',
        name: s.extra is String ? s.extra! as String : null,
      ),
    ),
  ],
);
