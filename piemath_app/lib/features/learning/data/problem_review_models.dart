import 'package:flutter/foundation.dart';

import 'json.dart';
import 'mistake_models.dart';

/// Алдсан бодлогын хугацаатай давталт — `docs/api-contract/learning.md` §3.1.
/// Хариуны түлхүүр, бодолт зөвхөн хариулсны дараа (`ReviewAnswerResult`) ирнэ.

/// `GET /review/problems/due` мөр. `problem` нь алдааны дэвтрийнхтэй ижил хэлбэр.
@immutable
class DueReview {
  const DueReview({
    required this.id,
    required this.problem,
    this.dueAt,
    this.intervalDays = 1,
    this.reps = 0,
    this.lapses = 0,
    this.formulas = const [],
  });

  factory DueReview.fromJson(Object? raw) {
    final j = asMap(raw);
    return DueReview(
      id: asStr(j['id']) ?? '',
      problem: MistakeProblem.fromJson(j['problem']),
      dueAt: DateTime.tryParse(asStr(j['dueAt']) ?? ''),
      intervalDays: asInt(j['intervalDays']) ?? 1,
      reps: asInt(j['reps']) ?? 0,
      lapses: asInt(j['lapses']) ?? 0,
      formulas: [for (final f in asList(j['formulas'])) MistakeFormula.fromJson(f)],
    );
  }

  final String id;
  final MistakeProblem problem;
  final DateTime? dueAt;
  final int intervalDays;
  final int reps;
  final int lapses;
  final List<MistakeFormula> formulas;
}

@immutable
class DueReviews {
  const DueReviews({this.total = 0, this.items = const []});

  factory DueReviews.fromJson(Object? raw) {
    final j = asMap(raw);
    final items = [
      for (final i in asList(j['items']))
        if (DueReview.fromJson(i) case final r when r.id.isNotEmpty) r,
    ];
    return DueReviews(total: (asInt(j['total']) ?? items.length).clamp(items.length, 100000), items: items);
  }

  /// Хугацаа нь болсон нийт тоо (ачаалсан [items]-ээс их байж болно).
  final int total;
  final List<DueReview> items;
}

/// `POST /review/problems/:id/answer`.
@immutable
class ReviewAnswerResult {
  const ReviewAnswerResult({
    required this.correct,
    this.correctAnswer,
    this.solutionOutline,
    this.scheduled = false,
    this.dueAt,
    this.intervalDays,
  });

  factory ReviewAnswerResult.fromJson(Object? raw) {
    final j = asMap(raw);
    return ReviewAnswerResult(
      correct: j['correct'] == true,
      correctAnswer: j['correctAnswer'],
      solutionOutline: asStr(j['solutionOutline']),
      scheduled: asBool(j['scheduled']),
      dueAt: DateTime.tryParse(asStr(j['dueAt']) ?? ''),
      intervalDays: asInt(j['intervalDays']),
    );
  }

  final bool correct;
  final Object? correctAnswer;
  final String? solutionOutline;

  /// Хугацаа нь болсон тул хуваарь шинэчлэгдсэн эсэх.
  final bool scheduled;

  /// Дараагийн давталт.
  final DateTime? dueAt;
  final int? intervalDays;
}
