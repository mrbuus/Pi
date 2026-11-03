import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';
import '../domain/answer.dart';

/// Шалгалтын API-ийн Dart загварууд — `docs/api-contract/exam.md`.
///
/// Гараар задалсан (freezed биш): хариу нь `number | string | object` холимог, олон талбар
/// сонголттой — хатуу codegen-ээс уян задлагч найдвартай. Үл мэдэгдэх утга → аюулгүй өгөгдмөл.

typedef Json = Map<String, Object?>;

Json _map(Object? v) => v is Map ? v.cast<String, Object?>() : const {};
String? _str(Object? v) => v is String ? v : null;
int? _int(Object? v) => v is int ? v : (v is double && v.isFinite ? v.round() : null);
double? _num(Object? v) => v is num ? v.toDouble() : null;
bool _bool(Object? v) => v == true;
List<Object?> _list(Object? v) => v is List ? v : const [];

/// Сессийн төлөв.
enum SessionStatus {
  none,
  inProgress,
  submitted;

  static SessionStatus parse(Object? v) => switch (v) {
    'IN_PROGRESS' => inProgress,
    'SUBMITTED' => submitted,
    _ => none,
  };
}

@immutable
class ScorePair {
  const ScorePair(this.total, this.max);

  factory ScorePair.fromJson(Object? v) {
    final j = _map(v);
    return ScorePair(_num(j['totalScore'] ?? j['total']) ?? 0, _num(j['maxScore'] ?? j['max']) ?? 0);
  }

  final double total;
  final double max;

  int? get percent => max > 0 ? (total / max * 100).round() : null;

  @override
  bool operator ==(Object other) => other is ScorePair && other.total == total && other.max == max;

  @override
  int get hashCode => Object.hash(total, max);
}

/// Оноог «7» / «7.5» хэлбэрээр.
String formatScore(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);

@immutable
class TestBook {
  const TestBook({required this.code, this.displayName});

  final String code;
  final String? displayName;
}

/// Жагсаалтын мөр (`GET /tests?includeThousand=1`, `GET /exam-results/my`).
@immutable
class TestRow {
  const TestRow({
    required this.id,
    required this.title,
    required this.type,
    this.gradingMode,
    this.timeLimitMin,
    this.variantLabel,
    this.groupKey,
    this.book,
    this.problemCount = 0,
    this.results = const [],
    this.sessionStatus = SessionStatus.none,
    this.upcoming = false,
    this.assignedAt,
    this.percent,
    this.takenAt,
    this.absent = false,
  });

  /// [deriveUpcoming] — `/exam-results/my`: `upcoming` ирээгүй бол `assignedAt > одоо` (вэб `useMyExams`).
  factory TestRow.fromJson(Object? raw, {bool deriveUpcoming = false, DateTime? now}) {
    final j = _map(raw);
    final assigned = parseApiInstant(_str(j['assignedAt']));
    final chapter = _map(j['chapter']);
    final book = _map(chapter['book']);
    return TestRow(
      id: _str(j['id']) ?? '',
      title: _str(j['title']) ?? '',
      type: _str(j['type']) ?? 'CUSTOM',
      gradingMode: _str(j['gradingMode']),
      timeLimitMin: _int(j['timeLimitMin']),
      variantLabel: _str(j['variantLabel']),
      groupKey: _str(j['groupKey']),
      book: _str(book['code']) == null
          ? null
          : TestBook(code: _str(book['code'])!, displayName: _str(book['displayName'])),
      problemCount: _int(_map(j['_count'])['problems']) ?? _int(j['problemCount']) ?? 0,
      results: [for (final r in _list(j['results'])) ScorePair.fromJson(r)],
      sessionStatus: SessionStatus.parse(j['sessionStatus']),
      upcoming: j['upcoming'] is bool
          ? j['upcoming'] == true
          : deriveUpcoming && assigned != null && assigned.isAfter(now ?? DateTime.now()),
      assignedAt: assigned,
      percent: _int(j['percent']),
      takenAt: parseApiInstant(_str(j['takenAt'])),
      absent: _bool(j['absent']),
    );
  }

  final String id;
  final String title;
  final String type;
  final String? gradingMode;
  final int? timeLimitMin;
  final String? variantLabel;
  final String? groupKey;
  final TestBook? book;
  final int problemCount;
  final List<ScorePair> results;
  final SessionStatus sessionStatus;
  final bool upcoming;
  final DateTime? assignedAt;
  final int? percent;
  final DateTime? takenAt;
  final bool absent;

  bool get manual => gradingMode == 'MANUAL';
  ScorePair? get result => results.isEmpty ? null : results.first;
  bool get done => result != null || sessionStatus == SessionStatus.submitted;
}

/// `GET /tests/my-results` — миний бүх дүн (дасгал тест ч). Апп зөвхөн энэ талбарыг уншина (§1.3).
@immutable
class MyResult {
  const MyResult({
    required this.id,
    required this.testId,
    required this.title,
    required this.type,
    required this.score,
    this.createdAt,
  });

  factory MyResult.fromJson(Object? raw) {
    final j = _map(raw);
    final test = _map(j['test']);
    return MyResult(
      id: _str(j['id']) ?? '',
      testId: _str(test['id']) ?? _str(j['testId']) ?? '',
      title: _str(test['title']) ?? '',
      type: _str(test['type']) ?? 'CUSTOM',
      score: ScorePair.fromJson(j),
      createdAt: parseApiInstant(_str(j['createdAt'])),
    );
  }

  final String id;
  final String testId;
  final String title;
  final String type;
  final ScorePair score;
  final DateTime? createdAt;
}

/// `GET /tests/:id` — интро мета.
@immutable
class TestMeta {
  const TestMeta({
    required this.id,
    required this.title,
    required this.type,
    this.gradingMode,
    this.timeLimitMin,
    this.variantLabel,
    this.problemCount = 0,
    this.totalPoints = 0,
    this.myResult,
    this.sessionStatus = SessionStatus.none,
  });

  factory TestMeta.fromJson(Object? raw) {
    final j = _map(raw);
    return TestMeta(
      id: _str(j['id']) ?? '',
      title: _str(j['title']) ?? '',
      type: _str(j['type']) ?? 'CUSTOM',
      gradingMode: _str(j['gradingMode']),
      timeLimitMin: _int(j['timeLimitMin']),
      variantLabel: _str(j['variantLabel']),
      problemCount: _int(j['problemCount']) ?? 0,
      totalPoints: _num(j['totalPoints']) ?? 0,
      myResult: j['myResult'] is Map ? ScorePair.fromJson(j['myResult']) : null,
      sessionStatus: SessionStatus.parse(j['sessionStatus']),
    );
  }

  final String id;
  final String title;
  final String type;
  final String? gradingMode;
  final int? timeLimitMin;
  final String? variantLabel;
  final int problemCount;
  final double totalPoints;
  final ScorePair? myResult;
  final SessionStatus sessionStatus;

  bool get manual => gradingMode == 'MANUAL';
  bool get finished => sessionStatus == SessionStatus.submitted || myResult != null;
}

enum ProblemFormat {
  choice,
  fillNumber,
  open;

  static ProblemFormat parse(Object? v) => switch (v) {
    'FILL_NUMBER' => fillNumber,
    'OPEN' => open,
    _ => choice,
  };
}

enum ChoiceMode { text, letter }

/// Шалгалтын бодлого (start-ийн `problems[]`). Хариуны түлхүүр ХЭЗЭЭ Ч ирэхгүй.
@immutable
class ExamProblem {
  const ExamProblem({
    required this.id,
    required this.format,
    this.statementText,
    this.imageKey,
    this.points = 1,
    this.choiceMode,
    this.choices,
    this.choiceImages,
  });

  factory ExamProblem.fromJson(Object? raw) {
    final j = _map(raw);
    final mode = switch (j['choiceMode']) {
      'TEXT' => ChoiceMode.text,
      'LETTER' => ChoiceMode.letter,
      _ => null,
    };
    final choices = j['choices'] is List ? [for (final c in _list(j['choices'])) c is String ? c : ''] : null;
    final images = j['choiceImages'] is List ? [for (final c in _list(j['choiceImages'])) _str(c)] : null;
    return ExamProblem(
      id: _str(j['id']) ?? '',
      format: ProblemFormat.parse(j['format']),
      statementText: _str(j['statementText']),
      imageKey: _str(j['imageKey']),
      points: _num(j['points']) ?? 1,
      choiceMode: mode,
      choices: choices,
      choiceImages: images,
    );
  }

  final String id;
  final ProblemFormat format;
  final String? statementText;
  final String? imageKey;
  final double points;
  final ChoiceMode? choiceMode;
  final List<String>? choices;
  final List<String?>? choiceImages;

  bool get isChoice => format == ProblemFormat.choice && choices != null && choices!.isNotEmpty;
}

/// `POST /tests/:id/start` хариу.
@immutable
class StartResult {
  const StartResult({
    required this.status,
    this.title,
    this.variantLabel,
    this.timeLimitMin,
    this.remainingSec,
    this.leaveCount = 0,
    this.draftAnswers = const {},
    this.draftStates = const {},
    this.problems = const [],
    this.result,
  });

  factory StartResult.fromJson(Object? raw) {
    final j = _map(raw);
    final s = _map(j['session']);
    final t = _map(j['test']);
    return StartResult(
      status: SessionStatus.parse(s['status']),
      title: _str(t['title']),
      variantLabel: _str(t['variantLabel']),
      timeLimitMin: _int(t['timeLimitMin']),
      remainingSec: _int(s['remainingSec']),
      leaveCount: _int(s['leaveCount']) ?? 0,
      draftAnswers: {
        for (final e in _map(s['draftAnswers']).entries)
          if (normalizeAnswer(e.value) != null) e.key: normalizeAnswer(e.value),
      },
      draftStates: {
        for (final e in _map(s['draftStates']).entries)
          if (SelfState.fromWire(e.value) != null) e.key: SelfState.fromWire(e.value)!,
      },
      problems: [for (final p in _list(j['problems'])) ExamProblem.fromJson(p)],
      result: j['result'] is Map ? ScorePair.fromJson(j['result']) : null,
    );
  }

  final SessionStatus status;
  final String? title;
  final String? variantLabel;
  final int? timeLimitMin;

  /// Серверийн `deadlineAt - now` (null = хугацаагүй).
  final int? remainingSec;
  final int leaveCount;
  final Map<String, Object?> draftAnswers;
  final Map<String, SelfState> draftStates;
  final List<ExamProblem> problems;
  final ScorePair? result;
}

/// `PATCH /tests/:id/session` хариу.
@immutable
class SaveResponse {
  const SaveResponse({required this.status, this.leaveCount, this.remainingSec, this.result});

  factory SaveResponse.fromJson(Object? raw) {
    final j = _map(raw);
    return SaveResponse(
      status: SessionStatus.parse(j['status']),
      leaveCount: _int(j['leaveCount']),
      remainingSec: _int(j['remainingSec']),
      result: j['result'] is Map ? ScorePair.fromJson(j['result']) : null,
    );
  }

  final SessionStatus status;
  final int? leaveCount;
  final int? remainingSec;
  final ScorePair? result;
}

/// Эргэн харалтын сонголт (`{letter, text, image}` — канон дараалал).
@immutable
class ReviewChoice {
  const ReviewChoice({required this.letter, this.text = '', this.image});

  factory ReviewChoice.fromJson(Object? raw) {
    final j = _map(raw);
    return ReviewChoice(letter: _str(j['letter']) ?? '', text: _str(j['text']) ?? '', image: _str(j['image']));
  }

  final String letter;
  final String text;
  final String? image;
}

@immutable
class YoutubeLink {
  const YoutubeLink(this.url, this.embedUrl);

  static YoutubeLink? fromJson(Object? raw) {
    final j = _map(raw);
    final url = _str(j['url']);
    if (url == null || !_safeYoutube(url)) return null;
    return YoutubeLink(url, _str(j['embedUrl']));
  }

  final String url;
  final String? embedUrl;

  static bool _safeYoutube(String url) {
    final u = Uri.tryParse(url);
    if (u == null || u.scheme != 'https') return false;
    return u.host == 'www.youtube.com' || u.host == 'youtube.com' || u.host == 'youtu.be' || u.host == 'm.youtube.com';
  }
}

/// Хариуг харуулах бичвэр болгох (`"C"`, `"35"`, `{a:"3"}` → «a = 3»).
String? answerDisplay(Object? v) {
  if (v == null) return null;
  if (v is String) return v.isEmpty ? null : v;
  if (v is num) return formatScore(v.toDouble());
  if (v is Map) {
    final parts = [
      for (final e in v.entries)
        if (e.value is String && (e.value as String).isNotEmpty) '${e.key} = ${e.value}',
    ];
    return parts.isEmpty ? null : parts.join(', ');
  }
  return null;
}

/// 1000 бодлого / шалгалтын бодлогын эргэн харалт (§5.1 `wrong[].problem`, §5.3 `items[]`).
@immutable
class ReviewProblem {
  const ReviewProblem({
    required this.format,
    this.statementText,
    this.imageKey,
    this.choices,
    this.myAnswer,
    this.correctAnswer,
    this.solution,
    this.answerNeedsCheck = false,
    this.youtube,
  });

  factory ReviewProblem.fromJson(Object? raw) {
    final j = _map(raw);
    return ReviewProblem(
      format: ProblemFormat.parse(j['format']),
      statementText: _str(j['statementText']),
      imageKey: _str(j['imageKey']),
      choices: j['choices'] is List ? [for (final c in _list(j['choices'])) ReviewChoice.fromJson(c)] : null,
      myAnswer: normalizeAnswer(j['myAnswer']),
      correctAnswer: normalizeAnswer(j['correctAnswer']),
      solution: _str(j['solution']),
      answerNeedsCheck: _bool(j['answerNeedsCheck']),
      youtube: YoutubeLink.fromJson(j['youtube']),
    );
  }

  final ProblemFormat format;
  final String? statementText;
  final String? imageKey;
  final List<ReviewChoice>? choices;
  final Object? myAnswer;
  final Object? correctAnswer;
  final String? solution;
  final bool answerNeedsCheck;
  final YoutubeLink? youtube;
}

/// Эргэн харалтын түвшин (THOUSAND; бусад нь үргэлж FULL).
enum ReviewLevel {
  none,
  problems,
  full;

  static ReviewLevel parse(Object? v) => switch (v) {
    'FULL' => full,
    'PROBLEMS' => problems,
    _ => none,
  };
}

@immutable
class WrongStep {
  const WrongStep({required this.label, required this.blank, this.points = 0});

  final String label;
  final bool blank;
  final double points;
}

@immutable
class WrongItem {
  const WrongItem({required this.n, required this.part, this.steps = const [], this.lost = 0, this.problem});

  factory WrongItem.fromJson(Object? raw) {
    final j = _map(raw);
    return WrongItem(
      n: _int(j['n']) ?? 0,
      part: _int(j['part']) ?? 1,
      steps: [
        for (final s in _list(j['items']))
          WrongStep(
            label: _str(_map(s)['label']) ?? '',
            blank: _map(s)['status'] == 'BLANK',
            points: _num(_map(s)['points']) ?? 0,
          ),
      ],
      lost: _num(j['lost']) ?? 0,
      problem: j['problem'] is Map ? ReviewProblem.fromJson(j['problem']) : null,
    );
  }

  final int n;
  final int part;
  final List<WrongStep> steps;
  final double lost;
  final ReviewProblem? problem;

  bool get allBlank => steps.isNotEmpty && steps.every((s) => s.blank);
}

@immutable
class TopicScore {
  const TopicScore({required this.name, this.percent, this.earned = 0, this.max = 0});

  final String name;
  final int? percent;
  final double earned;
  final double max;
}

/// `GET /exam-results/my/:testId` (§5.1).
@immutable
class ExamResultPage {
  const ExamResultPage({
    required this.testId,
    required this.title,
    required this.type,
    this.absent = false,
    this.result,
    this.percent,
    this.part1,
    this.part1Max,
    this.part2,
    this.part2Max,
    this.reviewLevel = ReviewLevel.full,
    this.reviewOpensAt,
    this.reviewOpen = false,
    this.fullReview = false,
    this.topics = const [],
    this.wrong,
    this.practiceTopic,
    this.practiceChapterIds = const [],
  });

  factory ExamResultPage.fromJson(Object? raw) {
    final j = _map(raw);
    final t = _map(j['test']);
    final r = _map(j['result']);
    final parts = _map(j['parts']);
    final review = _map(j['review']);
    final practice = _map(j['practice']);
    return ExamResultPage(
      testId: _str(t['id']) ?? '',
      title: _str(t['title']) ?? '',
      type: _str(t['type']) ?? '',
      absent: _bool(j['absent']),
      result: j['result'] is Map ? ScorePair.fromJson(r) : null,
      percent: _int(r['percent']),
      part1: _num(parts['part1']),
      part1Max: _num(parts['part1Max']),
      part2: _num(parts['part2']),
      part2Max: _num(parts['part2Max']),
      reviewLevel: ReviewLevel.parse(review['level']),
      reviewOpensAt: parseApiInstant(_str(review['opensAt'])),
      reviewOpen: _bool(review['open']),
      fullReview: _bool(review['fullReview']),
      topics: [
        for (final tp in _list(j['topics']))
          TopicScore(
            name: _str(_map(tp)['name']) ?? '',
            percent: _int(_map(tp)['percent']),
            earned: _num(_map(tp)['earned']) ?? 0,
            max: _num(_map(tp)['max']) ?? 0,
          ),
      ],
      wrong: j['wrong'] is List ? [for (final w in _list(j['wrong'])) WrongItem.fromJson(w)] : null,
      practiceTopic: _str(practice['topic']),
      practiceChapterIds: [
        for (final c in _list(practice['chapterIds']))
          if (c is String) c,
      ],
    );
  }

  final String testId;
  final String title;
  final String type;
  final bool absent;
  final ScorePair? result;
  final int? percent;
  final double? part1;
  final double? part1Max;
  final double? part2;
  final double? part2Max;
  final ReviewLevel reviewLevel;
  final DateTime? reviewOpensAt;
  final bool reviewOpen;
  final bool fullReview;
  final List<TopicScore> topics;
  final List<WrongItem>? wrong;
  final String? practiceTopic;
  final List<String> practiceChapterIds;
}

/// `GET /tests/:id/review` мөр (§5.2).
@immutable
class PracticeReviewItem {
  const PracticeReviewItem({
    required this.n,
    this.points = 0,
    this.chapterTitle,
    this.statementText,
    this.imageKey,
    this.answered = false,
    this.correct = false,
    this.answerUnknown = false,
    this.myAnswer,
    this.solution,
  });

  factory PracticeReviewItem.fromJson(Object? raw) {
    final j = _map(raw);
    return PracticeReviewItem(
      n: _int(j['n']) ?? 0,
      points: _num(j['points']) ?? 0,
      chapterTitle: _str(j['chapterTitle']),
      statementText: _str(j['statementText']),
      imageKey: _str(j['imageKey']),
      answered: _bool(j['answered']),
      correct: _bool(j['correct']),
      answerUnknown: _bool(j['answerUnknown']),
      myAnswer: _str(j['myAnswer']) ?? answerDisplay(normalizeAnswer(j['myAnswer'])),
      solution: _str(j['solution']),
    );
  }

  final int n;
  final double points;
  final String? chapterTitle;
  final String? statementText;
  final String? imageKey;
  final bool answered;
  final bool correct;
  final bool answerUnknown;
  final String? myAnswer;
  final String? solution;
}

@immutable
class PracticeReview {
  const PracticeReview({this.result, this.items = const [], this.leaveCount = 0, this.gatedReview = false});

  factory PracticeReview.fromJson(Object? raw) {
    final j = _map(raw);
    return PracticeReview(
      result: j['result'] is Map ? ScorePair.fromJson(j['result']) : null,
      items: [for (final i in _list(j['items'])) PracticeReviewItem.fromJson(i)],
      leaveCount: _int(j['leaveCount']) ?? 0,
      gatedReview: _bool(j['gatedReview']),
    );
  }

  final ScorePair? result;
  final List<PracticeReviewItem> items;
  final int leaveCount;

  /// THOUSAND — сервер талын хаалттай эргэн харалт руу шилжинэ.
  final bool gatedReview;
}

@immutable
class ThousandReviewItem {
  const ThousandReviewItem({
    required this.n,
    required this.problem,
    this.points = 0,
    this.answered = false,
    this.answerKnown = true,
    this.correct,
  });

  factory ThousandReviewItem.fromJson(Object? raw) {
    final j = _map(raw);
    return ThousandReviewItem(
      n: _int(j['n']) ?? 0,
      problem: ReviewProblem.fromJson(j),
      points: _num(j['points']) ?? 0,
      answered: _bool(j['answered']),
      answerKnown: j['answerKnown'] != false,
      correct: j['correct'] is bool ? j['correct']! as bool : null,
    );
  }

  final int n;
  final ReviewProblem problem;
  final double points;
  final bool answered;
  final bool answerKnown;

  /// `null` = PROBLEMS түвшин эсвэл хариу тодорхойгүй.
  final bool? correct;
}

/// `GET /thousand/tests/:testId/review` (§5.3).
@immutable
class ThousandReview {
  const ThousandReview({
    required this.title,
    this.result,
    this.level = ReviewLevel.none,
    this.opensAt,
    this.items = const [],
  });

  factory ThousandReview.fromJson(Object? raw) {
    final j = _map(raw);
    return ThousandReview(
      title: _str(_map(j['test'])['title']) ?? '',
      result: j['result'] is Map ? ScorePair.fromJson(j['result']) : null,
      level: ReviewLevel.parse(j['level']),
      opensAt: parseApiInstant(_str(j['opensAt'])),
      items: [for (final i in _list(j['items'])) ThousandReviewItem.fromJson(i)],
    );
  }

  final String title;
  final ScorePair? result;
  final ReviewLevel level;
  final DateTime? opensAt;
  final List<ThousandReviewItem> items;
}
