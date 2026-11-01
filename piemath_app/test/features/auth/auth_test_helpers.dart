import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/app/app.dart';
import 'package:piemath_app/app/router.dart';
import 'package:piemath_app/app/theme_mode.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/auth/data/login_prefs.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

/// Бүтэн апп (router, shell)-ийг mock API-тай асаана. [location] өгвөл сэргээсний дараа тийш очно.
Future<ProviderContainer> pumpAuthApp(
  WidgetTester tester, {
  required FakeHttp http,
  StoredAuth? auth,
  MemoryTokenStore? store,
  LoginPrefs? prefs,
  String? location,
  Size size = const Size(390, 844),
  ThemeMode themeMode = ThemeMode.light,
}) async {
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({if (themeMode != ThemeMode.system) 'theme_mode': themeMode.name});
  final sp = await SharedPreferences.getInstance();
  final container = ProviderContainer(
    overrides: [
      ...testOverrides(http: http, store: store ?? MemoryTokenStore(auth)),
      sharedPreferencesProvider.overrideWithValue(sp),
      loginPrefsProvider.overrideWithValue(prefs ?? MemoryLoginPrefs()),
    ],
    retry: (_, _) => null,
  );
  addTearDown(container.dispose);
  await tester.pumpWidget(UncontrolledProviderScope(container: container, child: const PiemathApp()));
  // Dio-гийн хариуны stream бодит async-д дуусна (FakeAsync дотор шууд await хийвэл гацна).
  await tester.runAsync(() => container.read(sessionProvider.notifier).restore());
  await settle(tester);
  if (location != null) {
    container.read(routerProvider).go(location);
    await settle(tester);
  }
  return container;
}

/// HTTP хариу ирж, анимац дуустал хэд хэдэн frame.
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 60));
  }
  await tester.pumpAndSettle();
}

/// Нэвтэрсэн сурагч (хадгалсан токен).
const signedInStudent = StoredAuth(token: 'tok-old', userId: 'u1', role: UserRole.student);
