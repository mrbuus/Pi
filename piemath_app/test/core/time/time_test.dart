import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/date_mn.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/core/time/weekday.dart';

void main() {
  group('гарагийн хөрвүүлэлт', () {
    test('JS → Монгол', () {
      expect([for (var js = 0; js < 7; js++) mnWeekdayFromJs(js)], [7, 1, 2, 3, 4, 5, 6]);
    });

    test('Монгол → JS', () {
      expect([for (var mn = 1; mn <= 7; mn++) jsWeekdayFromMn(mn)], [1, 2, 3, 4, 5, 6, 0]);
    });

    test('хоёр чиглэл буцаж ижил болно', () {
      for (var mn = 1; mn <= 7; mn++) {
        expect(mnWeekdayFromJs(jsWeekdayFromMn(mn)), mn);
      }
    });

    test('хүрээнээс гадуур бол алдаа', () {
      expect(() => mnWeekdayFromJs(7), throwsRangeError);
      expect(() => jsWeekdayFromMn(0), throwsRangeError);
    });

    test('нэрс', () {
      expect(weekdayNameMn(1), 'Даваа');
      expect(weekdayNameMn(7), 'Ням');
      expect(weekdayShortMn(4), 'Пү');
    });

    test('Dart DateTime.weekday нь Монгол дугаарлалттай ижил', () {
      // 2026-11-02 бол Даваа гараг.
      expect(DateTime.utc(2026, 11, 2).weekday, 1);
      expect(UbDateTime(2026, 11, 8).weekday, 7);
    });
  });

  group('UB цаг', () {
    test('UTC 16:30 = UB дараагийн өдрийн 00:30', () {
      final t = UbDateTime.fromInstant(DateTime.utc(2026, 11, 1, 16, 30));
      expect(t.dateKey, '2026-11-02');
      expect(t.hour, 0);
      expect(t.minute, 30);
      expect(t.weekday, 1);
    });

    test('утасны локал бүсээс үл хамаарна', () {
      final instant = DateTime.utc(2026, 3, 1, 23);
      expect(UbDateTime.fromInstant(instant.toLocal()), UbDateTime.fromInstant(instant));
    });

    test('toInstant буцаад агшин', () {
      final t = UbDateTime(2026, 11, 2, 15);
      expect(t.toInstant(), DateTime.utc(2026, 11, 2, 7));
    });

    test('ISO задлах: Z, офсет, бүсгүй', () {
      expect(parseApiInstant('2026-11-01T16:30:00.000Z'), DateTime.utc(2026, 11, 1, 16, 30));
      expect(parseApiInstant('2026-11-02T00:30:00+08:00'), DateTime.utc(2026, 11, 1, 16, 30));
      expect(parseApiInstant('2026-11-01T16:30:00'), DateTime.utc(2026, 11, 1, 16, 30));
      expect(parseApiInstant('буруу'), isNull);
      expect(parseApiInstant(null), isNull);
    });

    test('огнооны түлхүүр', () {
      expect(parseDateKey('2026-02-28')!.addDays(1).dateKey, '2026-03-01');
      expect(parseDateKey('2026-02-28T00:00:00.000Z')!.dateKey, '2026-02-28');
      expect(parseDateKey('28/02'), isNull);
    });

    test('өдрийн индекс ба ижил өдөр', () {
      final a = UbDateTime(2026, 11, 2, 0, 1);
      final b = UbDateTime(2026, 11, 2, 23, 59);
      expect(a.isSameDay(b), isTrue);
      expect(a.addDays(1).dayIndex - a.dayIndex, 1);
      expect(a.compareTo(b), lessThan(0));
    });
  });

  group('Монгол огнооны формат (вэбийн dateMn.ts-тэй ижил)', () {
    final t = UbDateTime(2026, 10, 7, 9, 5);

    test('тоон', () {
      expect(DateMn.numeric(t), '2026.10.07');
      expect(DateMn.numericWithTime(t), '2026.10.07 09:05');
      expect(DateMn.time(t), '09:05');
    });

    test('урт', () {
      expect(DateMn.long(t), '10-р сарын 7');
      expect(DateMn.long(t, withYear: true), '2026 оны 10-р сарын 7');
      expect(DateMn.month(t, withYear: true), '2026 оны 10-р сар');
      expect(DateMn.longWithWeekday(t), '10-р сарын 7, Лхагва');
      expect(DateMn.longWithWeekday(t, shortWeekday: true), '10-р сарын 7, Лх');
    });
  });

  group('харьцангуй цаг (relativeTimeMn.ts)', () {
    final now = DateTime.utc(2026, 11, 2, 6); // UB 14:00

    test('дөнгөж сая, минутын өмнө', () {
      expect(DateMn.relative(now.subtract(const Duration(seconds: 30)), now: now), 'дөнгөж сая');
      expect(DateMn.relative(now.subtract(const Duration(minutes: 5)), now: now), '5 минутын өмнө');
    });

    test('өнөөдөр, өчигдөр — UB өдрөөр', () {
      expect(DateMn.relative(DateTime.utc(2026, 11, 2, 1, 5), now: now), 'өнөөдөр 09:05');
      // UTC-ээр 11-01 боловч UB-аар 11-02 00:30 → өнөөдөр.
      expect(DateMn.relative(DateTime.utc(2026, 11, 1, 16, 30), now: now), 'өнөөдөр 00:30');
      expect(DateMn.relative(DateTime.utc(2026, 11, 1, 15, 59), now: now), 'өчигдөр 23:59');
    });

    test('энэ жил ба өмнөх жил', () {
      expect(DateMn.relative(DateTime.utc(2026, 10, 3, 6, 5), now: now), '10-р сарын 3, 14:05');
      expect(DateMn.relative(DateTime.utc(2025, 10, 3, 6, 5), now: now), '2025.10.03');
    });
  });
}
