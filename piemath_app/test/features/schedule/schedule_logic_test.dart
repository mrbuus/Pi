import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/schedule/data/schedule_models.dart';
import 'package:piemath_app/features/schedule/domain/schedule_logic.dart';

import '../student_fixtures.dart';

void main() {
  test('mondayOf: тухайн 7 хоногийн Даваа', () {
    expect(mondayOf(UbDateTime(2026, 11, 2, 9)).dateKey, '2026-11-02'); // Даваа
    expect(mondayOf(UbDateTime(2026, 11, 8, 23)).dateKey, '2026-11-02'); // Ням
    expect(mondayOf(UbDateTime(2026, 11, 4)).dateKey, '2026-11-02'); // Лхагва
    expect(mondayOf(UbDateTime(2026, 3, 1)).dateKey, '2026-02-23'); // сар дамжина
  });

  test('patternByWeekday: JS 0 (Ням) → Монгол 7, цагаар эрэмбэлнэ', () {
    final me = ScheduleMe.fromJson(scheduleMeJson());
    final p = patternByWeekday(me.entries);
    expect(p[1]!.single.id, 'e1'); // Даваа
    expect(p[3]!.single.id, 'e2'); // Лхагва
    expect(p[7]!.single.id, 'e3'); // Ням
    expect(p[2], isEmpty);
    // Буруу гараг алгасагдана.
    final bad = patternByWeekday([me.entries.first.copyWith(weekday: 9)]);
    expect(bad.values.every((l) => l.isEmpty), isTrue);
  });

  test('шошго, нэр', () {
    expect(calendarTypeLabel('BREAK'), 'Завсарлага');
    expect(calendarTypeLabel('X'), 'Онцгой өдөр');
    expect(subjectLabel('MATH'), 'Математик');
    expect(subjectLabel(null), isNull);
    final me = ScheduleMe.fromJson(scheduleMeJson());
    expect(patternTeacherName(me.entries.first.teacher), 'О. Сараа+');
    final w = ScheduleWeek.fromJson(weekJson('2026-11-02'));
    expect(weekTeacherName(w.days.first.entries.single), 'Очир Сараа+');
    expect(weekTeacherName(w.days[4].entries.single), isNull);
    expect(mnWeekdayOfDay(w.days.last), 7);
  });
}
