import '../../../core/time/ub_time.dart';

/// Ирцийн төлөв (`AttendanceStatus`). «Өвчтэй» сонголт БАЙХГҮЙ (RULES §6).
enum AttendanceMark {
  present('PRESENT', 'Ирсэн'),
  late('LATE', 'Хоцорсон'),
  absent('ABSENT', 'Тасалсан'),
  excused('EXCUSED', 'Чөлөөтэй'),
  unknown('', 'Тэмдэглэсэн');

  const AttendanceMark(this.api, this.label);

  final String api;
  final String label;

  static AttendanceMark fromApi(String? v) =>
      values.firstWhere((m) => m.api == v && v!.isNotEmpty, orElse: () => AttendanceMark.unknown);
}

/// Даалгаврын төлөв: танхимын тэмдэглэгээ (`HomeworkMarkStatus`) ба онлайн илгээлт (`SubmissionState`).
enum HomeworkMark {
  done('DONE', 'Хийсэн'),
  partial('PARTIAL', 'Дутуу'),
  notDone('NOT_DONE', 'Хийгээгүй'),
  submitted('SUBMITTED', 'Шалгуулахаар илгээсэн'),
  returned('RETURNED', 'Дахин илгээх'),
  doneOnline('DONE_ONLINE', 'Шалгасан'),
  doneInClass('DONE_IN_CLASS', 'Ангид шалгасан'),
  unknown('', 'Тэмдэглэсэн');

  const HomeworkMark(this.api, this.label);

  final String api;
  final String label;

  static HomeworkMark fromApi(String? v) =>
      values.firstWhere((m) => m.api == v && v!.isNotEmpty, orElse: () => HomeworkMark.unknown);
}

/// Дүнгийн эх сурвалжийн тайлбар (вэбийн эцэг эхийн хуудас).
String resultSourceLabel(String? source) => switch (source) {
      'CHAPTER_EXAM' => 'Багшийн үнэлгээ',
      'EVENING_SELF_REPORT' => 'Сурагчийн өөрийн тэмдэглэгээ',
      _ => 'Шалгалтын дүн',
    };

/// `@db.Date` / ISO-ийн өдрийг «2026.10.30» болгоно (эхний 10 тэмдэгт — бүсээр гулсуулахгүй).
String dayLabel(String? iso) {
  final d = parseDateKey(iso);
  if (d == null) return '';
  return '${d.year}.${d.month.toString().padLeft(2, '0')}.${d.day.toString().padLeft(2, '0')}';
}

/// Тухайн UB өдрийн 7 хоногийн Даваа гараг (`YYYY-MM-DD`) — тайлангийн `week` параметр.
String mondayKey(UbDateTime day) => day.startOfDay.addDays(1 - day.weekday).dateKey;

/// Сүүлийн [count] долоо хоногийн Даваа (шинэ нь эхэнд) — вэбийн `weekOptions()`.
List<String> weekOptions(UbDateTime today, {int count = 12}) {
  final monday = today.startOfDay.addDays(1 - today.weekday);
  return [for (var i = 0; i < count; i++) monday.addDays(-7 * i).dateKey];
}

/// «2026-10-26» → «10-р сарын 26».
String weekLabel(String key) {
  final d = parseDateKey(key);
  if (d == null) return key;
  return '${d.month}-р сарын ${d.day}';
}

/// UB шөнө дундаас хойших минут → «15:00».
String minuteLabel(int minutes) =>
    '${(minutes ~/ 60).toString().padLeft(2, '0')}:${(minutes % 60).toString().padLeft(2, '0')}';

/// Хүүхэд холбох утасны дугаар: зөвхөн цифр, яг 8.
String? normalizeStudentPhone(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  return digits.length == 8 ? digits : null;
}
