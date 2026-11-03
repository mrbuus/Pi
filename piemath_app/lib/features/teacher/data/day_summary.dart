/// `GET /attendance/day-summary?date=` — «Ангиуд» → «Өнөөдөр» тойм (вэбийн `TodayOverview`).
/// Өдөр бүрийн хичээлтэй анги: ирц, даалгаврын явц. Тоог сервер тооцно; мөнгөн дүн байхгүй.
library;

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();

int _int(Object? v) => v is num ? v.toInt() : 0;

class DayAttendance {
  const DayAttendance({
    this.present = 0,
    this.late = 0,
    this.absent = 0,
    this.excused = 0,
    this.unmarked = 0,
  });

  factory DayAttendance.fromJson(Map<String, Object?> j) => DayAttendance(
    present: _int(j['present']),
    late: _int(j['late']),
    absent: _int(j['absent']),
    excused: _int(j['excused']),
    unmarked: _int(j['unmarked']),
  );

  final int present, late, absent, excused, unmarked;

  /// Ирсэн (хоцорсныг оруулан).
  int get came => present + late;

  /// Ирээгүй (чөлөөтэйг оруулан).
  int get away => absent + excused;
}

class DayHomework {
  const DayHomework({
    this.done = 0,
    this.partial = 0,
    this.notDone = 0,
    this.unmarked = 0,
  });

  factory DayHomework.fromJson(Map<String, Object?> j) => DayHomework(
    done: _int(j['done']),
    partial: _int(j['partial']),
    notDone: _int(j['notDone']),
    unmarked: _int(j['unmarked']),
  );

  final int done, partial, notDone, unmarked;

  /// Дутуу, хийгээгүй.
  int get missing => partial + notDone;
}

class DaySummaryClass {
  const DaySummaryClass({
    required this.id,
    required this.name,
    required this.startMinute,
    required this.room,
    required this.students,
    required this.attendance,
    required this.homework,
    required this.confirmed,
  });

  factory DaySummaryClass.fromJson(Map<String, Object?> j) => DaySummaryClass(
    id: (j['id'] as String?) ?? '',
    name: (j['name'] as String?) ?? '',
    startMinute: _int(j['startMinute']),
    room: (j['room'] as String?)?.trim(),
    students: _int(j['students']),
    attendance: j['attendance'] is Map
        ? DayAttendance.fromJson(_map(j['attendance']))
        : const DayAttendance(),
    homework: j['homework'] is Map
        ? DayHomework.fromJson(_map(j['homework']))
        : null,
    confirmed: j['confirmed'] == true,
  );

  final String id, name;
  final int startMinute;
  final String? room;
  final int students;
  final DayAttendance attendance;

  /// null = онлайн анги (даалгаврын самбаргүй).
  final DayHomework? homework;
  final bool confirmed;

  /// «11А (Зүүн 4)» -> «11А».
  String get shortName => name.replaceAll(RegExp(r'\s*\([^)]*\)$'), '');
}

class DaySummary {
  const DaySummary({required this.date, required this.classes});

  factory DaySummary.fromJson(Map<String, Object?> j) {
    final list =
        [
          for (final e in (j['classes'] as List?) ?? const [])
            if (e is Map) DaySummaryClass.fromJson(_map(e)),
        ]..sort((a, b) {
          final d = a.startMinute - b.startMinute;
          return d != 0
              ? d
              : a.name.toLowerCase().compareTo(b.name.toLowerCase());
        });
    return DaySummary(date: (j['date'] as String?) ?? '', classes: list);
  }

  final String date;
  final List<DaySummaryClass> classes;

  int get studentTotal => classes.fold(0, (s, c) => s + c.students);
  int get cameTotal => classes.fold(0, (s, c) => s + c.attendance.came);
  int get homeworkBase =>
      classes.fold(0, (s, c) => s + (c.homework == null ? 0 : c.students));
  int get homeworkDone =>
      classes.fold(0, (s, c) => s + (c.homework?.done ?? 0));
}
