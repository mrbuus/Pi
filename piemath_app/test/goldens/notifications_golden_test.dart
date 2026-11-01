@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/notifications/ui/notifications_screen.dart';
import 'package:piemath_app/features/payments/ui/student_payments_screen.dart';

import '../features/m7_fixtures.dart';
import '../features/m7_harness.dart';
import '../helpers/fake_http.dart';
import '../helpers/fonts.dart';

void main() {
  setUpAll(loadAppFonts);

  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';

    testWidgets('мэдэгдэл ($mode)', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/notifications/my', {
          'notifications': [
            notification('n1', link: '/app/homework'),
            notification('n2', kind: 'PAYMENT_DUE'),
            notification('n3', read: true, kind: 'SCHEDULE_CHANGE'),
          ],
          'nextCursor': 'n3',
        })
        ..json('GET', '/notifications/my/unread-count', {'count': 2});
      await pumpM7(tester, const NotificationsScreen(), http: http, dark: dark, size: const Size(390, 1100));
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('notifications_$mode.png'));
    });

    testWidgets('сурагчийн төлбөр ($mode)', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
      final http = FakeHttp()
        ..json('GET', '/tuition/paid-until/my', {'paidUntil': '2026-11-01T00:00:00.000Z'})
        ..json('GET', '/assignments/my-classrooms', [
          {'id': 'c1', 'name': '12Б', 'type': 'IN_PERSON', 'grade': 12},
        ])
        ..json('GET', '/payments/my', myPayments());
      await pumpM7(tester, const StudentPaymentsScreen(), http: http, dark: dark, size: const Size(390, 1500));
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('notifications_payments_$mode.png'));
    });
  }
}
