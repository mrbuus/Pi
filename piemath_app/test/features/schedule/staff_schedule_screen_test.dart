import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/schedule/ui/staff/lesson_detail.dart';
import 'package:piemath_app/features/schedule/ui/staff/staff_schedule_screen.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../student_harness.dart';
import 'staff_fixtures.dart';

Map<String, Object?> bodyOf(RequestOptions r) => (r.data as Map).cast<String, Object?>();

String firstPlanDate(FakeHttp http) =>
    http.requests.firstWhere((r) => r.path == '/schedule/day-plan').queryParameters['date']! as String;

Future<void> openSchedule(WidgetTester tester, FakeHttp http, UserRole role, {Size size = const Size(390, 844)}) async {
  await pumpStudentRoute(tester, http: http, location: '/app/schedule', role: role, size: size);
  await settle(tester);
}

/// Өдрийн хуваарийн «12-1» хичээлийг нээнэ (agenda-ийн карт).
Future<void> openLesson(WidgetTester tester) async {
  await tester.ensureVisible(find.text('501 12-1'));
  await settle(tester);
  await tester.tap(find.text('501 12-1'));
  await settle(tester);
}

/// Дэлгэрэнгүйн жагсаалтыг [text] харагдтал гүйлгэнэ.
Future<void> scrollDetail(WidgetTester tester, String text) async {
  await tester.scrollUntilVisible(
    find.text(text),
    200,
    scrollable: find.descendant(of: find.byType(LessonDetail), matching: find.byType(Scrollable)).first,
  );
  await settle(tester);
}

void main() {
  setUpAll(loadAppFonts);

  group('эрх', () {
    testWidgets('Багш: бүгдийг харна, засах үйлдэл, «Шинэ цаг», хүснэгтийн товшилт алга', (tester) async {
      final http = staffHttp();
      await openSchedule(tester, http, UserRole.teacher);
      expect(find.byType(StaffScheduleScreen), findsOneWidget);
      expect(find.byType(WeekStrip), findsOneWidget);
      expect(find.byType(DayAgenda), findsOneWidget);
      // Багшид эрхийн дуудлага хийхгүй (вэбтэй адил).
      expect(http.count('GET', '/staff-capabilities/me'), 0);

      await openLesson(tester);
      expect(find.byType(LessonDetail), findsOneWidget);
      expect(find.text('Ахлах багш'), findsOneWidget);
      for (final t in ['Цуцлах', 'Зөөх', 'Танхим солих', 'Устгах']) {
        expect(find.text(t), findsNothing, reason: t);
      }
      expect(find.byTooltip('Сэдэв засах'), findsNothing);
      await tester.tap(find.text('Ахлах багш'));
      await settle(tester);
      expect(find.text('Өнөөдөр ажиллах'), findsNothing);
      expect(http.count('GET', '/schedule/teachers'), 0);
      Navigator.of(tester.element(find.byType(LessonDetail))).pop();
      await settle(tester);

      await tester.tap(find.text('Ерөнхий хуваарь'));
      await settle(tester);
      expect(find.text('Шинэ цаг нэмэх'), findsNothing);
      expect(find.text('12-1'), findsWidgets);

      await tester.tap(find.text('Багшийн ажлын өдөр'));
      await settle(tester);
      expect(find.byTooltip('Хүснэгтийн тохиргоо'), findsNothing);
      expect(find.text('Онцгой өдөр бүртгэх'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('roster:Сарнай:2')));
      await settle(tester);
      expect(http.count('PUT', '/schedule/teacher-workdays'), 0);
    });

    testWidgets('Багш+ эрхгүй анги: багш оноох, сэдэв бий, танхим/цуцлах алга', (tester) async {
      final http = staffHttp(
        canPlan: true,
        caps: {
          'administrator': false,
          'grants': [
            {'capability': 'schedule.manage', 'scopeKey': 'c2'},
          ],
        },
      );
      await openSchedule(tester, http, UserRole.teacherPlus);
      expect(http.count('GET', '/staff-capabilities/me'), 1);
      await openLesson(tester);
      expect(find.byTooltip('Сэдэв засах'), findsOneWidget);
      expect(find.text('Цуцлах'), findsNothing);
      expect(find.text('Танхим солих'), findsNothing);
    });

    testWidgets('Админ: бүх үйлдэл, «Шинэ цаг нэмэх»', (tester) async {
      final http = staffHttp(canPlan: true);
      await openSchedule(tester, http, UserRole.admin);
      expect(http.count('GET', '/staff-capabilities/me'), 0);
      await openLesson(tester);
      await scrollDetail(tester, 'Устгах');
      for (final t in ['Танхим солих', 'Зөөх', 'Цуцлах', 'Өөрчлөх', 'Устгах']) {
        expect(find.text(t), findsOneWidget, reason: t);
      }
      Navigator.of(tester.element(find.byType(LessonDetail))).pop();
      await settle(tester);
      await tester.tap(find.text('Ерөнхий хуваарь'));
      await settle(tester);
      expect(find.text('Шинэ цаг нэмэх'), findsOneWidget);
    });
  });

  testWidgets('туузыг шудрахад 7 хоног солигдож, тэр гарагийн хуваарь ачаална', (tester) async {
    final http = staffHttp();
    await openSchedule(tester, http, UserRole.teacher);
    final first = DateTime.parse(firstPlanDate(http));
    final strip = find.descendant(of: find.byType(WeekStrip), matching: find.byType(PageView));
    await tester.fling(strip, const Offset(-300, 0), 1500);
    await settle(tester, frames: 20);
    List<DateTime> planned() => [
      for (final r in http.requests)
        if (r.path == '/schedule/day-plan') DateTime.parse(r.queryParameters['date']! as String),
    ];
    expect(planned().last, first.add(const Duration(days: 7)));
    final weeks = http.requests.where((r) => r.path == '/schedule/week').map((r) => r.queryParameters['start']);
    expect(weeks.toSet(), hasLength(2));
    await tester.fling(strip, const Offset(300, 0), 1500);
    await settle(tester, frames: 20);
    // Буцаж ирэхэд кэшээс (дахин дуудахгүй).
    expect(planned().where((d) => d == first), hasLength(1));
    expect(find.text('501 12-1'), findsOneWidget);
  });

  testWidgets('тууз дээр өдөр товшиход тэр өдрийн хуваарь', (tester) async {
    final http = staffHttp();
    await openSchedule(tester, http, UserRole.teacher);
    final first = DateTime.parse(firstPlanDate(http));
    // Нөгөө өдөр (7 хоногийн доторх) — Даваа бол Мягмар, бусад үед Даваа.
    final other = first.weekday == DateTime.monday
        ? first.add(const Duration(days: 1))
        : first.subtract(Duration(days: first.weekday - 1));
    await tester.tap(find.descendant(of: find.byType(WeekStrip), matching: find.text('${other.day}')).first);
    await settle(tester);
    final last = http.requests.lastWhere((r) => r.path == '/schedule/day-plan').queryParameters['date'];
    expect(DateTime.parse(last! as String), other);
  });

  testWidgets('ачаалж байхад skeleton (shimmer-гүй)', (tester) async {
    final http = FakeHttp()
      ..on(
        'GET',
        '/schedule/day-plan',
        (r) => FakeResponse(dayPlanJson(r.queryParameters['date']! as String), delay: const Duration(seconds: 2)),
      )
      ..on('GET', '/schedule/week', (r) => FakeResponse({'start': r.queryParameters['start'], 'days': <Object?>[]}));
    await pumpStudentRoute(tester, http: http, location: '/app/schedule', role: UserRole.teacher);
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('staff-day-skeleton')), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
    await settle(tester);
  });

  testWidgets('шүүлтүүр: ангиар сонгоход нөгөө анги нуугдана', (tester) async {
    final http = staffHttp();
    await openSchedule(tester, http, UserRole.teacher);
    expect(find.text('301 11-2'), findsOneWidget);
    await tester.tap(find.text('Анги'));
    await settle(tester);
    await tester.tap(find.text('12-1').last);
    await settle(tester);
    expect(find.text('301 11-2'), findsNothing);
    expect(find.text('501 12-1'), findsOneWidget);
    await tester.tap(find.byTooltip('Шүүлтүүр арилгах').first);
    await settle(tester);
    expect(find.text('301 11-2'), findsOneWidget);
  });

  group('засах хуудас', () {
    testWidgets('Зөөх: маягт нээгдэж, MOVED илгээгээд хаагдана', (tester) async {
      final http = staffHttp(canPlan: true);
      await openSchedule(tester, http, UserRole.admin);
      final date = firstPlanDate(http);
      await openLesson(tester);
      // «Төлөвлөгөө засах», «Батлах» нэмэгдсэн тул үйлдлийн хэсэг доор.
      await scrollDetail(tester, 'Зөөх');
      await tester.tap(find.text('Зөөх'));
      await settle(tester);
      expect(find.text('Хичээл зөөх'), findsOneWidget);
      expect(find.text('Шинэ эхлэх цаг'), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Зөөх'));
      await settle(tester);
      final body = bodyOf(http.requests.lastWhere((r) => r.method == 'POST' && r.path == '/schedule/s1/exceptions'));
      expect(body['kind'], 'MOVED');
      expect(body['date'], date);
      expect(body['newStartMinute'], 600);
      expect(body['newEndMinute'], 720);
      expect(body.containsKey('newDate'), isFalse);
      expect(find.text('Хичээл зөөх'), findsNothing);
    });

    testWidgets('Танхим солих: ижил танхим сонговол маягт дотор алдаа, хаагдахгүй', (tester) async {
      final http = staffHttp(canPlan: true);
      await openSchedule(tester, http, UserRole.admin);
      await openLesson(tester);
      await scrollDetail(tester, 'Танхим солих');
      await tester.tap(find.text('Танхим солих'));
      await settle(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Танхим солих'));
      await settle(tester);
      expect(find.text('Одоогийн танхимтай ижил байна, өөр танхим сонгоно уу'), findsOneWidget);
      expect(http.count('POST', '/schedule/s1/exceptions'), 0);
    });

    testWidgets('Ахлах багш: сонгоход шууд харагдаж, оноолт илгээнэ', (tester) async {
      late final FakeHttp http;
      bool assigned() => http.count('PUT', '/schedule/s1/staffing') > 0;
      http = staffHttp(canPlan: true)
        // Хоёр дахь дуудлагаас (оноолтын дараах шинэчлэл) сервер шинэ ахлах багштай.
        ..on('GET', '/schedule/day-plan', (r) {
          final date = r.queryParameters['date']! as String;
          return FakeResponse(
            dayPlanJson(
              date,
              canPlan: true,
              entries: [
                lessonJson(
                  id: 's1',
                  date: date,
                  lead: assigned() ? {'id': 't2', 'name': 'Болд', 'role': 'TEACHER_PLUS'} : null,
                ),
              ],
            ),
          );
        });
      await openSchedule(tester, http, UserRole.teacherPlus);
      final date = firstPlanDate(http);
      await openLesson(tester);
      await tester.tap(find.text('Ахлах багш'));
      await settle(tester);
      expect(find.text('Өнөөдөр ажиллах'), findsOneWidget);
      await tester.tap(find.text('Болд+'));
      await settle(tester);
      expect(bodyOf(http.requests.lastWhere((r) => r.path == '/schedule/s1/staffing')), {
        'date': date,
        'leadTeacherId': 't2',
        'assistantTeacherId': null,
      });
      expect(find.text('Болд+'), findsWidgets);
    });

    testWidgets('Багшийн ажлын өдөр: нүд товшиход тухайн ээлжийн гарагуудыг илгээнэ', (tester) async {
      final http = staffHttp(canPlan: true);
      await openSchedule(tester, http, UserRole.teacherPlus);
      await tester.tap(find.text('Багшийн ажлын өдөр'));
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('roster:Сарнай:3')));
      await settle(tester);
      final body = bodyOf(http.requests.lastWhere((r) => r.method == 'PUT' && r.path == '/schedule/teacher-workdays'));
      expect(body['teacherId'], 't1');
      expect(body['parity'], 0);
      expect(body['weekdays'], [1, 3]);
    });
  });

  group('буцаах', () {
    testWidgets('Цуцлах → «Буцаах»: хичээл эргэж гарна, серверт илгээхгүй', (tester) async {
      final http = staffHttp(canPlan: true);
      await openSchedule(tester, http, UserRole.admin);
      await openLesson(tester);
      await scrollDetail(tester, 'Устгах');
      await tester.tap(find.text('Цуцлах'));
      await settle(tester);
      expect(find.text('Энэ өдрийн хичээлийг цуцлах уу'), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Цуцлах'));
      await settle(tester);
      expect(find.byType(LessonDetail), findsNothing);
      expect(find.text('501 12-1'), findsNothing);
      expect(find.text('Хичээл цуцлагдлаа'), findsOneWidget);
      await tester.tap(find.text('Буцаах'));
      await settle(tester);
      expect(find.text('501 12-1'), findsOneWidget);
      await tester.pump(const Duration(seconds: 6));
      await settle(tester);
      expect(http.count('POST', '/schedule/s1/exceptions'), 0);
    });

    testWidgets('Цуцлах: 5 секундын дараа CANCELLED илгээнэ', (tester) async {
      final http = staffHttp(canPlan: true);
      await openSchedule(tester, http, UserRole.admin);
      await openLesson(tester);
      await scrollDetail(tester, 'Устгах');
      await tester.tap(find.text('Цуцлах'));
      await settle(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Цуцлах'));
      await settle(tester);
      expect(http.count('POST', '/schedule/s1/exceptions'), 0);
      await tester.pump(const Duration(seconds: 6));
      await settle(tester);
      final body = bodyOf(http.requests.lastWhere((r) => r.path == '/schedule/s1/exceptions'));
      expect(body['kind'], 'CANCELLED');
    });

    testWidgets('Устгах → «Буцаах»: DELETE илгээхгүй', (tester) async {
      final http = staffHttp(canPlan: true);
      await openSchedule(tester, http, UserRole.admin);
      await openLesson(tester);
      await scrollDetail(tester, 'Устгах');
      await tester.tap(find.text('Устгах'));
      await settle(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Устгах'));
      await settle(tester);
      await tester.tap(find.text('Буцаах'));
      await tester.pump(const Duration(seconds: 6));
      await settle(tester);
      expect(http.count('DELETE', '/schedule/s1'), 0);
      expect(find.text('501 12-1'), findsOneWidget);
    });
  });

  testWidgets('таблет: зүүн хуваарь, баруун дэлгэрэнгүй', (tester) async {
    final http = staffHttp(canPlan: true);
    await openSchedule(tester, http, UserRole.admin, size: const Size(1024, 768));
    expect(find.text('Хичээл сонгоно уу'), findsOneWidget);
    await openLesson(tester);
    expect(find.byType(LessonDetail), findsOneWidget);
    expect(find.byType(BottomSheet), findsNothing);
    expect(find.text('Ахлах багш'), findsOneWidget);
  });

  testWidgets('товчнуудын хүрэх талбай 48dp-ээс багагүй', (tester) async {
    final http = staffHttp(canPlan: true);
    await openSchedule(tester, http, UserRole.teacherPlus);
    await tester.tap(find.text('Багшийн ажлын өдөр'));
    await settle(tester);
    final cell = tester.getSize(find.byKey(const ValueKey('roster:Сарнай:1')));
    expect(cell.height, greaterThanOrEqualTo(48));
    expect(cell.width, greaterThanOrEqualTo(44));
  });
}
