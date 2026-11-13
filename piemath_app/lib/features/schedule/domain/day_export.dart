import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../data/staff_schedule_models.dart';
import 'lesson_road.dart';
import 'staff_schedule_logic.dart';

// «Зураг хуваалцах»-ын агуулга (вэбийн `day/exportModel.ts`, эзэн 2026-11-08) — өдрийн хуваарьт харагдаж буй бүх
// зүйл: анги, цаг, багш, тест (товчилсон нэр), тарах/үлдэнэ, тарсан цаг, онолын зураг, тэмдэглэл, ирц, зөөсөн
// хичээл, амрах анги, амралтын өдөр, хоол, ажиллах багш. Танхим зурагт ОРОХГҮЙ. Зурахаас тусдаа цэвэр өгөгдөл.

enum ExportTone { info, warn, dim }

/// Мөрийн нэмэлт: [label] хоосон бол зөвхөн [text].
typedef ExportExtra = ({String label, String text, ExportTone tone});

class ExportRow {
  ExportRow({
    required this.className,
    required this.sub,
    required this.tests,
    required this.done,
    required this.lead,
    required this.assistant,
    required this.extras,
  });

  final String className;

  /// «14 сурагч» — танхим ОРОХГҮЙ.
  final String sub;

  /// Тестүүд товчилсон, бодлогын санд байхгүй сэдэвтэй.
  final String tests;

  /// Тест хийгдсэн (бүртгэлтэй) эсэх.
  final bool done;

  /// Ахлах, туслах (Багш+ нэрэнд «+»).
  final String lead;
  final String assistant;
  final List<ExportExtra> extras;
}

class ExportBlock {
  const ExportBlock({required this.time, required this.rows});

  /// «15:00–16:30» — дуусах цаг нь олонх мөрийнх.
  final String time;
  final List<ExportRow> rows;
}

class ExportBranch {
  const ExportBranch({required this.name, required this.count, required this.blocks});

  final String name;
  final int count;
  final List<ExportBlock> blocks;
}

class DayExportModel {
  const DayExportModel({
    required this.title,
    required this.year,
    required this.notices,
    required this.branches,
    required this.footer,
  });

  /// «11-р сарын 8, Ням».
  final String title;
  final String year;
  final List<String> notices;
  final List<ExportBranch> branches;
  final List<({String label, String text})> footer;
}

const _branches = ['Баруун 4', 'Зүүн 4', 'Бусад'];

String _shortDay(String key) => key.length >= 10 ? key.substring(5).replaceAll('-', '.') : key;

/// ISO агшин → «18:40» (UB).
String? _clock(String? iso) {
  final t = parseApiInstant(iso);
  return t == null ? null : DateMn.time(UbDateTime.fromInstant(t));
}

DayExportModel dayExportModel(DayPlan data) {
  final day = parseDateKey(data.date)!;
  final notices = <String>[
    if (data.isHoliday) data.holidayTitle ?? 'Амралтын өдөр',
    if (data.restingClasses.isNotEmpty) 'Амарна: ${{for (final n in data.restingClasses) shortClass(n)}.join(', ')}',
  ];

  final branches = <ExportBranch>[];
  for (final name in _branches) {
    final lessons =
        [
          for (final l in data.lessons)
            if (branchOf(l.classroomName) == name) l,
        ]..sort(
          (a, b) => a.startMinute != b.startMinute
              ? a.startMinute - b.startMinute
              : roomOrderOf(a.room) - roomOrderOf(b.room),
        );
    if (lessons.isEmpty) continue;
    final blocks = <({String time, List<ExportRow> rows, List<int> ends})>[];
    for (final l in lessons) {
      final time = formatMinutes(l.startMinute);
      final road = roadOf(l, data.tests);
      final extras = <ExportExtra>[];
      if (l.moved case final m?) {
        extras.add((
          label: '',
          text: m.originalDate != data.date ? '${_shortDay(m.originalDate)}-ээс зөөсөн' : 'Цаг, танхим өөрчилсөн',
          tone: ExportTone.warn,
        ));
      }
      if (dismissLabel(l.dismissMode) case final d?) extras.add((label: '', text: d, tone: ExportTone.info));
      if (_clock(l.dismissalAt) case final t?) extras.add((label: 'Тарсан', text: t, tone: ExportTone.dim));
      if (l.photoStudentName case final p?) extras.add((label: 'Онолын зураг', text: p, tone: ExportTone.dim));
      if (l.record case final r?) {
        extras.add((label: '', text: 'Батлагдсан', tone: ExportTone.info));
        if (r.attendanceMarked > 0) {
          extras.add((label: 'Ирсэн', text: '${r.presentCount}/${r.enrolledCount}', tone: ExportTone.dim));
          if (r.absentCount > 0) extras.add((label: 'Тасалсан', text: '${r.absentCount}', tone: ExportTone.warn));
        }
        if (r.problemNumbersText case final n?) extras.add((label: 'Бодсон', text: n, tone: ExportTone.dim));
        if (r.description case final d?) extras.add((label: 'Тайлбар', text: d, tone: ExportTone.dim));
      }
      final capacity = roomCapacityOf(l.room);
      if (capacity != null && l.students > capacity) {
        extras.add((label: '', text: '${l.students - capacity} суудал дутна', tone: ExportTone.warn));
      }
      if (l.noteBody case final n?) extras.add((label: 'Тэмдэглэл', text: n, tone: ExportTone.dim));
      final row = ExportRow(
        className: shortClass(l.classroomName),
        sub: '${l.students} сурагч',
        tests: lessonTestsText(l, data.tests),
        done: road.doneToday,
        lead: l.lead == null ? '' : staffRefLabel(l.lead!),
        assistant: l.assistant == null ? '' : staffRefLabel(l.assistant!),
        extras: extras,
      );
      if (blocks.isNotEmpty && blocks.last.time == time) {
        blocks.last.rows.add(row);
        blocks.last.ends.add(l.endMinute);
      } else {
        blocks.add((time: time, rows: [row], ends: [l.endMinute]));
      }
    }
    // Блокийн дуусах цаг = хамгийн олон давтагдсан нь; ялгаатай мөрд «Дуусах» (дэлгэцтэй ижил).
    final out = <ExportBlock>[];
    for (final b in blocks) {
      final count = <int, int>{};
      for (final e in b.ends) {
        count[e] = (count[e] ?? 0) + 1;
      }
      final end =
          (count.entries.toList()..sort((x, z) => z.value != x.value ? z.value - x.value : x.key - z.key)).first.key;
      for (var i = 0; i < b.rows.length; i++) {
        if (b.ends[i] != end) {
          b.rows[i].extras.insert(0, (label: 'Дуусах', text: formatMinutes(b.ends[i]), tone: ExportTone.warn));
        }
      }
      out.add(ExportBlock(time: '${b.time}–${formatMinutes(end)}', rows: b.rows));
    }
    branches.add(ExportBranch(name: name, count: lessons.length, blocks: out));
  }

  final footer = <({String label, String text})>[
    if (data.rosterTeachers.isNotEmpty)
      (label: 'Ажиллах багш', text: data.rosterTeachers.map(staffRefLabel).join(', ')),
    if (data.mealCook != null || data.mealFood != null)
      (label: 'Хоол', text: [if (data.mealCook != null) staffRefLabel(data.mealCook!), ?data.mealFood].join(' — ')),
  ];

  return DayExportModel(
    title: '${day.month}-р сарын ${day.day}, ${weekdayNameMn(day.weekday)}',
    year: '${day.year}',
    notices: notices,
    branches: branches,
    footer: footer,
  );
}

/// Хуваалцах файлын нэр: `huvaari-2026-11-08.png`.
String dayExportFileName(String date) => 'huvaari-$date.png';
