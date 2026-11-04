import 'package:flutter/foundation.dart';

/// Тест зохиох, засах өгөгдөл — вэбийн `components/test-builder/types.ts`, `components/test-editor/model.ts`,
/// API `tests.service.ts` (`getOne` ажилтны хувилбар), `content.service.ts` (`listProblems`)-ийн хэлбэр.
///
/// Хариуны түлхүүр (`isCorrect`, `correctAnswer`) зөвхөн ажилтанд ирнэ — сервер сурагчаас хасдаг.
/// Энэ feature-ийн дэлгэц бүр зөвхөн Багш, Багш+, Админд нээгдэнэ.

Map<String, Object?> _map(Object? v) => v is Map ? v.cast<String, Object?>() : const {};
List<Object?> _list(Object? v) => v is List ? v.cast<Object?>() : const [];
String? _str(Object? v) => v is String ? v : null;
int? _int(Object? v) => v is num ? v.toInt() : null;
double? _double(Object? v) => v is num ? v.toDouble() : null;

/// Тестийн төрөл (`TestType`).
abstract final class TestTypes {
  static const daily = 'DAILY';
  static const chapterExam = 'CHAPTER_EXAM';
  static const eeshMock = 'EESH_MOCK';
  static const custom = 'CUSTOM';
  static const theory = 'THEORY';
  static const thousand = 'THOUSAND';

  static const labels = <String, String>{
    daily: 'Өдрийн тест',
    chapterExam: 'Сэдвийн шалгалт',
    eeshMock: 'ЭЕШ сорил',
    custom: 'Бусад',
    theory: 'Онолын тест',
    thousand: '1000 бодлого',
  };

  /// Шинэ тест үүсгэхэд сонгох төрлүүд (вэбийн `TYPES`).
  static const creatable = [daily, chapterExam, eeshMock, custom];

  /// Засахад сонгох төрлүүд (вэбийн `EDITABLE_TYPES`). 1000 бодлогын төрөл өөрчлөгдөхгүй.
  static const editable = [daily, chapterExam, eeshMock, custom, theory];

  static String label(String type) => labels[type] ?? type;
}

/// Дүгнэх горим (`TestGradingMode`).
abstract final class GradingModes {
  static const auto = 'AUTO';
  static const manual = 'MANUAL';

  /// Үүсгэх хуудасны урт шошго.
  static const createLabels = <String, String>{
    auto: 'Авто дүн (зөв хариу баталгаатай)',
    manual: 'Багшийн дүн (PDF эх сурвалж, хариу баталгаажуулна)',
  };

  static String shortLabel(String mode) => mode == manual ? 'Багшийн дүн' : 'Авто дүн';
}

/// Хичээл (`Subject`). Хоосон = бүх хичээл.
abstract final class Subjects {
  static const all = '';
  static const math = 'MATH';
  static const social = 'SOCIAL_STUDIES';
  static const sat = 'SAT';

  static const labels = <String, String>{all: 'Бүх хичээл', math: 'Математик', social: 'Нийгмийн ухаан', sat: 'SAT'};

  /// Үүсгэх хуудсанд (вэбийн `SUBJECTS`, SAT-гүй).
  static const creatable = [all, math, social];

  /// Засах хуудсанд (вэбийн `SettingsCard`, SAT-тай).
  static const editable = [all, math, social, sat];

  static String label(String s) => labels[s] ?? s;

  /// Математикаас бусад хичээл ангиар хаалттай, ном/бүлэггүй байж болно —
  /// бүлэг сонгоогүй бол тестийн нэрээр бүлэг үүснэ (`POST /chapters/for-subject`).
  static bool isGated(String subject) => subject != all && subject != math;
}

/// Бодлогын төрөл (`ProblemFormat`).
abstract final class ProblemFormats {
  static const choice = 'CHOICE';
  static const fill = 'FILL_NUMBER';
  static const open = 'OPEN';

  static const labels = <String, String>{choice: 'Сонгох', fill: 'Нөхөх', open: 'Задгай'};

  static String label(String f) => labels[f] ?? f;
}

/// `GET /classrooms` мөр.
@immutable
class ClassroomOption {
  const ClassroomOption({required this.id, required this.name, this.grade, this.subject, this.enrollments = 0});

  factory ClassroomOption.fromJson(Object? raw) {
    final j = _map(raw);
    return ClassroomOption(
      id: _str(j['id']) ?? '',
      name: _str(j['name']) ?? '',
      grade: _int(j['grade']),
      subject: _str(j['subject']),
      enrollments: _int(_map(j['_count'])['enrollments']) ?? 0,
    );
  }

  final String id;
  final String name;
  final int? grade;

  /// `null` = MATH (анхдагч).
  final String? subject;
  final int enrollments;

  String get subjectOrMath => subject ?? Subjects.math;
}

/// `GET /chapters` мөр.
@immutable
class ChapterOption {
  const ChapterOption({required this.id, required this.title, this.grade, this.bookCode, this.problemCount = 0});

  factory ChapterOption.fromJson(Object? raw) {
    final j = _map(raw);
    return ChapterOption(
      id: _str(j['id']) ?? '',
      title: _str(j['title']) ?? '',
      grade: _int(j['grade']),
      bookCode: _str(_map(j['book'])['code']),
      problemCount: _int(_map(j['_count'])['problems']) ?? 0,
    );
  }

  final String id;
  final String title;
  final int? grade;
  final String? bookCode;
  final int problemCount;

  /// «100 — Илтгэгч тэгшитгэл» (вэбийн сонгогчтой ижил).
  String get label => [if (bookCode != null && bookCode!.isNotEmpty) bookCode, title].join(' — ');
}

/// Сонголтын мөр (`ProblemChoice`).
@immutable
class ChoiceOptionRef {
  const ChoiceOptionRef({required this.order, required this.text, required this.isCorrect, this.label, this.imageKey});

  factory ChoiceOptionRef.fromJson(Object? raw) {
    final j = _map(raw);
    return ChoiceOptionRef(
      order: _int(j['order']) ?? 0,
      text: _str(j['text']) ?? '',
      isCorrect: j['isCorrect'] == true,
      label: _str(j['label']),
      imageKey: _str(j['imageKey']),
    );
  }

  final int order;
  final String text;
  final bool isCorrect;
  final String? label;
  final String? imageKey;
}

/// Бодлогын шинжилгээ (`ProblemAnalysis`) — зөвхөн ажилтанд.
@immutable
class ProblemAnalysisRef {
  const ProblemAnalysisRef({this.answerKeyStatus, this.topic, this.subtopic, this.solutionOutline});

  static ProblemAnalysisRef? fromJson(Object? raw) {
    if (raw is! Map) return null;
    final j = _map(raw);
    return ProblemAnalysisRef(
      answerKeyStatus: _str(j['answerKeyStatus']),
      topic: _str(j['topic']),
      subtopic: _str(j['subtopic']),
      solutionOutline: _str(j['solutionOutline']),
    );
  }

  final String? answerKeyStatus;
  final String? topic;
  final String? subtopic;

  /// Урьдчилан бэлтгэсэн бодолт (зөвхөн сангийн жагсаалтад ирдэг, `GET /tests/:id`-д ирэхгүй).
  final String? solutionOutline;
}

/// Бодлого — `GET /tests/:id` (ажилтан) болон `GET /chapters/:id/problems`-ийн нэг хэлбэр.
@immutable
class ServerProblem {
  const ServerProblem({
    required this.id,
    required this.format,
    this.token = '',
    this.statementText,
    this.imageKey,
    this.choices,
    this.correctAnswer,
    this.points,
    this.chapterId,
    this.version,
    this.choiceOptions = const [],
    this.tags = const [],
    this.analysis,
    this.correctRate,
    this.attemptCount = 0,
    this.variantLabel,
  });

  factory ServerProblem.fromJson(Object? raw) {
    final j = _map(raw);
    return ServerProblem(
      id: _str(j['id']) ?? '',
      token: _str(j['token']) ?? '',
      format: _str(j['format']) ?? ProblemFormats.choice,
      statementText: _str(j['statementText']),
      imageKey: _str(j['imageKey']),
      choices: j['choices'],
      correctAnswer: j['correctAnswer'],
      points: _int(j['points']),
      chapterId: _str(j['chapterId']),
      version: _int(j['version']),
      choiceOptions: [for (final c in _list(j['choiceOptions'])) ChoiceOptionRef.fromJson(c)],
      tags: [
        for (final t in _list(j['tags']))
          if (_str(_map(_map(t)['tag'])['name']) case final String name) name,
      ],
      analysis: ProblemAnalysisRef.fromJson(j['analysis']),
      correctRate: _double(j['correctRate']),
      attemptCount: _int(j['attemptCount']) ?? 0,
      variantLabel: _str(j['variantLabel']),
    );
  }

  final String id;

  /// Бодлогын код («100-23-05») — зөвхөн ажилтанд; шинэ бодлогын кодын угтвар гаргахад.
  final String token;
  final String format;
  final String? statementText;
  final String? imageKey;

  /// Хуучин загвар: сонголтын текстийн массив.
  final Object? choices;
  final Object? correctAnswer;
  final int? points;
  final String? chapterId;

  /// Зэрэг засварын хувилбар (`expectedVersion`).
  final int? version;
  final List<ChoiceOptionRef> choiceOptions;
  final List<String> tags;
  final ProblemAnalysisRef? analysis;
  final double? correctRate;
  final int attemptCount;

  /// Сангийн жагсаалтад: A/B хувилбар.
  final String? variantLabel;

  ServerProblem copyWith({String? id, int? version}) => ServerProblem(
    id: id ?? this.id,
    format: format,
    token: token,
    statementText: statementText,
    imageKey: imageKey,
    choices: choices,
    correctAnswer: correctAnswer,
    points: points,
    chapterId: chapterId,
    version: version ?? this.version,
    choiceOptions: choiceOptions,
    tags: tags,
    analysis: analysis,
    correctRate: correctRate,
    attemptCount: attemptCount,
    variantLabel: variantLabel,
  );
}

/// `GET /tests/:id` — засварлагчийн тестийн дэлгэрэнгүй.
@immutable
class TestDetails {
  const TestDetails({
    required this.id,
    required this.title,
    required this.type,
    required this.gradingMode,
    this.chapterId,
    this.timeLimitMin,
    this.groupKey,
    this.variantLabel,
    this.pdfKey,
    this.price,
    this.version = 0,
    this.subject,
    this.createdById,
    this.isDraft = false,
    this.problems = const [],
    this.classroomIds = const [],
  });

  factory TestDetails.fromJson(Object? raw) {
    final j = _map(raw);
    return TestDetails(
      id: _str(j['id']) ?? '',
      title: _str(j['title']) ?? '',
      type: _str(j['type']) ?? TestTypes.daily,
      gradingMode: _str(j['gradingMode']) ?? GradingModes.auto,
      chapterId: _str(j['chapterId']),
      timeLimitMin: _int(j['timeLimitMin']),
      groupKey: _str(j['groupKey']),
      variantLabel: _str(j['variantLabel']),
      pdfKey: _str(j['pdfKey']),
      price: _int(j['price']),
      version: _int(j['version']) ?? 0,
      subject: _str(_map(_map(j['chapter'])['book'])['subject']),
      createdById: _str(j['createdById']),
      isDraft: j['isDraft'] == true,
      problems: [
        for (final p in _list(j['problems']))
          TestProblemRow(
            problemId: _str(_map(p)['problemId']) ?? '',
            order: _int(_map(p)['order']) ?? 0,
            points: _int(_map(p)['points']) ?? 1,
            problem: ServerProblem.fromJson(_map(p)['problem']),
          ),
      ]..sort((a, b) => a.order.compareTo(b.order)),
      classroomIds: [
        for (final a in _list(j['access']))
          if (_str(_map(a)['classroomId']) case final String id) id,
      ],
    );
  }

  final String id;
  final String title;
  final String type;
  final String gradingMode;
  final String? chapterId;
  final int? timeLimitMin;
  final String? groupKey;
  final String? variantLabel;
  final String? pdfKey;
  final int? price;
  final int version;
  final String? subject;
  final String? createdById;
  final bool isDraft;
  final List<TestProblemRow> problems;
  final List<String> classroomIds;

  bool get isThousand => type == TestTypes.thousand;
}

@immutable
class TestProblemRow {
  const TestProblemRow({required this.problemId, required this.order, required this.points, required this.problem});

  final String problemId;
  final int order;
  final int points;
  final ServerProblem problem;
}

/// `GET /tests/:id/edit-info` — сурагч өгсөн бол LIMITED (зөвхөн нэр, хугацаа).
@immutable
class EditInfo {
  const EditInfo({required this.limited, this.reason = ''});

  factory EditInfo.fromJson(Object? raw) {
    final j = _map(raw);
    return EditInfo(limited: j['mode'] == 'LIMITED', reason: _str(j['reason']) ?? '');
  }

  final bool limited;
  final String reason;
}

/// Серверийн тестийн ноорог (`POST/GET/PATCH /tests/drafts`).
@immutable
class TestDraftSnapshot {
  const TestDraftSnapshot({required this.id, required this.revision, this.state = const {}});

  factory TestDraftSnapshot.fromJson(Object? raw) {
    final j = _map(raw);
    return TestDraftSnapshot(id: _str(j['id']) ?? '', revision: _int(j['revision']) ?? 0, state: _map(j['state']));
  }

  final String id;
  final int revision;
  final Map<String, Object?> state;

  /// Нооргийн тестийн нэр (баннерт).
  String get title => (_str(state['title']) ?? '').trim();
}

/// Хариуны түлхүүрийн анхааруулга (`answerWarning`).
@immutable
class AnswerWarning {
  const AnswerWarning({required this.message, this.withoutAnswerCount = 0, this.totalProblems = 0});

  static AnswerWarning? fromJson(Object? raw) {
    if (raw is! Map) return null;
    final j = _map(raw);
    return AnswerWarning(
      message: _str(j['message']) ?? '',
      withoutAnswerCount: _int(j['withoutAnswerCount']) ?? 0,
      totalProblems: _int(j['totalProblems']) ?? 0,
    );
  }

  final String message;
  final int withoutAnswerCount;
  final int totalProblems;
}

/// `POST /tests` хариу.
@immutable
class CreatedTest {
  const CreatedTest({required this.id, this.answerWarning});

  factory CreatedTest.fromJson(Object? raw) {
    final j = _map(raw);
    final id = _str(j['id']);
    if (id == null || id.isEmpty) throw const FormatException('id');
    return CreatedTest(id: id, answerWarning: AnswerWarning.fromJson(j['answerWarning']));
  }

  final String id;
  final AnswerWarning? answerWarning;
}

/// `PATCH /tests/:id`, `PATCH /problems/:id` хариу (хадгалсан хувилбар, нэгтгэсэн хүмүүс).
@immutable
class SaveResponse {
  const SaveResponse({this.version, this.changed, this.mergedWith = const [], this.answerWarning});

  factory SaveResponse.fromJson(Object? raw) {
    final j = _map(raw);
    return SaveResponse(
      version: _int(j['version']),
      changed: j['changed'] is bool ? j['changed']! as bool : null,
      mergedWith: [for (final n in _list(j['mergedWith'])) ?_str(n)],
      answerWarning: AnswerWarning.fromJson(j['answerWarning']),
    );
  }

  final int? version;
  final bool? changed;
  final List<String> mergedWith;
  final AnswerWarning? answerWarning;
}

/// `POST /tests/:id/duplicate` хариу.
@immutable
class DuplicatedTest {
  const DuplicatedTest({required this.id, required this.title});

  factory DuplicatedTest.fromJson(Object? raw) {
    final j = _map(raw);
    final id = _str(j['id']);
    if (id == null || id.isEmpty) throw const FormatException('id');
    return DuplicatedTest(id: id, title: _str(j['title']) ?? '');
  }

  final String id;
  final String title;
}

/// 409 `VERSION_CONFLICT` — ижил хэсгийг өөр хүн өөрөөр засчээ (вэбийн `versionConflictOf`).
@immutable
class VersionConflict {
  const VersionConflict({required this.message, this.currentVersion = 0, this.changedBy, this.fields = const []});

  /// 409-ийн бие `code: VERSION_CONFLICT` бол; эс бөгөөс `null`.
  static VersionConflict? fromBody(String message, int? status, Object? body) {
    if (status != 409 || body is! Map || body['code'] != 'VERSION_CONFLICT') return null;
    return VersionConflict(
      message: message,
      currentVersion: _int(body['currentVersion']) ?? 0,
      changedBy: _str(body['changedBy']),
      fields: [for (final f in _list(body['fields'])) ?_str(f)],
    );
  }

  final String message;
  final int currentVersion;
  final String? changedBy;
  final List<String> fields;
}

/// `GET /tests` (ажилтан) мөр — тестийн жагсаалтын «Засах», «Шинэ тест» оролтод.
@immutable
class StaffTestRow {
  const StaffTestRow({
    required this.id,
    required this.title,
    required this.type,
    this.variantLabel,
    this.isDraft = false,
    this.createdById,
    this.problemCount = 0,
    this.resultCount = 0,
    this.classNames = const [],
    this.bookCode,
  });

  factory StaffTestRow.fromJson(Object? raw) {
    final j = _map(raw);
    final count = _map(j['_count']);
    return StaffTestRow(
      id: _str(j['id']) ?? '',
      title: _str(j['title']) ?? '',
      type: _str(j['type']) ?? TestTypes.daily,
      variantLabel: _str(j['variantLabel']),
      isDraft: j['isDraft'] == true,
      createdById: _str(j['createdById']),
      problemCount: _int(count['problems']) ?? 0,
      resultCount: _int(count['results']) ?? 0,
      classNames: [
        for (final a in _list(j['access']))
          if (_str(_map(_map(a)['classroom'])['name']) case final String n) n,
      ],
      bookCode: _str(_map(_map(j['chapter'])['book'])['code']),
    );
  }

  final String id;
  final String title;
  final String type;
  final String? variantLabel;
  final bool isDraft;
  final String? createdById;
  final int problemCount;
  final int resultCount;
  final List<String> classNames;
  final String? bookCode;
}
