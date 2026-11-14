import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/pump.dart';

AgendaEvent _ev(String id, int h1, int m1, int h2, int m2, {UbDateTime? day}) {
  final d = day ?? UbDateTime(2026, 11, 4);
  return AgendaEvent(
    id: id,
    start: UbDateTime(d.year, d.month, d.day, h1, m1),
    end: UbDateTime(d.year, d.month, d.day, h2, m2),
    title: 'Хичээл $id',
    subtitle: '501',
  );
}

/// Сонгосон өдрийг төлөвт хадгалдаг тууз.
class _Strip extends StatefulWidget {
  const _Strip({required this.log, required this.weeks});

  final List<UbDateTime> log;
  final List<UbDateTime> weeks;

  @override
  State<_Strip> createState() => _StripState();
}

class _StripState extends State<_Strip> {
  UbDateTime day = UbDateTime(2026, 11, 4); // Лхагва

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        WeekStrip(
          selected: day,
          today: UbDateTime(2026, 11, 4),
          counts: const {'2026-11-02': 2, '2026-11-05': 6},
          onSelected: (d) {
            widget.log.add(d);
            setState(() => day = d);
          },
          onWeekChanged: widget.weeks.add,
        ),
        Text('Сонгосон ${day.dateKey}'),
      ],
    );
  }
}

void main() {
  group('WeekStrip', () {
    test('7 хоногийн эхлэл Даваа (UB)', () {
      expect(WeekStrip.weekStartOf(UbDateTime(2026, 11, 4, 15)), UbDateTime(2026, 11, 2));
      expect(WeekStrip.weekStartOf(UbDateTime(2026, 11, 8)), UbDateTime(2026, 11, 2)); // Ням
      expect(WeekStrip.weekStartOf(UbDateTime(2026, 11, 9)), UbDateTime(2026, 11, 9));
    });

    testWidgets('өдөр, цэг/тоо, өнөөдөр тэмдэглэгдсэн, дарахад сонгоно', (tester) async {
      final log = <UbDateTime>[];
      await pumpThemed(tester, _Strip(log: log, weeks: const []));
      for (final d in ['2', '3', '4', '5', '7', '8']) {
        expect(find.text(d), findsOneWidget);
      }
      expect(
        find.byWidgetPredicate(
          (w) => w.key is ValueKey<String> && (w.key! as ValueKey<String>).value.startsWith('week-dot:2026-11-02'),
        ),
        findsNWidgets(2),
      );
      expect(find.text('6'), findsNWidgets(2), reason: '3-аас олон бол тоо (Пүрэв 5-ны доор 6)');
      expect(find.bySemanticsLabel(RegExp('11-р сарын 4, Лхагва, өнөөдөр')), findsOneWidget);
      expect(find.text('Өнөөдөр'), findsNothing);

      await tester.tap(find.text('7'));
      await tester.pump();
      expect(log.last, UbDateTime(2026, 11, 7));
      expect(find.text('Өнөөдөр'), findsOneWidget);
      await tester.tap(find.text('Өнөөдөр'));
      await tester.pumpAndSettle();
      expect(log.last, UbDateTime(2026, 11, 4));
    });

    testWidgets('зүүн тийш шудрахад дараагийн 7 хоног, гараг хэвээр', (tester) async {
      final log = <UbDateTime>[];
      final weeks = <UbDateTime>[];
      await pumpThemed(tester, _Strip(log: log, weeks: weeks));
      await tester.fling(find.byType(PageView), const Offset(-300, 0), 1500);
      await tester.pumpAndSettle();
      expect(weeks, [UbDateTime(2026, 11, 9)]);
      expect(log, [UbDateTime(2026, 11, 11)]);
      expect(find.text('Сонгосон 2026-11-11'), findsOneWidget);
      expect(find.text('11'), findsOneWidget);

      await tester.fling(find.byType(PageView), const Offset(300, 0), 1500);
      await tester.pumpAndSettle();
      expect(log.last, UbDateTime(2026, 11, 4));
      expect(weeks.last, UbDateTime(2026, 11, 2));
    });

    testWidgets('өмнөх/дараагийн товч 7 хоног шилжүүлнэ', (tester) async {
      final log = <UbDateTime>[];
      final weeks = <UbDateTime>[];
      await pumpThemed(tester, _Strip(log: log, weeks: weeks));
      await tester.tap(find.byTooltip('Дараагийн 7 хоног'));
      await tester.pumpAndSettle();
      expect(log, [UbDateTime(2026, 11, 11)]);
      expect(weeks, [UbDateTime(2026, 11, 9)]);
      expect(find.text('11'), findsOneWidget);
      await tester.tap(find.byTooltip('Өмнөх 7 хоног'));
      await tester.pumpAndSettle();
      expect(log.last, UbDateTime(2026, 11, 4));
    });
  });

  group('layoutAgenda', () {
    test('давхцаагүй бол бүгд 1 багана', () {
      final p = layoutAgenda([_ev('a', 9, 0, 10, 0), _ev('b', 10, 0, 11, 0)]);
      expect(p.map((x) => (x.event.id, x.column, x.columns)), [('a', 0, 1), ('b', 0, 1)]);
    });

    test('давхцсан бүлэг ижил өргөнтэй, чөлөөлөгдсөн баганыг дахин ашиглана', () {
      // a 9–11, b 9:30–10:30, c 10:30–12 (a-тай давхцана, b-гийн баганыг авна), d 13–14 тусдаа.
      final p = {
        for (final x in layoutAgenda([
          _ev('c', 10, 30, 12, 0),
          _ev('a', 9, 0, 11, 0),
          _ev('d', 13, 0, 14, 0),
          _ev('b', 9, 30, 10, 30),
        ]))
          x.event.id: (x.column, x.columns),
      };
      expect(p['a'], (0, 2));
      expect(p['b'], (1, 2));
      expect(p['c'], (1, 2));
      expect(p['d'], (0, 1));
    });

    test('гурав зэрэг давхцвал 3 багана', () {
      final p = layoutAgenda([_ev('a', 9, 0, 10, 0), _ev('b', 9, 0, 10, 0), _ev('c', 9, 15, 9, 45)]);
      expect(p.map((x) => x.columns).toSet(), {3});
      expect(p.map((x) => x.column).toSet(), {0, 1, 2});
    });
  });

  group('DayAgenda', () {
    testWidgets('давхцсан хичээл зэрэгцээ, хагас өргөнтэй; дарахад event', (tester) async {
      final tapped = <Object>[];
      await pumpThemed(
        tester,
        DayAgenda(
          day: UbDateTime(2026, 11, 4),
          now: UbDateTime(2026, 11, 5, 12),
          events: [_ev('a', 9, 0, 11, 0), _ev('b', 9, 30, 10, 30), _ev('c', 14, 0, 15, 30)],
          onEventTap: (e) => tapped.add(e.id),
        ),
      );
      final a = tester.getRect(find.byKey(const ValueKey('agenda:a')));
      final b = tester.getRect(find.byKey(const ValueKey('agenda:b')));
      final c = tester.getRect(find.byKey(const ValueKey('agenda:c')));
      expect(a.width, closeTo(b.width, 0.5));
      expect(c.width, greaterThan(a.width * 1.8));
      expect(b.left, greaterThan(a.right - 1));
      expect(a.top, lessThan(b.top));
      expect(a.height, closeTo(2 * 72 - 2, 0.5));
      expect(find.byKey(const ValueKey('agenda:now')), findsNothing, reason: 'өөр өдөр');
      await tester.tap(find.text('Хичээл c'));
      expect(tapped, ['c']);
    });

    testWidgets('өнөөдөр «одоо» шугам зөв өндөрт', (tester) async {
      await pumpThemed(
        tester,
        DayAgenda(
          day: UbDateTime(2026, 11, 4),
          now: UbDateTime(2026, 11, 4, 10, 30),
          startHour: 8,
          events: [_ev('a', 10, 0, 11, 0)],
        ),
      );
      final now = tester.getRect(find.byKey(const ValueKey('agenda:now')));
      final a = tester.getRect(find.byKey(const ValueKey('agenda:a')));
      // 10:30 нь 10:00-ийн хичээлийн дунд.
      expect(now.center.dy, closeTo(a.top - 1 + 36, 2));
      expect(find.bySemanticsLabel('Одоо 10:30'), findsOneWidget);
    });

    testWidgets('хүрээнээс гадуурх хичээлд хүрээ тэлнэ, хоосон цаг дарах', (tester) async {
      final slots = <UbDateTime>[];
      await pumpThemed(
        tester,
        DayAgenda(
          day: UbDateTime(2026, 11, 4),
          now: UbDateTime(2026, 11, 1),
          events: [_ev('late', 21, 0, 22, 30)],
          onSlotTap: slots.add,
          controller: ScrollController(),
        ),
      );
      expect(find.text('22:00'), findsOneWidget);
      expect(find.text('23:00'), findsNothing);
      // 08:00 мөрөөс 1.5 цаг доош → 09:30.
      final eight = tester.getTopLeft(find.text('08:00'));
      await tester.tapAt(Offset(200, eight.dy + 8 + 72 * 1.5 + 4));
      expect(slots, [UbDateTime(2026, 11, 4, 9, 30)]);
    });

    testWidgets('хичээлгүй өдөр бичвэр', (tester) async {
      await pumpThemed(
        tester,
        DayAgenda(day: UbDateTime(2026, 11, 4), now: UbDateTime(2026, 11, 1), events: const [], emptyText: 'Хичээлгүй'),
      );
      expect(find.text('Хичээлгүй'), findsOneWidget);
    });
  });
}
