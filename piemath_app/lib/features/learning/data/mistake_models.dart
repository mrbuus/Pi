import 'package:flutter/foundation.dart';

import '../../exam/data/exam_models.dart' show ChoiceMode, ExamProblem, ProblemFormat;
import 'json.dart';

/// Алдааны дэвтрийн загварууд — `docs/api-contract/learning.md` §1.
/// Хариуны түлхүүр, бодолт зөвхөн СЕРВЕР өгөхөд (дахин оролдсоны дараа) л ирнэ.

enum MistakeStatus {
  fresh('NEW', 'Шинэ'),
  retrying('RETRYING', 'Давтаж байна'),
  mastered('MASTERED', 'Эзэмшсэн');

  const MistakeStatus(this.wire, this.label);

  final String wire;
  final String label;

  static MistakeStatus parse(Object? v) {
    for (final s in values) {
      if (s.wire == v) return s;
    }
    return fresh;
  }
}

/// Алдааны шалтгаан (`PATCH /mistakes/:id`).
enum MistakeReason {
  calc('CALC', 'Бодолтын алдаа'),
  concept('CONCEPT', 'Ойлголт'),
  formula('FORMULA', 'Томьёо мартсан'),
  reading('READING', 'Буруу уншсан'),
  time('TIME', 'Цаг дууссан'),
  unknown('UNKNOWN', 'Мэдэхгүй');

  const MistakeReason(this.wire, this.label);

  final String wire;
  final String label;

  static MistakeReason? parse(Object? v) {
    for (final r in values) {
      if (r.wire == v) return r;
    }
    return null;
  }
}

/// Эх сурвалж шүүлтүүр (`source`).
enum MistakeSource {
  practice('PRACTICE', 'Дасгал'),
  test('TEST', 'Тест');

  const MistakeSource(this.wire, this.label);

  final String wire;
  final String label;
}

@immutable
class MistakeProblem {
  const MistakeProblem({
    required this.id,
    required this.format,
    this.statementText,
    this.imageKey,
    this.choiceMode,
    this.choices,
    this.answerFields = const [],
  });

  factory MistakeProblem.fromJson(Object? raw) {
    final j = asMap(raw);
    final mode = switch (j['choiceMode']) {
      'TEXT' => ChoiceMode.text,
      'LETTER' => ChoiceMode.letter,
      _ => null,
    };
    final choices = j['choices'] is List ? [for (final c in asList(j['choices'])) c is String ? c : '$c'] : null;
    return MistakeProblem(
      id: asStr(j['id']) ?? '',
      format: ProblemFormat.parse(j['format']),
      statementText: asStr(j['statementText']),
      imageKey: asStr(j['imageKey']),
      choiceMode: mode,
      choices: choices,
      answerFields: [for (final f in asList(j['answerFields'])) if (f is String && f.isNotEmpty) f],
    );
  }

  final String id;
  final ProblemFormat format;
  final String? statementText;
  final String? imageKey;
  final ChoiceMode? choiceMode;
  final List<String>? choices;

  /// FILL_NUMBER-ийн объект хариуны түлхүүрүүд (`{"a": "3", "bc": "54"}`).
  final List<String> answerFields;

  bool get isChoice => format == ProblemFormat.choice && choices != null && choices!.isNotEmpty;

  /// Шалгалтын хариу оруулах widget-үүдийг дахин ашиглахын тулд.
  ExamProblem toExamProblem() => ExamProblem(
    id: id,
    format: format,
    statementText: statementText,
    imageKey: imageKey,
    choiceMode: choiceMode,
    choices: choices,
  );
}

@immutable
class MistakeFormula {
  const MistakeFormula({required this.slug, required this.title, this.latex});

  factory MistakeFormula.fromJson(Object? raw) {
    final j = asMap(raw);
    return MistakeFormula(
      slug: asStr(j['slug']) ?? '',
      title: asStr(j['title']) ?? '',
      latex: asStr(j['latex']),
    );
  }

  final String slug;
  final String title;
  final String? latex;
}

@immutable
class Mistake {
  const Mistake({
    required this.id,
    required this.problem,
    required this.status,
    this.givenAnswer,
    this.retryCount = 0,
    this.reason,
    this.note,
    this.testTitle,
    this.nextRetryAt,
    this.formulas = const [],
    this.correctAnswer,
    this.solutionOutline,
  });

  factory Mistake.fromJson(Object? raw) {
    final j = asMap(raw);
    return Mistake(
      id: asStr(j['id']) ?? '',
      problem: MistakeProblem.fromJson(j['problem']),
      status: MistakeStatus.parse(j['status']),
      givenAnswer: j['givenAnswer'],
      retryCount: asInt(j['retryCount']) ?? 0,
      reason: MistakeReason.parse(j['reason']),
      note: asStr(j['note']),
      testTitle: asStr(j['testTitle']),
      nextRetryAt: DateTime.tryParse(asStr(j['nextRetryAt']) ?? ''),
      formulas: [for (final f in asList(j['formulas'])) MistakeFormula.fromJson(f)],
      correctAnswer: j['correctAnswer'],
      solutionOutline: asStr(j['solutionOutline']),
    );
  }

  final String id;
  final MistakeProblem problem;
  final MistakeStatus status;
  final Object? givenAnswer;
  final int retryCount;
  final MistakeReason? reason;
  final String? note;
  final String? testTitle;
  final DateTime? nextRetryAt;
  final List<MistakeFormula> formulas;

  /// Сервер дахин оролдсоны дараа (эсвэл MASTERED үед) л илгээнэ.
  final Object? correctAnswer;
  final String? solutionOutline;

  bool get hasSolutionRevealed => correctAnswer != null;

  Mistake copyWith({
    MistakeStatus? status,
    int? retryCount,
    Object? reason = _keep,
    Object? note = _keep,
    Object? nextRetryAt = _keep,
    Object? correctAnswer = _keep,
    Object? solutionOutline = _keep,
  }) => Mistake(
    id: id,
    problem: problem,
    status: status ?? this.status,
    givenAnswer: givenAnswer,
    retryCount: retryCount ?? this.retryCount,
    reason: identical(reason, _keep) ? this.reason : reason as MistakeReason?,
    note: identical(note, _keep) ? this.note : note as String?,
    testTitle: testTitle,
    nextRetryAt: identical(nextRetryAt, _keep) ? this.nextRetryAt : nextRetryAt as DateTime?,
    formulas: formulas,
    correctAnswer: identical(correctAnswer, _keep) ? this.correctAnswer : correctAnswer,
    solutionOutline: identical(solutionOutline, _keep) ? this.solutionOutline : solutionOutline as String?,
  );
}

const Object _keep = Object();

@immutable
class MistakeCounts {
  const MistakeCounts({this.fresh = 0, this.retrying = 0, this.mastered = 0});

  factory MistakeCounts.fromJson(Object? raw) {
    final j = asMap(raw);
    return MistakeCounts(
      fresh: asInt(j['NEW']) ?? 0,
      retrying: asInt(j['RETRYING']) ?? 0,
      mastered: asInt(j['MASTERED']) ?? 0,
    );
  }

  final int fresh;
  final int retrying;
  final int mastered;

  int get total => fresh + retrying + mastered;

  int of(MistakeStatus s) => switch (s) {
    MistakeStatus.fresh => fresh,
    MistakeStatus.retrying => retrying,
    MistakeStatus.mastered => mastered,
  };

  /// Нэг алдааны төлөв өөрчлөгдөхөд тоог зөөнө (сервер дахин тоолохыг хүлээхгүй, дараагийн ачаалалд баталгаажна).
  MistakeCounts moved(MistakeStatus from, MistakeStatus to) {
    if (from == to) return this;
    int adj(MistakeStatus s, int v) => s == from ? (v > 0 ? v - 1 : 0) : (s == to ? v + 1 : v);
    return MistakeCounts(
      fresh: adj(MistakeStatus.fresh, fresh),
      retrying: adj(MistakeStatus.retrying, retrying),
      mastered: adj(MistakeStatus.mastered, mastered),
    );
  }
}

@immutable
class TopicCount {
  const TopicCount(this.topic, this.count);

  final String topic;
  final int count;
}

/// `GET /mistakes/my` хариу (нэг хуудас).
@immutable
class Notebook {
  const Notebook({
    required this.counts,
    required this.byTopic,
    required this.items,
    this.nextCursor,
  });

  factory Notebook.fromJson(Object? raw) {
    final j = asMap(raw);
    return Notebook(
      counts: MistakeCounts.fromJson(j['counts']),
      byTopic: [
        for (final t in asList(j['byTopic']))
          if (asStr(asMap(t)['topic']) != null) TopicCount(asStr(asMap(t)['topic'])!, asInt(asMap(t)['count']) ?? 0),
      ],
      items: [for (final i in asList(j['items'])) Mistake.fromJson(i)],
      nextCursor: asStr(j['nextCursor']),
    );
  }

  final MistakeCounts counts;
  final List<TopicCount> byTopic;
  final List<Mistake> items;
  final String? nextCursor;

  Notebook copyWith({MistakeCounts? counts, List<Mistake>? items, Object? nextCursor = _keep}) => Notebook(
    counts: counts ?? this.counts,
    byTopic: byTopic,
    items: items ?? this.items,
    nextCursor: identical(nextCursor, _keep) ? this.nextCursor : nextCursor as String?,
  );
}

/// `POST /mistakes/:id/retry` хариу — зөв эсэхийг СЕРВЕР шийднэ.
@immutable
class RetryResult {
  const RetryResult({
    required this.correct,
    required this.status,
    this.correctAnswer,
    this.retryCount,
    this.nextRetryAt,
    this.solutionOutline,
  });

  factory RetryResult.fromJson(Object? raw) {
    final j = asMap(raw);
    return RetryResult(
      correct: j['correct'] == true,
      status: MistakeStatus.parse(j['status']),
      correctAnswer: j['correctAnswer'],
      retryCount: asInt(j['retryCount']),
      nextRetryAt: DateTime.tryParse(asStr(j['nextRetryAt']) ?? ''),
      solutionOutline: asStr(j['solutionOutline']),
    );
  }

  final bool correct;
  final MistakeStatus status;
  final Object? correctAnswer;
  final int? retryCount;
  final DateTime? nextRetryAt;
  final String? solutionOutline;

  Mistake applyTo(Mistake m) => m.copyWith(
    status: status,
    retryCount: retryCount ?? m.retryCount + 1,
    nextRetryAt: nextRetryAt,
    correctAnswer: correctAnswer,
    solutionOutline: solutionOutline,
  );
}
