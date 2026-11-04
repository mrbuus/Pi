import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/schedule/domain/agenda_scroll.dart';
import 'package:piemath_app/features/schedule/ui/staff/staff_schedule_screen.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../../helpers/test_container.dart';
import '../student_harness.dart';
import 'staff_fixtures.dart';

final _day = UbDateTime(2026, 11, 4);

FakeHttp _http(List<Map<String, Object?>> entries) => FakeHttp()
  ..on('GET', '/schedule/day-plan', (r) {
    final date = r.queryParameters['date']! as String;
    return FakeResponse(dayPlanJson(date, entries: date == _day.dateKey ? entries : const []));
  })
  ..on('GET', '/schedule/week', (r) => FakeResponse({'start': r.queryParameters['start'], 'days': <Object?>[]}));

Future<void> _pump(WidgetTester tester, FakeHttp http, UbDateTime now) async {
  tester.view.physicalSize = const Size(390, 844) * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(() => FixedSession(signedInAs(UserRole.teacher))),
      ],
      retry: (_, _) => null,
      child: MaterialApp(
        theme: AppTheme.light(),
        home: StaffScheduleScreen(today: now),
      ),
    ),
  );
  await settle(tester, frames: 20);
}

/// Хичээлийн карт өдрийн хуваарийн харагдах хэсэгт бүтнээрээ багтсан эсэх.
void _expectOnScreen(WidgetTester tester, String scheduleId) {
  final viewport = tester.getRect(find.descendant(of: find.byType(DayAgenda), matching: find.byType(Scrollable)).first);
  final tile = tester.getRect(find.byKey(ValueKey('agenda:$scheduleId')));
  expect(tile.top, greaterThanOrEqualTo(viewport.top), reason: 'дээд хэсэг нь харагдана');
  expect(tile.top, lessThan(viewport.bottom - 48), reason: 'хичээлийн эхлэл дэлгэцэнд');
}

void main() {
  setUpAll(loadAppFonts);

  group('agendaTargetMinute', () {
    final lessons = [(start: 900, end: 1020), (start: 1080, end: 1200)];

    test('өөр өдөр, эсвэл өнөөдөр хичээл явахгүй бол эхний хичээл', () {
      expect(agendaTargetMinute(day: _day, now: UbDateTime(2026, 11, 3, 20), lessons: lessons), 880);
      expect(agendaTargetMinute(day: _day, now: UbDateTime(2026, 11, 4, 9), lessons: lessons), 880);
      // Хоёр хичээлийн завсар — эхний хичээл.
      expect(agendaTargetMinute(day: _day, now: UbDateTime(2026, 11, 4, 17, 30), lessons: lessons), 880);
    });

    test('хичээл явж байвал «одоо»', () {
      expect(agendaTargetMinute(day: _day, now: UbDateTime(2026, 11, 4, 18, 30), lessons: lessons), 18 * 60);
      expect(agendaTargetMinute(day: _day, now: UbDateTime(2026, 11, 4, 15), lessons: lessons), 870);
    });

    test('хичээлгүй өдөр', () {
      expect(agendaTargetMinute(day: _day, now: UbDateTime(2026, 11, 4, 11), lessons: const []), 630);
      expect(agendaTargetMinute(day: _day, now: UbDateTime(2026, 11, 2, 11), lessons: const []), 480);
    });

    test('зай: торны эхлэл 8:00, эрт хичээлд тэлнэ', () {
      expect(agendaScrollOffset(day: _day, now: UbDateTime(2026, 11, 3), lessons: lessons), (880 - 480) * 72 / 60);
      expect(agendaScrollOffset(day: _day, now: UbDateTime(2026, 11, 3), lessons: [(start: 420, end: 540)]), 0);
      expect(
        agendaScrollOffset(day: _day, now: UbDateTime(2026, 11, 3), lessons: [(start: 450, end: 540)]),
        (430 - 420) * 72 / 60,
      );
    });
  });

  testWidgets('өнөөдөр 09:00, хичээл 15:00-д: нээхэд 15:00-ийн хичээл харагдана', (tester) async {
    final http = _http([
      lessonJson(id: 's15', date: _day.dateKey, start: 900, end: 1020),
      lessonJson(id: 's17', date: _day.dateKey, classroomId: 'c2', start: 1020, end: 1140, room: '301'),
    ]);
    await _pump(tester, http, UbDateTime(2026, 11, 4, 9));
    expect(find.byType(DayAgenda), findsOneWidget);
    _expectOnScreen(tester, 's15');
  });

  testWidgets('хичээл явж байхад «одоо» руу (18:30, 17:00–19:00)', (tester) async {
    final http = _http([
      lessonJson(id: 's10', date: _day.dateKey, start: 600, end: 720),
      lessonJson(id: 's17', date: _day.dateKey, classroomId: 'c2', start: 1020, end: 1140, room: '301'),
    ]);
    // 12 цагаас хойш «маргааш» сонгогддог тул өнөөдрийг туузаас товшино.
    await _pump(tester, http, UbDateTime(2026, 11, 4, 18, 30));
    await tester.tap(find.descendant(of: find.byType(WeekStrip), matching: find.text('${_day.day}')).first);
    await settle(tester, frames: 20);
    _expectOnScreen(tester, 's17');
    expect(
      find.byKey(const ValueKey('agenda:s10')).hitTestable(),
      findsNothing,
      reason: 'өглөөний хичээл дээр нуугдана',
    );
  });
}
