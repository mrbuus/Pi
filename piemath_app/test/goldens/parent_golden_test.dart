@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/parent/ui/parent_home_screen.dart';
import 'package:piemath_app/features/parent/ui/weekly_report_screen.dart';

import '../features/m7_fixtures.dart';
import '../features/m7_harness.dart';
import '../helpers/fake_http.dart';
import '../helpers/fonts.dart';

FakeHttp _http() => FakeHttp()
  ..json('GET', '/parent/children', [verifiedLink(), pendingLink()])
  ..json('GET', '/exam-results/parent/tr1', examCard())
  ..json('GET', '/tuition/paid-until/s1', {'paidUntil': '2026-11-06T00:00:00.000Z'})
  ..json('GET', '/parents/weekly-report', weeklyReportJson());

void main() {
  setUpAll(loadAppFonts);

  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';

    testWidgets('эцэг эхийн нүүр ($mode)', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
      await pumpM7(
        tester,
        const ParentHomeScreen(),
        http: _http(),
        session: signedInAs('PARENT'),
        dark: dark,
        size: const Size(390, 1500),
      );
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('parent_home_$mode.png'));
    });

    testWidgets('7 хоногийн тайлан ($mode)', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
      await pumpM7(
        tester,
        const WeeklyReportScreen(),
        http: _http(),
        session: signedInAs('PARENT'),
        dark: dark,
        size: const Size(390, 1300),
      );
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('parent_weekly_$mode.png'));
    });
  }
}
