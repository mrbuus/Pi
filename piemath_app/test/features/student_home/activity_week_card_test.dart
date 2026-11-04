import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/learning/data/activity_models.dart';
import 'package:piemath_app/features/student_home/ui/activity_week_card.dart';

import '../../helpers/fake_http.dart';
import '../student_harness.dart';
import 'student_home_screen_test.dart' show homeHttp;

ActivityYear _year(Map<String, int> counts) => ActivityYear.fromJson({
  'year': 2026,
  'totalActiveDays': counts.length,
  'days': [
    for (final e in counts.entries)
      {'date': e.key, 'count': e.value, 'level': 1, 'isHoliday': false, 'isClassDay': true},
  ],
});

FakeHttp _http({int current = 4, bool fail = false}) {
  final now = UbDateTime.now();
  final http = homeHttp();
  if (fail) {
    http
      ..error('GET', '/activity/me', 500)
      ..error('GET', '/activity/streak', 500);
  } else {
    http
      ..json('GET', '/activity/me', {
        'year': now.year,
        'totalActiveDays': 1,
        'days': [
          {'date': now.dateKey, 'count': 3, 'level': 2, 'isHoliday': false, 'isClassDay': true},
        ],
      })
      ..json('GET', '/activity/streak', {'currentStreak': current, 'longestStreak': 9, 'totalActiveDays': 31});
  }
  return http;
}

void main() {
  test('weekDots: Даваагаас Ням, ирээдүйн өдөр тэмдэглэгдэнэ (Лхагва = 2026-11-04)', () {
    final dots = weekDots(UbDateTime(2026, 11, 4, 10), _year({'2026-11-02': 2, '2026-11-04': 1}));
    expect(dots.map((d) => d.date.dateKey).toList().first, '2026-11-02');
    expect(dots.last.date.dateKey, '2026-11-08');
    expect(dots.map((d) => d.done).toList(), [true, false, true, false, false, false, false]);
    expect(dots.map((d) => d.isToday).toList(), [false, false, true, false, false, false, false]);
    expect(dots.map((d) => d.isFuture).toList(), [false, false, false, true, true, true, true]);
  });

  test('weekDots: Ням өдөр өмнөх Даваагаас эхэлнэ; өгөгдөлгүй бол бүгд хоосон', () {
    final dots = weekDots(UbDateTime(2026, 11, 8, 23, 30), null);
    expect(dots.first.date.dateKey, '2026-11-02');
    expect(dots.where((d) => d.done), isEmpty);
    expect(dots.last.isToday, isTrue);
  });

  testWidgets('нүүр: идэвхийн карт, сервер тоо; товшвол /app/activity', (tester) async {
    final router = await pumpStudentRoute(tester, http: _http(), location: '/app/student');
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Дараалсан өдөр'), 300);
    expect(find.text('Идэвх'), findsOneWidget);
    expect(find.text('4'), findsWidgets);
    expect(find.text('Хамгийн урт'), findsOneWidget);
    expect(find.text('31'), findsOneWidget);
    await tester.tap(find.text('Идэвх'));
    await settle(tester);
    expect(router.state.uri.toString(), '/app/activity');
  });

  testWidgets('дараалал 0: дарамт, буруутгал, «тасарсан» гэсэн үг огт байхгүй', (tester) async {
    await pumpStudentRoute(tester, http: _http(current: 0), location: '/app/student');
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Дараалсан өдөр'), 300);
    for (final bad in ['тасар', 'алдсан', 'хүлээж', 'бодоорой', 'ичиг']) {
      expect(find.textContaining(bad), findsNothing, reason: bad);
    }
  });

  testWidgets('идэвхийн өгөгдөл ачаалагдахгүй бол карт нууцлагдана (нүүр эвдрэхгүй)', (tester) async {
    await pumpStudentRoute(tester, http: _http(fail: true), location: '/app/student');
    await settle(tester);
    expect(find.text('Идэвх'), findsNothing);
    expect(find.text('Миний самбар'), findsOneWidget);
  });
}
