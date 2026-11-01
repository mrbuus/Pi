import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/session.dart';
import '../features/auth/auth_routes.dart';
import '../features/books/books_routes.dart';
import '../features/exam/exam_routes.dart';
import '../features/homework/homework_routes.dart';
import '../features/learning/learning_routes.dart';
import '../features/my_class/my_class_routes.dart';
import '../features/notifications/notifications_routes.dart';
import '../features/parent/parent_routes.dart';
import '../features/payments/payments_routes.dart';
import '../features/scan/scan_routes.dart';
import '../features/schedule/schedule_routes.dart';
import '../features/student_home/student_home_routes.dart';
import '../features/support/support_routes.dart';
import '../features/teacher/teacher_routes.dart';
import '../features/theory/theory_routes.dart';
import '../features/tools/tools_routes.dart';
import 'feature_routes.dart';
import 'redirect.dart';
import 'shell/app_shell.dart';
import 'shell/more_screen.dart';
import 'shell/pending_screen.dart';
import 'shell/splash_screen.dart';

/// Бүх feature-ийн маршрут. Шинэ feature нэмэхэд энд НЭГ мөр.
final allFeatureRoutes = <FeatureRoutes>[
  toolsRoutes,
  authRoutes,
  studentHomeRoutes,
  myClassRoutes,
  homeworkRoutes,
  theoryRoutes,
  examRoutes,
  scheduleRoutes,
  notificationsRoutes,
  paymentsRoutes,
  scanRoutes,
  booksRoutes,
  parentRoutes,
  teacherRoutes,
  learningRoutes,
  supportRoutes,
];

/// Зөвшөөрлийн шалгалт — M1 (`features/auth`) override хийнэ.
final consentCheckProvider = Provider<ConsentCheck?>((ref) => null);

final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final _shellNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'shell');

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(sessionProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  final router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: refresh,
    debugLogDiagnostics: false,
    redirect: (context, state) => appRedirect(
      ref.read(sessionProvider),
      state.uri,
      needsConsent: ref.read(consentCheckProvider),
    ),
    routes: buildRoutes(allFeatureRoutes),
    errorBuilder: (context, state) => PendingScreen(path: state.uri.path),
  );
  ref.onDispose(router.dispose);
  return router;
});

/// Маршрутын мод: public → бүтэн дэлгэц → shell (feature-ийнх, дараа нь «удахгүй» catch-all).
@visibleForTesting
List<RouteBase> buildRoutes(List<FeatureRoutes> features) {
  Widget pending(BuildContext context, GoRouterState state) =>
      PendingScreen(path: state.uri.path);
  return [
    GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
    // Redirect нь «/», «/app»-ийг нүүр рүү шилжүүлнэ; энд хүрвэл зөвхөн хоосон дэлгэц үлдэхгүйн тулд.
    GoRoute(path: '/', builder: (_, _) => const SplashScreen()),
    GoRoute(path: '/q/:code', builder: (_, _) => const SplashScreen()),
    for (final f in features) ...f.public,
    for (final f in features)
      for (final r in f.fullscreen) _withParent(r, rootNavigatorKey),
    ShellRoute(
      navigatorKey: _shellNavigatorKey,
      builder: (context, state, child) =>
          AppShell(location: state.uri.path, child: child),
      routes: [
        GoRoute(path: morePath, builder: (_, _) => const MoreScreen()),
        for (final f in features) ...f.shell,
        // Хараахан хийгдээгүй хэсэг — вэбийн зам руу «вэбээр нээх» (функц хасахгүй).
        GoRoute(path: '/app/:a', builder: pending),
        GoRoute(path: '/app/:a/:b', builder: pending),
        GoRoute(path: '/app/:a/:b/:c', builder: pending),
        GoRoute(path: '/app/:a/:b/:c/:d', builder: pending),
      ],
    ),
  ];
}

RouteBase _withParent(RouteBase r, GlobalKey<NavigatorState> key) {
  if (r is GoRoute && r.parentNavigatorKey == null) {
    return GoRoute(
      path: r.path,
      name: r.name,
      builder: r.builder,
      pageBuilder: r.pageBuilder,
      redirect: r.redirect,
      routes: r.routes,
      parentNavigatorKey: key,
    );
  }
  return r;
}
