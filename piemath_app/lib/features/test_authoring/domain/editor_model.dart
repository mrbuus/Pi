import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../exam/domain/fill_slots.dart';
import '../data/authoring_models.dart';

/// «Тест засах» цэвэр логик — вэбийн `components/test-editor/model.ts`-ийн хуулбар
/// (`web/tests/test-editor-model.test.cjs`-тэй ижил дүрэм). Flutter widget-гүй.
///
/// Тохиргоо + бодлогын дараалал/оноо + блокийн агуулгын ноорог нэг төлөвт ([EditorState]) —
/// буцаах/давтах бүгдэд нэг дор ажиллана, нэг «Хадгалах».

/// A, B, C … (вэбийн `LETTERS`). Сонголт 8-аас олон болохгүй.
const choiceLetters = 'ABCDEFGH';

String choiceLetter(int i) => i >= 0 && i < choiceLetters.length ? choiceLetters[i] : '${i + 1}';

/// Нэг сонголт (дараалал = A, B, C …).
@immutable
class EditorChoice {
  const EditorChoice({this.text = '', this.isCorrect = false, this.imageKey});

  final String text;
  final bool isCorrect;

  /// Сонголтын зураг (график хариу).
  final String? imageKey;

  EditorChoice copyWith({String? text, bool? isCorrect, String? Function()? imageKey}) => EditorChoice(
    text: text ?? this.text,
    isCorrect: isCorrect ?? this.isCorrect,
    imageKey: imageKey == null ? this.imageKey : imageKey(),
  );

  /// Серверт илгээх хэлбэр (`ChoiceOptionInputDto`). Зураг байвал л `imageKey`.
  Map<String, Object?> toBody() => {'text': text.trim(), 'isCorrect': isCorrect, 'imageKey': ?imageKey};

  @override
  bool operator ==(Object other) =>
      other is EditorChoice && other.text == text && other.isCorrect == isCorrect && other.imageKey == imageKey;

  @override
  int get hashCode => Object.hash(text, isCorrect, imageKey);
}

/// Блокийн (бодлогын) агуулга — сервертэй харьцуулж зөвхөн өөрчлөгдсөнийг илгээнэ.
@immutable
class BlockContent {
  const BlockContent({
    this.statement = '',
    this.imageKey,
    this.format = ProblemFormats.choice,
    this.choices = const [],
    this.fill = '',
  });

  final String statement;
  final String? imageKey;
  final String format;

  /// CHOICE: сонголтууд.
  final List<EditorChoice> choices;

  /// FILL_NUMBER: нүдний цифрүүд бодлогын дарааллаар (`_` = хоосон).
  final String fill;

  BlockContent copyWith({
    String? statement,
    String? Function()? imageKey,
    String? format,
    List<EditorChoice>? choices,
    String? fill,
  }) => BlockContent(
    statement: statement ?? this.statement,
    imageKey: imageKey == null ? this.imageKey : imageKey(),
    format: format ?? this.format,
    choices: choices ?? this.choices,
    fill: fill ?? this.fill,
  );

  /// Зөв хариу тодорхойгүй эсэх (картын «хариугүй» тэмдэг).
  bool get missingAnswer =>
      (format == ProblemFormats.choice && !choices.any((c) => c.isCorrect)) ||
      (format == ProblemFormats.fill && fill.replaceAll(fillEmpty, '').trim().isEmpty);

  /// Зөв сонголтын индекс (-1 = алга).
  int get correctIndex => choices.indexWhere((c) => c.isCorrect);

  @override
  bool operator ==(Object other) =>
      other is BlockContent &&
      other.statement == statement &&
      other.imageKey == imageKey &&
      other.format == format &&
      listEquals(other.choices, choices) &&
      other.fill == fill;

  @override
  int get hashCode => Object.hash(statement, imageKey, format, Object.hashAll(choices), fill);
}

/// Тест дэх бодлогын байр.
@immutable
class BlockItem {
  const BlockItem({required this.key, this.problemId, this.points = 1});

  /// Тогтвортой түлхүүр: байгаа бодлого — problemId, шинэ — `new-…`.
  final String key;

  /// `null` — шинэ бодлого (хадгалахад үүснэ).
  final String? problemId;

  /// Тест дэх оноо.
  final int points;

  bool get isNew => problemId == null;

  BlockItem copyWith({String? key, String? problemId, int? points}) =>
      BlockItem(key: key ?? this.key, problemId: problemId ?? this.problemId, points: points ?? this.points);

  @override
  bool operator ==(Object other) =>
      other is BlockItem && other.key == key && other.problemId == problemId && other.points == points;

  @override
  int get hashCode => Object.hash(key, problemId, points);
}

/// Тестийн тохиргоо (талбар бүр бичвэр — маягттай шууд холбогдоно).
@immutable
class TestSettings {
  const TestSettings({
    this.title = '',
    this.type = TestTypes.daily,
    this.gradingMode = GradingModes.auto,
    this.chapterId = '',
    this.subject = '',
    this.timeLimit = '',
    this.groupKey = '',
    this.variantLabel = '',
    this.pdfKey = '',
    this.price = '',
  });

  factory TestSettings.fromDetails(TestDetails d) => TestSettings(
    title: d.title,
    type: d.type,
    gradingMode: d.gradingMode,
    chapterId: d.chapterId ?? '',
    subject: d.subject ?? '',
    timeLimit: d.timeLimitMin?.toString() ?? '',
    groupKey: d.groupKey ?? '',
    variantLabel: d.variantLabel ?? '',
    pdfKey: d.pdfKey ?? '',
    price: d.price?.toString() ?? '',
  );

  final String title;
  final String type;
  final String gradingMode;
  final String chapterId;
  final String subject;
  final String timeLimit;
  final String groupKey;
  final String variantLabel;
  final String pdfKey;
  final String price;

  TestSettings copyWith({
    String? title,
    String? type,
    String? gradingMode,
    String? chapterId,
    String? subject,
    String? timeLimit,
    String? groupKey,
    String? variantLabel,
    String? pdfKey,
    String? price,
  }) => TestSettings(
    title: title ?? this.title,
    type: type ?? this.type,
    gradingMode: gradingMode ?? this.gradingMode,
    chapterId: chapterId ?? this.chapterId,
    subject: subject ?? this.subject,
    timeLimit: timeLimit ?? this.timeLimit,
    groupKey: groupKey ?? this.groupKey,
    variantLabel: variantLabel ?? this.variantLabel,
    pdfKey: pdfKey ?? this.pdfKey,
    price: price ?? this.price,
  );

  @override
  bool operator ==(Object other) =>
      other is TestSettings &&
      other.title == title &&
      other.type == type &&
      other.gradingMode == gradingMode &&
      other.chapterId == chapterId &&
      other.subject == subject &&
      other.timeLimit == timeLimit &&
      other.groupKey == groupKey &&
      other.variantLabel == variantLabel &&
      other.pdfKey == pdfKey &&
      other.price == price;

  @override
  int get hashCode =>
      Object.hash(title, type, gradingMode, chapterId, subject, timeLimit, groupKey, variantLabel, pdfKey, price);
}

/// Засварлагчийн бүтэн төлөв.
@immutable
class EditorState {
  const EditorState({
    this.settings = const TestSettings(),
    this.items = const [],
    this.classes = const [],
    this.drafts = const {},
  });

  factory EditorState.fromDetails(TestDetails d) => EditorState(
    settings: TestSettings.fromDetails(d),
    items: [for (final p in d.problems) BlockItem(key: p.problemId, problemId: p.problemId, points: p.points)],
    classes: d.classroomIds,
  );

  final TestSettings settings;
  final List<BlockItem> items;
  final List<String> classes;

  /// Засварласан эсвэл шинэ блокийн агуулга (`item.key` → агуулга).
  final Map<String, BlockContent> drafts;

  EditorState copyWith({
    TestSettings? settings,
    List<BlockItem>? items,
    List<String>? classes,
    Map<String, BlockContent>? drafts,
  }) => EditorState(
    settings: settings ?? this.settings,
    items: items ?? this.items,
    classes: classes ?? this.classes,
    drafts: drafts ?? this.drafts,
  );

  @override
  bool operator ==(Object other) =>
      other is EditorState &&
      other.settings == settings &&
      listEquals(other.items, items) &&
      listEquals(other.classes, classes) &&
      mapEquals(other.drafts, drafts);

  @override
  int get hashCode => Object.hash(settings, Object.hashAll(items), Object.hashAll(classes), drafts.length);
}

// ======================= Сервер → засварлагч =======================

/// `correctAnswer` → нүдний цифрүүд (мөр, тоо, үсгээр түлхүүрлэсэн объект).
String fillAnswerOf(Object? correctAnswer, String statement) {
  if (correctAnswer == null) return '';
  if (correctAnswer is String) return correctAnswer.trim();
  if (correctAnswer is num) return _numText(correctAnswer);
  if (correctAnswer is Map) {
    final obj = correctAnswer.cast<Object?, Object?>();
    final out = StringBuffer();
    for (final group in parseFillSlots(statement)) {
      final whole = obj[group.key];
      if (whole is String || whole is num) {
        final s = whole is num ? _numText(whole) : whole! as String;
        out.write(s.padRight(group.length, fillEmpty).substring(0, group.length));
        continue;
      }
      for (final letter in group.key.split('')) {
        final v = obj[letter];
        final s = v is num ? _numText(v) : (v is String ? v : '');
        out.write(s.isEmpty ? fillEmpty : s.substring(0, 1));
      }
    }
    return out.toString().replaceFirst(RegExp('$fillEmpty+\$'), '');
  }
  return '';
}

String _numText(num n) => n == n.roundToDouble() ? n.toInt().toString() : n.toString();

/// Хуучин загвар (`choices` текстийн массив + `correctAnswer` = «A» үсэг эсвэл зөв хариуны текст).
List<EditorChoice> legacyChoiceList(Object? choices, Object? correctAnswer) {
  if (choices is! List) return const [];
  final texts = [for (final t in choices) t is String ? t : '${t ?? ''}'];
  final raw = correctAnswer is String || correctAnswer is num ? '$correctAnswer'.trim() : '';
  final byLetter = RegExp(r'^[A-Ha-h]$').hasMatch(raw) ? choiceLetters.indexOf(raw.toUpperCase()) : -1;
  final correct = byLetter >= 0 && byLetter < texts.length ? byLetter : texts.indexWhere((t) => t.trim() == raw);
  return [for (var i = 0; i < texts.length; i++) EditorChoice(text: texts[i], isCorrect: i == correct)];
}

BlockContent contentOf(ServerProblem p) {
  final statement = p.statementText ?? '';
  var choices = const <EditorChoice>[];
  if (p.format == ProblemFormats.choice) {
    if (p.choiceOptions.isNotEmpty) {
      final sorted = [...p.choiceOptions]..sort((a, b) => a.order.compareTo(b.order));
      choices = [for (final c in sorted) EditorChoice(text: c.text, isCorrect: c.isCorrect, imageKey: c.imageKey)];
    } else {
      choices = legacyChoiceList(p.choices, p.correctAnswer);
    }
  }
  return BlockContent(
    statement: statement,
    imageKey: p.imageKey,
    format: p.format,
    choices: choices,
    fill: p.format == ProblemFormats.fill ? fillAnswerOf(p.correctAnswer, statement) : '',
  );
}

/// Шинэ бодлого. Зөв хариуг багш өөрөө сонгоно — анхнаасаа A-г зөв болговол андуурна.
BlockContent newContent(String format) => BlockContent(
  format: format,
  choices: format == ProblemFormats.choice ? List.filled(5, const EditorChoice()) : const [],
);

// ======================= Шалгалт =======================

final _fillCell = RegExp(r'^[0-9-]$');

/// `''` — зөв; эс бөгөөс багшид харуулах товч алдаа (вэбийн `validateContent`).
String validateContent(BlockContent c) {
  if (c.statement.trim().isEmpty && c.imageKey == null) return 'Бодлогын текст хоосон байна';
  if (c.format == ProblemFormats.choice) {
    if (c.choices.length < 2) return 'Дор хаяж 2 сонголт хэрэгтэй';
    if (c.choices.any((ch) => ch.text.trim().isEmpty && ch.imageKey == null)) return 'Хоосон сонголт байна';
    if (c.choices.where((ch) => ch.isCorrect).length != 1) return 'Зөв хариуг сонгоно уу';
  }
  if (c.format == ProblemFormats.fill) {
    final total = slotsTotalLength(parseFillSlots(c.statement));
    if (total == 0) {
      if (c.fill.trim().isEmpty) return 'Хариуг оруулна уу';
    } else {
      final cells = [for (var i = 0; i < total; i++) i < c.fill.length ? c.fill[i] : ''];
      if (cells.any((ch) => !_fillCell.hasMatch(ch))) return 'Хариуны $total нүдийг бүгдийг бөглөнө үү';
    }
  }
  return '';
}

// ======================= Дараалал =======================

List<BlockItem> moveItem(List<BlockItem> items, String key, int toIndex) {
  final from = items.indexWhere((i) => i.key == key);
  if (from < 0 || items.isEmpty) return items;
  final to = toIndex.clamp(0, items.length - 1);
  if (to == from) return items;
  final next = [...items];
  final moved = next.removeAt(from);
  next.insert(to, moved);
  return next;
}

/// [SliverReorderableList]-ийн `onReorderItem(old, new)` → [moveItem] ([newIndex] нь эцсийн байр).
List<BlockItem> reorderItems(List<BlockItem> items, int oldIndex, int newIndex) {
  if (oldIndex < 0 || oldIndex >= items.length) return items;
  return moveItem(items, items[oldIndex].key, newIndex);
}

List<BlockItem> insertItems(List<BlockItem> items, int index, List<BlockItem> added) {
  final fresh = [
    for (final a in added)
      if (!items.any((i) => i.key == a.key)) a,
  ];
  final at = index.clamp(0, items.length);
  return [...items.sublist(0, at), ...fresh, ...items.sublist(at)];
}

List<BlockItem> removeItem(List<BlockItem> items, String key) => [
  for (final i in items)
    if (i.key != key) i,
];

// ======================= Хадгалах төлөвлөгөө =======================

int? _positiveInt(String value) {
  if (value.trim().isEmpty) return null;
  final n = int.tryParse(value.trim());
  return n != null && n > 0 ? n : null;
}

/// «1000-S22A-12» → «1000-S22A»; хөршгүй бол «T».
String tokenPrefix(List<String> neighbors) {
  for (final t in neighbors) {
    final i = t.lastIndexOf('-');
    if (i > 0) return t.substring(0, i);
  }
  return 'T';
}

@immutable
class SaveContext {
  const SaveContext({
    required this.originals,
    required this.limited,
    required this.isAdmin,
    required this.thousand,
    required this.chapterId,
    required this.makeToken,
  });

  final Map<String, ServerProblem> originals;

  /// Сурагч өгсөн — зөвхөн нэр, хугацаа.
  final bool limited;
  final bool isAdmin;

  /// 1000 бодлогын тест: анги «Шалгалт → Тохиргоо»-оос, төрөл түгжээтэй.
  final bool thousand;

  /// Шинэ бодлогын бүлэг (тестийн бүлэг).
  final String? chapterId;

  /// Шинэ бодлогын код (давхардвал сервер 409 — дахин оролдоно).
  final String Function(BlockItem item, int index) makeToken;
}

@immutable
class PlannedCreate {
  const PlannedCreate(this.key, this.body);
  final String key;
  final Map<String, Object?> body;
}

@immutable
class PlannedUpdate {
  const PlannedUpdate(this.key, this.problemId, this.body, this.expectedVersion);
  final String key;
  final String problemId;
  final Map<String, Object?> body;
  final int? expectedVersion;
}

@immutable
class SavePlan {
  const SavePlan({this.creates = const [], this.updates = const [], this.test});

  final List<PlannedCreate> creates;
  final List<PlannedUpdate> updates;

  /// `null` — тестийн өөрчлөлтгүй. `problems[].problemId` нь шинэ бодлогод түлхүүр (key) байна.
  final Map<String, Object?>? test;

  bool get isEmpty => creates.isEmpty && updates.isEmpty && test == null;

  int get count => creates.length + updates.length + (test == null ? 0 : 1);
}

List<Map<String, Object?>> _choiceBody(List<EditorChoice> choices) => [for (final c in choices) c.toBody()];

/// Байгаа бодлогын агуулгын ялгаа → `PATCH /problems/:id`.
Map<String, Object?> contentPatch(BlockContent original, BlockContent draft) {
  final body = <String, Object?>{};
  if (draft.statement != original.statement) body['statementText'] = draft.statement;
  if (draft.imageKey != original.imageKey) body['imageKey'] = draft.imageKey;
  if (draft.format == ProblemFormats.choice) {
    final a = jsonEncode(_choiceBody(original.choices));
    final b = jsonEncode(_choiceBody(draft.choices));
    if (a != b) body['choiceOptions'] = _choiceBody(draft.choices);
  }
  if (draft.format == ProblemFormats.fill && draft.fill != original.fill) body['correctAnswer'] = draft.fill;
  return body;
}

Map<String, Object?> _createBody(BlockContent c, BlockItem item, SaveContext ctx, int index) => {
  'chapterId': ctx.chapterId,
  'token': ctx.makeToken(item, index),
  'format': c.format,
  'statementText': c.statement,
  'imageKey': ?c.imageKey,
  if (c.format == ProblemFormats.choice) 'choiceOptions': _choiceBody(c.choices) else 'correctAnswer': c.fill,
  'points': item.points,
};

Map<String, Object?> _settingsPatch(TestSettings a, TestSettings b, SaveContext ctx) {
  final out = <String, Object?>{};
  if (a.title != b.title) out['title'] = b.title.trim();
  if (a.timeLimit != b.timeLimit) out['timeLimitMin'] = _positiveInt(b.timeLimit);
  if (ctx.limited) return out;
  if (a.type != b.type && !ctx.thousand) out['type'] = b.type;
  if (a.gradingMode != b.gradingMode) out['gradingMode'] = b.gradingMode;
  if (a.chapterId != b.chapterId) out['chapterId'] = b.chapterId.isEmpty ? null : b.chapterId;
  if (a.groupKey != b.groupKey) out['groupKey'] = b.groupKey.trim().isEmpty ? null : b.groupKey.trim();
  if (a.variantLabel != b.variantLabel) {
    out['variantLabel'] = b.variantLabel.trim().isEmpty ? null : b.variantLabel.trim();
  }
  if (a.pdfKey != b.pdfKey) out['pdfKey'] = b.pdfKey.trim().isEmpty ? null : b.pdfKey.trim();
  if (ctx.isAdmin && a.price != b.price) out['price'] = b.price.trim().isEmpty ? null : int.tryParse(b.price.trim());
  return out;
}

bool _sameItems(List<BlockItem> a, List<BlockItem> b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i].key != b[i].key || a[i].points != b[i].points) return false;
  }
  return true;
}

/// Юуг серверт илгээх вэ (вэбийн `planSave`).
SavePlan planSave(EditorState state, EditorState baseline, SaveContext ctx) {
  final creates = <PlannedCreate>[];
  final updates = <PlannedUpdate>[];
  for (var index = 0; index < state.items.length; index++) {
    final item = state.items[index];
    final draft = state.drafts[item.key];
    if (item.problemId == null) {
      if (draft != null) creates.add(PlannedCreate(item.key, _createBody(draft, item, ctx, index)));
      continue;
    }
    final original = ctx.originals[item.problemId];
    if (draft == null || original == null) continue;
    final body = contentPatch(contentOf(original), draft);
    if (body.isEmpty) continue;
    updates.add(PlannedUpdate(item.key, item.problemId!, body, original.version));
  }

  final test = _settingsPatch(baseline.settings, state.settings, ctx);
  if (!ctx.limited) {
    if (creates.isNotEmpty || !_sameItems(baseline.items, state.items)) {
      test['problems'] = [
        for (var i = 0; i < state.items.length; i++)
          {
            'problemId': state.items[i].problemId ?? state.items[i].key,
            'order': i + 1,
            'points': state.items[i].points,
          },
      ];
    }
    final a = [...baseline.classes]..sort();
    final b = [...state.classes]..sort();
    if (!ctx.thousand && a.join(',') != b.join(',')) test['classroomIds'] = state.classes;
  }
  return SavePlan(creates: creates, updates: updates, test: test.isEmpty ? null : test);
}

// ======================= Тоо =======================

@immutable
class EditorStats {
  const EditorStats({this.choice = 0, this.fill = 0, this.open = 0, this.points = 0});

  final int choice;
  final int fill;
  final int open;
  final int points;
}

EditorStats statsOf(List<BlockItem> items, String Function(BlockItem item) formatOf) {
  var choice = 0, fill = 0, open = 0, points = 0;
  for (final item in items) {
    final f = formatOf(item);
    if (f == ProblemFormats.choice) {
      choice++;
    } else if (f == ProblemFormats.fill) {
      fill++;
    } else {
      open++;
    }
    points += item.points;
  }
  return EditorStats(choice: choice, fill: fill, open: open, points: points);
}
