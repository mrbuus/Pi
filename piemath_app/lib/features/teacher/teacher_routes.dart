import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/announcements_screen.dart';
import 'ui/assignments_screen.dart';
import 'ui/board_screen.dart';
import 'ui/class_checks_screen.dart';
import 'ui/classes_screen.dart';
import 'ui/leads_screen.dart';
import 'ui/pending_actions_screen.dart';
import 'ui/room406_screen.dart';
import 'ui/student_screen.dart';
import 'ui/teacher_home_screen.dart';
import 'ui/teacher_hours_screen.dart';

/// `teacher` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/teacher` — сонгосон өдрийн хичээлтэй ангиуд. Вэбийн `?class=<id>&date=YYYY-MM-DD` холбоос (мэдэгдлээс)
///   `class` байвал тэр ангийн самбар руу, зөвхөн `date` байвал тэр өдрийн жагсаалт руу.
/// - `/app/teacher/pending` — хүлээгдэж буй (Багш+, Админ): эцэг эхийн холболт, шинэ сурагч, төлбөр.
/// - `/app/teacher/announcements` — зар тавих.
/// - `/app/admin/leads` — элсэлтийн хүсэлтийн төлөв (Админ, Багш+).
/// - `/app/teacher/board/:classId?date=YYYY-MM-DD` — ирц, даалгаврын самбар (огноогүй бол өнөөдөр).
/// - `/app/teacher/room406?date=YYYY-MM-DD` — 406 нөхөх өрөө (хуваарьгүй, ямар ч өдөр).
/// - `/app/teacher-hours` — ажилласан цаг.
/// - `/app/classes`, `/app/classes/:id` — ангиуд, ангийн самбар.
/// - `/app/classes/:id/assignments[/:assignmentId]` — онлайн даалгавар шалгах.
/// - `/app/classes/:id/checks` — ангийн «Чек» (`extra` = ангийн нэр).
/// - `/app/teacher/tests/:id/results` — хуучин холбоос, `/app/tests/:id/results` руу шилжинэ.
/// - `/app/students/:id` — сурагчийн хуудас (`extra` = харуулах нэр).
final teacherRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: '/app/teacher',
      redirect: (_, s) => teacherLinkRedirect(s.uri),
      builder: (_, s) => TeacherHomeScreen(date: _dateParam(s.uri.queryParameters['date'])),
    ),
    GoRoute(path: '/app/teacher/pending', builder: (_, _) => const PendingActionsScreen()),
    GoRoute(path: '/app/teacher/announcements', builder: (_, _) => const AnnouncementsScreen()),
    GoRoute(path: '/app/admin/leads', builder: (_, _) => const LeadsScreen()),
    GoRoute(
      path: '/app/teacher/board/:classId',
      builder: (_, s) =>
          BoardScreen(classId: s.pathParameters['classId'] ?? '', date: _dateParam(s.uri.queryParameters['date'])),
    ),
    GoRoute(
      path: '/app/teacher/room406',
      builder: (_, s) => Room406Screen(date: _dateParam(s.uri.queryParameters['date'])),
    ),
    GoRoute(path: '/app/teacher-hours', builder: (_, _) => const TeacherHoursScreen()),
    GoRoute(path: '/app/classes', builder: (_, _) => const ClassesScreen()),
    GoRoute(
      path: '/app/classes/:id',
      builder: (_, s) => ClassDetailScreen(classId: s.pathParameters['id'] ?? ''),
    ),
    GoRoute(
      path: '/app/classes/:id/checks',
      builder: (_, s) => ClassChecksScreen(
        classId: s.pathParameters['id'] ?? '',
        className: s.extra is String ? s.extra! as String : null,
      ),
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
    // Хуучин зам — бүрэн дүнгийн дэлгэц `/app/tests/:id/results` (features/results) руу.
    GoRoute(
      path: '/app/teacher/tests/:id/results',
      redirect: (_, s) => '/app/tests/${Uri.encodeComponent(s.pathParameters['id'] ?? '')}/results',
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

final _classKey = RegExp(r'^[A-Za-z0-9_-]{1,40}$');

/// Вэбийн `/app/teacher?class=&date=` → апп-ын самбарын зам. Анги байхгүй/буруу бол null (жагсаалт нээгдэнэ).
@visibleForTesting
String? teacherLinkRedirect(Uri uri) {
  final cls = uri.queryParameters['class'];
  if (cls == null || !_classKey.hasMatch(cls)) return null;
  final date = _dateParam(uri.queryParameters['date']);
  return '/app/teacher/board/${Uri.encodeComponent(cls)}${date == null ? '' : '?date=$date'}';
}
