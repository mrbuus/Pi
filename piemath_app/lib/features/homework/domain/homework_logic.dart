import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../data/homework_models.dart';

/// Гэрийн даалгаврын цэвэр логик (I/O-гүй, тесттэй). Эрх, хугацааг сервер дахин шалгана —
/// энд зөвхөн харуулах шийдвэр.

/// Зураг илгээх цонх: өнөөдөр ба сүүлийн 13 хоног (нийт 14) — вэбийн `HOMEWORK_WINDOW_DAYS`.
const homeworkWindowDays = 14;

/// «YYYY-MM-DD» хоёрын өдрийн зөрүү (a хасах b).
int dayDiff(String a, String b) {
  final x = parseDateKey(a), y = parseDateKey(b);
  if (x == null || y == null) return 0;
  return x.dayIndex - y.dayIndex;
}

/// Тухайн өдрийн зургийг одоо илгээж болох уу (вэбийн `canSend`).
bool canSendPhoto(HwDay day, String today) {
  if (day.upcoming) return true;
  final d = dayDiff(today, day.date);
  return d >= 0 && d < homeworkWindowDays;
}

/// «10-р сарын 26, Даваа» (вэбийн `dayLabel`).
String dayLabel(String dateKey, {bool withWeekday = true}) {
  final d = parseDateKey(dateKey);
  if (d == null) return dateKey;
  final base = '${d.month}-р сарын ${d.day}';
  return withWeekday ? '$base, ${weekdayNameMn(d.weekday)}' : base;
}

/// Өдрийн хэсэг (жагсаалтын гарчиг).
class HwSection {
  const HwSection(this.title, this.days);
  final String title;
  final List<HwDay> days;
}

/// Өнөөдөр → урьдчилан (ойрх нь эхэнд) → өмнөх (шинэ нь эхэнд). Хоосон хэсэг орохгүй.
List<HwSection> homeworkSections(List<HwDay> days, String today) {
  final sorted = [...days]..sort((a, b) {
      final c = b.date.compareTo(a.date);
      return c != 0 ? c : a.classroomName.compareTo(b.classroomName);
    });
  final sections = [
    HwSection('Өнөөдөр', sorted.where((d) => d.date == today).toList()),
    HwSection('Урьдчилан илгээх', sorted.where((d) => d.date.compareTo(today) > 0).toList().reversed.toList()),
    HwSection('Өмнөх хичээлүүд', sorted.where((d) => d.date.compareTo(today) < 0).toList()),
  ];
  return [for (final s in sections) if (s.days.isNotEmpty) s];
}

/// «Өмнөх хичээлүүд» хэсгийн зураг илгээгээгүй боловч одоо ч илгээж болох өдрийн тоо (бусад хэсэгт 0).
int missedPhotoDays(HwSection s, String today) => s.title != 'Өмнөх хичээлүүд'
    ? 0
    : s.days.where((d) => d.photo == null && canSendPhoto(d, today)).length;

/// Өдрийн бүх ажил илгээгдсэн эсэх (өдрийн зурвасын тэмдэг).
bool dayDone(HwDay d) => d.photo != null && d.items.every((i) => i.status == HwItemStatus.submitted);

/// Сурагчид харагдах тестийн нэр — номын дотоод нэр («100x100», «V3»)-ийг хасаж, хувилбарын
/// үсгийг давтахгүй, дунд цэгийг (U+00B7) урт зураасаар солино (вэбийн `lib/studentTitle.ts` `cleanTitle`).
String cleanTitle(String title, {String? variantLabel, String fallback = 'Даалгавар'}) {
  var t = title
      .replaceAll(RegExp(r'\b\d{2,4}\s*[xX\u00D7\u0445\u0425]\s*\d{2,4}\b'), ' ')
      .replaceAllMapped(RegExp('(^|[\\s\u00B7\u2022\u2014\u2013:-])V\\d\\b'), (m) => m.group(1)!)
      .replaceAll(RegExp('\\s*[\u00B7\u2022]\\s*'), ' \u2014 ');
  if (variantLabel != null && variantLabel.isNotEmpty) {
    final v = RegExp.escape(variantLabel);
    t = t.replaceFirst(RegExp('[\\s(-]*$v\\)?(\\s*хувилбар)?\\s*\$', caseSensitive: false), '');
  }
  t = t
      .replaceAll(RegExp(r'\s{2,}'), ' ')
      .replaceAll(RegExp('(\\s\u2014)+\\s\u2014'), ' \u2014')
      .replaceAll(RegExp('^[\\s\u2014\u2013:,-]+|[\\s\u2014\u2013:,-]+\$'), '')
      .trim();
  return t.isEmpty ? fallback : t;
}

/// Хариу хоосон эсэх (вэбийн `isBlankAnswer`): null, хоосон мөр, «___».
bool isBlankAnswer(Object? v) {
  if (v == null) return true;
  if (v is String) return v.trim().isEmpty || RegExp(r'^_+$').hasMatch(v.trim());
  if (v is Map) return v.values.every(isBlankAnswer);
  return false;
}

/// «4:07» эсвэл «1:04:07».
String formatClock(int seconds) {
  final s = seconds < 0 ? 0 : seconds;
  final h = s ~/ 3600, m = (s % 3600) ~/ 60, ss = (s % 60).toString().padLeft(2, '0');
  return h > 0 ? '$h:${m.toString().padLeft(2, '0')}:$ss' : '$m:$ss';
}

/// Хадгалах ёстой өөрчлөгдсөн хариунууд ([saved]-тай харьцуулж).
Map<String, Object?> changedAnswers(Map<String, Object?> current, Map<String, Object?> saved) {
  bool same(Object? a, Object? b) {
    if (a is Map && b is Map) {
      if (a.length != b.length) return false;
      return a.entries.every((e) => b[e.key] == e.value);
    }
    return a == b;
  }

  return {
    for (final e in current.entries)
      if (!same(e.value, saved[e.key])) e.key: e.value,
  };
}
