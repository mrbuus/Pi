import 'ub_time.dart';
import 'weekday.dart';

/// Монгол огноо/цагийн формат — вэбийн `lib/dateMn.ts`, `relativeTimeMn.ts`-тэй ижил үр дүн.
/// Төхөөрөмжийн locale-д найдахгүй, үргэлж Улаанбаатарын цагаар.
abstract final class DateMn {
  /// «2026.10.07»
  static String numeric(UbDateTime t) => '${t.year}.${_two(t.month)}.${_two(t.day)}';

  /// «10:53»
  static String time(UbDateTime t) => '${_two(t.hour)}:${_two(t.minute)}';

  /// «2026.10.07 10:53»
  static String numericWithTime(UbDateTime t) => '${numeric(t)} ${time(t)}';

  /// «10-р сарын 8» (оныг сонголтоор: «2026 оны 10-р сарын 8»).
  static String long(UbDateTime t, {bool withYear = false}) {
    final s = '${t.month}-р сарын ${t.day}';
    return withYear ? '${t.year} оны $s' : s;
  }

  /// «10-р сар» / «2026 оны 10-р сар»
  static String month(UbDateTime t, {bool withYear = false}) {
    final s = '${t.month}-р сар';
    return withYear ? '${t.year} оны $s' : s;
  }

  /// «10-р сарын 8, Пүрэв»
  static String longWithWeekday(UbDateTime t, {bool shortWeekday = false}) =>
      '${long(t)}, ${shortWeekday ? weekdayShortMn(t.weekday) : weekdayNameMn(t.weekday)}';

  /// «дөнгөж сая», «5 минутын өмнө», «өнөөдөр 14:05», «өчигдөр 09:12»,
  /// «10-р сарын 3, 14:05», «2025.10.03».
  static String relative(DateTime instant, {DateTime? now}) {
    final n = (now ?? DateTime.now()).toUtc();
    final diffSec = n.difference(instant.toUtc()).inSeconds;
    if (diffSec >= 0 && diffSec < 60) return 'дөнгөж сая';
    if (diffSec >= 60 && diffSec < 3600) return '${diffSec ~/ 60} минутын өмнө';
    final a = UbDateTime.fromInstant(instant);
    final b = UbDateTime.fromInstant(n);
    final days = b.dayIndex - a.dayIndex;
    if (days == 0) return 'өнөөдөр ${time(a)}';
    if (days == 1) return 'өчигдөр ${time(a)}';
    if (a.year == b.year) return '${a.month}-р сарын ${a.day}, ${time(a)}';
    return numeric(a);
  }
}

String _two(int v) => v.toString().padLeft(2, '0');
