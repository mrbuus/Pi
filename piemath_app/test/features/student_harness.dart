import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/current_user.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/homework/homework_routes.dart';
import 'package:piemath_app/features/my_class/my_class_routes.dart';
import 'package:piemath_app/features/schedule/schedule_routes.dart';
import 'package:piemath_app/features/student_home/student_home_routes.dart';
import 'package:piemath_app/features/theory/theory_routes.dart';

import '../helpers/fake_http.dart';
import '../helpers/test_container.dart';

/// Нэвтэрсэн төлөвтэй тогтмол session (сэргээх дуудлагагүй).
class FixedSession extends SessionController {
  FixedSession(this.initial);

  final SessionState initial;

  @override
  SessionState build() => initial;
}

SignedIn signedInAs(UserRole role, {Map<String, Object?>? me}) => SignedIn(
      StoredAuth(token: 't', userId: 'u1', role: role),
      CurrentUser.fromJson(me ?? fakeMe(role: role.apiValue)),
    );

/// Сурагчийн feature-ийн дэлгэцийг жинхэнэ маршруттай (go_router) зурна.
/// Бүртгээгүй замд «PENDING:<зам>» бичвэр — шилжилтийг шалгахад.
Future<GoRouter> pumpStudentRoute(
  WidgetTester tester, {
  required FakeHttp http,
  required String location,
  UserRole role = UserRole.student,
  bool dark = false,
  Size size = const Size(390, 844),
  List<Override> overrides = const [],
}) async {
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    initialLocation: location,
    routes: [
      ...studentHomeRoutes.shell,
      ...myClassRoutes.shell,
      ...scheduleRoutes.shell,
      ...theoryRoutes.shell,
      ...homeworkRoutes.shell,
      GoRoute(path: '/app/:a', builder: (_, s) => Scaffold(body: Text('PENDING:${s.uri}'))),
      GoRoute(path: '/app/:a/:b', builder: (_, s) => Scaffold(body: Text('PENDING:${s.uri}'))),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(() => FixedSession(signedInAs(role))),
        ...overrides,
      ],
      retry: (_, _) => null,
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        routerConfig: router,
      ),
    ),
  );
  return router;
}

/// HTTP хариу ирж дуустал хэдэн frame (FakeAsync дотор шууд await хийхгүй).
Future<void> settle(WidgetTester tester, {int frames = 12}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 30));
  }
}
