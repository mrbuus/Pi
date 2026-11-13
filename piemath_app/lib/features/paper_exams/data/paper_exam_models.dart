import 'package:flutter/foundation.dart';

import '../../learning/data/json.dart';

export '../../learning/data/json.dart' show Json;

/// «Нэгдсэн шалгалт» — төвийн цаасан шалгалт (OMR / Excel), `api/src/paper-exams`,
/// вэбийн `components/paper-exams/types.ts`.

/// БҮТ-ийн 5 агуулга (API-ийн `CONTENT_AREAS`).
const kContentAreas = ['Тоо тоолол', 'Алгебр', 'Анализын эхлэл', 'Геометр ба тригонометр', 'Магадлал статистик'];

/// Бодлогын хариуны төлөв — API мөр бүрийн төлөвийг нэг тэмдэгтээр (C/W/B/M/U) илгээнэ.
enum ItemStatus {
  correct('C', 'Зөв'),
  wrong('W', 'Буруу'),
  blank('B', 'Хариулаагүй'),
  multi('M', 'Давхар будсан'),
  ungraded('U', 'Тооцохгүй');

  const ItemStatus(this.char, this.label);
  final String char;
  final String label;

  static ItemStatus ofChar(String? c) => switch (c) {
    'C' => correct,
    'W' => wrong,
    'B' => blank,
    'M' => multi,
    _ => ungraded,
  };

  static ItemStatus parse(Object? v) => switch (v) {
    'CORRECT' => correct,
    'WRONG' => wrong,
    'BLANK' => blank,
    'MULTI' => multi,
    _ => ungraded,
  };

  /// Алдсан (буруу, хоосон, давхар).
  bool get missed => this == wrong || this == blank || this == multi;
}

/// Сэдвээр (оноосон бол) эсвэл агуулгаар ангилна.
enum ClassifyBy {
  area('Агуулга', 'Сул агуулга', 'Агуулгын төрлөөр'),
  topic('Сэдэв', 'Сул сэдэв', 'Сэдвээр');

  const ClassifyBy(this.one, this.weak, this.by);
  final String one;
  final String weak;
  final String by;

  static ClassifyBy parse(Object? v) => v == 'topic' ? topic : area;
}

/// `GET /paper-exams` (ажилтан).
@immutable
class PaperExamRow {
  const PaperExamRow({
    required this.id,
    required this.title,
    required this.heldOn,
    required this.itemCount,
    required this.published,
    this.keyedCount = 0,
    this.areaCount = 0,
    this.voidedCount = 0,
    this.sheetCount = 0,
    this.unmatchedCount = 0,
    this.avgPct,
  });

  factory PaperExamRow.fromJson(Object? json) {
    final j = asMap(json);
    return PaperExamRow(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      heldOn: asStr(j['heldOn']) ?? '',
      itemCount: asInt(j['itemCount']) ?? 0,
      published: asBool(j['published']),
      keyedCount: asInt(j['keyedCount']) ?? 0,
      areaCount: asInt(j['areaCount']) ?? 0,
      voidedCount: asInt(j['voidedCount']) ?? 0,
      sheetCount: asInt(j['sheetCount']) ?? 0,
      unmatchedCount: asInt(j['unmatchedCount']) ?? 0,
      avgPct: asInt(j['avgPct']),
    );
  }

  final String id;
  final String title;

  /// «YYYY-MM-DD» (УБ-ийн өдөр).
  final String heldOn;
  final int itemCount;
  final bool published;
  final int keyedCount;
  final int areaCount;
  final int voidedCount;
  final int sheetCount;
  final int unmatchedCount;
  final int? avgPct;
}

/// Бодлого: түлхүүр, оноо, агуулга, сэдэв, томьёо.
@immutable
class PaperItem {
  const PaperItem({
    required this.number,
    this.answerKey,
    this.points = 1,
    this.area,
    this.topic,
    this.formulaSlugs = const [],
    this.voided = false,
  });

  factory PaperItem.fromJson(Object? json) {
    final j = asMap(json);
    return PaperItem(
      number: asInt(j['number']) ?? 0,
      answerKey: asStr(j['answerKey']),
      points: asInt(j['points']) ?? 0,
      area: asStr(j['area']),
      topic: asStr(j['topic']),
      formulaSlugs: [for (final s in asList(j['formulaSlugs'])) ?asStr(s)],
      voided: asBool(j['voided']),
    );
  }

  final int number;
  final String? answerKey;
  final int points;
  final String? area;
  final String? topic;
  final List<String> formulaSlugs;
  final bool voided;
}

/// Томьёоны сангийн томьёо (нэр + LaTeX).
@immutable
class FormulaRef {
  const FormulaRef({required this.slug, required this.title, this.latex});

  factory FormulaRef.fromJson(Object? json) {
    final j = asMap(json);
    return FormulaRef(slug: asStr(j['slug']) ?? '', title: asStr(j['title']) ?? '', latex: asStr(j['latex']));
  }

  final String slug;
  final String title;
  final String? latex;
}

/// Агуулга/сэдвийн гүйцэтгэл.
@immutable
class AreaScore {
  const AreaScore({required this.area, this.pct, this.earned, this.possible});

  factory AreaScore.fromJson(Object? json) {
    final j = asMap(json);
    return AreaScore(
      area: asStr(j['area']) ?? '',
      pct: asInt(j['pct']),
      earned: asNum(j['earned']),
      possible: asNum(j['possible']),
    );
  }

  final String area;
  final int? pct;
  final double? earned;
  final double? possible;
}

/// Нэг бодлогын нийт гүйцэтгэл.
@immutable
class ItemStat {
  const ItemStat({required this.number, this.correct = 0, this.graded = 0, this.pct, this.topWrong});

  factory ItemStat.fromJson(Object? json) {
    final j = asMap(json);
    final tw = j['topWrong'];
    return ItemStat(
      number: asInt(j['number']) ?? 0,
      correct: asInt(j['correct']) ?? 0,
      graded: asInt(j['graded']) ?? 0,
      pct: asInt(j['pct']),
      topWrong: tw is Map ? (letter: asStr(tw['letter']) ?? '', count: asInt(tw['count']) ?? 0) : null,
    );
  }

  final int number;
  final int correct;
  final int graded;
  final int? pct;

  /// Хамгийн олон сонгосон буруу хариу.
  final ({String letter, int count})? topWrong;
}

/// Хүснэгтийн нэг мөр (нэг сурагчийн хуудас).
@immutable
class BoardRow {
  const BoardRow({
    required this.sheetId,
    this.studentId,
    this.code = '',
    this.lastName = '',
    this.firstName = '',
    this.totalScore = 0,
    this.maxScore = 0,
    this.pct,
    this.rank,
    this.weak = const [],
    this.areas = const [],
    this.topics = const [],
    this.statuses = '',
    this.answers = const [],
    this.group,
  });

  factory BoardRow.fromJson(Object? json, {String? group}) {
    final j = asMap(json);
    return BoardRow(
      sheetId: asStr(j['sheetId']) ?? '',
      studentId: asStr(j['studentId']),
      code: asStr(j['code']) ?? '',
      lastName: asStr(j['lastName']) ?? '',
      firstName: asStr(j['firstName']) ?? '',
      totalScore: asNum(j['totalScore']) ?? 0,
      maxScore: asNum(j['maxScore']) ?? 0,
      pct: asInt(j['pct']),
      rank: asInt(j['rank']),
      weak: [for (final w in asList(j['weak'])) ?asStr(w)],
      areas: [for (final a in asList(j['areas'])) AreaScore.fromJson(a)],
      topics: [for (final a in asList(j['topics'])) AreaScore.fromJson(a)],
      statuses: asStr(j['statuses']) ?? '',
      answers: [for (final a in asList(j['answers'])) asStr(a) ?? ''],
      group: group,
    );
  }

  final String sheetId;
  final String? studentId;
  final String code;
  final String lastName;
  final String firstName;
  final double totalScore;
  final double maxScore;
  final int? pct;

  /// Төвийн байр.
  final int? rank;
  final List<String> weak;
  final List<AreaScore> areas;
  final List<AreaScore> topics;

  /// Бодлого бүрийн төлөв нэг тэмдэгтээр.
  final String statuses;
  final List<String> answers;

  /// Аль багийнх (хайлтын үр дүнд).
  final String? group;

  String get name => '$lastName $firstName'.trim();

  ItemStatus statusAt(int i) => ItemStatus.ofChar(i < statuses.length ? statuses[i] : null);

  /// Сурагчийн сонгосон үсэг (A–E) эсвэл `null`.
  String? letterAt(int i) {
    final a = i < answers.length ? answers[i] : '';
    return RegExp(r'^[A-E]$').hasMatch(a) ? a : null;
  }

  BoardRow withGroup(String g) => BoardRow(
    sheetId: sheetId,
    studentId: studentId,
    code: code,
    lastName: lastName,
    firstName: firstName,
    totalScore: totalScore,
    maxScore: maxScore,
    pct: pct,
    rank: rank,
    weak: weak,
    areas: areas,
    topics: topics,
    statuses: statuses,
    answers: answers,
    group: g,
  );
}

/// Нэг баг (Excel-ийн шийт).
@immutable
class BoardGroup {
  const BoardGroup({
    required this.label,
    this.teacher,
    this.count = 0,
    this.avgScore,
    this.avgPct,
    this.items = const [],
    this.areas = const [],
    this.topics = const [],
    this.rows = const [],
  });

  factory BoardGroup.fromJson(Object? json) {
    final j = asMap(json);
    final label = asStr(j['label']) ?? '';
    return BoardGroup(
      label: label,
      teacher: asStr(j['teacher']),
      count: asInt(j['count']) ?? 0,
      avgScore: asNum(j['avgScore']),
      avgPct: asInt(j['avgPct']),
      items: [for (final s in asList(j['items'])) ItemStat.fromJson(s)],
      areas: [for (final a in asList(j['areas'])) AreaScore.fromJson(a)],
      topics: [for (final a in asList(j['topics'])) AreaScore.fromJson(a)],
      rows: [for (final r in asList(j['rows'])) BoardRow.fromJson(r, group: label)],
    );
  }

  final String label;
  final String? teacher;
  final int count;
  final double? avgScore;
  final int? avgPct;
  final List<ItemStat> items;
  final List<AreaScore> areas;
  final List<AreaScore> topics;
  final List<BoardRow> rows;
}

/// Төвийн нийт үзүүлэлт.
@immutable
class BoardOverall {
  const BoardOverall({
    this.count = 0,
    this.avgScore,
    this.avgPct,
    this.maxScore,
    this.minScore,
    this.medianScore,
    this.items = const [],
    this.areas = const [],
    this.topics = const [],
  });

  factory BoardOverall.fromJson(Object? json) {
    final j = asMap(json);
    return BoardOverall(
      count: asInt(j['count']) ?? 0,
      avgScore: asNum(j['avgScore']),
      avgPct: asInt(j['avgPct']),
      maxScore: asNum(j['maxScore']),
      minScore: asNum(j['minScore']),
      medianScore: asNum(j['medianScore']),
      items: [for (final s in asList(j['items'])) ItemStat.fromJson(s)],
      areas: [for (final a in asList(j['areas'])) AreaScore.fromJson(a)],
      topics: [for (final a in asList(j['topics'])) AreaScore.fromJson(a)],
    );
  }

  final int count;
  final double? avgScore;
  final int? avgPct;
  final double? maxScore;
  final double? minScore;
  final double? medianScore;
  final List<ItemStat> items;
  final List<AreaScore> areas;
  final List<AreaScore> topics;
}

/// `GET /paper-exams/:id` (ажилтан). Багш — өөрийн ангийн сурагч (`OWN_CLASSES`), Багш+/Админ — бүгд.
@immutable
class PaperBoard {
  const PaperBoard({
    required this.id,
    required this.title,
    required this.heldOn,
    required this.itemCount,
    required this.published,
    required this.ownClassesOnly,
    required this.classifyBy,
    required this.formulas,
    required this.items,
    required this.overall,
    required this.groups,
    required this.unmatched,
  });

  factory PaperBoard.fromJson(Object? json) {
    final j = asMap(json);
    final e = asMap(j['exam']);
    return PaperBoard(
      id: asStr(e['id']) ?? '',
      title: asStr(e['title']) ?? '',
      heldOn: asStr(e['heldOn']) ?? '',
      itemCount: asInt(e['itemCount']) ?? 0,
      published: asBool(e['published']),
      ownClassesOnly: j['scope'] == 'OWN_CLASSES',
      classifyBy: ClassifyBy.parse(j['classifyBy']),
      formulas: [for (final f in asList(j['formulas'])) FormulaRef.fromJson(f)],
      items: [for (final i in asList(j['items'])) PaperItem.fromJson(i)],
      overall: BoardOverall.fromJson(j['overall']),
      groups: [for (final g in asList(j['groups'])) BoardGroup.fromJson(g)],
      unmatched: [for (final r in asList(j['unmatched'])) BoardRow.fromJson(r)],
    );
  }

  final String id;
  final String title;
  final String heldOn;
  final int itemCount;
  final bool published;
  final bool ownClassesOnly;
  final ClassifyBy classifyBy;
  final List<FormulaRef> formulas;
  final List<PaperItem> items;
  final BoardOverall overall;
  final List<BoardGroup> groups;

  /// Сурагчтай холбогдоогүй хуудас.
  final List<BoardRow> unmatched;
}

/// `GET /paper-exams/my` — сурагчийн нэг шалгалт.
@immutable
class MyPaperExam {
  const MyPaperExam({
    required this.id,
    required this.title,
    required this.heldOn,
    required this.totalScore,
    required this.maxScore,
    this.pct,
    this.rank,
    this.participants,
    this.group,
    this.sheetId,
  });

  factory MyPaperExam.fromJson(Object? json) {
    final j = asMap(json);
    return MyPaperExam(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      heldOn: asStr(j['heldOn']) ?? '',
      totalScore: asNum(j['totalScore']) ?? 0,
      maxScore: asNum(j['maxScore']) ?? 0,
      pct: asInt(j['pct']),
      rank: asInt(j['rank']),
      participants: asInt(j['participants']),
    );
  }

  final String id;
  final String title;
  final String heldOn;
  final double totalScore;
  final double maxScore;
  final int? pct;
  final int? rank;

  /// Нийт оролцогч (зөвхөн сурагчийн өөрийн харагдацад).
  final int? participants;

  /// Ажилтны харагдацад: баг ба хуудас (дэлгэрэнгүй нээхэд).
  final String? group;
  final String? sheetId;
}

/// Сурагчийн нэг бодлого.
@immutable
class MyPaperItem {
  const MyPaperItem({
    required this.number,
    required this.status,
    this.area,
    this.topic,
    this.formulaSlugs = const [],
    this.centerPct,
    this.points = 0,
    this.answer,
    this.key,
  });

  factory MyPaperItem.fromJson(Object? json) {
    final j = asMap(json);
    return MyPaperItem(
      number: asInt(j['number']) ?? 0,
      status: ItemStatus.parse(j['status']),
      area: asStr(j['area']),
      topic: asStr(j['topic']),
      formulaSlugs: [for (final s in asList(j['formulaSlugs'])) ?asStr(s)],
      centerPct: asInt(j['centerPct']),
      points: asInt(j['points']) ?? 0,
      answer: asStr(j['answer']),
      key: asStr(j['key']),
    );
  }

  final int number;
  final ItemStatus status;
  final String? area;
  final String? topic;
  final List<String> formulaSlugs;
  final int? centerPct;
  final int points;
  final String? answer;

  /// Зөв хариу — сервер нийтэлсэн шалгалтад л өгнө.
  final String? key;
}

/// `GET /paper-exams/my/:id` — сурагчийн өөрийн дүн + төвийн жагсаалт.
@immutable
class MyPaperDetail {
  const MyPaperDetail({
    required this.id,
    required this.title,
    required this.heldOn,
    required this.itemCount,
    required this.totalScore,
    required this.maxScore,
    this.pct,
    required this.rank,
    required this.participants,
    required this.group,
    required this.weak,
    required this.areas,
    required this.topics,
    required this.items,
    this.centerAvgPct,
    required this.centerAreas,
    required this.centerTopics,
    required this.classifyBy,
    required this.formulas,
    required this.ranking,
  });

  factory MyPaperDetail.fromJson(Object? json) {
    final j = asMap(json);
    final e = asMap(j['exam']);
    final me = asMap(j['me']);
    final center = asMap(j['center']);
    return MyPaperDetail(
      id: asStr(e['id']) ?? '',
      title: asStr(e['title']) ?? '',
      heldOn: asStr(e['heldOn']) ?? '',
      itemCount: asInt(e['itemCount']) ?? 0,
      totalScore: asNum(me['totalScore']) ?? 0,
      maxScore: asNum(me['maxScore']) ?? 0,
      pct: asInt(me['pct']),
      rank: asInt(me['rank']) ?? 0,
      participants: asInt(me['participants']) ?? 0,
      group: asStr(me['group']) ?? '',
      weak: [for (final w in asList(me['weak'])) ?asStr(w)],
      areas: [for (final a in asList(me['areas'])) AreaScore.fromJson(a)],
      topics: [for (final a in asList(me['topics'])) AreaScore.fromJson(a)],
      items: [for (final i in asList(me['items'])) MyPaperItem.fromJson(i)],
      centerAvgPct: asInt(center['avgPct']),
      centerAreas: [for (final a in asList(center['areas'])) AreaScore.fromJson(a)],
      centerTopics: [for (final a in asList(center['topics'])) AreaScore.fromJson(a)],
      classifyBy: ClassifyBy.parse(j['classifyBy']),
      formulas: [for (final f in asList(j['formulas'])) FormulaRef.fromJson(f)],
      ranking: [
        for (final r in asList(j['ranking']))
          (
            rank: asInt(asMap(r)['rank']) ?? 0,
            name: asStr(asMap(r)['name']) ?? '',
            group: asStr(asMap(r)['group']) ?? '',
            totalScore: asNum(asMap(r)['totalScore']) ?? 0,
            maxScore: asNum(asMap(r)['maxScore']) ?? 0,
            isMe: asBool(asMap(r)['isMe']),
          ),
      ],
    );
  }

  final String id;
  final String title;
  final String heldOn;
  final int itemCount;
  final double totalScore;
  final double maxScore;
  final int? pct;
  final int rank;
  final int participants;
  final String group;
  final List<String> weak;
  final List<AreaScore> areas;
  final List<AreaScore> topics;
  final List<MyPaperItem> items;
  final int? centerAvgPct;
  final List<AreaScore> centerAreas;
  final List<AreaScore> centerTopics;
  final ClassifyBy classifyBy;
  final List<FormulaRef> formulas;
  final List<({int rank, String name, String group, double totalScore, double maxScore, bool isMe})> ranking;
}

/// `POST /paper-exams/:id/import` — урьдчилан харах (эсвэл хадгалсан) үр дүн.
@immutable
class ImportPreview {
  const ImportPreview({
    required this.fileName,
    required this.sheets,
    required this.skipped,
    this.blocking,
    this.sameFileImportedAt,
    required this.rows,
    required this.matched,
    required this.unmatched,
    required this.duplicates,
    required this.replaces,
    required this.willWrite,
    required this.noKeyLetters,
    required this.previewRows,
    required this.saved,
  });

  factory ImportPreview.fromJson(Object? json) {
    final j = asMap(json);
    final t = asMap(j['totals']);
    return ImportPreview(
      fileName: asStr(j['fileName']) ?? '',
      sheets: [
        for (final s in asList(j['sheets']))
          (
            name: asStr(asMap(s)['name']) ?? '',
            groupLabel: asStr(asMap(s)['groupLabel']) ?? '',
            groupTeacher: asStr(asMap(s)['groupTeacher']),
            itemCount: asInt(asMap(s)['itemCount']) ?? 0,
            rowCount: asInt(asMap(s)['rowCount']) ?? 0,
            letters: asMap(s)['mode'] == 'LETTERS',
          ),
      ],
      skipped: [
        for (final s in asList(j['skipped']))
          (name: asStr(asMap(s)['name']) ?? '', reason: asStr(asMap(s)['reason']) ?? ''),
      ],
      blocking: asStr(j['blocking']),
      sameFileImportedAt: DateTime.tryParse(asStr(j['sameFileImportedAt']) ?? ''),
      rows: asInt(t['rows']) ?? 0,
      matched: asInt(t['matched']) ?? 0,
      unmatched: asInt(t['unmatched']) ?? 0,
      duplicates: asInt(t['duplicates']) ?? 0,
      replaces: asInt(t['replaces']) ?? 0,
      willWrite: asInt(t['willWrite']) ?? 0,
      noKeyLetters: asBool(j['noKeyLetters']),
      previewRows: [for (final r in asList(j['rows'])) ImportPreviewRow.fromJson(r)],
      saved: asBool(j['saved']),
    );
  }

  final String fileName;
  final List<({String name, String groupLabel, String? groupTeacher, int itemCount, int rowCount, bool letters})>
  sheets;
  final List<({String name, String reason})> skipped;

  /// Хадгалахыг хориглох шалтгаан.
  final String? blocking;
  final DateTime? sameFileImportedAt;
  final int rows;
  final int matched;
  final int unmatched;
  final int duplicates;
  final int replaces;
  final int willWrite;
  final bool noKeyLetters;
  final List<ImportPreviewRow> previewRows;
  final bool saved;

  /// Бичигдэх хуудасны тоо (вэбтэй ижил): давхардлыг хасаад, солихгүй бол солих мөрийг ч хасна.
  int writeCount({required bool replace}) => rows - duplicates - (replace ? 0 : replaces);
}

@immutable
class ImportPreviewRow {
  const ImportPreviewRow({
    required this.key,
    required this.rowNumber,
    required this.code,
    required this.lastName,
    required this.firstName,
    required this.groupLabel,
    this.match,
    this.studentName,
    required this.totalScore,
    required this.maxScore,
    required this.duplicate,
    required this.warnings,
  });

  factory ImportPreviewRow.fromJson(Object? json) {
    final j = asMap(json);
    final s = j['student'];
    return ImportPreviewRow(
      key: asInt(j['key']) ?? 0,
      rowNumber: asInt(j['rowNumber']) ?? 0,
      code: asStr(j['code']) ?? '',
      lastName: asStr(j['lastName']) ?? '',
      firstName: asStr(j['firstName']) ?? '',
      groupLabel: asStr(j['groupLabel']) ?? '',
      match: asStr(j['match']),
      studentName: s is Map ? asStr(s['name']) : null,
      totalScore: asNum(j['totalScore']) ?? 0,
      maxScore: asNum(j['maxScore']) ?? 0,
      duplicate: asBool(j['duplicate']),
      warnings: [for (final w in asList(j['warnings'])) ?asStr(w)],
    );
  }

  final int key;
  final int rowNumber;
  final String code;
  final String lastName;
  final String firstName;
  final String groupLabel;

  /// `CODE` | `LEGACY` | `NAME`.
  final String? match;
  final String? studentName;
  final double totalScore;
  final double maxScore;
  final bool duplicate;
  final List<String> warnings;

  bool get problem => studentName == null || duplicate || warnings.isNotEmpty;
}

/// `GET /paper-exams/:id/imports`.
@immutable
class ImportHistoryRow {
  const ImportHistoryRow({
    required this.id,
    required this.fileName,
    required this.sheetCount,
    required this.matchedCount,
    required this.reverted,
    this.createdAt,
    this.createdBy,
  });

  factory ImportHistoryRow.fromJson(Object? json) {
    final j = asMap(json);
    return ImportHistoryRow(
      id: asStr(j['id']) ?? '',
      fileName: asStr(j['fileName']) ?? '',
      sheetCount: asInt(j['sheetCount']) ?? 0,
      matchedCount: asInt(j['matchedCount']) ?? 0,
      reverted: j['status'] == 'REVERTED',
      createdAt: DateTime.tryParse(asStr(j['createdAt']) ?? ''),
      createdBy: asStr(j['createdBy']),
    );
  }

  final String id;
  final String fileName;
  final int sheetCount;
  final int matchedCount;
  final bool reverted;
  final DateTime? createdAt;
  final String? createdBy;
}

/// `GET /paper-exams/students/search`.
@immutable
class FoundStudent {
  const FoundStudent({required this.id, required this.name, this.code, this.classes = const []});

  factory FoundStudent.fromJson(Object? json) {
    final j = asMap(json);
    return FoundStudent(
      id: asStr(j['id']) ?? '',
      name: asStr(j['name']) ?? '',
      code: asStr(j['code']),
      classes: [for (final c in asList(j['classes'])) ?asStr(c)],
    );
  }

  final String id;
  final String name;
  final String? code;
  final List<String> classes;
}
