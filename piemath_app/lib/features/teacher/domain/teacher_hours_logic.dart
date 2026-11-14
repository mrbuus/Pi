// «Ажилласан цаг» (эзэн 2026-11-08) — цэвэр логик, I/O-гүй, тесттэй (test/features/teacher/teacher_hours_sheet_test.dart).
//
// Нүдний утгыг уншихдаа API-ийн `api/src/teacher-hours/work-sheet.logic.ts#parseHoursInput`, вэбийн
// `web/src/lib/hoursInput.ts`-тэй ЯГ ИЖИЛ дүрэм — сервер эцсийн шийдвэр гаргана, энд зөвхөн хэрэглэгчид
// шууд алдааг харуулна. Цагийг бүхэл «цагийг 100-аар үржүүлсэн» (hundredths): 7.5 цаг = 750.

import '../../../core/time/weekday.dart';

/// Нэг өдөрт хамгийн ихдээ 24 цаг.
const maxHoursPerDay = 24;

/// Нүдийн утга 1 секундын дараа (эсвэл нүднээс гарахад) автоматаар хадгалагдана.
const hoursSaveDelay = Duration(seconds: 1);

/// Нүдийг уншсан үр дүн: [ok] бол [hundredths] (null = арилгах), эс бөгөөс [error].
class HoursParse {
  const HoursParse.ok(this.hundredths) : ok = true, error = null;

  const HoursParse.error(String this.error) : ok = false, hundredths = null;

  final bool ok;
  final int? hundredths;
  final String? error;
}

final _hoursRe = RegExp(r'^(\d{0,2})(?:\.(\d*))?$');

/// «7.5», «7,5», « 9 » → бүхэл; хоосон = арилгах (null). 0–24, бутархай 2 орон хүртэл.
HoursParse parseHoursInput(String? raw) {
  if (raw == null) return const HoursParse.ok(null);
  final text = raw.trim().replaceAll(RegExp(r'\s+'), '').replaceFirst(',', '.');
  if (text.isEmpty) return const HoursParse.ok(null);
  final m = _hoursRe.firstMatch(text);
  final whole = m?.group(1) ?? '';
  final frac = m?.group(2);
  if (m == null || (whole.isEmpty && (frac == null || frac.isEmpty))) {
    return const HoursParse.error('Зөвхөн тоо бичнэ үү (ж: 7 эсвэл 7,5)');
  }
  final f = frac ?? '';
  if (f.length > 2) return const HoursParse.error('Бутархай нь 2 оронгоос ихгүй (ж: 7,25)');
  final hundredths = int.parse(whole.isEmpty ? '0' : whole) * 100 + int.parse(f.padRight(2, '0'));
  if (hundredths > maxHoursPerDay * 100) return const HoursParse.error('Нэг өдөрт 0–24 цаг');
  return HoursParse.ok(hundredths);
}

/// 750 → «7.5», 725 → «7.25», 700 → «7», null → «».
String formatHundredths(int? value) {
  if (value == null) return '';
  final sign = value < 0 ? '-' : '';
  final abs = value.abs();
  final whole = abs ~/ 100;
  final frac = abs % 100;
  if (frac == 0) return '$sign$whole';
  return '$sign$whole.${frac.toString().padLeft(2, '0').replaceFirst(RegExp(r'0$'), '')}';
}

/// Цаг үржих хөлс (₮/цаг) — төгрөгөөр бүхэлчилнэ (API `payAmount`).
int payAmount(int hundredths, int ratePerHour) => (hundredths * ratePerHour / 100).round();

/// Нүдний түлхүүр `teacherId|YYYY-MM-DD`.
String hoursKey(String teacherId, String date) => '$teacherId|$date';

int _dayOf(String date) => int.parse(date.substring(8, 10));

/// Монгол гараг (1=Даваа … 7=Ням) — цагийн бүсээс хамаарахгүй (огноо нь өдрийн түлхүүр).
int weekdayOfKey(String date) =>
    DateTime.utc(int.parse(date.substring(0, 4)), int.parse(date.substring(5, 7)), _dayOf(date)).weekday;

/// «2026 оны 11-р сар, 1–15».
String periodLabel(String start, String end) =>
    '${start.substring(0, 4)} оны ${int.parse(start.substring(5, 7))}-р сар, ${_dayOf(start)}–${_dayOf(end)}';

/// «11-р сарын 3, Мягмар».
String hoursDateLabel(String date) =>
    '${int.parse(date.substring(5, 7))}-р сарын ${_dayOf(date)}, ${weekdayNameMn(weekdayOfKey(date))}';

/// Өдрийн дугаар («03» → 3).
int dayNumberOf(String date) => _dayOf(date);

/// 90 → «1 цаг 30 мин», 45 → «45 мин».
String minutesLabel(int minutes) {
  final h = minutes ~/ 60;
  final m = minutes % 60;
  if (h == 0) return '$m мин';
  return m == 0 ? '$h цаг' : '$h цаг $m мин';
}

/// «Дараах»: доорх багш; багана дуусвал дараагийн өдрийн эхний мөр (вэбийн Enter = доош). Төгсгөлд null.
({int row, int col})? nextHoursCell(int row, int col, {required int rows, required int cols}) {
  if (rows == 0) return null;
  if (row + 1 < rows) return (row: row + 1, col: col);
  if (col + 1 < cols) return (row: 0, col: col + 1);
  return null;
}

/// CSV-ийн нэг нүд — Excel томьёо болж ажиллахаас сэргийлж `= + - @ tab CR`-ээр эхэлсэн утгын өмнө `'`.
String csvCell(String s) {
  final safe = RegExp(r'^[=+\-@\t\r]').hasMatch(s) ? "'$s" : s;
  return '"${safe.replaceAll('"', '""')}"';
}

/// Хүснэгтийг CSV болгоно (UTF-8 BOM-той — Excel кирилл үсгийг зөв уншина): «№, Нэр, 1…15, Нийт».
String hoursCsv({
  required List<({String teacherId, String name})> rows,
  required List<String> days,
  required int? Function(String key) valueOf,
}) {
  final lines = [
    ['№', 'Нэр', for (final d in days) '${_dayOf(d)}', 'Нийт'].join(','),
  ];
  for (final (i, r) in rows.indexed) {
    var total = 0;
    final cells = <String>[];
    for (final d in days) {
      final v = valueOf(hoursKey(r.teacherId, d));
      total += v ?? 0;
      cells.add(formatHundredths(v));
    }
    lines.add([i + 1, csvCell(r.name), ...cells, formatHundredths(total)].join(','));
  }
  return '﻿${lines.join('\n')}';
}

/// Монголын арилжааны банкууд (вэбийн `AccountDrawer` `BANKS`) — жагсаалтад байхгүй бол «Бусад банк».
const teacherBanks = [
  'Хаан банк',
  'Голомт банк',
  'Худалдаа хөгжлийн банк',
  'Төрийн банк',
  'Хас банк',
  'Капитрон банк',
  'Ариг банк',
  'Богд банк',
  'Үндэсний хөрөнгө оруулалтын банк',
  'Тээвэр хөгжлийн банк',
  'М банк',
  'Чингис хаан банк',
  'Кредит банк',
];

/// Дансны маягт бэлэн эсэх (вэбтэй ижил: банк 2+, дугаарт 5+ орон, эзэмшигч 2+). Эцсийн шалгалт серверт.
bool accountFormReady({required String bankName, required String number, required String holder}) =>
    bankName.trim().length >= 2 && number.replaceAll(RegExp(r'[\s-]'), '').length >= 5 && holder.trim().length >= 2;
