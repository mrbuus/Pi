import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/session.dart';
import '../core/auth/user_role.dart';
import '../features/auth/auth_routes.dart';
import '../features/books/books_routes.dart';
import '../features/buyer/buyer_routes.dart';
import '../features/classrooms_admin/classrooms_admin_routes.dart';
import '../features/enrollment/enrollment_routes.dart';
import '../features/exam/exam_routes.dart';
import '../features/groups/groups_routes.dart';
import '../features/homework/homework_routes.dart';
import '../features/homework/ui/homework_screen.dart' show HomeworkAppBarActions;
import '../features/learning/learning_routes.dart';
import '../features/lesson_flow/lesson_flow_routes.dart';
import '../features/my_class/my_class_routes.dart';
import '../features/notifications/notifications_routes.dart';
import '../features/online_students/online_routes.dart';
import '../features/parent/parent_routes.dart';
import '../features/payments/payments_routes.dart';
import '../features/planner/planner_routes.dart';
import '../features/results/results_routes.dart';
import '../features/scan/scan_routes.dart';
import '../features/schedule/schedule_routes.dart';
import '../features/sms/sms_routes.dart';
import '../features/student_home/student_home_routes.dart';
import '../features/students_admin/students_admin_routes.dart';
import '../features/support/support_routes.dart';
import '../features/teacher/teacher_routes.dart';
import '../features/test_authoring/test_authoring_routes.dart';
import '../features/theory/theory_routes.dart';
import '../features/tools/tools_routes.dart';
import '../features/tuition/tuition_routes.dart';
import 'feature_routes.dart';
import 'nav/nav_data.dart';
import 'redirect.dart';
import 'shell/app_shell.dart';
import 'shell/branch_stack.dart';
import 'shell/manage_screen.dart';
import 'shell/more_screen.dart';
import 'shell/pending_screen.dart';
import 'shell/section_screen.dart';
import 'shell/splash_screen.dart';

/// Бүх feature-ийн маршрут. Шинэ feature нэмэхэд энд НЭГ мөр.
final allFeatureRoutes = <FeatureRoutes>[
  buyerRoutes,
  toolsRoutes,
  authRoutes,
  studentHomeRoutes,
  myClassRoutes,
  homeworkRoutes,
  theoryRoutes,
  // `/app/tests/new` нь `/app/tests/:id`-ээс өмнө таарах ёстой
  testAuthoringRoutes,
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
  plannerRoutes,
  tuitionRoutes,
  classroomsAdminRoutes,
  studentsAdminRoutes,
  lessonFlowRoutes,
  groupsRoutes,
  resultsRoutes,
  onlineRoutes,
  smsRoutes,
  enrollmentRoutes,
  _manageRoutes,
];

/// Админы «Удирдлага» төв
final _manageRoutes = FeatureRoutes(
  shell: [GoRoute(path: '/app/admin', builder: (_, _) => const ManageScreen())],
);

/// Зөвшөөрлийн шалгалт — M1 (`features/auth`) override хийнэ.
final consentCheckProvider = Provider<ConsentCheck?>((ref) => null);

final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

UserRole _navRole(SessionState s) => s is SignedIn ? NavData.navigationRole(s.role, s.user) : UserRole.unknown;

/// Router. Доод табын бүтэц role-оос хамаардаг тул маршрутын мод ([RoutingConfig]) role солигдоход
/// (нэвтрэх, гарах) шинэчлэгдэнэ — router өөрөө дахин үүсэхгүй.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  var role = _navRole(ref.read(sessionProvider));

  RoutingConfig configFor(UserRole r) => RoutingConfig(
    routes: buildRoutes(allFeatureRoutes, role: r),
    redirect: (context, state) =>
        appRedirect(ref.read(sessionProvider), state.uri, needsConsent: ref.read(consentCheckProvider)),
  );

  final config = ValueNotifier<RoutingConfig>(configFor(role));
  ref.listen(sessionProvider, (_, next) {
    final r = _navRole(next);
    if (r != role) {
      role = r;
      config.value = configFor(r);
    }
    refresh.value++;
  });

  final router = GoRouter.routingConfig(
    routingConfig: config,
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: refresh,
    debugLogDiagnostics: false,
    errorBuilder: (context, state) => PendingScreen(path: state.uri.path),
  );
  ref.onDispose(() {
    router.dispose();
    config.dispose();
    refresh.dispose();
  });
  return router;
});

/// Дэд хуудасны AppBar-ын үйлдлийг хэсгийн AppBar-т гаргах (дэд хуудасны өөрийн мөр нуугддаг).
final _sectionActions = <String, WidgetBuilder>{'/app/homework': (_) => const HomeworkAppBarActions()};

/// Маршрутын мод: public → бүтэн дэлгэц → доод табын салбарууд ([StatefulShellRoute]).
///
/// [role]-ийн хэсэг бүр нэг салбар ([NavData.sections]), сүүлийнх нь «Бусад». Feature-ийн маршрут бүрийг
/// замын хамгийн урт угтвараар хэсэгт нь оноож, хамаарахгүйг «Бусад»-д. Дэд табтай хэсгийн дэд зам бүр
/// ижил key-тэй [SectionScreen] хуудас болно. Хараахан хийгдээгүй зам — «вэбээр нээх».
@visibleForTesting
List<RouteBase> buildRoutes(List<FeatureRoutes> features, {UserRole role = UserRole.unknown}) {
  return [
    GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
    // Redirect нь «/», «/app»-ийг нүүр рүү шилжүүлнэ; энд хүрвэл зөвхөн хоосон дэлгэц үлдэхгүйн тулд.
    GoRoute(path: '/', builder: (_, _) => const SplashScreen()),
    GoRoute(path: '/q/:code', builder: (_, _) => const SplashScreen()),
    for (final f in features) ...f.public,
    for (final f in features)
      for (final r in f.fullscreen) _withParent(r, rootNavigatorKey),
    buildShellRoute(features, NavData.sections(role), role: role),
  ];
}

/// Доод табын салбарууд — [sections] бүрт нэг + «Бусад».
@visibleForTesting
StatefulShellRoute buildShellRoute(List<FeatureRoutes> features, List<NavSection> sections, {required UserRole role}) {
  Widget pending(BuildContext context, GoRouterState state) => PendingScreen(path: state.uri.path);
  final shellRoutes = [for (final f in features) ...f.shell];
  final byPath = {
    for (final r in shellRoutes)
      if (r is GoRoute) r.path: r,
  };
  final buckets = [for (var i = 0; i <= sections.length; i++) <RouteBase>[]];
  final more = buckets.last..add(GoRoute(path: morePath, builder: (_, _) => const MoreScreen()));
  final placed = <String>{};

  for (var i = 0; i < sections.length; i++) {
    final s = sections[i];
    if (!s.hasSubTabs) {
      final r = byPath[s.rootPath];
      buckets[i].add(r ?? GoRoute(path: s.rootPath, builder: pending));
      placed.add(s.rootPath);
      continue;
    }
    final pages = [
      for (final link in s.pages)
        SectionPage(
          link: link,
          builder: (context) => _buildPage(context, byPath[link.path], link.path),
          actions: _sectionActions[link.path],
        ),
    ];
    for (var j = 0; j < s.pages.length; j++) {
      final link = s.pages[j];
      final original = byPath[link.path];
      placed.add(link.path);
      buckets[i].add(
        GoRoute(
          path: link.path,
          name: original?.name,
          redirect: original?.redirect,
          routes: original?.routes ?? const [],
          pageBuilder: (context, state) => MaterialPage<void>(
            // Бүх дэд зам нэг key — дэд таб солиход хуудас шинээр үүсэхгүй, зөвхөн шинэчлэгдэнэ.
            key: ValueKey('section:${s.id}'),
            name: state.uri.path,
            child: SectionScreen(
              section: s,
              index: j,
              pages: [
                for (var k = 0; k < pages.length; k++)
                  k == j
                      ? SectionPage(
                          link: pages[k].link,
                          actions: pages[k].actions,
                          builder: (context) => _buildPage(context, original, link.path, state),
                        )
                      : pages[k],
              ],
            ),
          ),
        ),
      );
    }
  }

  for (final r in shellRoutes) {
    if (r is GoRoute && placed.contains(r.path)) continue;
    final path = r is GoRoute ? r.path : null;
    final i = path == null ? -1 : NavData.sectionIndexOf(role, path);
    (i < 0 ? more : buckets[i]).add(r);
  }
  // Хараахан хийгдээгүй хэсэг — вэбийн зам руу «вэбээр нээх» (функц хасахгүй). Хамгийн сүүлд.
  more.addAll([
    GoRoute(path: '/app/:a', builder: pending),
    GoRoute(path: '/app/:a/:b', builder: pending),
    GoRoute(path: '/app/:a/:b/:c', builder: pending),
    GoRoute(path: '/app/:a/:b/:c/:d', builder: pending),
  ]);

  return StatefulShellRoute(
    builder: (context, state, shell) => AppShell(navigationShell: shell, sections: sections),
    navigatorContainerBuilder: (context, shell, children) =>
        BranchStack(currentIndex: shell.currentIndex, children: children),
    branches: [
      for (var i = 0; i < sections.length; i++)
        StatefulShellBranch(
          navigatorKey: GlobalKey<NavigatorState>(debugLabel: 'tab-${sections[i].id}'),
          initialLocation: sections[i].rootPath,
          routes: buckets[i],
        ),
      StatefulShellBranch(
        navigatorKey: GlobalKey<NavigatorState>(debugLabel: 'tab-more'),
        initialLocation: morePath,
        routes: more,
      ),
    ],
  );
}

/// Дэд хуудсыг feature-ийн маршрутаар зурна. Идэвхгүй дэд табад жинхэнэ [GoRouterState] байхгүй тул
/// зөвхөн замтай state (query-гүй) үүсгэнэ.
Widget _buildPage(BuildContext context, GoRoute? route, String path, [GoRouterState? state]) {
  final builder = route?.builder;
  if (builder == null) return PendingScreen(path: path);
  final s =
      state ??
      GoRouterState(
        GoRouter.of(context).configuration,
        uri: Uri(path: path),
        matchedLocation: path,
        path: path,
        fullPath: path,
        pathParameters: const {},
        pageKey: ValueKey('sub:$path'),
      );
  return builder(context, s);
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
