import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/my_class/data/hub_models.dart';
import 'package:piemath_app/features/my_class/data/my_class_repository.dart';
import 'package:piemath_app/features/my_class/domain/hub_logic.dart';
import 'package:piemath_app/shared/marks/marks.dart';

import '../student_fixtures.dart';

void main() {
  group('огноо, цаг', () {
    test('dayKeyOf: ISO ба энгийн', () {
      expect(dayKeyOf('2026-10-23T00:00:00.000Z'), '2026-10-23');
      expect(dayKeyOf('2026-10-23'), '2026-10-23');
    });

    test('hm, timeRange', () {
      expect(hm(600), '10:00');
      expect(hm(905), '15:05');
      expect(timeRange(900, 1020), '15:00–17:00');
      expect(timeRange(900, null), '15:00');
      expect(timeRange(null, 1020), isNull);
    });

    test('монгол гарчиг', () {
      expect(dayTitle('2026-10-23'), '10-р сарын 23, Баасан');
      expect(dayShort('2026-10-23T00:00:00.000Z'), '10-р сарын 23');
      expect(weekdayShortOf('2026-11-02'), 'Да');
      expect(monthTitle('2026-10'), '2026 оны 10-р сар');
      expect(dayNumberOf('2026-11-09'), 9);
    });

    test('өнөөдөр, одоогийн сар — УБ цагаар', () {
      // UTC 16:30 = УБ дараагийн өдөр.
      final now = UbDateTime.fromInstant(DateTime.utc(2026, 10, 31, 16, 30));
      expect(todayKey(now), '2026-11-01');
      expect(currentMonthKey(now), '2026-11');
    });
  });

  group('cleanTitle (вэбийн lib/studentTitle.ts)', () {
    test('номын дотоод нэр, V-код хасна, дунд цэгийг зураас болгоно', () {
      expect(cleanTitle('100x100 V3 · Логарифм 3'), 'Логарифм 3');
      expect(cleanTitle('200 × 200 · Интеграл'), 'Интеграл');
      expect(cleanTitle('Интеграл · Тест 1'), 'Интеграл — Тест 1');
    });

    test('хувилбарын үсгийг төгсгөлөөс хасна', () {
      expect(cleanTitle('Илтгэгч 2-B', variant: 'B'), 'Илтгэгч 2');
      expect(cleanTitle('Илтгэгч (A)', variant: 'A'), 'Илтгэгч');
      expect(cleanTitle('Илтгэгч B хувилбар', variant: 'B'), 'Илтгэгч');
    });

    test('хоосон үлдвэл fallback', () {
      expect(cleanTitle('100x100 V2'), 'Даалгавар');
      expect(cleanTitle('V3', fallback: 'Тест'), 'Тест');
    });
  });

  group('жагсаалтын логик', () {
    test('recentDays: энэ сар + өмнөх сараас 5 хүртэл', () {
      final cur = HubDays.fromJson(daysJson());
      final prev = HubDays.fromJson(daysJson(month: '2026-10', prev: '2026-09', days: [
        for (var d = 30; d > 20; d--) dayJson(date: '2026-10-$d'),
      ]));
      final r = recentDays(cur, prev);
      expect(r.length, 5);
      expect(r.first.date, '2026-11-02');
      expect(r.last.date, '2026-10-28');
      expect(recentDays(cur, null).length, 2);
      expect(recentDays(null, null), isEmpty);
    });

    test('groupTestsByMonth: дарааллаа хадгална', () {
      final rows = [
        for (final j in [testsJson()[1], testsJson()[0], testsJson()[2]]) HubTestRow.fromJson(j),
      ];
      final g = groupTestsByMonth(rows);
      expect(g.map((e) => e.$1), ['2026-11', '2026-10', '2026-09']);
      expect(g.first.$2.single.testId, 't2');
    });

    test('attendanceByMonth: шинэ сар эхэнд, өдөрт нэг', () {
      final rows = [
        for (final j in [...attendanceJson(), attendanceJson().first]) AttendanceRow.fromJson(j),
      ];
      final m = attendanceByMonth(rows);
      expect(m.map((e) => e.$1), ['2026-11', '2026-10', '2026-09']);
      expect(m.first.$2.length, 1);
      expect(m[1].$2.keys, containsAll(['2026-10-30', '2026-10-28']));
    });

    test('monthCells: Даваагаас эхэлсэн тор', () {
      // 2026-11-01 бол Ням → өмнө нь 6 хоосон нүд.
      final nov = monthCells('2026-11');
      expect(nov.take(6), everyElement(isNull));
      expect(nov[6], '2026-11-01');
      expect(nov.whereType<String>().length, 30);
      // 2026-06-01 бол Даваа → хоосон нүдгүй.
      expect(monthCells('2026-06').first, '2026-06-01');
      expect(monthCells('2028-02').whereType<String>().length, 29);
    });
  });

  test('correctChoice: үсэгтэй таарвал сонголт, нөхөх хариу бол null', () {
    final d = HubTestDetail.fromJson(testDetailJson());
    final withChoices = d.problems.firstWhere((p) => p.id == 'p1');
    final fill = d.problems.firstWhere((p) => p.id == 'p2');
    expect(correctChoice(withChoices)?.label, 'B');
    expect(correctChoice(fill), isNull);
  });

  test('makeupTestLabel: гарчигт хувилбар давтахгүй', () {
    expect(makeupTestLabel('Илтгэгч 2-A', 'A'), (title: 'Илтгэгч 2', variant: 'A'));
    expect(makeupTestLabel('Илтгэгч', null), (title: 'Илтгэгч', variant: null));
  });

  group('төлбөрийн хугацаа', () {
    final today = UbDateTime(2026, 11, 2, 10);

    test('хоног тоолох — ISO-ийн огнооны утгаар', () {
      expect(paidUntilDaysLeft('2026-11-12T00:00:00.000Z', today), 10);
      expect(paidUntilDaysLeft('2026-11-02T00:00:00.000Z', today), 0);
      expect(paidUntilDaysLeft('2026-10-30T00:00:00.000Z', today), -3);
      expect(paidUntilDaysLeft(null, today), isNull);
    });

    test('төлөв', () {
      expect(paidUntilState(null), PaidUntilState.unknown);
      expect(paidUntilState(-1), PaidUntilState.expired);
      expect(paidUntilState(0), PaidUntilState.endingSoon);
      expect(paidUntilState(6), PaidUntilState.endingSoon);
      expect(paidUntilState(7), PaidUntilState.ok);
      expect(paidUntilLabel('2026-12-01T00:00:00.000Z'), '2026.12.01');
    });
  });

  group('тестийн 403 шалтгаан', () {
    test('code-оор', () {
      expect(lockReasonOf({'code': 'NOT_OPEN_YET'}, ''), TestLockReason.tomorrow);
      expect(lockReasonOf({'code': 'NOT_CLASS_TEST'}, ''), TestLockReason.notDone);
    });

    test('code байхгүй бол мессежээр', () {
      expect(lockReasonOf({'message': 'Энэ тест маргааш нээгдэнэ.'}, 'x'), TestLockReason.tomorrow);
      expect(lockReasonOf(null, 'Энэ тестийг танай анги хийгээгүй байна.'), TestLockReason.notDone);
    });
  });

  test('ирцийн нийт тоо төлөвөөр', () {
    final o = HubOverview.fromJson(overviewJson());
    expect([for (final s in attendanceOrder) o.attendance.count(s)], [15, 2, 2, 1]);
    expect([for (final s in homeworkOrder) o.homework.count(s)], [6, 2, 2]);
  });
}
