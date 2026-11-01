import 'package:flutter/foundation.dart';

import '../../exam/data/exam_models.dart' show ProblemFormat;
import 'json.dart';

/// Дасгалын загварууд — `docs/api-contract/learning.md` §3.

enum RecommendReason {
  retryTopic('RETRY_TOPIC', 'Алдсан сэдвээ давтах'),
  weakTopic('WEAK_TOPIC', 'Бататгах сэдэв'),
  rightLevel('RIGHT_LEVEL', 'Таны түвшинд тохирсон'),
  newTopic('NEW_TOPIC', 'Шинэ сэдэв'),
  confidence('CONFIDENCE', 'Өөртөө итгэл нэмэх'),
  other('', 'Санал болгосон бодлого');

  const RecommendReason(this.wire, this.label);

  final String wire;
  final String label;

  static RecommendReason parse(Object? v) {
    for (final r in values) {
      if (r.wire == v && v != '') return r;
    }
    return other;
  }
}

@immutable
class Recommendation {
  const Recommendation({required this.problemId, required this.reason, this.explanation});

  factory Recommendation.fromJson(Object? raw) {
    final j = asMap(raw);
    return Recommendation(
      problemId: asStr(j['problemId']) ?? '',
      reason: RecommendReason.parse(j['reason']),
      explanation: asStr(j['explanation']),
    );
  }

  final String problemId;
  final RecommendReason reason;

  /// Серверийн тайлбар (монгол бол л харуулна).
  final String? explanation;
}

@immutable
class PracticeChoice {
  const PracticeChoice({this.label, required this.text});

  final String? label;
  final String text;
}

/// `GET /problems/:id` — сурагчид зөвхөн нөхцөл, сонголт (хариуны түлхүүр ирэхгүй).
@immutable
class PracticeProblem {
  const PracticeProblem({
    required this.id,
    required this.format,
    this.statementText,
    this.imageKey,
    this.choices,
    this.hasLabels = false,
  });

  factory PracticeProblem.fromJson(Object? raw) {
    final j = asMap(raw);
    List<PracticeChoice>? choices;
    var labels = false;
    if (j['choices'] is List) {
      choices = [];
      for (final c in asList(j['choices'])) {
        if (c is String) {
          choices.add(PracticeChoice(text: c));
        } else {
          final m = asMap(c);
          final l = asStr(m['label']);
          if (l != null && l.isNotEmpty) labels = true;
          choices.add(PracticeChoice(label: l, text: asStr(m['text']) ?? ''));
        }
      }
    }
    return PracticeProblem(
      id: asStr(j['id']) ?? '',
      format: ProblemFormat.parse(j['format']),
      statementText: asStr(j['statementText']),
      imageKey: asStr(j['imageKey']),
      choices: choices,
      hasLabels: labels,
    );
  }

  final String id;
  final ProblemFormat format;
  final String? statementText;
  final String? imageKey;
  final List<PracticeChoice>? choices;

  /// Сонголтууд `{label, text}` хэлбэртэй (хариу = үсэг), үгүй бол индекс.
  final bool hasLabels;

  bool get isChoice => choices != null && choices!.isNotEmpty;
}

@immutable
class AttemptResult {
  const AttemptResult({this.correct});

  factory AttemptResult.fromJson(Object? raw) {
    final j = asMap(raw);
    return AttemptResult(correct: j['correct'] is bool ? j['correct'] as bool : null);
  }

  /// `null` = хариуны түлхүүр баталгаажаагүй тул сервер дүгнээгүй.
  final bool? correct;
}

/// Серверийн тайлбар кирилл үсэгтэй бол л харуулна (англи техникийн бичвэр хэрэглэгчид гарахгүй).
bool isMongolianText(String? s) => s != null && RegExp(r'[Ѐ-ӿ]').hasMatch(s);
