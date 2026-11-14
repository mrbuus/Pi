import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/app/theme_mode.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

/// Тогтмол нэвтрэлтийн төлөв (сүлжээгүй).
class FixedSession extends SessionController {
  FixedSession(this.initial);

  final SessionState initial;

  @override
  SessionState build() => initial;
}

const signedInStudent = SignedIn(StoredAuth(token: 't', userId: 'u1', role: UserRole.student));

/// Хаягийг одоогийн router-оос уншина.
String currentPath(WidgetTester tester) {
  final ctx = tester.element(find.byType(Navigator).first);
  return GoRouter.of(ctx).routerDelegate.currentConfiguration.uri.toString();
}

/// Дэлгэцийг go_router + ProviderScope (mock API) дотор зурна.
Future<void> pumpRouted(
  WidgetTester tester, {
  required String initial,
  required List<RouteBase> routes,
  required FakeHttp http,
  SessionState session = signedInStudent,
  bool dark = false,
  Map<String, Object> prefs = const {},
  List<Override> extra = const [],
  Size size = const Size(390, 844),
}) async {
  tester.view.physicalSize = size * 3;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues(prefs);
  final sp = await SharedPreferences.getInstance();
  final router = GoRouter(
    initialLocation: initial,
    routes: [
      ...routes,
      GoRoute(path: '/', builder: (_, _) => const Scaffold(body: Text('НҮҮР'))),
      GoRoute(path: '/login', builder: (_, _) => const Scaffold(body: Text('НЭВТРЭХ'))),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sharedPreferencesProvider.overrideWithValue(sp),
        sessionProvider.overrideWith(() => FixedSession(session)),
        ...extra,
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
}

/// Хүсэлт дуусч, дэлгэц тогтворжтол (skeleton анимацтай тул pumpAndSettle биш).
Future<void> settle(WidgetTester tester, {int frames = 12}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}
