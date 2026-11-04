import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/time/weekday.dart';
import 'package:piemath_app/core/ui/ui.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../student_fixtures.dart';
import '../student_harness.dart';

FakeHttp scheduleHttp({bool enrolled = true}) => FakeHttp()
  ..json('GET', '/schedule/me', scheduleMeJson(enrolled: enrolled))
  ..json('GET', '/schedule/week', weekJson('2026-11-02'));

void main() {
  setUpAll(loadAppFonts);

  testWidgets('сурагч: 7 хоногийн тор, Даваа зүүн талд, Ням баруун талд', (tester) async {
    await pumpStudentRoute(tester, http: scheduleHttp(), location: '/app/schedule');
    await settle(tester);
    expect(find.text('7 хоногийн хуваарь'), findsOneWidget);
    final mon = tester.getCenter(find.text(weekdayShortMn(1)).first).dx;
    final wed = tester.getCenter(find.text(weekdayShortMn(3)).first).dx;
    final sun = tester.getCenter(find.text(weekdayShortMn(7)).first).dx;
    expect(mon, lessThan(wed));
    expect(wed, lessThan(sun));
    // Даваа 15:00 (JS 1), Ням 10:00 (JS 0).
    expect(find.text('15:00'), findsWidgets);
    expect(find.text('10:00'), findsWidgets);
  });

  testWidgets('7 хоногийн хичээл: амралт, зөөгдсөн хичээл, хичээлгүй өдөр', (tester) async {
    await pumpStudentRoute(tester, http: scheduleHttp(), location: '/app/schedule');
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Энэ 7 хоног'), 300);
    expect(find.text('Логарифм'), findsOneWidget);
    await tester.scrollUntilVisible(find.textContaining('Зөөгдсөн хичээл'), 300);
    expect(find.textContaining('Зөөгдсөн хичээл (анх'), findsOneWidget);
    await tester.scrollUntilVisible(find.textContaining('Үндэсний баяр'), -300);
    expect(find.textContaining('хичээл явагдахгүй'), findsWidgets);
    expect(find.text('Хичээлгүй'), findsWidgets);
  });

  testWidgets('өмнөх/дараагийн 7 хоног: Даваа гарагаар хүсэлт илгээнэ', (tester) async {
    final http = scheduleHttp();
    await pumpStudentRoute(tester, http: http, location: '/app/schedule');
    await settle(tester);
    final first = http.requests.firstWhere((r) => r.path == '/schedule/week').queryParameters['start']! as String;
    await tester.scrollUntilVisible(find.byTooltip('Өмнөх 7 хоног'), 300);
    await tester.tap(find.byTooltip('Өмнөх 7 хоног'));
    await settle(tester);
    final weeks = http.requests
        .where((r) => r.path == '/schedule/week')
        .map((r) => r.queryParameters['start']! as String)
        .toList();
    expect(weeks.length, 2);
    final a = DateTime.parse(first), b = DateTime.parse(weeks.last);
    expect(a.difference(b).inDays, 7);
    expect(a.weekday, DateTime.monday);
  });

  testWidgets('ангид элсээгүй: тайлбартай хоосон төлөв', (tester) async {
    await pumpStudentRoute(tester, http: scheduleHttp(enrolled: false), location: '/app/schedule');
    await settle(tester);
    expect(find.text('Идэвхтэй анги алга'), findsOneWidget);
  });

  testWidgets('тогтмол хуваарийн алдаа: дахин оролдоно', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/schedule/week', weekJson('2026-11-02'))
      ..on('GET', '/schedule/me', (_) => const FakeResponse(<String, Object?>{'message': 'Алдаа'}, status: 500))
      ..on('GET', '/schedule/me', (_) => FakeResponse(scheduleMeJson()));
    await pumpStudentRoute(tester, http: http, location: '/app/schedule');
    await settle(tester);
    expect(find.text(AppStrings.retry), findsWidgets);
    await tester.tap(find.text(AppStrings.retry).first);
    await settle(tester);
    expect(find.text('15:00'), findsWidgets);
  });

  testWidgets('эцэг эх: тогтмол хуваарьгүй, зөвхөн 7 хоног (/schedule/me дуудахгүй)', (tester) async {
    final http = scheduleHttp();
    await pumpStudentRoute(tester, http: http, location: '/app/schedule', role: UserRole.parent);
    await settle(tester);
    expect(find.text('7 хоногийн хуваарь'), findsNothing);
    expect(find.text('Энэ 7 хоног'), findsOneWidget);
    expect(http.count('GET', '/schedule/me'), 0);
  });

  testWidgets('ажилтан: вэбийн холбоосгүй, натив хуваарь', (tester) async {
    await pumpStudentRoute(tester, http: scheduleHttp(), location: '/app/schedule', role: UserRole.teacher);
    await settle(tester);
    expect(find.text('Вэбээр нээх'), findsNothing);
    expect(find.text('Өдрийн хуваарь'), findsOneWidget);
  });

  testWidgets('хурууны хүрэх талбай ≥ 44dp (7 хоногийн сум)', (tester) async {
    await pumpStudentRoute(tester, http: scheduleHttp(), location: '/app/schedule');
    await settle(tester);
    await tester.scrollUntilVisible(find.byTooltip('Дараагийн 7 хоног'), 300);
    final size = tester.getSize(find.byTooltip('Дараагийн 7 хоног'));
    expect(size.width, greaterThanOrEqualTo(44));
    expect(size.height, greaterThanOrEqualTo(44));
    expect(find.byType(Scaffold), findsWidgets);
  });
}
