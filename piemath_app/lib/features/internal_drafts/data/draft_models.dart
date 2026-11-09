import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';
import '../../learning/data/json.dart';

export '../../learning/data/json.dart' show Json, asBool, asInt, asList, asMap, asStr, isSafeId;

const draftLetters = ['A', 'B', 'C', 'D', 'E'];

enum DraftSubject {
  math('MATH', 'Математик'),
  social('SOCIAL_STUDIES', 'Нийгмийн ухаан'),
  sat('SAT', 'SAT');

  const DraftSubject(this.api, this.label);
  final String api;
  final String label;

  static DraftSubject parse(String? v) => switch (v) {
    'SOCIAL_STUDIES' => social,
    'SAT' => sat,
    _ => math,
  };
}

/// `CHOICE` (A–E) эсвэл `NUMERIC` (тоон хариу).
enum DraftKind {
  choice('CHOICE', 'Сонгох'),
  numeric('NUMERIC', 'Тоон хариу');

  const DraftKind(this.api, this.label);
  final String api;
  final String label;

  static DraftKind parse(String? v) => v == 'NUMERIC' ? numeric : choice;
}

@immutable
class DraftChapterRef {
  const DraftChapterRef({required this.id, required this.title, this.bookTitle});

  factory DraftChapterRef.fromJson(Object? raw) {
    final j = asMap(raw);
    return DraftChapterRef(
      id: asStr(j['id']) ?? '',
      title: (asStr(j['title']) ?? '').replaceAll(RegExp(r'\s*·\s*'), ' — '),
      bookTitle: (asStr(j['bookTitle']) ?? asStr(asMap(j['book'])['title']))?.replaceAll(RegExp(r'\s*·\s*'), ' — '),
    );
  }

  final String id;
  final String title;
  final String? bookTitle;
}

@immutable
class DraftSet {
  const DraftSet({
    required this.id,
    required this.title,
    required this.subject,
    this.chapter,
    this.topic,
    this.count = 0,
    this.published = false,
    this.publishCount = 0,
    this.changedSincePublish = false,
    this.updatedByName = '',
    this.updatedAt,
    this.blocks = const [],
    this.events = const [],
  });

  factory DraftSet.fromJson(Object? raw) {
    final j = asMap(raw);
    final blocks = [for (final b in asList(j['blocks'])) DraftBlock.fromJson(b)]
      ..sort((a, b) => a.order.compareTo(b.order));
    return DraftSet(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      subject: DraftSubject.parse(asStr(j['subject'])),
      chapter: j['chapter'] is Map ? DraftChapterRef.fromJson(j['chapter']) : null,
      topic: asStr(j['topic']),
      count: asInt(j['count']) ?? blocks.length,
      published: asStr(j['status']) == 'PUBLISHED',
      publishCount: asInt(j['publishCount']) ?? 0,
      changedSincePublish: asBool(j['changedSincePublish']),
      updatedByName: asStr(j['updatedByName']) ?? '',
      updatedAt: parseApiInstant(asStr(j['updatedAt'])),
      blocks: blocks,
      events: [for (final e in asList(j['events'])) DraftEvent.fromJson(e)],
    );
  }

  final String id;
  final String title;
  final DraftSubject subject;
  final DraftChapterRef? chapter;
  final String? topic;
  final int count;
  final bool published;
  final int publishCount;
  final bool changedSincePublish;
  final String updatedByName;
  final DateTime? updatedAt;
  final List<DraftBlock> blocks;
  final List<DraftEvent> events;

  String get displayTitle => title.trim().isEmpty ? 'Нэргүй ноорог' : title;
}

@immutable
class DraftEvent {
  const DraftEvent({required this.actorName, required this.summary, this.at});

  factory DraftEvent.fromJson(Object? raw) {
    final j = asMap(raw);
    return DraftEvent(
      actorName: asStr(j['actorName']) ?? '',
      summary: asStr(j['summary']) ?? '',
      at: parseApiInstant(asStr(j['at'])),
    );
  }

  final String actorName;
  final String summary;
  final DateTime? at;
}

/// Ноорогийн агуулга — бодлого нэмэх, засах, бөөнөөр оруулахад.
@immutable
class DraftContent {
  const DraftContent({
    this.kind = DraftKind.choice,
    this.statement = '',
    this.choices = const ['', '', '', ''],
    this.answer,
    this.solution,
    this.tag,
    this.points = 1,
  });

  final DraftKind kind;
  final String statement;
  final List<String> choices;
  final String? answer;
  final String? solution;
  final String? tag;
  final int points;

  Json toJson() => {
    'kind': kind.api,
    'statement': statement,
    'choices': kind == DraftKind.choice ? choices : const <String>[],
    'answer': answer,
    'solution': solution,
    'tag': tag,
    'points': points,
  };
}

@immutable
class DraftBlock {
  const DraftBlock({
    required this.id,
    required this.content,
    this.order = 0,
    this.version = 0,
    this.imageKey,
    this.publishedProblemId,
    this.updatedByName = '',
    this.issues = const [],
  });

  factory DraftBlock.fromJson(Object? raw) {
    final j = asMap(raw);
    return DraftBlock(
      id: asStr(j['id']) ?? '',
      order: asInt(j['order']) ?? 0,
      version: asInt(j['version']) ?? 0,
      imageKey: asStr(j['imageKey']),
      publishedProblemId: asStr(j['publishedProblemId']),
      updatedByName: asStr(j['updatedByName']) ?? '',
      issues: [
        for (final i in asList(j['issues']))
          if (asStr(asMap(i)['message']) case final m? when m.isNotEmpty) m,
      ],
      content: DraftContent(
        kind: DraftKind.parse(asStr(j['kind'])),
        statement: asStr(j['statement']) ?? '',
        choices: [for (final c in asList(j['choices'])) asStr(c) ?? ''],
        answer: asStr(j['answer']),
        solution: asStr(j['solution']),
        tag: asStr(j['tag']),
        points: asInt(j['points']) ?? 1,
      ),
    );
  }

  final String id;
  final int order;
  final int version;
  final String? imageKey;
  final String? publishedProblemId;
  final String updatedByName;

  /// Серверийн шалгалтын монгол тайлбар (нийтлэхийн өмнө засах).
  final List<String> issues;
  final DraftContent content;
}

@immutable
class DraftCheckResult {
  const DraftCheckResult({required this.n, required this.blockId, this.given, this.correct, this.key});

  factory DraftCheckResult.fromJson(Object? raw) {
    final j = asMap(raw);
    return DraftCheckResult(
      n: asInt(j['n']) ?? 0,
      blockId: asStr(j['blockId']) ?? '',
      given: asStr(j['given']),
      correct: j['correct'] is bool ? j['correct']! as bool : null,
      key: asStr(j['key']),
    );
  }

  final int n;
  final String blockId;
  final String? given;
  final bool? correct;
  final String? key;
}

@immutable
class DraftCheck {
  const DraftCheck({
    this.results = const [],
    this.correct = 0,
    this.wrong = 0,
    this.blank = 0,
    this.unkeyed = 0,
    this.total = 0,
  });

  factory DraftCheck.fromJson(Object? raw) {
    final j = asMap(raw);
    return DraftCheck(
      results: [for (final r in asList(j['results'])) DraftCheckResult.fromJson(r)],
      correct: asInt(j['correct']) ?? 0,
      wrong: asInt(j['wrong']) ?? 0,
      blank: asInt(j['blank']) ?? 0,
      unkeyed: asInt(j['unkeyed']) ?? 0,
      total: asInt(j['total']) ?? 0,
    );
  }

  final List<DraftCheckResult> results;
  final int correct;
  final int wrong;
  final int blank;
  final int unkeyed;
  final int total;
}

/// Тест болгож нийтлэхэд (`PublishTestDto`).
enum DraftTestType {
  custom('CUSTOM', 'Энгийн тест'),
  daily('DAILY', 'Өдөр тутмын'),
  eesh('EESH_MOCK', 'ЭЕШ сорил');

  const DraftTestType(this.api, this.label);
  final String api;
  final String label;
}

@immutable
class DraftPublishResult {
  const DraftPublishResult({required this.count, required this.chapterTitle, this.testId});

  factory DraftPublishResult.fromJson(Object? raw) {
    final j = asMap(raw);
    return DraftPublishResult(
      count: asInt(j['count']) ?? 0,
      chapterTitle: asStr(j['chapterTitle']) ?? '',
      testId: asStr(j['testId']),
    );
  }

  final int count;
  final String chapterTitle;
  final String? testId;
}

// ---------------- Word (`/document-import/preview`) ----------------

@immutable
class WordBlock {
  const WordBlock({required this.id, required this.text, this.warnings = const []});

  final String id;
  final String text;
  final List<String> warnings;
}

@immutable
class WordPreview {
  const WordPreview({
    required this.token,
    required this.filename,
    required this.blocks,
    this.equationCount = 0,
    this.warnings = const [],
  });

  /// Хүснэгтийн нүдийг ч задалж хавтгай жагсаалт болгоно (вэбийн `flatten`).
  factory WordPreview.fromJson(Object? raw) {
    final j = asMap(raw);
    List<WordBlock> flatten(List<Object?> list, List<String> inherited) => [
      for (final b in list)
        if (asList(asMap(b)['rows']).isNotEmpty)
          ...flatten(
            [
              for (final row in asList(asMap(b)['rows']))
                for (final cell in asList(row)) ...asList(cell),
            ],
            [...inherited, ..._warnings(asMap(b)['warnings'])],
          )
        else
          WordBlock(
            id: asStr(asMap(b)['id']) ?? '',
            text: (asStr(asMap(b)['text']) ?? '').replaceAll('＄', r'$'),
            warnings: [...inherited, ..._warnings(asMap(b)['warnings'])],
          ),
    ];
    return WordPreview(
      token: asStr(j['previewToken']) ?? '',
      filename: asStr(j['filename']) ?? '',
      blocks: flatten(asList(j['blocks']), const []).where((b) => b.text.trim().isNotEmpty).toList(),
      equationCount: asInt(j['equationCount']) ?? 0,
      warnings: _warnings(j['warnings']),
    );
  }

  final String token;
  final String filename;
  final List<WordBlock> blocks;
  final int equationCount;
  final List<String> warnings;

  /// Ноорогт оруулах бичвэр (вэбийн `wordBlocksToText`).
  String get plainText => blocks.map((b) => b.text).join('\n');
}

List<String> _warnings(Object? raw) => [
  for (final w in asList(raw))
    if (asStr(asMap(w)['message']) case final m? when m.isNotEmpty) m,
];
