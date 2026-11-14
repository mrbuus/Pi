import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/book_money/book_money_routes.dart';
import 'package:piemath_app/features/paper_exams/paper_exams_routes.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import '../student_harness.dart';

/// «Номын мөнгө», «Нэгдсэн шалгалт»-ын дэлгэцийг жинхэнэ маршрутаар зурна. Бүртгээгүй замд
/// «ROUTE:<зам>» бичвэр — шилжилтийг шалгахад. [home] өгвөл `/test` замд тэр widget.
Future<GoRouter> pumpInternal(
  WidgetTester tester, {
  required FakeHttp http,
  String location = '/test',
  Widget? home,
  UserRole role = UserRole.teacher,
  String userId = 'u1',
  List<Override> overrides = const [],
  Size size = const Size(390, 844),
}) async {
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    initialLocation: location,
    routes: [
      ...bookMoneyRoutes.shell,
      ...paperExamsRoutes.shell,
      GoRoute(
        path: '/test',
        builder: (_, _) => Scaffold(body: home ?? const SizedBox()),
      ),
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
        ...overrides,
      ],
      retry: (_, _) => null,
      child: MaterialApp.router(debugShowCheckedModeBanner: false, theme: AppTheme.light(), routerConfig: router),
    ),
  );
  await settle(tester);
  return router;
}
