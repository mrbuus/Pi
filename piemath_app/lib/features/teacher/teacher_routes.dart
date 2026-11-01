import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/assignments_screen.dart';
import 'ui/board_screen.dart';
import 'ui/classes_screen.dart';
import 'ui/student_screen.dart';
import 'ui/teacher_home_screen.dart';
import 'ui/teacher_hours_screen.dart';
import 'ui/test_run_screen.dart';

/// `teacher` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/teacher` — сонгосон өдрийн хичээлтэй ангиуд.
/// - `/app/teacher/board/:classId?date=YYYY-MM-DD` — ирц, даалгаврын самбар (огноогүй бол өнөөдөр).
/// - `/app/teacher-hours` — цагийн бүртгэл.
/// - `/app/classes`, `/app/classes/:id` — ангиуд, ангийн самбар.
/// - `/app/classes/:id/assignments[/:assignmentId]` — онлайн даалгавар шалгах.
/// - `/app/teacher/tests/:id/results` — шалгалтын дүн + бүрэн бүтэн байдлын тоо (`extra` = шалгалтын нэр).
/// - `/app/students/:id` — сурагчийн хуудас (`extra` = харуулах нэр).
final teacherRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/teacher', builder: (_, _) => const TeacherHomeScreen()),
    GoRoute(
      path: '/app/teacher/board/:classId',
      builder: (_, s) =>
          BoardScreen(classId: s.pathParameters['classId'] ?? '', date: _dateParam(s.uri.queryParameters['date'])),
    ),
    GoRoute(path: '/app/teacher-hours', builder: (_, _) => const TeacherHoursScreen()),
    GoRoute(path: '/app/classes', builder: (_, _) => const ClassesScreen()),
    GoRoute(
      path: '/app/classes/:id',
      builder: (_, s) => ClassDetailScreen(classId: s.pathParameters['id'] ?? ''),
    ),
    GoRoute(
      path: '/app/classes/:id/assignments',
      builder: (_, s) => AssignmentsScreen(classId: s.pathParameters['id'] ?? ''),
    ),
    GoRoute(
      path: '/app/classes/:id/assignments/:assignmentId',
      builder: (_, s) => SubmissionsScreen(
        assignmentId: s.pathParameters['assignmentId'] ?? '',
        title: s.extra is String ? s.extra! as String : null,
      ),
    ),
    GoRoute(
      path: '/app/teacher/tests/:id/results',
      builder: (_, s) => TestRunScreen(
        testId: s.pathParameters['id'] ?? '',
        title: s.extra is String ? s.extra! as String : null,
      ),
    ),
    GoRoute(
      path: '/app/students/:id',
      builder: (_, s) =>
          StudentScreen(studentId: s.pathParameters['id'] ?? '', name: s.extra is String ? s.extra! as String : null),
    ),
  ],
);

final _dateKey = RegExp(r'^\d{4}-\d{2}-\d{2}$');

/// Буруу/хоосон огноо → null (самбар өнөөдрийг авна).
String? _dateParam(String? v) => v != null && _dateKey.hasMatch(v) ? v : null;
