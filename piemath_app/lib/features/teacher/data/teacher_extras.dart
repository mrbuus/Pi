import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';

/// M8-ын нэмэлт хариунууд (бие даасан явц, хичээлийн тэмдэглэл, тарах цаг, шалгуур, presence).
/// Жижиг тул freezed-гүй, гараар задална (`docs/api-contract/teacher.md` §2.6, 2.8, 3, 6).

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();

int _int(Object? v, [int fallback = 0]) => v is num ? v.toInt() : fallback;

/// Идэвхийн нэг өдөр (`GET /activity/student/:id?year=`).
class ActivityDay {
  const ActivityDay({required this.date, required this.count, required this.level, required this.isHoliday});

  factory ActivityDay.fromJson(Map<String, Object?> j) => ActivityDay(
    date: (j['date'] as String?) ?? '',
    count: _int(j['count']),
    level: _int(j['level']).clamp(0, 4),
    isHoliday: j['isHoliday'] == true,
  );

  /// `YYYY-MM-DD`.
  final String date;
  final int count;

  /// 0..4 (хэр идэвхтэй).
  final int level;
  final bool isHoliday;
}

class ActivityYear {
  const ActivityYear({required this.year, required this.totalActiveDays, required this.days});

  factory ActivityYear.fromJson(Map<String, Object?> j) => ActivityYear(
    year: _int(j['year']),
    totalActiveDays: _int(j['totalActiveDays']),
    days: [for (final d in (j['days'] as List?) ?? const []) ActivityDay.fromJson(_map(d))],
  );

  final int year;
  final int totalActiveDays;
  final List<ActivityDay> days;

  /// Одоогийн ба хамгийн урт дараалал. Амралтын өдөр дарааллыг таслахгүй. Жилийн заагийг давахгүй
  /// (вэбийн `ActivityHeatmap`-ийн ойролцоо тооцоотой ижил).
  ({int current, int longest}) streak(String todayKey) {
    var run = 0;
    var longest = 0;
    for (final d in days) {
      if (d.date.compareTo(todayKey) > 0) break;
      if (d.count > 0) {
        run++;
        if (run > longest) longest = run;
      } else if (!d.isHoliday) {
        run = 0;
      }
    }
    return (current: run, longest: longest);
  }
}

/// Нэг хичээлийн тэмдэглэл (`GET /lesson-records/day` → `notes[]`).
class LessonNote {
  const LessonNote({required this.scheduleId, required this.body, this.updatedByName, this.updatedAt});

  factory LessonNote.fromJson(Map<String, Object?> j) => LessonNote(
    scheduleId: (j['scheduleId'] as String?) ?? '',
    body: (j['body'] as String?) ?? '',
    updatedByName: j['updatedByName'] as String?,
    updatedAt: j['updatedAt'] as String?,
  );

  final String scheduleId;
  final String body;
  final String? updatedByName;
  final String? updatedAt;
}

/// Өдрийн хичээлийн тэмдэглэлүүд, `scheduleId`-аар.
Map<String, LessonNote> parseLessonDay(Object? j) => {
  for (final n in (_map(j)['notes'] as List?) ?? const [])
    (_map(n)['scheduleId'] as String? ?? ''): LessonNote.fromJson(_map(n)),
};

/// Ангийн тарах цаг (`GET /learning-lab/classrooms/:id/dismissal`). Цагуудыг UB «HH:mm» болгож хадгална.
class DismissalInfo {
  const DismissalInfo({required this.approximate, this.lastLeft, this.note});

  static DismissalInfo? fromJson(Object? j) {
    if (j is! Map) return null;
    final m = _map(j);
    final approx = _clock(m['approximateAt'] as String?);
    if (approx == null) return null;
    return DismissalInfo(approximate: approx, lastLeft: _clock(m['lastLeftAt'] as String?), note: m['note'] as String?);
  }

  /// «17:10».
  final String approximate;
  final String? lastLeft;
  final String? note;

  static String? _clock(String? iso) {
    final at = parseApiInstant(iso);
    return at == null ? null : DateMn.time(UbDateTime.fromInstant(at));
  }
}

/// Эрсдэлийн шалгуур (`PUT /attendance/classrooms/:id/criteria`).
class RiskCriteria {
  const RiskCriteria({
    required this.windowDays,
    required this.minAttendance,
    required this.maxAbsences,
    required this.maxLates,
    required this.minHomework,
    required this.missingStreak,
  });

  factory RiskCriteria.fromJson(Map<String, Object?> j) => RiskCriteria(
    windowDays: _int(j['windowDays'], 30),
    minAttendance: _int(j['minAttendance'], 80),
    maxAbsences: _int(j['maxAbsences'], 3),
    maxLates: _int(j['maxLates'], 4),
    minHomework: _int(j['minHomework'], 60),
    missingStreak: _int(j['missingStreak'], 2),
  );

  static const windowChoices = [7, 14, 30, 60, 90];

  final int windowDays;
  final int minAttendance;
  final int maxAbsences;
  final int maxLates;
  final int minHomework;
  final int missingStreak;

  RiskCriteria copyWith({
    int? windowDays,
    int? minAttendance,
    int? maxAbsences,
    int? maxLates,
    int? minHomework,
    int? missingStreak,
  }) => RiskCriteria(
    windowDays: windowDays ?? this.windowDays,
    minAttendance: minAttendance ?? this.minAttendance,
    maxAbsences: maxAbsences ?? this.maxAbsences,
    maxLates: maxLates ?? this.maxLates,
    minHomework: minHomework ?? this.minHomework,
    missingStreak: missingStreak ?? this.missingStreak,
  );

  Map<String, Object?> toJson() => {
    'windowDays': windowDays,
    'minAttendance': minAttendance,
    'maxAbsences': maxAbsences,
    'maxLates': maxLates,
    'minHomework': minHomework,
    'missingStreak': missingStreak,
  };

  @override
  bool operator ==(Object other) => other is RiskCriteria && other.toJson().toString() == toJson().toString();

  @override
  int get hashCode => toJson().toString().hashCode;
}

class CriteriaPayload {
  const CriteriaPayload({required this.criteria, required this.defaults, this.isDefault = false});

  factory CriteriaPayload.fromJson(Map<String, Object?> j) => CriteriaPayload(
    criteria: RiskCriteria.fromJson(_map(j['criteria'])),
    defaults: RiskCriteria.fromJson(j['defaults'] is Map ? _map(j['defaults']) : const {}),
    isDefault: j['isDefault'] == true,
  );

  final RiskCriteria criteria;
  final RiskCriteria defaults;
  final bool isDefault;
}

/// Нэг ангийн ирцийг одоо хэн засаж байна (`POST /presence`).
class PresenceEditor {
  const PresenceEditor({required this.name, this.since});

  factory PresenceEditor.fromJson(Map<String, Object?> j) =>
      PresenceEditor(name: (j['name'] as String?) ?? '', since: j['since'] as String?);

  final String name;
  final String? since;
}

List<PresenceEditor> parsePresence(Object? j, String key) {
  final editors = _map(j)['editors'];
  if (editors is! Map) return const [];
  return [
    for (final e in (editors[key] as List?) ?? const [])
      if (PresenceEditor.fromJson(_map(e)) case final p when p.name.trim().isNotEmpty) p,
  ];
}
