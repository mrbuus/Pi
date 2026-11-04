import 'package:flutter/foundation.dart';

import '../data/authoring_models.dart';

/// «Тест үүсгэх» цэвэр логик — вэбийн `app/app/tests/new/page.tsx`, `components/test-builder/types.ts`.

// ============================================================================
// Хариуны түлхүүр илрүүлэлт — API `tests/grading.ts`-ийн `choiceModeOf/hasKnownAnswer`-тэй ИЖИЛ
// (сервер дүн бодохдоо яг үүнийг ашигладаг; клиент өөр дүгнэлт гаргавал багш худал баталгаа харна).
// ============================================================================

final _placeholderChoice = RegExp(r'^[A-Za-zА-Яа-я]$');

bool _isPlaceholderChoices(Object? choices) {
  if (choices is! List || choices.isEmpty) return false;
  return choices.every((c) => c is String && _placeholderChoice.hasMatch(c.trim()));
}

enum _ChoiceMode { text, letter }

_ChoiceMode? _choiceModeOf(ServerProblem p) {
  if (p.format != ProblemFormats.choice) return null;
  if (p.choiceOptions.isNotEmpty) return _ChoiceMode.text;
  final c = p.choices;
  if (c is List && c.isNotEmpty) return _isPlaceholderChoices(c) ? _ChoiceMode.letter : _ChoiceMode.text;
  return null;
}

/// Бодлого зөв хариутай эсэх. Хариугүй бодлого оноо авахгүй тул тестэд орвол дүн шударга бус.
bool hasKnownAnswer(ServerProblem p) {
  // TEXT горим (шинэ эсвэл хуучин текстэн сонголт) — зөвхөн `choiceOptions`-ийн isCorrect-оор.
  if (_choiceModeOf(p) == _ChoiceMode.text) return p.choiceOptions.any((o) => o.isCorrect);
  final c = p.correctAnswer;
  if (c == null || c == '') return false;
  if (c is Map && _truthy(c['manualReview'])) return false;
  return true;
}

bool _truthy(Object? v) => switch (v) {
  null || false || '' => false,
  final num n => n != 0 && !n.isNaN,
  _ => true,
};

/// Хариу «шалгах шаардлагатай» гэж тэмдэглэгдсэн эсэх.
bool needsAnswerReview(ServerProblem p) => hasKnownAnswer(p) && p.analysis?.answerKeyStatus == 'REVIEW_REQUIRED';

// ============================================================================
// Түвшин — өгөгдлөөс гарган авсан ойролцоо үзүүлэлт (5-аас цөөн оролдлоготой бол тодорхойгүй).
// ============================================================================

enum Difficulty {
  easy('Хялбар'),
  medium('Дунд'),
  hard('Хэцүү'),
  unknown('Тодорхойгүй');

  const Difficulty(this.label);
  final String label;
}

Difficulty difficultyOf(ServerProblem p) {
  final rate = p.correctRate;
  if (rate == null || p.attemptCount < 5) return Difficulty.unknown;
  if (rate >= 0.7) return Difficulty.easy;
  if (rate >= 0.4) return Difficulty.medium;
  return Difficulty.hard;
}

// ============================================================================
// ЭЕШ стандарт бүтэц: I хэсэг 36 СОНГОХ (№1–12 = 1, №13–28 = 2, №29–36 = 3 оноо), II хэсэг 4 НӨХӨХ, 100 мин.
// ============================================================================

const eeshChoiceCount = 36;
const eeshFillCount = 4;
const eeshTotalPoints = 100;
const eeshTimeLimitMin = 100;
const eeshLikeTypes = {TestTypes.eeshMock, TestTypes.chapterExam};

int eeshPointFor(int choiceIndex) => choiceIndex < 12 ? 1 : (choiceIndex < 28 ? 2 : 3);

int? parsePositiveInt(String value) {
  final n = int.tryParse(value.trim());
  return n != null && n > 0 ? n : null;
}

/// Үүсгэх маягтын бүтэн төлөв — серверийн нооргийн (`TestDraftStateDto`) талбаруудтай ижил.
@immutable
class BuilderForm {
  const BuilderForm({
    this.subject = '',
    this.title = '',
    this.type = TestTypes.chapterExam,
    this.gradingMode = GradingModes.auto,
    this.chapterId = '',
    this.timeLimit = '100',
    this.groupKey = '',
    this.variantLabel = 'A',
    this.pdfKey = '',
    this.selectedProblems = const [],
    this.pointOverrides = const {},
    this.selectedClasses = const [],
  });

  /// Хүчингүй утгыг алгасаж сэргээнэ (вэбийн `applyDraftState`).
  factory BuilderForm.fromDraftState(Map<String, Object?> state) {
    String text(String key, [String fallback = '']) => state[key] is String ? state[key]! as String : fallback;
    List<String> strings(String key) => [
      for (final v in (state[key] is List ? state[key]! as List : const <Object?>[]))
        if (v is String) v,
    ];
    final overrides = <String, int>{};
    final raw = state['pointOverrides'];
    if (raw is Map) {
      for (final e in raw.entries) {
        final v = e.value;
        if (e.key is String && v is num && v == v.roundToDouble() && v > 0) overrides[e.key as String] = v.toInt();
      }
    }
    final type = text('type', TestTypes.chapterExam);
    final mode = text('gradingMode', GradingModes.auto);
    return BuilderForm(
      subject: Subjects.labels.containsKey(text('subject')) ? text('subject') : Subjects.all,
      title: text('title'),
      type: TestTypes.labels.containsKey(type) ? type : TestTypes.chapterExam,
      gradingMode: mode == GradingModes.manual ? GradingModes.manual : GradingModes.auto,
      chapterId: text('chapterId'),
      timeLimit: text('timeLimit', '100'),
      groupKey: text('groupKey'),
      variantLabel: text('variantLabel', 'A'),
      pdfKey: text('pdfKey'),
      selectedProblems: strings('selectedProblems'),
      pointOverrides: overrides,
      selectedClasses: strings('selectedClasses'),
    );
  }

  final String subject;
  final String title;
  final String type;
  final String gradingMode;
  final String chapterId;
  final String timeLimit;
  final String groupKey;
  final String variantLabel;
  final String pdfKey;

  /// Сонгосон бодлогууд тестэд орох дарааллаар.
  final List<String> selectedProblems;

  /// Зөвхөн энэ тестэд хэрэглэх оноо (бодлогын өөрийн оноог өөрчлөхгүй).
  final Map<String, int> pointOverrides;
  final List<String> selectedClasses;

  BuilderForm copyWith({
    String? subject,
    String? title,
    String? type,
    String? gradingMode,
    String? chapterId,
    String? timeLimit,
    String? groupKey,
    String? variantLabel,
    String? pdfKey,
    List<String>? selectedProblems,
    Map<String, int>? pointOverrides,
    List<String>? selectedClasses,
  }) => BuilderForm(
    subject: subject ?? this.subject,
    title: title ?? this.title,
    type: type ?? this.type,
    gradingMode: gradingMode ?? this.gradingMode,
    chapterId: chapterId ?? this.chapterId,
    timeLimit: timeLimit ?? this.timeLimit,
    groupKey: groupKey ?? this.groupKey,
    variantLabel: variantLabel ?? this.variantLabel,
    pdfKey: pdfKey ?? this.pdfKey,
    selectedProblems: selectedProblems ?? this.selectedProblems,
    pointOverrides: pointOverrides ?? this.pointOverrides,
    selectedClasses: selectedClasses ?? this.selectedClasses,
  );

  /// Нооргийн бие (`POST/PATCH /tests/drafts`).
  Map<String, Object?> toDraftJson() => {
    'subject': subject,
    'title': title,
    'type': type,
    'gradingMode': gradingMode,
    'chapterId': chapterId,
    'timeLimit': timeLimit,
    'groupKey': groupKey,
    'variantLabel': variantLabel,
    'pdfKey': pdfKey,
    'selectedProblems': selectedProblems,
    'pointOverrides': pointOverrides,
    'selectedClasses': selectedClasses,
  };

  /// Хадгалах зүйлтэй эсэх — хоосон маягтыг ноорог болгож хадгалахгүй.
  bool get hasContent => title.trim().isNotEmpty || selectedProblems.isNotEmpty || selectedClasses.isNotEmpty;

  bool get gated => Subjects.isGated(subject);

  /// Бодлогогүй хаалттай хичээлийн тест — үүсгээд засварлагчид бодлогоо бичнэ, анги тэнд сонгоно.
  bool get writeLater => gated && selectedProblems.isEmpty;

  int pointsFor(ServerProblem p) => pointOverrides[p.id] ?? p.points ?? 1;

  @override
  bool operator ==(Object other) =>
      other is BuilderForm &&
      other.subject == subject &&
      other.title == title &&
      other.type == type &&
      other.gradingMode == gradingMode &&
      other.chapterId == chapterId &&
      other.timeLimit == timeLimit &&
      other.groupKey == groupKey &&
      other.variantLabel == variantLabel &&
      other.pdfKey == pdfKey &&
      listEquals(other.selectedProblems, selectedProblems) &&
      mapEquals(other.pointOverrides, pointOverrides) &&
      listEquals(other.selectedClasses, selectedClasses);

  @override
  int get hashCode => Object.hash(
    subject,
    title,
    type,
    gradingMode,
    chapterId,
    timeLimit,
    groupKey,
    variantLabel,
    pdfKey,
    Object.hashAll(selectedProblems),
    Object.hashAll(pointOverrides.entries.map((e) => '${e.key}=${e.value}')),
    Object.hashAll(selectedClasses),
  );
}

// ======================= Сонголтын үйлдэл =======================

/// Бодлогыг сонгох / хасах. Хасахад оноо override цэвэрлэгдэнэ (дахин сонгоход стандарт оноогоор).
BuilderForm toggleProblem(BuilderForm f, String id) {
  if (f.selectedProblems.contains(id)) {
    return f.copyWith(
      selectedProblems: [
        for (final x in f.selectedProblems)
          if (x != id) x,
      ],
      pointOverrides: {...f.pointOverrides}..remove(id),
    );
  }
  return f.copyWith(selectedProblems: [...f.selectedProblems, id]);
}

/// Сонгосон дарааллыг солих (`onReorderItem`-ийн `old`, эцсийн `new` индекс).
BuilderForm reorderSelected(BuilderForm f, int oldIndex, int newIndex) {
  final list = [...f.selectedProblems];
  if (oldIndex < 0 || oldIndex >= list.length) return f;
  final to = newIndex.clamp(0, list.length - 1);
  final moved = list.removeAt(oldIndex);
  list.insert(to, moved);
  return f.copyWith(selectedProblems: list);
}

BuilderForm moveSelected(BuilderForm f, String id, int delta) {
  final i = f.selectedProblems.indexOf(id);
  final j = i + delta;
  if (i < 0 || j < 0 || j >= f.selectedProblems.length) return f;
  return reorderSelected(f, i, j);
}

BuilderForm setPoints(BuilderForm f, String id, int points) =>
    f.copyWith(pointOverrides: {...f.pointOverrides, id: points});

BuilderForm bulkSetPoints(BuilderForm f, int points) =>
    f.copyWith(pointOverrides: {...f.pointOverrides, for (final id in f.selectedProblems) id: points});

BuilderForm toggleClass(BuilderForm f, String id) => f.copyWith(
  selectedClasses: f.selectedClasses.contains(id)
      ? [
          for (final x in f.selectedClasses)
            if (x != id) x,
        ]
      : [...f.selectedClasses, id],
);

/// «36+4 загвар» — бүлгийн бодлогуудаас форматаар шүүж дараалал, оноог тавина.
/// Буцаах: шинэ маягт + анхааруулга (`null` бол бүтэн бүтэц үүссэн).
(BuilderForm, String?) applyEeshTemplate(BuilderForm f, List<ServerProblem> problems) {
  final choice = [
    for (final p in problems)
      if (p.format == ProblemFormats.choice) p.id,
  ].take(eeshChoiceCount).toList();
  final fill = [
    for (final p in problems)
      if (p.format == ProblemFormats.fill) p.id,
  ].take(eeshFillCount).toList();
  if (choice.isEmpty && fill.isEmpty) {
    return (f, 'Энэ бүлэгт Сонгох, Нөхөх төрлийн бодлого олдсонгүй — 36+4 бүтэц үүсгэх боломжгүй');
  }
  final next = f.copyWith(
    type: TestTypes.chapterExam,
    gradingMode: GradingModes.auto,
    timeLimit: '$eeshTimeLimitMin',
    title: f.title.trim().isEmpty ? '36+4 сэдвийн шалгалт' : f.title,
    variantLabel: f.variantLabel.trim().isEmpty ? 'A' : f.variantLabel,
    pointOverrides: {for (var i = 0; i < choice.length; i++) choice[i]: eeshPointFor(i)},
    selectedProblems: [...choice, ...fill],
  );
  final notice = choice.length < eeshChoiceCount || fill.length < eeshFillCount
      ? 'Энэ бүлэгт ${choice.length}/$eeshChoiceCount сонгох, ${fill.length}/$eeshFillCount нөхөх бодлого '
            'байгаа тул боломжит бүгдийг сонгов'
      : null;
  return (next, notice);
}

// ======================= Хураангуй =======================

@immutable
class BuilderSummary {
  const BuilderSummary({
    required this.choice,
    required this.fill,
    required this.open,
    required this.totalPoints,
    required this.missingAnswers,
    required this.reviewNeeded,
    required this.selectedCount,
    required this.deviations,
  });

  final int choice;
  final int fill;
  final int open;
  final int totalPoints;
  final int missingAnswers;
  final int reviewNeeded;
  final int selectedCount;

  /// ЭЕШ стандарт бүтцээс зөрсөн зүйлс (`SummaryRail`).
  final List<String> deviations;

  bool get allMissing => selectedCount > 0 && missingAnswers == selectedCount;
}

/// Сонгосон бодлогууд (дарааллаар, ачаалагдаагүйг алгасна).
List<ServerProblem> selectedProblemObjects(BuilderForm f, List<ServerProblem> problems) {
  final byId = {for (final p in problems) p.id: p};
  return [
    for (final id in f.selectedProblems)
      if (byId[id] case final ServerProblem p) p,
  ];
}

BuilderSummary summarize(BuilderForm f, List<ServerProblem> problems) {
  final selected = selectedProblemObjects(f, problems);
  final choice = selected.where((p) => p.format == ProblemFormats.choice).length;
  final fill = selected.where((p) => p.format == ProblemFormats.fill).length;
  final open = selected.where((p) => p.format == ProblemFormats.open).length;
  final total = selected.fold<int>(0, (s, p) => s + f.pointsFor(p));
  final limit = parsePositiveInt(f.timeLimit);
  final deviations = <String>[];
  if (eeshLikeTypes.contains(f.type) && selected.isNotEmpty) {
    if (choice != eeshChoiceCount || fill != eeshFillCount || open > 0) {
      deviations.add(
        'ЭЕШ стандарт бүтэц $eeshChoiceCount сонголт + $eeshFillCount нөхөх — одоо $choice сонголт + $fill нөхөх'
        '${open > 0 ? ' + $open задгай' : ''} байна',
      );
    }
    if (total != eeshTotalPoints) deviations.add('Нийт оноо $eeshTotalPoints байх ёстой, одоо $total');
    if (limit != eeshTimeLimitMin) {
      deviations.add('Хугацаа $eeshTimeLimitMin мин байх ёстой, одоо ${limit ?? 'тодорхойгүй'}');
    }
  }
  return BuilderSummary(
    choice: choice,
    fill: fill,
    open: open,
    totalPoints: total,
    missingAnswers: selected.where((p) => !hasKnownAnswer(p)).length,
    reviewNeeded: selected.where(needsAnswerReview).length,
    selectedCount: selected.length,
    deviations: deviations,
  );
}

/// Үүсгэхийн өмнөх шалгалт (вэбийн `createTest`). `null` = болно.
String? validateBuilder(BuilderForm f, List<ServerProblem> problems) {
  final missing = [
    if (f.title.trim().isEmpty) 'Тестийн нэр',
    if (!f.writeLater && f.selectedClasses.isEmpty) 'Харагдах анги',
  ];
  if (missing.isNotEmpty) return 'Дараах талбарууд дутуу байна: ${missing.join(', ')}';
  final s = summarize(f, problems);
  if (f.selectedClasses.isNotEmpty && s.allMissing) {
    return 'Сонгосон бүх ${s.missingAnswers} бодлого хариуны түлхүүргүй тул автоматаар дүгнэх боломжгүй — '
        'ангид оноох боломжгүй. Эхлээд наад зах нь нэг бодлогод хариу нэмнэ үү';
  }
  return null;
}

/// `POST /tests` бие. [chapterId] — сонгосон эсвэл тестийн нэрээр үүсгэсэн бүлэг.
Map<String, Object?> createTestBody(BuilderForm f, List<ServerProblem> problems, {String? chapterId}) {
  final selected = selectedProblemObjects(f, problems);
  final limit = parsePositiveInt(f.timeLimit);
  final targetChapter = chapterId ?? (f.chapterId.isEmpty ? null : f.chapterId);
  return {
    'title': f.title.trim(),
    'type': f.type,
    'gradingMode': f.gradingMode,
    'chapterId': ?targetChapter,
    'timeLimitMin': ?limit,
    if (f.groupKey.trim().isNotEmpty) 'groupKey': f.groupKey.trim(),
    if (f.variantLabel.trim().isNotEmpty) 'variantLabel': f.variantLabel.trim(),
    if (f.pdfKey.trim().isNotEmpty) 'pdfKey': f.pdfKey.trim(),
    'classroomIds': f.writeLater ? const <String>[] : f.selectedClasses,
    'problems': [
      for (var i = 0; i < selected.length; i++)
        {'problemId': selected[i].id, 'order': i + 1, 'points': f.pointsFor(selected[i])},
    ],
  };
}

/// Хаалттай хичээлийн ангид сонгосон бусад хичээлийн анги (сурагчид нь тестийг харахгүй).
List<ClassroomOption> mismatchedClasses(BuilderForm f, List<ClassroomOption> classrooms) {
  if (!f.gated) return const [];
  return [
    for (final c in classrooms)
      if (f.selectedClasses.contains(c.id) && c.subjectOrMath != f.subject) c,
  ];
}

// ======================= Сангаас сонгох шүүлтүүр =======================

enum AnswerKeyFilter { any, known, missing }

enum ImageFilter { any, yes, no }

@immutable
class BankFilter {
  const BankFilter({
    this.search = '',
    this.format = '',
    this.difficulty,
    this.answerKey = AnswerKeyFilter.any,
    this.image = ImageFilter.any,
  });

  final String search;

  /// Хоосон = бүх төрөл.
  final String format;
  final Difficulty? difficulty;
  final AnswerKeyFilter answerKey;
  final ImageFilter image;

  BankFilter copyWith({
    String? search,
    String? format,
    Difficulty? Function()? difficulty,
    AnswerKeyFilter? answerKey,
    ImageFilter? image,
  }) => BankFilter(
    search: search ?? this.search,
    format: format ?? this.format,
    difficulty: difficulty == null ? this.difficulty : difficulty(),
    answerKey: answerKey ?? this.answerKey,
    image: image ?? this.image,
  );

  /// Код, бодлогын текст, tag, сэдвээр хайна (вэбийн `ProblemPicker`).
  bool matches(ServerProblem p) {
    if (format.isNotEmpty && p.format != format) return false;
    if (difficulty != null && difficultyOf(p) != difficulty) return false;
    if (answerKey == AnswerKeyFilter.known && !hasKnownAnswer(p)) return false;
    if (answerKey == AnswerKeyFilter.missing && hasKnownAnswer(p)) return false;
    if (image == ImageFilter.yes && p.imageKey == null) return false;
    if (image == ImageFilter.no && p.imageKey != null) return false;
    final q = search.trim().toLowerCase();
    if (q.isEmpty) return true;
    return p.token.toLowerCase().contains(q) ||
        (p.statementText ?? '').toLowerCase().contains(q) ||
        p.tags.any((t) => t.toLowerCase().contains(q)) ||
        (p.analysis?.topic ?? '').toLowerCase().contains(q) ||
        (p.analysis?.subtopic ?? '').toLowerCase().contains(q);
  }
}
