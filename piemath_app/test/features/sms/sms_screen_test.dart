import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/sms/sms_routes.dart';
import 'package:piemath_app/features/sms/ui/sms_screen.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import '../student_harness.dart' show FixedSession, signedInAs, settle;
import 'sms_fixtures.dart';

Future<void> _pump(
  WidgetTester tester,
  FakeHttp http, {
  UserRole role = UserRole.admin,
  Size size = const Size(390, 844),
}) async {
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  final router = GoRouter(initialLocation: SmsScreen.path, routes: smsRoutes.shell);
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(() => FixedSession(signedInAs(role, me: fakeMe(role: role.apiValue)))),
      ],
      retry: (_, _) => null,
      child: MaterialApp.router(debugShowCheckedModeBanner: false, theme: AppTheme.light(), routerConfig: router),
    ),
  );
  await settle(tester);
}

Future<void> _openTab(WidgetTester tester, String label) async {
  await tester.tap(find.widgetWithText(Tab, label));
  await settle(tester, frames: 20);
}

void main() {
  testWidgets('маршрут: /app/sms бүрхүүлд', (tester) async {
    expect(smsRoutes.shell.whereType<GoRoute>().map((r) => r.path), [SmsScreen.path]);
    expect(smsRoutes.public, isEmpty);
  });

  testWidgets('Багш, сурагчид хаалттай, хүсэлт явуулахгүй', (tester) async {
    for (final role in [UserRole.teacher, UserRole.student]) {
      final http = smsHttp();
      await _pump(tester, http, role: role);
      expect(find.text('Энэ хэсэг Админ, Багш+ хэрэглэгчид'), findsOneWidget);
      expect(http.requests, isEmpty);
    }
  });

  testWidgets('Багш+: илгээх таб байхгүй, загвар зөвхөн харна, дахин илгээх товчгүй', (tester) async {
    final http = smsHttp();
    await _pump(tester, http, role: UserRole.teacherPlus);
    expect(find.text('SMS илгээлт идэвхтэй'), findsOneWidget);
    expect(find.widgetWithText(Tab, 'Илгээх'), findsNothing);
    await _openTab(tester, 'Түүх');
    expect(find.text('Холбогдсонгүй'), findsOneWidget);
    expect(find.text('Дахин илгээх'), findsNothing);
    await _openTab(tester, 'Загвар');
    expect(find.text('Төлбөрөө төлнө үү'), findsOneWidget);
    expect(find.text('Загвар нэмэх'), findsNothing);
  });

  testWidgets('төлөв: алдаа → дахин оролдох', (tester) async {
    final h = FakeHttp()
      ..error('GET', '/sms/status', 500)
      ..json('GET', '/sms/status', smsStatusJson);
    await _pump(tester, h);
    expect(find.text('SMS илгээлт идэвхтэй'), findsNothing);
    await tester.tap(find.text('Дахин оролдох'));
    await settle(tester);
    expect(find.text('SMS илгээлт идэвхтэй'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);
  });

  testWidgets('загвар: хоосон төлөв', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/sms/status', smsStatusJson)
      ..json('GET', '/sms/templates', const <Object?>[]);
    await _pump(tester, http);
    await _openTab(tester, 'Загвар');
    expect(find.text('Загвар алга'), findsOneWidget);
    expect(find.text('Загвар нэмэх'), findsOneWidget);
  });

  testWidgets('Админ, нэг дугаар: баталгаажуулалт цуцлавал илгээхгүй, зөвшөөрвөл нэг л удаа', (tester) async {
    final http = smsHttp();
    await _pump(tester, http);
    await _openTab(tester, 'Илгээх');
    await tester.enterText(find.byKey(const ValueKey('sms-recipients')), '99000001');
    await tester.enterText(find.byKey(const ValueKey('sms-text')), 'Маргааш хичээл орно');
    await settle(tester);
    expect(find.text('UCS-2'), findsOneWidget);
    expect(find.text('Оруулсан дугаар 1'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const ValueKey('sms-send')));
    await tester.tap(find.byKey(const ValueKey('sms-send')));
    await settle(tester);
    expect(find.text('SMS илгээх үү'), findsOneWidget);
    expect(find.textContaining('99000001 дугаар руу 1 хэсэг'), findsOneWidget);
    await tester.tap(find.text('Болих'));
    await settle(tester);
    expect(http.count('POST', '/sms/send'), 0);

    await tester.tap(find.byKey(const ValueKey('sms-send')));
    await settle(tester);
    await tester.tap(find.widgetWithText(FilledButton, 'Илгээх'));
    await settle(tester);
    expect(http.count('POST', '/sms/send'), 1);
    expect(find.text('Мессеж илгээгдлээ, 1 хэсэг'), findsOneWidget);
  });

  testWidgets('Админ, бөөн: тооцоо авсны дараа л илгээнэ, цонхонд хүлээн авагч, өртөг', (tester) async {
    final http = smsHttp();
    // Өндөр дэлгэц — sliver жагсаалтын бүх мөр зурагдана.
    await _pump(tester, http, size: const Size(390, 1600));
    await _openTab(tester, 'Илгээх');
    await tester.enterText(find.byKey(const ValueKey('sms-recipients')), '99000001, 99000002, 99000001');
    await tester.enterText(find.byKey(const ValueKey('sms-text')), 'Мэдэгдэл');
    await settle(tester);
    final send = find.byKey(const ValueKey('sms-send'));
    await tester.ensureVisible(send);
    expect(tester.widget<ButtonStyleButton>(send).onPressed, isNull);

    await tester.ensureVisible(find.byKey(const ValueKey('sms-estimate')));
    await tester.tap(find.byKey(const ValueKey('sms-estimate')));
    await settle(tester);
    expect(http.count('POST', '/sms/bulk/estimate'), 1);
    expect(find.text('Ойролцоо өртөг'), findsOneWidget);
    expect(find.text('Нийт SMS хэсэг'), findsOneWidget);

    await tester.ensureVisible(send);
    await tester.tap(send);
    await settle(tester);
    expect(find.text('Бөөн SMS илгээх үү'), findsOneWidget);
    expect(find.textContaining('2 хүлээн авагч, 4 хэсэг'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Илгээх'));
    await settle(tester);
    expect(http.count('POST', '/sms/bulk'), 1);
    expect(http.count('POST', '/sms/bulk/b1/start'), 1);
    expect(find.text('2 дугаарын илгээлт эхэллээ'), findsOneWidget);
  });

  testWidgets('Админ, түүх: амжилттай дахин илгээсний дараа товч дахин гарахгүй', (tester) async {
    final http = smsHttp();
    await _pump(tester, http);
    await _openTab(tester, 'Түүх');
    expect(find.text('Дахин илгээх'), findsOneWidget);
    await tester.tap(find.text('Дахин илгээх'));
    await settle(tester);
    expect(find.text('Дахин илгээх үү'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Илгээх'));
    await settle(tester, frames: 20);
    expect(http.count('POST', '/sms/messages/m2/retry'), 1);
    expect(find.widgetWithText(OutlinedButton, 'Дахин илгээх'), findsNothing);
  });
}
