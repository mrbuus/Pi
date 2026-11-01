@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/auth/data/login_prefs.dart';

import '../features/auth/auth_test_helpers.dart';
import '../helpers/fake_http.dart';
import '../helpers/fonts.dart';
import '../helpers/pump.dart';

void main() {
  setUpAll(loadAppFonts);

  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';

    testWidgets('нэвтрэх дэлгэц ($mode)', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/auth/login-text', {'body': 'Шинэ улирлын бүртгэл 9-р сарын 1-нд эхэлнэ', 'updatedAt': null});
      await pumpAuthApp(
        tester,
        http: http,
        prefs: MemoryLoginPrefs(identifier: '99112233'),
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
      );
      await precacheImages(tester);
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('auth_login_$mode.png'));
    });
  }

  testWidgets('нууц үг сэргээх — код оруулах (light)', (tester) async {
    final http = FakeHttp()
      ..json('POST', '/auth/forgot-password', {
        'maskedTo': '9911****',
        'expiresInSeconds': 600,
        'linkExpiresInSeconds': 1800,
        'channels': {'sms': true, 'email': true},
      });
    await pumpAuthApp(tester, http: http, location: '/forgot-password', size: const Size(390, 1000));
    await tester.enterText(find.byType(TextField).first, '99112233');
    await tester.tap(find.widgetWithText(FilledButton, 'Сэргээх холбоос авах'));
    await settle(tester);
    await tester.enterText(find.byType(TextField).at(1), 'naraa20');
    // Хөвөгч шошгоны анимац дуусах (тоолуурын секунд солигдохоос өмнө).
    await tester.pump(const Duration(milliseconds: 300));
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('auth_forgot_verify_light.png'));
    // Тоолуурын Timer-ийг цэвэрлэнэ.
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
