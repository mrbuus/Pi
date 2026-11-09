import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';
import '../../learning/data/json.dart';

export '../../learning/data/json.dart' show Json, asBool, asInt, asList, asMap, asNum, asStr, isSafeId;

/// Хичээлийн төрөл (`Subject`). Онолын агуулга, ноорог зэрэгт шүүлтүүр.
enum ContentSubject {
  math('MATH', 'Математик'),
  social('SOCIAL_STUDIES', 'Нийгмийн ухаан');

  const ContentSubject(this.api, this.label);
  final String api;
  final String label;
}

@immutable
class ContentBook {
  const ContentBook({required this.id, required this.title, this.code});

  factory ContentBook.fromJson(Object? raw) {
    final j = asMap(raw);
    return ContentBook(
      id: asStr(j['id']) ?? '',
      title: cleanBookTitle(asStr(j['title']) ?? ''),
      code: asStr(j['code']),
    );
  }

  final String id;
  final String title;
  final String? code;
}

/// Вэбийн `title.replace(...)` — номын нэрэнд дунд цэг (U+00B7) тусгаарлагч харуулахгүй (RULES §3).
String cleanBookTitle(String t) => t.replaceAll(RegExp('\\s*\u00B7\\s*'), ' — ');

@immutable
class ContentChapter {
  const ContentChapter({required this.id, required this.title, this.theoryCount, this.freePreview = false});

  factory ContentChapter.fromJson(Object? raw) {
    final j = asMap(raw);
    return ContentChapter(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      theoryCount: asInt(asMap(j['_count'])['theories']),
      freePreview: asBool(j['freePreview']),
    );
  }

  final String id;
  final String title;
  final int? theoryCount;
  final bool freePreview;
}

/// Онолын нэг блок (`TheoryBlock`) — markdown + `$...$` томьёо, зураг нь `![alt](key)` мөр.
@immutable
class TheoryItem {
  const TheoryItem({
    required this.id,
    required this.title,
    required this.content,
    this.imageKeys = const [],
    this.order = 0,
    this.createdById,
  });

  factory TheoryItem.fromJson(Object? raw) {
    final j = asMap(raw);
    return TheoryItem(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      content: asStr(j['content']) ?? '',
      imageKeys: [
        for (final k in asList(j['imageKeys']))
          if (k is String && k.isNotEmpty) k,
      ],
      order: asInt(j['order']) ?? 0,
      createdById: asStr(j['createdById']),
    );
  }

  final String id;
  final String title;
  final String content;
  final List<String> imageKeys;
  final int order;
  final String? createdById;

  /// Жагсаалтын товч тайлбар: зургийн мөргүй эхний мөр.
  String get preview {
    for (final line in content.split('\n')) {
      final t = line.trim();
      if (t.isEmpty || imageLine.hasMatch(t)) continue;
      return t.length > 120 ? '${t.substring(0, 120)}...' : t;
    }
    return '';
  }
}

/// `GET /lessons/:chapterId`-ийн хариу янз бүрийн бүтэцтэй ирж болно (вэбийн `normalizeTheories`).
List<TheoryItem> parseTheories(Object? res) {
  Object? arr = res;
  if (res is Map) {
    final m = asMap(res);
    arr = m['theories'] ?? m['theoryBlocks'] ?? m['blocks'];
  }
  return [for (final e in asList(arr)) TheoryItem.fromJson(e)]..sort((a, b) => a.order.compareTo(b.order));
}

/// Зургийн мөр `![alt](key)` (вэбийн `IMAGE_LINE_RE`).
final imageLine = RegExp(r'^!\[([^\]]*)\]\(([^)]+)\)$');

String insertImageMarkdown(String content, String alt, String key) {
  final trimmed = content.replaceAll(RegExp(r'\s+$'), '');
  final safeAlt = alt.replaceAll('[', '(').replaceAll(']', ')').replaceAll(RegExp(r'\r?\n'), ' ');
  final line = '![$safeAlt]($key)';
  return trimmed.isEmpty ? '$line\n' : '$trimmed\n\n$line\n';
}

String removeImageMarkdown(String content, String key) {
  final kept = content
      .split('\n')
      .where((l) {
        final m = imageLine.firstMatch(l.trim());
        return !(m != null && m.group(2) == key);
      })
      .join('\n');
  return kept.replaceAll(RegExp(r'\n{3,}'), '\n\n');
}

/// Онолын агуулгыг бичвэр ба зургийн хэсэг болгон хуваана (урьдчилан харах).
List<({String? text, String? imageKey, String alt})> splitTheory(String content) {
  final out = <({String? text, String? imageKey, String alt})>[];
  final buf = StringBuffer();
  void flush() {
    final t = buf.toString().trim();
    if (t.isNotEmpty) out.add((text: t, imageKey: null, alt: ''));
    buf.clear();
  }

  for (final line in content.split('\n')) {
    final m = imageLine.firstMatch(line.trim());
    if (m != null) {
      flush();
      out.add((text: null, imageKey: m.group(2), alt: m.group(1) ?? ''));
    } else {
      buf.writeln(line);
    }
  }
  flush();
  return out;
}

// ---------------- Жишиг сорил (`/mock-exams/admin`) ----------------

enum MockPhase {
  upcoming('Удахгүй'),
  live('Явагдаж байна'),
  done('Дууссан');

  const MockPhase(this.label);
  final String label;

  static MockPhase parse(String? v) => switch (v) {
    'live' => live,
    'done' => done,
    _ => upcoming,
  };
}

@immutable
class MockEvent {
  const MockEvent({
    required this.id,
    required this.title,
    required this.startsAt,
    required this.testTitle,
    this.published = false,
    this.timeLimitMin,
    this.problemCount = 0,
    this.registered = 0,
    this.results = 0,
    this.phase = MockPhase.upcoming,
    this.note,
  });

  factory MockEvent.fromJson(Object? raw) {
    final j = asMap(raw);
    return MockEvent(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      startsAt: parseApiInstant(asStr(j['startsAt'])),
      testTitle: asStr(asMap(j['test'])['title']) ?? '',
      published: asBool(j['published']),
      timeLimitMin: asInt(j['timeLimitMin']),
      problemCount: asInt(j['problemCount']) ?? 0,
      registered: asInt(j['registered']) ?? 0,
      results: asInt(j['results']) ?? 0,
      phase: MockPhase.parse(asStr(j['phase'])),
      note: asStr(j['note']),
    );
  }

  final String id;
  final String title;
  final DateTime? startsAt;
  final String testTitle;
  final bool published;
  final int? timeLimitMin;
  final int problemCount;
  final int registered;
  final int results;
  final MockPhase phase;
  final String? note;

  MockEvent withPublished(bool v) => MockEvent(
    id: id,
    title: title,
    startsAt: startsAt,
    testTitle: testTitle,
    published: v,
    timeLimitMin: timeLimitMin,
    problemCount: problemCount,
    registered: registered,
    results: results,
    phase: phase,
    note: note,
  );
}

@immutable
class MockTestOption {
  const MockTestOption({required this.id, required this.title, this.timeLimitMin, this.problemCount = 0});

  factory MockTestOption.fromJson(Object? raw) {
    final j = asMap(raw);
    return MockTestOption(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      timeLimitMin: asInt(j['timeLimitMin']),
      problemCount: asInt(j['problemCount']) ?? 0,
    );
  }

  final String id;
  final String title;
  final int? timeLimitMin;
  final int problemCount;
}

enum MockRegStatus {
  notStarted('Эхлээгүй'),
  inProgress('Бодож байна'),
  submitted('Илгээсэн');

  const MockRegStatus(this.label);
  final String label;

  static MockRegStatus parse(String? v) => switch (v) {
    'IN_PROGRESS' => inProgress,
    'SUBMITTED' => submitted,
    _ => notStarted,
  };
}

@immutable
class MockRegistration {
  const MockRegistration({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.studentCode,
    this.school,
    this.grade,
    this.status = MockRegStatus.notStarted,
    this.score,
    this.max,
  });

  factory MockRegistration.fromJson(Object? raw) {
    final j = asMap(raw);
    final p = asMap(j['studentProfile']);
    return MockRegistration(
      id: asStr(j['id']) ?? '',
      firstName: asStr(j['firstName']) ?? '',
      lastName: asStr(j['lastName']) ?? '',
      phone: asStr(j['phone']),
      studentCode: asStr(j['studentCode']),
      school: asStr(p['school']),
      grade: asInt(p['grade']),
      status: MockRegStatus.parse(asStr(j['status'])),
      score: asNum(j['score']),
      max: asNum(j['max']),
    );
  }

  final String id;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? studentCode;
  final String? school;
  final int? grade;
  final MockRegStatus status;
  final double? score;
  final double? max;

  /// «Д. Болд» (вэбийн хэлбэр).
  String get displayName => lastName.isNotEmpty ? '${lastName.substring(0, 1)}. $firstName' : firstName;
}

// ---------------- Түвшин тогтоох (`/placement`) ----------------

enum PlacementStatus {
  newOne('NEW', 'Шинэ'),
  reviewed('REVIEWED', 'Шалгасан'),
  contacted('CONTACTED', 'Холбогдсон');

  const PlacementStatus(this.api, this.label);
  final String api;
  final String label;

  static PlacementStatus parse(String? v) => switch (v) {
    'REVIEWED' => reviewed,
    'CONTACTED' => contacted,
    _ => newOne,
  };
}

const placementLevels = ['Суурь', 'Дунд', 'Ахисан', 'Хоцрогдолтой, суурь ангид'];
const choiceKeys = ['A', 'B', 'C', 'D', 'E'];

@immutable
class PlacementAttempt {
  const PlacementAttempt({
    required this.id,
    required this.name,
    required this.phone,
    required this.grade,
    this.school,
    this.parentPhone,
    this.autoScore,
    this.maxScore,
    this.photoCount = 0,
    this.submittedAt,
    this.startedAt,
    this.createdAt,
    this.autoSubmitted = false,
    this.status = PlacementStatus.newOne,
    this.level,
  });

  factory PlacementAttempt.fromJson(Object? raw) {
    final j = asMap(raw);
    return PlacementAttempt(
      id: asStr(j['id']) ?? '',
      name: asStr(j['name']) ?? '',
      phone: asStr(j['phone']) ?? '',
      grade: asInt(j['grade']) ?? 0,
      school: asStr(j['school']),
      parentPhone: asStr(j['parentPhone']),
      autoScore: asNum(j['autoScore']),
      maxScore: asNum(j['maxScore']),
      photoCount: asInt(j['photoCount']) ?? 0,
      submittedAt: parseApiInstant(asStr(j['submittedAt'])),
      startedAt: parseApiInstant(asStr(j['startedAt'])),
      createdAt: parseApiInstant(asStr(j['createdAt'])),
      autoSubmitted: asBool(j['autoSubmitted']),
      status: PlacementStatus.parse(asStr(j['status'])),
      level: asStr(j['level']),
    );
  }

  final String id;
  final String name;
  final String phone;
  final int grade;
  final String? school;
  final String? parentPhone;
  final double? autoScore;
  final double? maxScore;
  final int photoCount;
  final DateTime? submittedAt;
  final DateTime? startedAt;
  final DateTime? createdAt;
  final bool autoSubmitted;
  final PlacementStatus status;
  final String? level;

  String get scoreLabel => 'Хариу ${fmtNum(autoScore ?? 0)}/${fmtNum(maxScore ?? 0)}';
}

String fmtNum(num v) => v == v.roundToDouble() ? '${v.round()}' : v.toStringAsFixed(1);

/// Түвшин тогтоох шалгалтын нэг бодлого. `answer` нь зөвхөн удирдлагад ирнэ.
@immutable
class PlacementProblem {
  const PlacementProblem({
    required this.n,
    required this.statement,
    required this.kind,
    this.points = 1,
    this.choices = const {},
    this.boxes = const [],
    this.answerChoice,
    this.answerBoxes = const {},
  });

  factory PlacementProblem.fromJson(Object? raw) {
    final j = asMap(raw);
    final ans = j['answer'];
    return PlacementProblem(
      n: asInt(j['n']) ?? 0,
      statement: asStr(j['statement']) ?? '',
      kind: asStr(j['kind']) == 'boxes' ? 'boxes' : 'choice',
      points: asInt(j['points']) ?? 1,
      choices: {for (final e in asMap(j['choices']).entries) e.key: asStr(e.value) ?? ''},
      boxes: [
        for (final b in asList(j['boxes'])) (key: asStr(asMap(b)['key']) ?? '', digits: asInt(asMap(b)['digits']) ?? 1),
      ],
      answerChoice: ans is String ? ans : null,
      answerBoxes: ans is Map ? {for (final e in asMap(ans).entries) e.key: '${e.value ?? ''}'} : const {},
    );
  }

  final int n;
  final String statement;

  /// `choice` (A–E) эсвэл `boxes` (нүдэнд бичих).
  final String kind;
  final int points;
  final Map<String, String> choices;
  final List<({String key, int digits})> boxes;
  final String? answerChoice;
  final Map<String, String> answerBoxes;

  bool get isChoice => kind == 'choice';

  /// `PUT /placement/config`-ийн бодлого (вэбийн `fromEdit`).
  Json toConfigJson() => isChoice
      ? {
          'kind': 'choice',
          'statement': statement,
          'points': points,
          'choices': {for (final k in choiceKeys) k: choices[k] ?? ''},
          'answer': answerChoice ?? 'A',
        }
      : {
          'kind': 'boxes',
          'statement': statement,
          'points': points,
          'boxes': [
            for (final b in boxes) {'key': b.key, 'digits': b.digits},
          ],
          'answer': {for (final b in boxes) b.key: answerBoxes[b.key] ?? ''},
        };

  PlacementProblem copyWith({
    String? statement,
    String? kind,
    int? points,
    Map<String, String>? choices,
    List<({String key, int digits})>? boxes,
    String? answerChoice,
    Map<String, String>? answerBoxes,
  }) => PlacementProblem(
    n: n,
    statement: statement ?? this.statement,
    kind: kind ?? this.kind,
    points: points ?? this.points,
    choices: choices ?? this.choices,
    boxes: boxes ?? this.boxes,
    answerChoice: answerChoice ?? this.answerChoice,
    answerBoxes: answerBoxes ?? this.answerBoxes,
  );

  /// Хүүхдийн/зөв хариуг бичвэр болгох (вэбийн `fmtAnswer`).
  String formatAnswer(Object? v) {
    if (v == null || v == '') return '-';
    if (v is String) return v;
    final m = asMap(v);
    return [for (final b in boxes) '[${b.key}]=${m[b.key] ?? '?'}'].join(', ');
  }

  Object? get correctAnswer => isChoice ? answerChoice : answerBoxes;
}

@immutable
class PlacementDetailProblem {
  const PlacementDetailProblem({required this.problem, this.given, this.correct = false, this.photos = const []});

  factory PlacementDetailProblem.fromJson(Object? raw) {
    final j = asMap(raw);
    return PlacementDetailProblem(
      problem: PlacementProblem.fromJson(j),
      given: j['given'],
      correct: asBool(j['correct']),
      photos: [
        for (final k in asList(j['photos']))
          if (k is String && k.isNotEmpty) k,
      ],
    );
  }

  final PlacementProblem problem;
  final Object? given;
  final bool correct;
  final List<String> photos;

  bool get unanswered => given == null || given == '';
}

@immutable
class PlacementDetail {
  const PlacementDetail({
    required this.attempt,
    required this.title,
    required this.minutes,
    this.teacherNote,
    this.problems = const [],
  });

  factory PlacementDetail.fromJson(Object? raw) {
    final j = asMap(raw);
    return PlacementDetail(
      attempt: PlacementAttempt.fromJson(j),
      title: asStr(j['title']) ?? '',
      minutes: asInt(j['minutes']) ?? 0,
      teacherNote: asStr(j['teacherNote']),
      problems: [for (final p in asList(j['problems'])) PlacementDetailProblem.fromJson(p)],
    );
  }

  final PlacementAttempt attempt;
  final String title;
  final int minutes;
  final String? teacherNote;
  final List<PlacementDetailProblem> problems;

  /// Бодсон минут (илгээгээгүй бол null).
  int? get usedMinutes {
    final s = attempt.startedAt;
    final e = attempt.submittedAt;
    if (s == null || e == null) return null;
    return (e.difference(s).inSeconds / 60).round();
  }
}

@immutable
class PlacementConfig {
  const PlacementConfig({
    required this.title,
    required this.minutes,
    required this.instructions,
    this.problems = const [],
  });

  factory PlacementConfig.fromJson(Object? raw) {
    final j = asMap(raw);
    return PlacementConfig(
      title: asStr(j['title']) ?? '',
      minutes: asInt(j['minutes']) ?? 0,
      instructions: asStr(j['instructions']) ?? '',
      problems: [for (final p in asList(j['problems'])) PlacementProblem.fromJson(p)],
    );
  }

  final String title;
  final int minutes;
  final String instructions;
  final List<PlacementProblem> problems;

  Json toJson() => {
    'title': title,
    'minutes': minutes,
    'instructions': instructions,
    'problems': [for (final p in problems) p.toConfigJson()],
  };
}
