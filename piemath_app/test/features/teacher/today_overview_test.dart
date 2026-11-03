// Ангиуд → «Өнөөдөр» тойм: `/attendance/day-summary`, вэбийн TodayOverview-тэй ижил.
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/teacher/data/day_summary.dart';
import 'package:piemath_app/features/teacher/ui/classes_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

Map<String, Object?> _cls(
  String id,
  String name, {
  int start = 900,
  int students = 20,
  int present = 15,
  int late = 1,
  int absent = 2,
  int excused = 1,
  int unmarked = 1,
  Map<String, Object?>? homework = const {'done': 12, 'partial': 2, 'notDone': 3, 'unmarked': 3},
  bool confirmed = false,
}) => {
  'id': id,
  'name': name,
  'startMinute': start,
  'room': '501',
  'students': students,
  'attendance': {'present': present, 'late': late, 'absent': absent, 'excused': excused, 'unmarked': unmarked},
  'homework': homework,
  'confirmed': confirmed,
};

void main() {
  test('DaySummary: эхлэх цагаар эрэмбэлж, нийлбэрийг тооцно', () {
    final d = DaySummary.fromJson({
      'date': testDate,
      'classes': [_cls('b', '11А (Зүүн 4)', start: 1020), _cls('a', '12Б', homework: null)],
    });
    expect(d.classes.first.id, 'a');
    expect(d.classes.last.shortName, '11А');
    expect(d.studentTotal, 40);
    expect(d.cameTotal, 32);
    expect(d.homeworkBase, 20);
    expect(d.homeworkDone, 12);
  });

  group('Өнөөдөр таб', () {
    testWidgets('нүүр «Бүх анги»; «Өнөөдөр» дарвал өдрийн тойм, ирц, даалгавар, дарвал самбар', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/class-dashboard', dashList([dashClass('c1', '12Б')]))
        ..json('GET', '/attendance/day-summary', {
          'date': testDate,
          'classes': [
            _cls('c2', '11А (Зүүн 4)', start: 1020, confirmed: true),
            _cls('c1', '12Б (Баруун 2)', start: 900),
            _cls('c3', 'Онлайн 9', start: 1100, homework: null),
          ],
        });
      await pumpTeacher(tester, const ClassesScreen(), http: http);
      expect(http.count('GET', '/attendance/day-summary'), 0);
      await tester.tap(find.text('Өнөөдөр'));
      await settle(tester);
      expect(http.requests.last.queryParameters['date'], testDate);
      expect(find.text('3 анги'), findsOneWidget);
      expect(find.text('ирсэн 48/60'), findsOneWidget);
      expect(find.text('даалгавар 24/40'), findsOneWidget);
      // 15:00 өнгөрсөн (өнөөдөр 16:00) ба тэмдэглээгүй байгаа
      expect(find.text('1 тэмдэглээгүй'), findsWidgets);
      expect(find.text('Батлагдсан'), findsOneWidget);
      expect(find.text('Онлайн анги'), findsOneWidget);
      expect(find.text('3 ирээгүй'), findsWidgets);
      expect(find.text('5 дутуу, хийгээгүй'), findsWidgets);
      expect(find.textContaining('₮'), findsNothing);
      // эхлэх цагаар: 12Б (15:00) 11А (17:00)-ээс дээр
      expect(tester.getTopLeft(find.text('12Б')).dy < tester.getTopLeft(find.text('11А')).dy, isTrue);
      await tester.tap(find.text('12Б'));
      await settle(tester);
      expect(find.text('ROUTE:/app/teacher/board/c1?date=$testDate'), findsOneWidget);
    });

    testWidgets('хичээлгүй өдөр; дараагийн өдөр рүү шилжиж дахин татна', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/class-dashboard', dashList([dashClass('c1', '12Б')]))
        ..json('GET', '/attendance/day-summary', {'date': testDate, 'classes': <Object?>[]});
      await pumpTeacher(tester, const ClassesScreen(), http: http);
      await tester.tap(find.text('Өнөөдөр'));
      await settle(tester);
      expect(find.text('Энэ өдөр хичээлтэй анги алга'), findsOneWidget);
      await tester.tap(find.byTooltip('Дараагийн өдөр'));
      await settle(tester);
      expect(http.requests.last.queryParameters['date'], '2026-11-03');
    });

    testWidgets('алдаа → тайван мессеж, дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/class-dashboard', dashList([dashClass('c1', '12Б')]))
        ..error('GET', '/attendance/day-summary', 403, 'Энэ хэсэгт таны эрх хүрэхгүй');
      await pumpTeacher(tester, const ClassesScreen(), http: http);
      await tester.tap(find.text('Өнөөдөр'));
      await settle(tester, frames: 20);
      expect(find.text('Энэ хэсэгт таны эрх хүрэхгүй'), findsOneWidget);
      expect(find.text(AppStrings.retry), findsOneWidget);
    });
  });
}
