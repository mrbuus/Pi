import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/enrollment/application/enrollment_providers.dart';
import 'package:piemath_app/features/enrollment/enrollment_routes.dart';
import 'package:piemath_app/features/enrollment/ui/enrollment_screen.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import '../student_harness.dart' show FixedSession, signedInAs, settle;
import 'enrollment_fixtures.dart';

Future<void> _pump(
  WidgetTester tester,
  FakeHttp http, {
  UserRole role = UserRole.admin,
  Size size = const Size(390, 2600),
}) async {
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  final router = GoRouter(initialLocation: EnrollmentScreen.path, routes: enrollmentRoutes.shell);
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(() => FixedSession(signedInAs(role, me: fakeMe(role: role.apiValue)))),
        enrollmentNowProvider.overrideWithValue(() => enrollmentNow),
      ],
      retry: (_, _) => null,
      child: MaterialApp.router(debugShowCheckedModeBanner: false, theme: AppTheme.light(), routerConfig: router),
    ),
  );
  await settle(tester);
}

Future<void> _openTab(WidgetTester tester, String label) async {
  // Гүйлгэдэг TabBar — гуравдахь таб нарийн дэлгэцэд баруун тийш гарсан байж болно.
  await tester.ensureVisible(find.widgetWithText(Tab, label));
  await settle(tester);
  await tester.tap(find.widgetWithText(Tab, label));
  await settle(tester, frames: 20);
}

Finder _inCard(String subject, Finder f) =>
    find.descendant(of: find.byKey(ValueKey('subject:$subject')), matching: f);

void main() {
  testWidgets('маршрут: /app/admin/enrollment бүрхүүлд', (tester) async {
    expect(enrollmentRoutes.shell.whereType<GoRoute>().map((r) => r.path), ['/app/admin/enrollment']);
    expect(enrollmentRoutes.public, isEmpty);
  });

  testWidgets('Багш, сурагчид хаалттай, хүсэлт явуулахгүй', (tester) async {
    for (final role in [UserRole.teacher, UserRole.student]) {
      final http = enrollmentHttp();
      await _pump(tester, http, role: role);
      expect(find.text('Энэ хэсэг Админ, Багш+ хэрэглэгчид'), findsOneWidget);
      expect(http.requests.where((r) => !r.path.startsWith('/staff-capabilities')), isEmpty);
    }
  });

  testWidgets('цонх: хичээлийн дараалал, ангигүй сурагч, хүлээсэн өдөр', (tester) async {
    await _pump(tester, enrollmentHttp());
    expect(find.text('Элсэлтийн удирдлага'), findsOneWidget);
    final math = tester.getTopLeft(find.byKey(const ValueKey('subject:MATH'))).dy;
    final social = tester.getTopLeft(find.byKey(const ValueKey('subject:SOCIAL_STUDIES'))).dy;
    expect(math, lessThan(social));
    expect(find.textContaining('3 өдөр хүлээж байна'), findsOneWidget);
  });

  testWidgets('цонх: «Дууссан» руу хадгалахад баталгаажуулна, цуцлавал илгээхгүй', (tester) async {
    final http = enrollmentHttp();
    await _pump(tester, http);
    await tester.tap(_inCard('MATH', find.widgetWithText(ChoiceChip, 'Дууссан')));
    await settle(tester);
    expect(_inCard('MATH', find.text('Хадгалаагүй өөрчлөлт бий')), findsOneWidget);
    expect(_inCard('MATH', find.text('Одоогоор шинэ элсэлт авахгүй байна')), findsOneWidget);

    await tester.tap(_inCard('MATH', find.widgetWithText(FilledButton, 'Хадгалах')));
    await settle(tester);
    expect(find.text('«Математик»-ийг хаах уу'), findsOneWidget);
    await tester.tap(find.text('Болих'));
    await settle(tester);
    expect(http.count('PATCH', '/enrollment-windows/MATH'), 0);

    await tester.tap(_inCard('MATH', find.widgetWithText(FilledButton, 'Хадгалах')));
    await settle(tester);
    await tester.tap(find.text('Тийм, хаах'));
    await settle(tester);
    expect(http.count('PATCH', '/enrollment-windows/MATH'), 1);
    expect(requestJson(http, 'PATCH', '/enrollment-windows/MATH'), {'status': 'CLOSED'});
    expect(_inCard('MATH', find.text('Хадгалаагүй өөрчлөлт бий')), findsNothing);
  });

  testWidgets('цонх: ачаалах алдаа → дахин оролдох', (tester) async {
    final h = FakeHttp()
      ..error('GET', '/enrollment-windows', 500)
      ..json('GET', '/enrollment-windows', windowsJson)
      ..json('GET', '/classrooms/unassigned-students', const <Object?>[]);
    await _pump(tester, h);
    expect(find.byKey(const ValueKey('subject:MATH')), findsNothing);
    await tester.tap(find.text('Дахин оролдох'));
    await settle(tester);
    expect(find.byKey(const ValueKey('subject:MATH')), findsOneWidget);
    expect(find.text('Ангид ороогүй сурагч алга'), findsOneWidget);
  });

  testWidgets('зөвшөөрөл: баталгаажуулаад зөвшөөрнө, жагсаалтаас хасагдана', (tester) async {
    final http = enrollmentHttp();
    await _pump(tester, http);
    await _openTab(tester, 'Зөвшөөрөл хүлээгч');
    expect(find.text('Дорж Сараа'), findsOneWidget);
    expect(find.text('Төлбөр баталгаажсан'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Зөвшөөрөх'));
    await settle(tester);
    expect(find.text('Дорж Сараа-г зөвшөөрөх үү'), findsOneWidget);
    await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Зөвшөөрөх')));
    await settle(tester);
    expect(http.count('POST', '/users/students/p1/approve'), 1);
    // Админ эрх олгож болно — «Дараа» гэвэл эрх олгохгүй.
    expect(find.text('Эрх олгох уу'), findsOneWidget);
    await tester.tap(find.text('Дараа'));
    await settle(tester);
    expect(http.count('POST', '/passes/pass1/grant'), 0);
    expect(find.text('Зөвшөөрөл хүлээгч сурагч алга'), findsOneWidget);
  });

  testWidgets('зөвшөөрөл: хоосон төлөв', (tester) async {
    final h = FakeHttp()
      ..json('GET', '/enrollment-windows', windowsJson)
      ..json('GET', '/classrooms/unassigned-students', const <Object?>[])
      ..json('GET', '/users/students/pending-approval', const <Object?>[]);
    await _pump(tester, h);
    await _openTab(tester, 'Зөвшөөрөл хүлээгч');
    expect(find.text('Зөвшөөрөл хүлээгч сурагч алга'), findsOneWidget);
  });

  testWidgets('гадны багш: баталгаажуулах тэмдэглэлтэй, Багш+ цуцлах товч харахгүй', (tester) async {
    final http = enrollmentHttp();
    await _pump(tester, http, role: UserRole.teacherPlus);
    await _openTab(tester, 'Гадны багш');
    expect(find.text('Ганаа Болд'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Баталгаажуулах'));
    await settle(tester);
    await tester.enterText(find.widgetWithText(TextField, 'Тэмдэглэл'), 'Диплом шалгасан');
    await tester.tap(find.widgetWithText(FilledButton, 'Баталгаажуулах').last);
    await settle(tester);
    expect(requestJson(http, 'PUT', '/teacher-groups/verify/x1'), {'note': 'Диплом шалгасан'});

    await tester.tap(find.byKey(const ValueKey('ext:verified')));
    await settle(tester);
    expect(find.text('Бат Оюун'), findsOneWidget);
    expect(find.text('Баталгаажуулалт цуцлах'), findsNothing);
  });

  testWidgets('гадны багш: Админ цуцлахын тулд ЦУЦЛАХ гэж бичнэ', (tester) async {
    final http = enrollmentHttp();
    await _pump(tester, http);
    await _openTab(tester, 'Гадны багш');
    await tester.tap(find.byKey(const ValueKey('ext:verified')));
    await settle(tester);
    await tester.tap(find.text('Баталгаажуулалт цуцлах'));
    await settle(tester);
    await tester.enterText(find.byType(TextField).last, 'тийм');
    await tester.tap(find.widgetWithText(FilledButton, 'Баталгаажуулалтыг цуцлах'));
    await settle(tester);
    expect(http.count('PUT', '/teacher-groups/unverify/x3'), 0);
    await tester.enterText(find.byType(TextField).last, 'ЦУЦЛАХ');
    await tester.tap(find.widgetWithText(FilledButton, 'Баталгаажуулалтыг цуцлах'));
    await settle(tester);
    expect(http.count('PUT', '/teacher-groups/unverify/x3'), 1);
  });

  testWidgets('гадны багш: татгалзсаныг дахин шалгах руу буцаана', (tester) async {
    final http = enrollmentHttp();
    await _pump(tester, http);
    await _openTab(tester, 'Гадны багш');
    await tester.tap(find.byKey(const ValueKey('ext:rejected')));
    await settle(tester);
    expect(find.text('Шалтгаан: Мэдээлэл дутуу'), findsOneWidget);
    await tester.tap(find.text('Хүлээгдэж буй руу буцаах'));
    await settle(tester);
    await tester.tap(find.text('Дахин шалгах'));
    await settle(tester);
    expect(http.count('PUT', '/teacher-groups/reconsider/x2'), 1);
  });
}
