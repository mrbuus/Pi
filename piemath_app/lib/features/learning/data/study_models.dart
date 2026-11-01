import 'package:flutter/foundation.dart';

import '../../exam/data/exam_models.dart' show ChoiceMode, ProblemFormat;
import 'json.dart';

/// Хугацаатай давтлагын загварууд — `docs/api-contract/learning.md` §2.

@immutable
class StudyChapterOption {
  const StudyChapterOption({required this.id, required this.title, required this.freshCount});

  factory StudyChapterOption.fromJson(Object? raw) {
    final j = asMap(raw);
    return StudyChapterOption(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      freshCount: asInt(j['freshCount']) ?? 0,
    );
  }

  final String id;
  final String title;
  final int freshCount;
}

@immutable
class StudyOptions {
  const StudyOptions({this.resumeRunId, this.chapters = const []});

  factory StudyOptions.fromJson(Object? raw) {
    final j = asMap(raw);
    return StudyOptions(
      resumeRunId: asStr(j['resumeRunId']),
      chapters: [for (final c in asList(j['chapters'])) StudyChapterOption.fromJson(c)],
    );
  }

  final String? resumeRunId;
  final List<StudyChapterOption> chapters;
}

@immutable
class StudyChoice {
  const StudyChoice({this.label, required this.text});

  final String? label;
  final String text;
}

@immutable
class StudySource {
  const StudySource({
    this.statement,
    this.imageKey,
    this.format = ProblemFormat.choice,
    this.choiceMode,
    this.choices,
  });

  factory StudySource.fromJson(Object? raw) {
    final j = asMap(raw);
    final mode = switch (j['choiceMode']) {
      'TEXT' => ChoiceMode.text,
      'LETTER' => ChoiceMode.letter,
      _ => null,
    };
    List<StudyChoice>? choices;
    if (j['choices'] is List) {
      choices = [
        for (final c in asList(j['choices']))
          if (c is String)
            StudyChoice(text: c)
          else
            StudyChoice(label: asStr(asMap(c)['label']), text: asStr(asMap(c)['text']) ?? ''),
      ];
    }
    return StudySource(
      statement: asStr(j['statement']),
      imageKey: asStr(j['imageKey']),
      format: ProblemFormat.parse(j['format']),
      choiceMode: mode,
      choices: choices,
    );
  }

  final String? statement;
  final String? imageKey;
  final ProblemFormat format;
  final ChoiceMode? choiceMode;
  final List<StudyChoice>? choices;

  bool get hasChoices => choices != null && choices!.isNotEmpty;
}

@immutable
class StudyResponse {
  const StudyResponse({required this.kind, required this.answer, this.correct, this.assistance = false});

  factory StudyResponse.fromJson(Object? raw) {
    final j = asMap(raw);
    return StudyResponse(
      kind: asStr(j['kind']) ?? 'FIRST',
      answer: asStr(j['answer']) ?? '',
      correct: j['correct'] is bool ? j['correct'] as bool : null,
      assistance: asBool(j['assistance']),
    );
  }

  final String kind;
  final String answer;
  final bool? correct;
  final bool assistance;

  bool get isCorrection => kind == 'CORRECTION';
}

@immutable
class StudyFirst {
  const StudyFirst({required this.answer, this.flags = const [], this.correct});

  factory StudyFirst.fromJson(Object? raw) {
    final j = asMap(raw);
    return StudyFirst(
      answer: asStr(j['answer']) ?? '',
      flags: [for (final f in asList(j['flags'])) if (f is String) f],
      correct: j['correct'] is bool ? j['correct'] as bool : null,
    );
  }

  final String answer;
  final List<String> flags;
  final bool? correct;
}

@immutable
class StudyItem {
  const StudyItem({
    required this.id,
    required this.problemId,
    required this.source,
    this.first,
    this.responses = const [],
    this.solution,
    this.answerKey,
  });

  factory StudyItem.fromJson(Object? raw) {
    final j = asMap(raw);
    return StudyItem(
      id: asStr(j['id']) ?? '',
      problemId: asStr(j['problemId']) ?? '',
      source: StudySource.fromJson(j['source']),
      first: j['first'] == null ? null : StudyFirst.fromJson(j['first']),
      responses: [for (final r in asList(j['responses'])) StudyResponse.fromJson(r)],
      solution: asStr(j['solution']),
      answerKey: j['answerKey'],
    );
  }

  final String id;
  final String problemId;
  final StudySource source;
  final StudyFirst? first;
  final List<StudyResponse> responses;

  /// Хэзээ нээгдэхийг СЕРВЕР шийднэ (анхны оролдлогод хэзээ ч үгүй).
  final String? solution;
  final Object? answerKey;

  bool get hasFirstAssistance => responses.any((r) => r.kind == 'FIRST' && r.assistance);
}

@immutable
class StudyEvidence {
  const StudyEvidence({
    this.assigned = 0,
    this.answered = 0,
    this.firstCorrect = 0,
    this.independentFirstCorrect = 0,
    this.assistedFirst = 0,
    this.correctedWithAssistance = 0,
    this.unknown = 0,
  });

  factory StudyEvidence.fromJson(Object? raw) {
    final j = asMap(raw);
    int n(String k) => asInt(j[k]) ?? 0;
    return StudyEvidence(
      assigned: n('assigned'),
      answered: n('answered'),
      firstCorrect: n('firstCorrect'),
      independentFirstCorrect: n('independentFirstCorrect'),
      assistedFirst: n('assistedFirst'),
      correctedWithAssistance: n('correctedWithAssistance'),
      unknown: n('unknown'),
    );
  }

  final int assigned;
  final int answered;
  final int firstCorrect;
  final int independentFirstCorrect;
  final int assistedFirst;
  final int correctedWithAssistance;
  final int unknown;
}

@immutable
class StudyRun {
  const StudyRun({
    required this.id,
    required this.budgetMinutes,
    required this.deadlineAt,
    required this.serverNow,
    required this.status,
    required this.items,
    required this.evidence,
    this.caution = '',
  });

  factory StudyRun.fromJson(Object? raw) {
    final j = asMap(raw);
    return StudyRun(
      id: asStr(j['id']) ?? '',
      budgetMinutes: asInt(j['budgetMinutes']) ?? 10,
      deadlineAt: DateTime.tryParse(asStr(j['deadlineAt']) ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      serverNow: DateTime.tryParse(asStr(j['serverNow']) ?? '') ?? DateTime.now().toUtc(),
      status: asStr(j['status']) ?? 'OPEN',
      items: [for (final i in asList(j['items'])) StudyItem.fromJson(i)],
      evidence: StudyEvidence.fromJson(j['evidence']),
      caution: asStr(j['caution']) ?? '',
    );
  }

  final String id;
  final int budgetMinutes;
  final DateTime deadlineAt;
  final DateTime serverNow;
  final String status;
  final List<StudyItem> items;
  final StudyEvidence evidence;
  final String caution;

  bool get isOpen => status == 'OPEN';
  bool get isExpired => status == 'EXPIRED';
}

@immutable
class HistoryItem {
  const HistoryItem({
    required this.id,
    required this.budgetMinutes,
    required this.state,
    required this.startedAt,
    required this.deadlineAt,
    this.submittedAt,
    required this.evidence,
  });

  factory HistoryItem.fromJson(Object? raw) {
    final j = asMap(raw);
    return HistoryItem(
      id: asStr(j['id']) ?? '',
      budgetMinutes: asInt(j['budgetMinutes']) ?? 10,
      state: asStr(j['state']) ?? '',
      startedAt: DateTime.tryParse(asStr(j['startedAt']) ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      deadlineAt: DateTime.tryParse(asStr(j['deadlineAt']) ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      submittedAt: DateTime.tryParse(asStr(j['submittedAt']) ?? ''),
      evidence: StudyEvidence.fromJson(j['evidence']),
    );
  }

  final String id;
  final int budgetMinutes;
  final String state;
  final DateTime startedAt;
  final DateTime deadlineAt;
  final DateTime? submittedAt;
  final StudyEvidence evidence;

  String get stateLabel => switch (state) {
    'OPEN' => 'Үргэлжилж буй',
    'SUBMITTED' => 'Хаасан',
    'EXPIRED' => 'Хугацаа дууссан',
    _ => 'Бүртгэсэн',
  };
}

@immutable
class HistoryPage {
  const HistoryPage({required this.year, required this.items, this.nextCursor, this.caution = ''});

  factory HistoryPage.fromJson(Object? raw) {
    final j = asMap(raw);
    return HistoryPage(
      year: asInt(j['year']) ?? DateTime.now().year,
      items: [for (final i in asList(j['items'])) HistoryItem.fromJson(i)],
      nextCursor: asStr(j['nextCursor']),
      caution: asStr(j['caution']) ?? '',
    );
  }

  final int year;
  final List<HistoryItem> items;
  final String? nextCursor;
  final String caution;
}
