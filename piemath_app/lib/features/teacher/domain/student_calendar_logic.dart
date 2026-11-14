import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../shared/marks/marks.dart';
import '../data/student_calendar_models.dart';

// Сурагчийн «Хичээлийн түүх» хуанли, «Сэдэв хөтөлбөр»-ийн цэвэр логик (I/O-гүй, тесттэй).
// Вэб: web/src/components/students/calendar/LessonCalendar.tsx, DaySheet.tsx, SyllabusTab.tsx.

String _two(int v) => v.toString().padLeft(2, '0');

/// «2026-11» → («2026-11-01», «2026-11-30»).
({String from, String to}) monthBounds(String month) {
  final parts = month.split('-');
  final y = int.parse(parts[0]);
  final m = int.parse(parts[1]);
  final last = DateTime.utc(y, m + 1, 0).day;
  return (from: '$month-01', to: '$month-${_two(last)}');
}

/// «2026-10» ± n сар.
String addMonths(String month, int n) {
  final parts = month.split('-');
  final d = DateTime.utc(int.parse(parts[0]), int.parse(parts[1]) + n);
  return '${d.year}-${_two(d.month)}';
}

/// «2026-10» → «2026 оны 10-р сар».
String monthKeyLabel(String month) {
  final parts = month.split('-');
  return '${int.parse(parts[0])} оны ${int.parse(parts[1])}-р сар';
}

/// «2026-10-17» → «10-р сарын 17».
String shortDay(String key) {
  final p = key.split('-');
  if (p.length < 3) return key;
  return '${int.parse(p[1])}-р сарын ${int.parse(p[2])}';
}

/// «2026-10-17» → «2026 оны 10-р сарын 17».
String fullDay(String key) {
  final p = key.split('-');
  if (p.length < 3) return key;
  return '${int.parse(p[0])} оны ${shortDay(key)}';
}

/// «2026-11-08» → «11-р сарын 8, Ням» (буруу бол хэвээр).
String lessonDayTitle(String key) {
  final t = parseDateKey(key);
  return t == null ? key : DateMn.longWithWeekday(t);
}

/// 600 → «10:00».
String hm(int minute) => '${_two(minute ~/ 60)}:${_two(minute % 60)}';

/// «12-6 (Баруун 4)» → «12-6».
String shortClass(String name) {
  final s = name.replaceFirst(RegExp(r'\s*\([^)]*\)\s*$'), '').trim();
  return s.isEmpty ? name : s;
}

// ───────── Тестийн нэр товчлох (вэбийн lib/testNames.ts regroupTopicText) ─────────

final _trailingNumber = RegExp(r'^(.*\S)\s+(\d+)$');

/// Өмнө нь «, »-оор нийлүүлсэн сэдэв («А 1, А 2, Б 3») → «А 1, 2; Б 3». Нэгтгэх зүйлгүй бол ЯГ хэвээр.
String regroupTopicText(String? text) {
  final raw = text ?? '';
  if (!raw.contains(',')) return raw;
  final groups = <({String base, List<String> numbers})>[];
  final numbered = <String, ({String base, List<String> numbers})>{};
  final plain = <String>{};
  for (final part in raw.split(RegExp(r'\s*,\s*'))) {
    final name = part.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (name.isEmpty) continue;
    final m = _trailingNumber.firstMatch(name);
    if (m == null) {
      if (plain.add(name)) groups.add((base: name, numbers: <String>[]));
      continue;
    }
    final base = m.group(1)!;
    final num = m.group(2)!;
    final g = numbered[base];
    if (g != null) {
      if (!g.numbers.contains(num)) g.numbers.add(num);
      continue;
    }
    final fresh = (base: base, numbers: <String>[num]);
    numbered[base] = fresh;
    groups.add(fresh);
  }
  if (!groups.any((g) => g.numbers.length > 1)) return raw;
  return groups.map((g) => g.numbers.isEmpty ? g.base : '${g.base} ${g.numbers.join(', ')}').join('; ');
}

// ───────── Хуанлийн хайрцаг ─────────

/// Хуанлийн нэг хайрцаг: хичээл эсвэл нөхөлт.
class CalendarCell {
  CalendarCell.lesson(LessonDay this.day) : makeup = null, key = day.key, date = day.date;

  CalendarCell.makeupVisit(MakeupHistoryItem this.makeup) : day = null, key = 'm:${makeup.id}', date = makeup.date;

  final LessonDay? day;
  final MakeupHistoryItem? makeup;
  final String key;
  final String date;

  /// Анги сольсон сард тэр ангийн эхний хайрцгийн өмнөх шошго («12-6»).
  String? classLabel;

  bool get isMakeup => makeup != null;
  int get dayOfMonth => int.tryParse(date.length >= 10 ? date.substring(8, 10) : '') ?? 0;
}

/// Хичээл + нөхөлтийг огноогоор (ижил өдөр нөхөлт сүүлд). Өөрийн анги солигдсон сард ангийн нэрийн шошго.
List<CalendarCell> calendarCells(LessonDaysResponse data) {
  final out = [
    for (final d in data.days) CalendarCell.lesson(d),
    for (final v in data.makeups) CalendarCell.makeupVisit(v),
  ];
  out.sort((a, b) {
    final c = a.date.compareTo(b.date);
    if (c != 0) return c;
    return (a.isMakeup ? 1 : 0) - (b.isMakeup ? 1 : 0);
  });
  final own = data.days.where((d) => d.own);
  if (own.map((d) => d.classroomId).toSet().length > 1) {
    var last = '';
    for (final c in out) {
      final d = c.day;
      if (d == null || !d.own || d.classroomId == last) continue;
      last = d.classroomId;
      c.classLabel = d.classroomName.split(' ').first;
    }
  }
  return out;
}

/// Сарын тоо: өнгөрсөн өдрийн ирц, даалгавар (өөрийн ангийн тэмдэглээгүйг оруулаад). Нөхөлт тоонд орохгүй.
class MonthCounts {
  final attendance = {for (final s in AttendanceStatus.values) s: 0};
  final homework = {for (final s in HomeworkStatus.values) s: 0};
  int attendanceUnmarked = 0;
  int homeworkUnmarked = 0;
}

MonthCounts monthCounts(Iterable<LessonDay> days) {
  final c = MonthCounts();
  for (final d in days) {
    if (d.future) continue;
    final a = d.attendance;
    if (a != null) {
      c.attendance[a.status] = c.attendance[a.status]! + 1;
    } else if (d.own) {
      c.attendanceUnmarked++;
    }
    final h = d.homework?.status;
    if (h != null) {
      c.homework[h] = c.homework[h]! + 1;
    } else if (d.own && d.quiz == null) {
      c.homeworkUnmarked++;
    }
  }
  return c;
}

/// Тасалсан (чөлөөтэйг оруулаад) өдрийн тестийг дараа нь нөхсөн нөхөлтүүд (төлөвлөгөөгөөрх тест тооцохгүй).
List<MakeupHistoryItem> madeUpFor(LessonDay day, List<MakeupHistoryItem> makeups) {
  final missed =
      day.attendance?.status == AttendanceStatus.absent || day.attendance?.status == AttendanceStatus.excused;
  if (!missed) return const [];
  final ids = {for (final t in day.tests) ?t.testId};
  return [
    for (final m in makeups)
      if (m.date.compareTo(day.date) >= 0 &&
          m.tests.any((t) => t.testId != null && t.source != CoveredSource.planned && ids.contains(t.testId)))
        m,
  ];
}

/// Тасалсан/чөлөөтэй өдөр эсэх.
bool isMissed(LessonDay day) =>
    day.attendance?.status == AttendanceStatus.absent || day.attendance?.status == AttendanceStatus.excused;

// ───────── Сэдэв хөтөлбөр ─────────

/// Нэг үйл явдлын бичвэр (вэбийн `eventText`).
String syllabusEventText(SyllabusEvent e) {
  switch (e.kind) {
    case SyllabusEventKind.classLesson:
      final att = e.attendance == null ? 'ирц тэмдэглээгүй' : attendanceMeta(e.attendance!).label.toLowerCase();
      return '${e.date == null ? '' : shortDay(e.date!)}, ${e.classroomName ?? 'анги'} — $att';
    case SyllabusEventKind.past:
      return '${e.classroomName ?? 'Анги'} — өмнө үзсэн (огноогүй)';
    case SyllabusEventKind.makeup:
      final p = e.place;
      final where = p == null || p.room406 ? '406-д нөхсөн' : '${p.name} ангид нөхсөн';
      return '${e.date == null ? '' : shortDay(e.date!)}, $where';
    case SyllabusEventKind.beforeJoin:
      return '${e.date == null ? '' : '${shortDay(e.date!)}, '}${e.classroomName ?? 'Анги'} элсэхээс өмнө үзсэн';
  }
}

/// Мөрийн товч: хийсэн бол огноо («өмнө үзсэн»), бусад үед сүүлийн үйл явдал.
String? syllabusSummary(SyllabusTest t) {
  if (t.status == SyllabusStatus.done) return t.doneOn == null ? 'өмнө үзсэн' : shortDay(t.doneOn!);
  return t.events.isEmpty ? null : syllabusEventText(t.events.last);
}

/// Шүүлтүүр: [onlyMissing] — зөвхөн дутуу; эс бөгөөс [showTodo] үгүй бол үзээгүйг нуух.
bool keepSyllabusTest(SyllabusTest t, {required bool onlyMissing, required bool showTodo}) =>
    onlyMissing ? t.status == SyllabusStatus.missing : showTodo || t.status != SyllabusStatus.todo;

/// Шүүсэн ном → бүлэг → тест (хоосон бүлэг, ном хасагдана).
List<SyllabusBook> filterSyllabus(List<SyllabusBook> books, {required bool onlyMissing, required bool showTodo}) => [
  for (final b in books)
    if (_filterBook(b, onlyMissing, showTodo) case final kept? when kept.chapters.isNotEmpty) kept,
];

SyllabusBook? _filterBook(SyllabusBook b, bool onlyMissing, bool showTodo) => SyllabusBook(
  id: b.id,
  code: b.code,
  title: b.title,
  chapters: [
    for (final c in b.chapters)
      if ([
            for (final t in c.tests)
              if (keepSyllabusTest(t, onlyMissing: onlyMissing, showTodo: showTodo)) t,
          ]
          case final tests when tests.isNotEmpty)
        SyllabusChapter(id: c.id, order: c.order, title: c.title, tests: tests),
  ],
);
