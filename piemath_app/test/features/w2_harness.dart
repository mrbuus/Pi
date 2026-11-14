import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/groups/groups_routes.dart';
import 'package:piemath_app/features/lesson_flow/lesson_flow_routes.dart';

import '../helpers/fake_http.dart';
import '../helpers/test_container.dart';
import 'student_harness.dart';

/// Давалгаа 2-ын (хичээлийн өдөр, ангийн бүлэг) дэлгэцийг жинхэнэ маршрутаар зурна.
/// Бүртгээгүй замд «ROUTE:<зам>» бичвэр — шилжилтийг шалгахад.
Future<GoRouter> pumpW2(
  WidgetTester tester, {
  required FakeHttp http,
  required String location,
  UserRole role = UserRole.teacher,
  String userId = 'u1',
  Size size = const Size(390, 844),
  List<RouteBase> extra = const [],
}) async {
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    initialLocation: location,
    routes: [
      ...lessonFlowRoutes.shell,
      ...groupsRoutes.shell,
      ...extra,
      for (final p in ['/app/:a', '/app/:a/:b', '/app/:a/:b/:c'])
        GoRoute(
          path: p,
          builder: (_, s) => Scaffold(body: Text('ROUTE:${s.uri}')),
        ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(
          () => FixedSession(
            signedInAs(
              role,
              me: fakeMe(id: userId, role: role.apiValue),
            ),
          ),
        ),
      ],
      retry: (_, _) => null,
      child: MaterialApp.router(debugShowCheckedModeBanner: false, theme: AppTheme.light(), routerConfig: router),
    ),
  );
  await settle(tester);
  return router;
}
