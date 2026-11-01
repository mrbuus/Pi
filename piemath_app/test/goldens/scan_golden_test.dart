@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/scan/scan_routes.dart';

import '../core/math/math_test_helpers.dart';
import '../features/scan/scan_screens_test.dart' show scanJson;
import '../features/scan/scan_test_helpers.dart';
import '../helpers/fake_http.dart';
import '../helpers/fonts.dart';

void main() {
  setUpAll(() async {
    await loadAppFonts();
    await loadKatexFonts();
  });

  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';
    testWidgets('QR бодлого: бодолт нээгдсэн ($mode)', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
      final http = FakeHttp()..json('GET', '/scan/AB12CD34', scanJson());
      await pumpRouted(
        tester,
        initial: '/app/scan/AB12CD34',
        routes: scanRoutes.shell,
        http: http,
        dark: dark,
        size: const Size(390, 1000),
      );
      await settle(tester);
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('scan_full_$mode.png'));
    });
  }

  testWidgets('QR бодлого: хаалттай (light)', (tester) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    final http = FakeHttp()
      ..json(
        'GET',
        '/scan/AB12CD34',
        scanJson(access: 'LOCKED', lockReason: 'WAITING', opensAt: '2026-11-02T07:00:00.000Z', hasImage: true),
      );
    await pumpRouted(tester, initial: '/app/scan/AB12CD34', routes: scanRoutes.shell, http: http, size: const Size(390, 900));
    await settle(tester);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('scan_locked_light.png'));
  });
}
