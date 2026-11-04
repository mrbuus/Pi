import '../../teacher/domain/test_run_row.dart';

/// Шалгалтын дүнгийн загварууд — вэбийн `components/results/types.ts`, `components/exams/analytics.ts`-тэй ижил.
///
/// Хариуны түлхүүр, зөв хариуны үсэг, бодолт, бодлогын агуулгыг ЗОРИУД задлахгүй (`/tests/:id`,
/// `/exams/:id/analytics` хариунд байсан ч) — апп эдгээрийг хадгалахгүй, харуулахгүй.

Map<String, Object?> jsonMap(Object? j) => j is Map ? j.cast<String, Object?>() : const {};

List<Map<String, Object?>> jsonList(Object? j) => [
  for (final e in (j is List ? j : const <Object?>[]))
    if (e is Map) e.cast<String, Object?>(),
];

double? jsonNum(Object? v) => v is num ? v.toDouble() : (v is String ? double.tryParse(v) : null);

int jsonInt(Object? v, [int fallback = 0]) => jsonNum(v)?.round() ?? fallback;

String jsonStr(Object? v) => v == null ? '' : '$v';

/// Тоог товч бичнэ: 12.0 → «12», 12.5 → «12.5».
String fmtScore(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);

/// Дүнгийн эх сурвалж (`TestResult.source`).
abstract final class ResultSource {
  static const online = 'ONLINE_TEST';
  static const chapterExam = 'CHAPTER_EXAM';
  static const manual = 'MANUAL_ENTRY';
  static const omr = 'OMR_IMPORT';
  static const evening = 'EVENING_SELF_REPORT';

  /// Вэбийн `sourceLabel`.
  static String label(String source) => switch (source) {
    chapterExam || manual => 'Цаасан (гараар)',
    online => 'Онлайн',
    omr => 'Онлайн (OMR)',
    evening => 'Өөрөө мэдүүлсэн',
    _ => 'Онлайн',
  };
}

/// `GET /tests/:id/results` мөр. Оноо, бүрэн бүтэн байдлын тоог багшийн [TestRunRow]-оос авна.
class ResultRow {
  const ResultRow({required this.run, required this.source, required this.firstName, required this.lastName});

  factory ResultRow.fromJson(Map<String, Object?> j) {
    final s = jsonMap(j['student']);
    return ResultRow(
      run: TestRunRow.fromJson(j),
      source: jsonStr(j['source']),
      firstName: jsonStr(s['firstName']),
      lastName: jsonStr(s['lastName']),
    );
  }

  final TestRunRow run;
  final String source;
  final String firstName;
  final String lastName;

  String get id => run.id;
  String get studentId => run.studentId;
  String get name => run.name;
  double get totalScore => run.totalScore;
  double get maxScore => run.maxScore;

  bool get isOnline => source == ResultSource.online;

  /// Хувь (бүхэл), `maxScore` 0 бол null (хуучин бичилт).
  int? get percent => scorePercent(totalScore, maxScore);

  String get scoreText => '${fmtScore(totalScore)}/${fmtScore(maxScore)}';
}

/// Вэбийн `scorePercent` — `maxScore <= 0` үед null.
int? scorePercent(double total, double max) {
  if (!max.isFinite || max <= 0) return null;
  return (total / max * 100).round();
}

/// `GET /tests/:id` (ажилтан) — зөвхөн нэр, оноосон ангиуд. Бодлого, хариуг уншихгүй.
class TestMeta {
  const TestMeta({required this.id, required this.title, required this.type, required this.accessClassIds});

  factory TestMeta.fromJson(Map<String, Object?> j) => TestMeta(
    id: jsonStr(j['id']),
    title: jsonStr(j['title']),
    type: jsonStr(j['type']),
    accessClassIds: {
      for (final a in jsonList(j['access']))
        if (jsonStr(a['classroomId']).isNotEmpty) jsonStr(a['classroomId']),
    },
  );

  final String id;
  final String title;
  final String type;
  final Set<String> accessClassIds;
}

/// Анги (`GET /classrooms`, анализын чип).
class ClassOption {
  const ClassOption({required this.id, required this.name});

  factory ClassOption.fromJson(Map<String, Object?> j) => ClassOption(id: jsonStr(j['id']), name: jsonStr(j['name']));

  final String id;
  final String name;

  @override
  bool operator ==(Object other) => other is ClassOption && other.id == id && other.name == name;

  @override
  int get hashCode => Object.hash(id, name);
}

/// Ангийн бүртгэлийн сурагч (`GET /classrooms/:id/attendance?date=` → `student`).
class RosterStudent {
  const RosterStudent({required this.id, required this.firstName, required this.lastName});

  factory RosterStudent.fromJson(Map<String, Object?> j) =>
      RosterStudent(id: jsonStr(j['id']), firstName: jsonStr(j['firstName']), lastName: jsonStr(j['lastName']));

  final String id;
  final String firstName;
  final String lastName;

  String get name => '$firstName $lastName'.trim();
}

/// `GET /users/search?q=` мөр.
class StudentHit {
  const StudentHit({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.studentCode,
    this.username,
  });

  factory StudentHit.fromJson(Map<String, Object?> j) => StudentHit(
    id: jsonStr(j['id']),
    firstName: jsonStr(j['firstName']),
    lastName: jsonStr(j['lastName']),
    studentCode: j['studentCode'] as String?,
    username: j['username'] as String?,
  );

  final String id;
  final String firstName;
  final String lastName;
  final String? studentCode;
  final String? username;

  String get name => '$firstName $lastName'.trim();
}

// ───────── Бодлогын анализ (`GET /exams/:id/analytics?classroomId=`) ─────────

enum DiscriminationLabel {
  good('Сайн ялгадаг'),
  weak('Сул ялгадаг'),
  problem('Асуудалтай');

  const DiscriminationLabel(this.text);
  final String text;

  static DiscriminationLabel? fromApi(Object? v) => switch (v) {
    'GOOD' => good,
    'WEAK' => weak,
    'PROBLEM' => problem,
    _ => null,
  };
}

enum ReliabilityLevel {
  good('Найдвартай'),
  fair('Дунд зэрэг'),
  low('Сул');

  const ReliabilityLevel(this.text);
  final String text;

  static ReliabilityLevel? fromApi(Object? v) => switch (v) {
    'GOOD' => good,
    'FAIR' => fair,
    'LOW' => low,
    _ => null,
  };
}

/// A–E сонголтын тархалт. Зөв хариуны үсгийг (`correct`) апп ЗОРИУД уншихгүй.
class ChoiceSpread {
  const ChoiceSpread({required this.counts, required this.blank, required this.total, this.mostWrong});

  factory ChoiceSpread.fromJson(Map<String, Object?> j) {
    final w = j['mostWrong'];
    final wm = jsonMap(w);
    return ChoiceSpread(
      counts: {for (final e in jsonMap(j['counts']).entries) e.key: jsonInt(e.value)},
      blank: jsonInt(j['blank']),
      total: jsonInt(j['total']),
      mostWrong: w is Map
          ? (letter: jsonStr(wm['letter']), count: jsonInt(wm['count']), note: wm['note'] as String?)
          : null,
    );
  }

  final Map<String, int> counts;
  final int blank;
  final int total;
  final ({String letter, int count, String? note})? mostWrong;
}

class ItemStat {
  const ItemStat({
    required this.key,
    required this.label,
    required this.part,
    required this.points,
    required this.order,
    required this.problemId,
    required this.marked,
    required this.correct,
    required this.blank,
    this.group,
    this.percent,
    this.choices,
    this.discrimination,
  });

  factory ItemStat.fromJson(Map<String, Object?> j) {
    final d = j['discrimination'];
    return ItemStat(
      key: jsonStr(j['key']),
      label: jsonStr(j['label']),
      part: jsonInt(j['part'], 1),
      points: jsonNum(j['points']) ?? 0,
      order: jsonInt(j['order']),
      problemId: jsonStr(j['problemId']),
      group: j['group'] as String?,
      marked: jsonInt(j['marked']),
      correct: jsonInt(j['correct']),
      blank: jsonInt(j['blank']),
      percent: jsonNum(j['percent'])?.round(),
      choices: j['choices'] is Map ? ChoiceSpread.fromJson(jsonMap(j['choices'])) : null,
      discrimination: d is Map ? DiscriminationLabel.fromApi(d['label']) : null,
    );
  }

  final String key;
  final String label;
  final int part;
  final double points;
  final int order;
  final String problemId;
  final String? group;
  final int marked;
  final int correct;
  final int blank;
  final int? percent;
  final ChoiceSpread? choices;
  final DiscriminationLabel? discrimination;

  /// Вэбийн `itemName`: алхмын багц бол шошго, үгүй бол «#3».
  String get name => group != null ? label : '#$label';
}

class TopicMastery {
  const TopicMastery({required this.key, required this.name, required this.items, required this.percent});

  factory TopicMastery.fromJson(Map<String, Object?> j) => TopicMastery(
    key: jsonStr(j['key']),
    name: jsonStr(j['name']),
    items: jsonInt(j['items']),
    percent: jsonInt(j['percent']),
  );

  final String key;
  final String name;
  final int items;
  final int percent;
}

class ClassCompare {
  const ClassCompare({required this.id, required this.name, required this.students, required this.taken, this.avg});

  factory ClassCompare.fromJson(Map<String, Object?> j) => ClassCompare(
    id: jsonStr(j['id']),
    name: jsonStr(j['name']),
    students: jsonInt(j['students']),
    taken: jsonInt(j['taken']),
    avg: jsonNum(j['avg'])?.round(),
  );

  final String id;
  final String name;
  final int students;
  final int taken;
  final int? avg;
}

class AnalyticsSummary {
  const AnalyticsSummary({
    required this.students,
    required this.absent,
    required this.taken,
    required this.pending,
    this.avg,
    this.median,
    this.max,
    this.min,
  });

  factory AnalyticsSummary.fromJson(Map<String, Object?> j) => AnalyticsSummary(
    students: jsonInt(j['students']),
    absent: jsonInt(j['absent']),
    taken: jsonInt(j['taken']),
    pending: jsonInt(j['pending']),
    avg: jsonNum(j['avg'])?.round(),
    median: jsonNum(j['median'])?.round(),
    max: jsonNum(j['max'])?.round(),
    min: jsonNum(j['min'])?.round(),
  );

  final int students;
  final int absent;
  final int taken;
  final int pending;
  final int? avg;
  final int? median;
  final int? max;
  final int? min;

  /// Өгөх ёстой (ирээгүйг хассан).
  int get expected => students - absent;
}

class ExamAnalytics {
  const ExamAnalytics({
    required this.title,
    required this.chips,
    required this.summary,
    required this.histogram,
    required this.classes,
    required this.topics,
    required this.items,
    required this.attention,
    required this.markedStudents,
    required this.onlineStudents,
    this.classroomId,
    this.reliability,
  });

  factory ExamAnalytics.fromJson(Map<String, Object?> j) {
    final rel = j['reliability'];
    final relLevel = rel is Map ? ReliabilityLevel.fromApi(rel['level']) : null;
    return ExamAnalytics(
      title: jsonStr(jsonMap(j['test'])['title']),
      classroomId: j['classroomId'] as String?,
      chips: [for (final c in jsonList(j['chips'])) ClassOption.fromJson(c)],
      summary: AnalyticsSummary.fromJson(jsonMap(j['summary'])),
      histogram: [for (final v in (j['histogram'] is List ? j['histogram']! as List : const <Object?>[])) jsonInt(v)],
      classes: [for (final c in jsonList(j['classes'])) ClassCompare.fromJson(c)],
      reliability: relLevel,
      topics: [for (final t in jsonList(j['topics'])) TopicMastery.fromJson(t)],
      items: [for (final i in jsonList(j['items'])) ItemStat.fromJson(i)],
      attention: [for (final a in (j['attention'] is List ? j['attention']! as List : const <Object?>[])) jsonStr(a)],
      markedStudents: jsonInt(j['markedStudents']),
      onlineStudents: jsonInt(j['onlineStudents']),
    );
  }

  final String title;
  final String? classroomId;
  final List<ClassOption> chips;
  final AnalyticsSummary summary;

  /// 5 багана: 0–20, 20–40, 40–60, 60–80, 80–100%.
  final List<int> histogram;
  final List<ClassCompare> classes;

  /// Зөвхөн Багш+/Админд (сервер шийднэ).
  final ReliabilityLevel? reliability;
  final List<TopicMastery> topics;
  final List<ItemStat> items;

  /// «Анхаарах» зүйлсийн түлхүүр (зөв хувь багаас нь).
  final List<String> attention;
  final int markedStudents;
  final int onlineStudents;

  List<ItemStat> get attentionItems {
    final byKey = {for (final i in items) i.key: i};
    return [
      for (final k in attention)
        if (byKey[k] != null) byKey[k]!,
    ];
  }
}

// ───────── Сурагчийн задаргаа (`GET /exams/:testId/students/:studentId`) ─────────

enum ItemStatus {
  correct,
  wrong,
  blank;

  static ItemStatus fromApi(Object? v) => switch (v) {
    'CORRECT' => correct,
    'BLANK' => blank,
    _ => wrong,
  };
}

class StudentAttempt {
  const StudentAttempt({
    required this.studentId,
    required this.name,
    required this.absent,
    required this.topics,
    required this.wrong,
    required this.trend,
    this.total,
    this.max,
    this.percent,
    this.parts,
  });

  factory StudentAttempt.fromJson(Map<String, Object?> j) {
    final s = jsonMap(j['student']);
    final r = j['result'];
    final rm = jsonMap(r);
    final p = j['parts'];
    final pm = jsonMap(p);
    return StudentAttempt(
      studentId: jsonStr(s['id']),
      name: '${jsonStr(s['firstName'])} ${jsonStr(s['lastName'])}'.trim(),
      absent: j['absent'] == true,
      total: r is Map ? jsonNum(rm['totalScore']) : null,
      max: r is Map ? jsonNum(rm['maxScore']) : null,
      percent: r is Map ? jsonNum(rm['percent'])?.round() : null,
      parts: p is Map
          ? (
              part1: jsonNum(pm['part1']) ?? 0,
              part1Max: jsonNum(pm['part1Max']) ?? 0,
              part2: jsonNum(pm['part2']) ?? 0,
              part2Max: jsonNum(pm['part2Max']) ?? 0,
            )
          : null,
      topics: [for (final t in jsonList(j['topics'])) TopicMastery.fromJson(t)],
      wrong: [
        for (final w in jsonList(j['wrong']))
          (
            key: jsonStr(w['key']),
            label: jsonStr(w['label']),
            part: jsonInt(w['part'], 1),
            points: jsonNum(w['points']) ?? 0,
            status: ItemStatus.fromApi(w['status']),
          ),
      ],
      trend: [
        for (final t in jsonList(j['trend']))
          (
            testId: jsonStr(t['testId']),
            title: jsonStr(t['title']),
            at: jsonStr(t['at']),
            percent: jsonInt(t['percent']),
            current: t['current'] == true,
          ),
      ],
    );
  }

  final String studentId;
  final String name;
  final bool absent;
  final double? total;
  final double? max;
  final int? percent;
  final ({double part1, double part1Max, double part2, double part2Max})? parts;
  final List<TopicMastery> topics;
  final List<({String key, String label, int part, double points, ItemStatus status})> wrong;
  final List<({String testId, String title, String at, int percent, bool current})> trend;

  bool get hasResult => total != null && max != null;
}
