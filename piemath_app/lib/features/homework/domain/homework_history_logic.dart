import '../data/homework_models.dart';

/// `GET /homework-marks/my?year=` -ийн нэг мөр: тэр өдрийн багшийн тэмдэглэгээ.
class HwMarkEntry {
  const HwMarkEntry({required this.date, required this.mark, required this.comment, required this.classroomName});

  factory HwMarkEntry.fromJson(Object? json) {
    final m = (json! as Map).cast<String, Object?>();
    final raw = (m['date'] as String? ?? '').trim();
    final room = m['classroom'];
    final comment = (m['comment'] as String?)?.trim();
    return HwMarkEntry(
      // «2026-10-27T00:00:00.000Z» — эхний 10 тэмдэгт (цагийн бүс хөрвүүлэхгүй).
      date: raw.length >= 10 ? raw.substring(0, 10) : raw,
      mark: HomeworkMark.parse(m['status']) ?? HomeworkMark.notDone,
      comment: (comment == null || comment.isEmpty) ? null : comment,
      classroomName: room is Map ? (room['name'] as String? ?? '') : '',
    );
  }

  final String date;
  final HomeworkMark mark;
  final String? comment;
  final String classroomName;
}

/// Тэмдэглэгээний нийлбэр.
class HwMarkSummary {
  const HwMarkSummary({required this.done, required this.partial, required this.notDone});

  final int done;
  final int partial;
  final int notDone;

  int get total => done + partial + notDone;
}

HwMarkSummary summarizeMarks(List<HwMarkEntry> entries) => HwMarkSummary(
      done: entries.where((e) => e.mark == HomeworkMark.done).length,
      partial: entries.where((e) => e.mark == HomeworkMark.partial).length,
      notDone: entries.where((e) => e.mark == HomeworkMark.notDone).length,
    );

/// Сараар бүлэглэсэн (шинэ сар эхэнд, сар доторх өдөр нь шинэ нь эхэнд).
/// Түлхүүр — «2026-10».
List<(String, List<HwMarkEntry>)> groupMarksByMonth(List<HwMarkEntry> entries) {
  final sorted = [...entries]..sort((a, b) => b.date.compareTo(a.date));
  final out = <(String, List<HwMarkEntry>)>[];
  for (final e in sorted) {
    final month = e.date.length >= 7 ? e.date.substring(0, 7) : e.date;
    if (out.isEmpty || out.last.$1 != month) {
      out.add((month, [e]));
    } else {
      out.last.$2.add(e);
    }
  }
  return out;
}

/// «2026-10» → «10-р сар».
String monthTitleMn(String key) {
  final parts = key.split('-');
  final m = parts.length > 1 ? int.tryParse(parts[1]) : null;
  return m == null ? key : '$m-р сар';
}
