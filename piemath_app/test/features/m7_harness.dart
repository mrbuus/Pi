import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/current_user.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/notifications/domain/notifications_controller.dart';
import 'package:piemath_app/features/parent/ui/weekly_report_screen.dart';
import 'package:piemath_app/shared/payment_status/paid_until_card.dart';

import '../helpers/fake_http.dart';
import '../helpers/test_container.dart';

/// M7 (эцэг эх, мэдэгдэл, төлбөр, тусламж) дэлгэцийн тестийн суурь.
/// Тогтмол «өнөөдөр»: 2026-11-04 (Лхагва) UB.
final testToday = UbDateTime(2026, 11, 4, 10);
final testNow = DateTime.utc(2026, 11, 4, 2); // UB 10:00

class _FixedSession extends SessionController {
  _FixedSession(this._state);

  final SessionState _state;

  @override
  SessionState build() => _state;
}

/// Нэвтэрсэн хэрэглэгчийн төлөв (зохиомол).
SessionState signedInAs(String role, {Map<String, Object?>? me}) => SignedIn(
      StoredAuth(token: 't', userId: 'u1', role: UserRole.fromApi(role)),
      CurrentUser.fromJson(me ?? fakeMe(role: role)),
    );

/// [screen]-ийг router, theme, mock API-тай зурна. Түлхсэн (push) зам `Text('ROUTE:<path>')`-ээр харагдана.
Future<void> pumpM7(
  WidgetTester tester,
  Widget screen, {
  required FakeHttp http,
  SessionState? session,
  bool dark = false,
  Size size = const Size(390, 844),
  List<Override> extra = const [],
}) async {
  tester.view.physicalSize = size * 3;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, _) => screen),
      for (final p in ['/app/:a', '/app/:a/:b', '/app/:a/:b/:c'])
        GoRoute(path: p, builder: (_, s) => Scaffold(body: Text('ROUTE:${s.uri}'))),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(() => _FixedSession(session ?? signedInAs('STUDENT'))),
        paymentTodayProvider.overrideWithValue(testToday),
        parentTodayProvider.overrideWithValue(testToday),
        notificationsNowProvider.overrideWithValue(() => testNow),
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
  await settle(tester);
}

/// Дэлгэцийн үндсэн ListView-ийг [finder] харагдтал гүйлгэнэ (дотор нь өөр Scrollable байж болно).
Future<void> scrollTo(WidgetTester tester, Finder finder) => tester.scrollUntilVisible(
      finder,
      300,
      scrollable: find.descendant(of: find.byType(ListView).first, matching: find.byType(Scrollable)).first,
    );

/// HTTP хариу ирж, дэлгэц шинэчлэгдтэл (skeleton анимацтай тул pumpAndSettle биш).
Future<void> settle(WidgetTester tester, {int frames = 8}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 30));
  }
}
