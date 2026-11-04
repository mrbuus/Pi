import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';

/// Номын каталог, үнэгүй тест, жишиг сорилын загвар — api-contract/books-scan-public.md §1–2.
/// `code`-ийг сурагчид ХАРУУЛАХГҮЙ (зөвхөн маршрутад) — [BookSummary.name] ашигла.

Map<String, Object?> _map(Object? v) => ((v as Map?) ?? const {}).cast<String, Object?>();
List<Object?> _list(Object? v) => (v as List?) ?? const [];
int _int(Object? v) => (v as num?)?.toInt() ?? 0;

@immutable
class BookSummary {
  const BookSummary({
    required this.id,
    required this.code,
    required this.title,
    this.displayName,
    this.topics = 0,
    this.chapters = 0,
    this.tests = 0,
    this.solvableTests = 0,
    this.freeTests = 0,
    this.problems = 0,
  });

  factory BookSummary.fromJson(Map<String, Object?> j) => BookSummary(
        id: j['id']! as String,
        code: j['code']! as String,
        title: j['title'] as String? ?? '',
        displayName: j['displayName'] as String?,
        topics: _int(j['topics']),
        chapters: _int(j['chapters']),
        tests: _int(j['tests']),
        solvableTests: _int(j['solvableTests']),
        freeTests: _int(j['freeTests']),
        problems: _int(j['problems']),
      );

  final String id;
  final String code;
  final String title;
  final String? displayName;
  final int topics;
  final int chapters;
  final int tests;
  final int solvableTests;
  final int freeTests;
  final int problems;
}

@immutable
class BookTestItem {
  const BookTestItem({
    required this.id,
    required this.title,
    this.variantLabel,
    this.timeLimitMin,
    this.problemCount = 0,
    this.free = false,
    this.solvable = false,
  });

  factory BookTestItem.fromJson(Map<String, Object?> j) => BookTestItem(
        id: j['id']! as String,
        title: j['title'] as String? ?? '',
        variantLabel: j['variantLabel'] as String?,
        timeLimitMin: (j['timeLimitMin'] as num?)?.toInt(),
        problemCount: _int(j['problemCount']),
        free: j['free'] == true,
        solvable: j['solvable'] == true,
      );

  final String id;
  final String title;
  final String? variantLabel;
  final int? timeLimitMin;
  final int problemCount;

  /// Сервер шийднэ — апп тооцохгүй.
  final bool free;
  final bool solvable;
}

@immutable
class BookChapter {
  const BookChapter({required this.id, required this.title, required this.label, this.problems = 0, this.tests = const []});

  factory BookChapter.fromJson(Map<String, Object?> j) => BookChapter(
        id: j['id']! as String,
        title: j['title'] as String? ?? '',
        label: j['label'] as String? ?? (j['title'] as String? ?? ''),
        problems: _int(j['problems']),
        tests: [for (final t in _list(j['tests'])) BookTestItem.fromJson(_map(t))],
      );

  final String id;
  final String title;
  final String label;
  final int problems;
  final List<BookTestItem> tests;

  /// A/B хувилбарын шошгууд (эрэмбэлсэн).
  List<String> get variantLabels =>
      ({for (final t in tests) ?t.variantLabel}.toList()..sort());

  bool get anyFree => tests.any((t) => t.free);
}

@immutable
class BookTopic {
  const BookTopic({required this.name, this.chapters = const [], this.tests = 0, this.freeTests = 0, this.problems = 0});

  factory BookTopic.fromJson(Map<String, Object?> j) => BookTopic(
        name: j['name'] as String? ?? '',
        chapters: [for (final c in _list(j['chapters'])) BookChapter.fromJson(_map(c))],
        tests: _int(j['tests']),
        freeTests: _int(j['freeTests']),
        problems: _int(j['problems']),
      );

  final String name;
  final List<BookChapter> chapters;
  final int tests;
  final int freeTests;
  final int problems;
}

@immutable
class BookDetail {
  const BookDetail({
    required this.id,
    required this.code,
    required this.title,
    this.displayName,
    this.freeTests = 0,
    this.topics = const [],
  });

  factory BookDetail.fromJson(Map<String, Object?> j) => BookDetail(
        id: j['id']! as String,
        code: j['code']! as String,
        title: j['title'] as String? ?? '',
        displayName: j['displayName'] as String?,
        freeTests: _int(j['freeTests']),
        topics: [for (final t in _list(j['topics'])) BookTopic.fromJson(_map(t))],
      );

  final String id;
  final String code;
  final String title;
  final String? displayName;
  final int freeTests;
  final List<BookTopic> topics;
}

/// `GET /catalog/try/tests/:id` бодлого. Сонголт холилдохгүй (TEXT хариу = эх индекс).
@immutable
class TryProblem {
  const TryProblem({
    required this.id,
    required this.n,
    required this.format,
    this.statementText,
    this.points = 1,
    this.imageKey,
    this.choiceMode,
    this.choices,
    this.choiceImages,
  });

  factory TryProblem.fromJson(Map<String, Object?> j) => TryProblem(
        id: j['id']! as String,
        n: _int(j['n']),
        format: j['format'] as String? ?? 'CHOICE',
        statementText: j['statementText'] as String?,
        points: (j['points'] as num?) ?? 1,
        imageKey: j['imageKey'] as String?,
        choiceMode: j['choiceMode'] as String?,
        choices: j['choices'] == null ? null : [for (final c in _list(j['choices'])) c?.toString() ?? ''],
        choiceImages: j['choiceImages'] == null ? null : [for (final c in _list(j['choiceImages'])) c as String?],
      );

  final String id;
  final int n;

  /// `CHOICE | FILL_NUMBER | OPEN`.
  final String format;
  final String? statementText;
  final num points;
  final String? imageKey;

  /// `TEXT | LETTER | null`.
  final String? choiceMode;
  final List<String>? choices;
  final List<String?>? choiceImages;

  bool get hasChoices => choiceMode != null && choices != null && choices!.isNotEmpty;
}

@immutable
class TryView {
  const TryView({
    required this.id,
    required this.title,
    this.variantLabel,
    this.timeLimitMin,
    required this.chapterTitle,
    this.problems = const [],
  });

  factory TryView.fromJson(Map<String, Object?> j) => TryView(
        id: j['id']! as String,
        title: j['title'] as String? ?? '',
        variantLabel: j['variantLabel'] as String?,
        timeLimitMin: (j['timeLimitMin'] as num?)?.toInt(),
        chapterTitle: _map(j['chapter'])['title'] as String? ?? '',
        problems: [for (final p in _list(j['problems'])) TryProblem.fromJson(_map(p))],
      );

  final String id;
  final String title;
  final String? variantLabel;
  final int? timeLimitMin;
  final String chapterTitle;
  final List<TryProblem> problems;
}

@immutable
class TryResult {
  const TryResult({required this.score, required this.max, required this.answered, this.perProblem = const {}});

  factory TryResult.fromJson(Map<String, Object?> j) => TryResult(
        score: (j['score'] as num?) ?? 0,
        max: (j['max'] as num?) ?? 0,
        answered: _int(j['answered']),
        perProblem: {for (final e in _map(j['perProblem']).entries) e.key: e.value as bool?},
      );

  final num score;
  final num max;
  final int answered;

  /// `true` зөв, `false` буруу, `null` = хариуны түлхүүргүй (дүнд ороогүй).
  final Map<String, bool?> perProblem;

  int get percent => max == 0 ? 0 : (score / max * 100).round();
}

/// Жишиг сорилын үйл явдал.
@immutable
class MockEvent {
  const MockEvent({
    required this.id,
    required this.title,
    required this.startsAt,
    required this.endsAt,
    this.note,
    this.timeLimitMin,
    this.problemCount = 0,
    this.registered = 0,
    this.phase = 'upcoming',
  });

  factory MockEvent.fromJson(Map<String, Object?> j) => MockEvent(
        id: j['id']! as String,
        title: j['title'] as String? ?? '',
        startsAt: parseApiInstant(j['startsAt'] as String?) ?? DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
        endsAt: parseApiInstant(j['endsAt'] as String?) ?? DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
        note: j['note'] as String?,
        timeLimitMin: (j['timeLimitMin'] as num?)?.toInt(),
        problemCount: _int(j['problemCount']),
        registered: _int(j['registered']),
        phase: j['phase'] as String? ?? 'upcoming',
      );

  final String id;
  final String title;
  final DateTime startsAt;
  final DateTime endsAt;
  final String? note;
  final int? timeLimitMin;
  final int problemCount;
  final int registered;

  /// `upcoming | live | done`.
  final String phase;
}

@immutable
class MockLast {
  const MockLast({required this.title, required this.startsAt, this.participants = 0, this.avgPct});

  final String title;
  final DateTime? startsAt;
  final int participants;
  final num? avgPct;
}

@immutable
class MockPublic {
  const MockPublic({this.live, this.next, this.upcoming = const [], this.last});

  factory MockPublic.fromJson(Map<String, Object?> j) {
    MockEvent? ev(Object? v) => v is Map ? MockEvent.fromJson(v.cast<String, Object?>()) : null;
    final last = j['last'];
    return MockPublic(
      live: ev(j['live']),
      next: ev(j['next']),
      upcoming: [for (final e in _list(j['upcoming'])) ?ev(e)],
      last: last is Map
          ? MockLast(
              title: last['title'] as String? ?? '',
              startsAt: parseApiInstant(last['startsAt'] as String?),
              participants: _int(last['participants']),
              avgPct: last['avgPct'] as num?,
            )
          : null,
    );
  }

  final MockEvent? live;
  final MockEvent? next;
  final List<MockEvent> upcoming;
  final MockLast? last;

  bool get isEmpty => live == null && next == null && upcoming.isEmpty && last == null;
}
