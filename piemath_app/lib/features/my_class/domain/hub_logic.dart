import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../data/hub_models.dart';

// Сурагчийн самбарын цэвэр логик (I/O-гүй) — вэбийн `student-hub/lib.ts`,
// `lib/studentTitle.ts`, `makeup/types.ts`-тэй ижил үр дүн. Тест: test/features/my_class/.

/// `"2026-10-23T00:00:00.000Z"` эсвэл `"2026-10-23"` → `"2026-10-23"`.
String dayKeyOf(String s) => s.length >= 10 ? s.substring(0, 10) : s;

/// Өнөөдрийн УБ-ийн өдрийн түлхүүр.
String todayKey([UbDateTime? now]) => (now ?? UbDateTime.now()).dateKey;

/// Одоогийн сар `"2026-10"`.
String currentMonthKey([UbDateTime? now]) => todayKey(now).substring(0, 7);

UbDateTime _date(String key) => parseDateKey(dayKeyOf(key)) ?? UbDateTime(1970);

/// «10-р сарын 23, Баасан»
String dayTitle(String key) => DateMn.longWithWeekday(_date(key));

/// «10-р сарын 23»
String dayShort(String key) => DateMn.long(_date(key));

/// «Ба»
String weekdayShortOf(String key) => weekdayShortMn(_date(key).weekday);

/// Өдрийн дугаар (1–31).
int dayNumberOf(String key) => _date(key).day;

/// «2026-10» → «2026 оны 10-р сар»
String monthTitle(String month) => DateMn.month(_date('$month-01'), withYear: true);

/// 600 → «10:00»
String hm(int minute) => '${(minute ~/ 60).toString().padLeft(2, '0')}:${(minute % 60).toString().padLeft(2, '0')}';

/// «10:00–12:00» (эхлэлгүй бол null).
String? timeRange(int? start, int? end) {
  if (start == null) return null;
  return end == null ? hm(start) : '${hm(start)}–${hm(end)}';
}

/// Сурагчид харагдах тестийн нэр (эзэн 2026-10-29): номын дотоод нэр («100x100», «V3»)
/// харуулахгүй, хувилбарын үсгийг давтахгүй, дунд цэгийг « — » болгоно (вэбийн `cleanTitle`).
String cleanTitle(String title, {String? variant, String fallback = 'Даалгавар'}) {
  var t = title
      .replaceAll(RegExp(r'\b\d{2,4}\s*[xX\u00D7хХ]\s*\d{2,4}\b'), ' ')
      .replaceAllMapped(RegExp('(^|[\\s\u00B7\u2022\u2014\u2013:-])V\\d\\b'), (m) => m.group(1)!)
      .replaceAll(RegExp('\\s*[\u00B7\u2022]\\s*'), ' \u2014 ');
  if (variant != null && variant.isNotEmpty) {
    final v = RegExp.escape(variant);
    t = t.replaceAll(RegExp('[\\s(-]*$v\\)?(\\s*хувилбар)?\\s*\$', caseSensitive: false), '');
  }
  t = t
      .replaceAll(RegExp(r'\s{2,}'), ' ')
      .replaceAll(RegExp('(\\s\u2014)+\\s\u2014'), ' \u2014')
      .replaceAll(RegExp('^[\\s\u2014\u2013:,-]+|[\\s\u2014\u2013:,-]+\$'), '')
      .trim();
  return t.isEmpty ? fallback : t;
}

/// Сүүлийн N хичээлийн өдөр: энэ сарынх, хүрэлцэхгүй бол өмнөх сарынхаар нөхнө.
List<HubDay> recentDays(HubDays? current, HubDays? previous, {int count = 5}) =>
    [...?current?.days, ...?previous?.days].take(count).toList();

/// Тестүүдийг сараар (ирж буй дарааллаар — шинэ нь дээр) бүлэглэнэ.
List<(String month, List<HubTestRow> items)> groupTestsByMonth(List<HubTestRow> rows) {
  final out = <(String, List<HubTestRow>)>[];
  for (final t in rows) {
    final m = dayKeyOf(t.date).substring(0, 7);
    if (out.isNotEmpty && out.last.$1 == m) {
      out.last.$2.add(t);
    } else {
      out.add((m, [t]));
    }
  }
  return out;
}

/// Ирцийг сараар (шинэ сар эхэнд), өдөр бүрт эхний бичлэг.
List<(String month, Map<String, AttendanceRow> days)> attendanceByMonth(List<AttendanceRow> rows) {
  final byMonth = <String, Map<String, AttendanceRow>>{};
  for (final r in rows) {
    final k = dayKeyOf(r.date);
    if (k.length < 10) continue;
    byMonth.putIfAbsent(k.substring(0, 7), () => {}).putIfAbsent(k, () => r);
  }
  final keys = byMonth.keys.toList()..sort((a, b) => b.compareTo(a));
  return [for (final k in keys) (k, byMonth[k]!)];
}

/// Сарын хуанлийн нүд: Даваагаас эхэлсэн (эзний дүрэм), эхний хоосон нүд null.
List<String?> monthCells(String month) {
  final first = _date('$month-01');
  final lead = first.weekday - 1; // Даваа = 0
  final days = DateTime.utc(first.year, first.month + 1, 0).day;
  return [
    for (var i = 0; i < lead; i++) null,
    for (var d = 1; d <= days; d++) '$month-${d.toString().padLeft(2, '0')}',
  ];
}

/// Зөв хариу сонголтын үсэгтэй таарвал тэр сонголт, үгүй бол null (нөхөх хариу).
HubChoice? correctChoice(HubProblem p) {
  final answer = (p.correctAnswer ?? '').trim().toUpperCase();
  if (answer.isEmpty) return null;
  for (final c in p.choices) {
    if (c.label.trim().toUpperCase() == answer) return c;
  }
  return null;
}

/// Нөхөх тестийн нэр + хувилбар (гарчигт хувилбар байвал давтахгүй).
({String title, String? variant}) makeupTestLabel(String title, String? variant) {
  if (variant == null || variant.isEmpty) return (title: title, variant: null);
  final re = RegExp('[-\\s]${RegExp.escape(variant)}\$', caseSensitive: false);
  return (title: title.replaceAll(re, '').trim(), variant: variant);
}

/// «Хэдий хүртэл төлсөн» картын төлөв.
enum PaidUntilState { unknown, expired, endingSoon, ok }

/// Төлбөрийн хугацаа хүртэлх хоног (УБ өдрөөр). `paidUntil` нь ISO — огнооны утгаар (эхний 10).
int? paidUntilDaysLeft(String? paidUntil, UbDateTime today) {
  if (paidUntil == null) return null;
  final end = parseDateKey(dayKeyOf(paidUntil));
  if (end == null) return null;
  return end.dayIndex - today.startOfDay.dayIndex;
}

PaidUntilState paidUntilState(int? left) {
  if (left == null) return PaidUntilState.unknown;
  if (left < 0) return PaidUntilState.expired;
  if (left < 7) return PaidUntilState.endingSoon;
  return PaidUntilState.ok;
}

/// «2026.10.07» — ISO огнооны утгаар (бүс хөрвүүлэхгүй).
String paidUntilLabel(String iso) {
  final d = parseDateKey(dayKeyOf(iso));
  return d == null ? '' : DateMn.numeric(d);
}
