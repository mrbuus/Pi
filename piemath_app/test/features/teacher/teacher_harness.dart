import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/current_user.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/teacher/application/teacher_providers.dart';
import 'package:piemath_app/shared/payment_status/paid_until_card.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

/// Тогтмол «өнөөдөр»: 2026-11-02 (Даваа) UB 16:00.
final teacherToday = UbDateTime(2026, 11, 2, 16);

class _FixedSession extends SessionController {
  _FixedSession(this._state);

  final SessionState _state;

  @override
  SessionState build() => _state;
}

SessionState teacherSession({String role = 'TEACHER', String id = 'u1'}) => SignedIn(
  StoredAuth(token: 't', userId: id, role: UserRole.fromApi(role)),
  CurrentUser.fromJson({...fakeMe(id: id, role: role), 'lastName': 'Багш'}),
);

/// [screen]-ийг router, theme, mock API-тай зурна. Түлхсэн (push) зам `Text('ROUTE:<path>')`-ээр харагдана.
Future<void> pumpTeacher(
  WidgetTester tester,
  Widget screen, {
  required FakeHttp http,
  SessionState? session,
  Size size = const Size(390, 844),
  bool presence = false,
}) async {
  tester.view.physicalSize = size * 3;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, _) => screen),
      for (final p in ['/app/:a', '/app/:a/:b', '/app/:a/:b/:c', '/app/:a/:b/:c/:d'])
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
        sessionProvider.overrideWith(() => _FixedSession(session ?? teacherSession())),
        teacherTodayProvider.overrideWithValue(teacherToday),
        presenceEnabledProvider.overrideWithValue(presence),
        paymentTodayProvider.overrideWithValue(teacherToday),
      ],
      retry: (_, _) => null,
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        routerConfig: router,
      ),
    ),
  );
  await settle(tester);
}

/// HTTP хариу ирж, дэлгэц шинэчлэгдтэл (skeleton анимацтай тул pumpAndSettle биш).
Future<void> settle(WidgetTester tester, {int frames = 10}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 30));
  }
}

/// Үндсэн ListView-ийг [finder] харагдтал гүйлгэнэ.
Future<void> scrollTo(WidgetTester tester, Finder finder) => tester.scrollUntilVisible(
  finder,
  300,
  scrollable: find.descendant(of: find.byType(ListView).first, matching: find.byType(Scrollable)).first,
);
