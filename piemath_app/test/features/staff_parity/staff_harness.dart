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

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

/// Ажилтны (Багш, Багш+, Админ) шинэ натив хуудсуудын тестийн нийтлэг суурь. Зохиомол өгөгдөл.
class _FixedSession extends SessionController {
  _FixedSession(this._state);

  final SessionState _state;

  @override
  SessionState build() => _state;
}

SessionState staffAs(String role, {String id = 'u1'}) => SignedIn(
  StoredAuth(token: 't', userId: id, role: UserRole.fromApi(role)),
  CurrentUser.fromJson({...fakeMe(id: id, role: role), 'lastName': 'Ажилтан'}),
);

/// Дэлгэцийг router, theme, mock API-тай зурна. Түлхсэн зам `ROUTE:<path>` бичвэрээр харагдана.
Future<void> pumpStaff(
  WidgetTester tester,
  Widget screen, {
  required FakeHttp http,
  String role = 'ADMIN',
  String userId = 'u1',
  List<Override> overrides = const [],
}) async {
  tester.view.physicalSize = const Size(390, 844) * 3;
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
        sessionProvider.overrideWith(() => _FixedSession(staffAs(role, id: userId))),
        ...overrides,
      ],
      retry: (_, _) => null,
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        routerConfig: router,
      ),
    ),
  );
  await settle(tester);
}

Future<void> settle(WidgetTester tester, {int frames = 12}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 30));
  }
}

/// [FakeHttp]-д ирсэн сүүлийн хүсэлтийн бие.
Map<String, Object?> lastBody(FakeHttp http, String method, String path) {
  final r = http.requests.lastWhere((r) => r.method == method && r.path == path);
  final d = r.data;
  return d is Map ? d.cast<String, Object?>() : const {};
}
