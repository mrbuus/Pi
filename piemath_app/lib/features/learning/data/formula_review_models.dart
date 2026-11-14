import 'package:flutter/foundation.dart';

import 'json.dart';

/// Томьёо цээжлэх (SRS) — `api/src/formulas` `/formulas/review/*`; вэбийн `components/formulas/review/types.ts`.

enum ReviewResult {
  again('AGAIN', 'Дахиад'),
  hard('HARD', 'Хэцүү'),
  good('GOOD', 'Зөв'),
  easy('EASY', 'Амархан');

  const ReviewResult(this.api, this.label);

  final String api;
  final String label;

  static ReviewResult? fromApi(String? v) {
    for (final r in values) {
      if (r.api == v) return r;
    }
    return null;
  }
}

enum ReviewMode {
  flashcard('flashcard', 'Флэш карт'),
  blank('blank', 'Нөхөх'),
  trueFalse('truefalse', 'Үнэн эсвэл худал'),
  match('match', 'Хос тааруулах');

  const ReviewMode(this.api, this.label);

  final String api;
  final String label;

  /// Үл мэдэгдэх горим → флэш карт (өөрийн үнэлгээ, аюулгүй өгөгдмөл).
  static ReviewMode fromApi(String? v) => values.firstWhere((m) => m.api == v, orElse: () => flashcard);
}

@immutable
class ReviewOption {
  const ReviewOption({required this.id, required this.text});

  final String id;
  final String text;
}

@immutable
class ReviewExercise {
  const ReviewExercise({required this.mode, required this.token, this.groupId, this.prompt, this.options = const []});

  factory ReviewExercise.fromJson(Object? raw) {
    final j = asMap(raw);
    return ReviewExercise(
      mode: ReviewMode.fromApi(asStr(j['mode'])),
      token: asStr(j['token']) ?? '',
      groupId: asStr(j['groupId']),
      prompt: asStr(j['prompt']),
      options: [
        for (final o in asList(j['options']))
          ReviewOption(id: asStr(asMap(o)['id']) ?? '', text: asStr(asMap(o)['text']) ?? ''),
      ],
    );
  }

  final ReviewMode mode;
  final String token;
  final String? groupId;
  final String? prompt;
  final List<ReviewOption> options;
}

@immutable
class ReviewCard {
  const ReviewCard({
    required this.slug,
    required this.title,
    required this.exercise,
    this.section,
    this.latex,
    this.general,
  });

  factory ReviewCard.fromJson(Object? raw) {
    final j = asMap(raw);
    return ReviewCard(
      slug: asStr(j['slug']) ?? '',
      title: asStr(j['title']) ?? '',
      section: asStr(j['section']),
      latex: asStr(j['latex']),
      general: asStr(j['general']),
      exercise: ReviewExercise.fromJson(j['exercise']),
    );
  }

  final String slug;
  final String title;
  final String? section;
  final String? latex;
  final String? general;
  final ReviewExercise exercise;
}

/// Хязгаарын томьёо (`\\lim`) давтлагын картад хэзээ ч гарахгүй (эзэн 2026-11-10). Сервер ч шүүдэг; энд прод
/// шинэчлэгдэхээс өмнөх хариунд зориулав. Харьцуулах картын бүлгийн нэг нь хязгаар бол бүлгийг бүхэлд нь хасна.
const _limitSlugs = {'fn-e-number', 'calc-derivative-definition'};

bool isLimitCard(ReviewCard c) =>
    c.slug.startsWith('calc-limit-') || _limitSlugs.contains(c.slug) || (c.latex?.contains(r'\lim') ?? false);

List<ReviewCard> withoutLimitCards(Iterable<ReviewCard> cards) {
  final list = cards.toList();
  final badGroups = {for (final c in list) if (isLimitCard(c) && c.exercise.groupId != null) c.exercise.groupId};
  return [for (final c in list) if (!isLimitCard(c) && !badGroups.contains(c.exercise.groupId)) c];
}

/// `GET /formulas/review/due`.
@immutable
class ReviewDue {
  const ReviewDue({required this.dueCount, required this.newCount, required this.cards});

  factory ReviewDue.fromJson(Object? raw) {
    final j = asMap(raw);
    return ReviewDue(
      dueCount: asInt(j['dueCount']) ?? 0,
      newCount: asInt(j['newCount']) ?? 0,
      cards: withoutLimitCards([for (final c in asList(j['cards'])) ReviewCard.fromJson(c)].where((c) => c.slug.isNotEmpty)),
    );
  }

  final int dueCount;
  final int newCount;
  final List<ReviewCard> cards;

  int get total => dueCount + newCount;
}

/// `GET /formulas/review/stats`.
@immutable
class ReviewStats {
  const ReviewStats({
    this.mastered = 0,
    this.learning = 0,
    this.fresh = 0,
    this.reviewedToday = 0,
    this.streakDays = 0,
  });

  factory ReviewStats.fromJson(Object? raw) {
    final j = asMap(raw);
    return ReviewStats(
      mastered: asInt(j['mastered']) ?? 0,
      learning: asInt(j['learning']) ?? 0,
      fresh: asInt(j['new']) ?? 0,
      reviewedToday: asInt(j['reviewedToday']) ?? 0,
      streakDays: asInt(j['streakDays']) ?? 0,
    );
  }

  final int mastered;
  final int learning;
  final int fresh;
  final int reviewedToday;
  final int streakDays;
}

@immutable
class ReviewFeedback {
  const ReviewFeedback({required this.correct, required this.answer, this.why});

  final bool correct;
  final String answer;
  final String? why;
}

/// `POST /formulas/review/{slug}` — хариулт хадгалсан баримт.
@immutable
class ReviewReceipt {
  const ReviewReceipt({required this.slug, required this.dueAt, this.result, this.feedback});

  factory ReviewReceipt.fromJson(Object? raw) {
    final j = asMap(raw);
    final f = j['feedback'];
    final fm = asMap(f);
    return ReviewReceipt(
      slug: asStr(j['slug']) ?? '',
      dueAt: asStr(j['dueAt']),
      result: ReviewResult.fromApi(asStr(j['result'])),
      feedback: f == null
          ? null
          : ReviewFeedback(correct: fm['correct'] == true, answer: asStr(fm['answer']) ?? '', why: asStr(fm['why'])),
    );
  }

  final String slug;
  final String? dueAt;
  final ReviewResult? result;
  final ReviewFeedback? feedback;
}

/// Хариултын бие: флэш картад [result], бусдад [answer] (сонголтын `id`).
@immutable
class ReviewAnswer {
  const ReviewAnswer({required this.exerciseToken, this.result, this.answer});

  final String exerciseToken;
  final ReviewResult? result;
  final String? answer;

  Map<String, Object?> toJson() => {
    'exerciseToken': exerciseToken,
    if (result != null) 'result': result!.api,
    'answer': ?answer,
  };
}
