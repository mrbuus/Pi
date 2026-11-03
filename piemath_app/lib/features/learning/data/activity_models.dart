import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';
import 'json.dart';

@immutable
class ActivityDay {
  const ActivityDay({required this.date, required this.count, required this.level, required this.isHoliday});

  final UbDateTime date;

  /// Тэр өдөр бодсон бодлогын тоо.
  final int count;

  /// Серверийн түвшин 0-4 (босгыг сервер тодорхойлно).
  final int level;
  final bool isHoliday;
}

/// `GET /activity/me?year=` — жилийн өдөр бүрийн бодлогын тоо.
@immutable
class ActivityYear {
  ActivityYear({required this.year, required this.totalActiveDays, required this.days});

  factory ActivityYear.fromJson(Object? raw) {
    final j = asMap(raw);
    final days = <ActivityDay>[];
    for (final d in asList(j['days'])) {
      final m = asMap(d);
      final date = parseDateKey(asStr(m['date']));
      if (date == null) continue;
      days.add(
        ActivityDay(
          date: date,
          count: asInt(m['count']) ?? 0,
          level: (asInt(m['level']) ?? 0).clamp(0, 4),
          isHoliday: asBool(m['isHoliday']),
        ),
      );
    }
    return ActivityYear(
      year: asInt(j['year']) ?? 0,
      totalActiveDays: asInt(j['totalActiveDays']) ?? days.where((d) => d.count > 0).length,
      days: days,
    );
  }

  final int year;
  final int totalActiveDays;
  final List<ActivityDay> days;

  /// `dateKey` -> өдөр.
  late final Map<String, ActivityDay> byKey = {for (final d in days) d.date.dateKey: d};

  int monthTotal(int month) => days.where((d) => d.date.month == month).fold(0, (s, d) => s + d.count);

  int monthActiveDays(int month) => days.where((d) => d.date.month == month && d.count > 0).length;
}

/// `GET /activity/streak` — дараалсан өдрийн тоо (серверийн тооцоо; апп өөрөө бодохгүй).
@immutable
class ActivityStreak {
  const ActivityStreak({this.currentStreak = 0, this.longestStreak = 0, this.totalActiveDays = 0});

  factory ActivityStreak.fromJson(Object? raw) {
    final j = asMap(raw);
    return ActivityStreak(
      currentStreak: (asInt(j['currentStreak']) ?? 0).clamp(0, 100000),
      longestStreak: (asInt(j['longestStreak']) ?? 0).clamp(0, 100000),
      totalActiveDays: (asInt(j['totalActiveDays']) ?? 0).clamp(0, 100000),
    );
  }

  final int currentStreak;
  final int longestStreak;
  final int totalActiveDays;
}
