import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/authoring_models.dart';
import '../data/authoring_repository.dart';
import '../domain/authoring_permissions.dart';
import '../domain/editor_model.dart';

/// Хоёр хүсэлтийг зэрэг; алдвал эхний алдааг (ихэвчлэн [ApiError]) шиднэ.
Future<(A, B)> both<A, B>(Future<A> a, Future<B> b) async {
  try {
    return await (a, b).wait;
  } on ParallelWaitError<(A?, B?), (AsyncError?, AsyncError?)> catch (e) {
    final err = e.errors.$1 ?? e.errors.$2;
    if (err == null) rethrow;
    Error.throwWithStackTrace(err.error, err.stackTrace);
  }
}

/// Хадгалалтын үр дүн (дэлгэц snackbar, үсрэлтэд ашиглана).
@immutable
class EditorSaveOutcome {
  const EditorSaveOutcome._({required this.ok, this.message = '', this.conflict, this.jumpKey, this.nothing = false});

  const EditorSaveOutcome.saved(String message) : this._(ok: true, message: message);
  const EditorSaveOutcome.nothing() : this._(ok: true, nothing: true);
  const EditorSaveOutcome.invalid(String message, {String? jumpKey})
    : this._(ok: false, message: message, jumpKey: jumpKey);
  const EditorSaveOutcome.conflict(VersionConflict conflict) : this._(ok: false, message: '', conflict: conflict);

  final bool ok;
  final String message;
  final VersionConflict? conflict;

  /// Алдаатай бодлогын түлхүүр — жагсаалтад тэр рүү гүйлгэнэ.
  final String? jumpKey;

  /// Өөрчлөлтгүй байсан.
  final bool nothing;
}

/// Хасагдсан бодлого — «Буцаах»-д.
@immutable
class RemovedBlock {
  const RemovedBlock(this.index, this.item, this.draft);
  final int index;
  final BlockItem item;
  final BlockContent? draft;
}

/// `/app/tests/:id/edit` төлөв — вэбийн `EditTestPage` + `useUndoable`.
///
/// Нэг [EditorState] (тохиргоо + дараалал/оноо + агуулгын ноорог), буцаах/давтах стек, нэг «Хадгалах».
/// Серверт: шинэ бодлогууд `POST /problems` → засварласан `PATCH /problems/:id` → тест `PATCH /tests/:id`.
class TestEditorController extends ChangeNotifier {
  TestEditorController({
    required TestAuthoringRepository repository,
    required this.permissions,
    required this.testId,
    String Function()? randomSuffix,
  }) : _repo = repository,
       _randomSuffix = randomSuffix ?? _rand4;

  final TestAuthoringRepository _repo;
  final AuthoringPermissions permissions;
  final String testId;
  final String Function() _randomSuffix;

  static final _random = math.Random();
  static String _rand4() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return String.fromCharCodes(Iterable.generate(4, (_) => chars.codeUnitAt(_random.nextInt(chars.length))));
  }

  static const _historyLimit = 100;

  TestDetails? _test;
  EditInfo? _info;
  Map<String, ServerProblem> _originals = {};
  Map<String, BlockContent> _originalContents = {};
  int _version = 0;
  EditorState _value = const EditorState();
  EditorState _baseline = const EditorState();
  final _past = <EditorState>[];
  final _future = <EditorState>[];
  Map<String, String> _errors = {};
  bool _loading = true;
  ApiError? _loadError;
  bool _saving = false;
  VersionConflict? _conflict;
  List<ClassroomOption> _classrooms = const [];
  List<ChapterOption> _chapters = const [];
  bool _catalogLoading = false;
  bool _catalogLoaded = false;
  String _catalogError = '';
  int _newSeq = 0;
  bool _disposed = false;

  TestDetails? get test => _test;
  EditInfo? get info => _info;
  EditorState get value => _value;
  EditorState get baseline => _baseline;
  Map<String, ServerProblem> get originals => _originals;
  Map<String, String> get errors => _errors;
  bool get loading => _loading;
  ApiError? get loadError => _loadError;
  bool get saving => _saving;
  VersionConflict? get conflict => _conflict;
  List<ClassroomOption> get classrooms => _classrooms;
  List<ChapterOption> get chapters => _chapters;
  bool get catalogLoading => _catalogLoading;
  String get catalogError => _catalogError;
  int get version => _version;

  EditorLocks get locks => _test == null || _info == null
      ? const EditorLocks(limited: false, thousand: false)
      : EditorLocks.of(_test!, _info!);

  bool get canUndo => _past.isNotEmpty;
  bool get canRedo => _future.isNotEmpty;

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  // ---------------- Ачаалах ----------------

  Future<void> load() async {
    _loading = true;
    _loadError = null;
    _notify();
    try {
      final (details, info) = await both(_repo.test(testId), _repo.editInfo(testId));
      _test = details;
      _info = info;
      _version = details.version;
      _originals = {for (final p in details.problems) p.problemId: p.problem};
      _originalContents = {for (final e in _originals.entries) e.key: contentOf(e.value)};
      _value = EditorState.fromDetails(details);
      _baseline = _value;
      _past.clear();
      _future.clear();
      _errors = {};
      _conflict = null;
    } on ApiError catch (e) {
      _loadError = e;
    } on Object {
      _loadError = const ApiError(ApiErrorKind.unknown, AppStrings.genericError);
    } finally {
      _loading = false;
      _notify();
    }
  }

  /// Тохиргоо нээхэд анги, бүлгийн жагсаалт (нэг удаа; хичээл солигдвол бүлгүүд дахин).
  Future<void> loadCatalog({bool force = false}) async {
    if (_catalogLoading || (_catalogLoaded && !force)) return;
    _catalogLoading = true;
    _catalogError = '';
    _notify();
    try {
      final (c, ch) = await both(_repo.classrooms(), _repo.chapters(subject: _value.settings.subject));
      _classrooms = c;
      _chapters = ch;
      _catalogLoaded = true;
    } on ApiError catch (e) {
      _catalogError = e.message;
    } on Object {
      _catalogError = 'Жагсаалт ачаалж чадсангүй';
    } finally {
      _catalogLoading = false;
      _notify();
    }
  }

  Future<void> _reloadChapters() async {
    try {
      _chapters = await _repo.chapters(subject: _value.settings.subject);
    } on ApiError catch (e) {
      _catalogError = e.message;
    }
    _notify();
  }

  // ---------------- Агуулга ----------------

  BlockContent contentOfItem(BlockItem item, [Map<String, BlockContent>? drafts]) =>
      (drafts ?? _value.drafts)[item.key] ??
      (item.problemId == null ? null : _originalContents[item.problemId]) ??
      newContent(ProblemFormats.choice);

  bool isChanged(BlockItem item) {
    if (item.problemId == null) return true;
    final draft = _value.drafts[item.key];
    final original = _originalContents[item.problemId];
    if (draft == null || original == null) return false;
    return contentPatch(original, draft).isNotEmpty;
  }

  ServerProblem? problemOf(BlockItem item) => item.problemId == null ? null : _originals[item.problemId];

  /// Энэ бодлогын агуулгыг засах эсэх: шинэ бодлого үргэлж, байгаа нь Админ, Багш+.
  bool canEditContentOf(BlockItem item) => item.isNew || permissions.canEditContent;

  EditorStats get stats => statsOf(_value.items, (i) => contentOfItem(i).format);

  SaveContext _context({String Function(BlockItem, int)? makeToken}) => SaveContext(
    originals: _originals,
    limited: locks.limited,
    isAdmin: permissions.isAdmin,
    thousand: locks.thousand,
    chapterId: _value.settings.chapterId.isNotEmpty ? _value.settings.chapterId : _test?.chapterId,
    makeToken: makeToken ?? (_, _) => '',
  );

  SavePlan get plan => planSave(_value, _baseline, _context());

  /// Хадгалаагүй өөрчлөлтийн тоо (0 — «Хадгалах» идэвхгүй).
  int get dirtyCount => plan.count;

  bool get dirty => dirtyCount > 0;

  // ---------------- Буцаах стек ----------------

  void _set(EditorState next) {
    if (next == _value) return;
    _past.add(_value);
    if (_past.length > _historyLimit) _past.removeAt(0);
    _future.clear();
    _value = next;
    _notify();
  }

  void undo() {
    if (_past.isEmpty) return;
    _future.add(_value);
    _value = _past.removeLast();
    _notify();
  }

  void redo() {
    if (_future.isEmpty) return;
    _past.add(_value);
    _value = _future.removeLast();
    _notify();
  }

  // ---------------- Үйлдэл ----------------

  void updateSettings(TestSettings next) {
    final subjectChanged = next.subject != _value.settings.subject;
    _set(_value.copyWith(settings: subjectChanged ? next.copyWith(chapterId: '') : next));
    if (subjectChanged && _catalogLoaded) unawaited(_reloadChapters());
  }

  void setClasses(List<String> ids) => _set(_value.copyWith(classes: ids));

  void toggleClass(String id) => _set(
    _value.copyWith(
      classes: _value.classes.contains(id)
          ? [
              for (final c in _value.classes)
                if (c != id) c,
            ]
          : [..._value.classes, id],
    ),
  );

  /// Бодлогын агуулга (бодлого засварлагчаас буцахад нэг алхам).
  void setContent(String key, BlockContent content) {
    final item = _value.items.where((i) => i.key == key).firstOrNull;
    if (item == null) return;
    final original = item.problemId == null ? null : _originalContents[item.problemId];
    final drafts = {..._value.drafts};
    if (original != null && original == content) {
      drafts.remove(key);
    } else {
      drafts[key] = content;
    }
    if (_errors.containsKey(key)) _errors = {..._errors}..remove(key);
    _set(_value.copyWith(drafts: drafts));
  }

  /// Бодлого засварлагчаас буцахад агуулга + оноо НЭГ алхам болж орно.
  void applyEdit(String key, BlockContent content, int points) {
    final item = _value.items.where((i) => i.key == key).firstOrNull;
    if (item == null) return;
    final original = item.problemId == null ? null : _originalContents[item.problemId];
    final drafts = {..._value.drafts};
    if (original != null && original == content) {
      drafts.remove(key);
    } else {
      drafts[key] = content;
    }
    if (_errors.containsKey(key)) _errors = {..._errors}..remove(key);
    final pts = points >= 1 && points <= 100 && !locks.structureLocked ? points : item.points;
    _set(
      _value.copyWith(
        drafts: drafts,
        items: [for (final i in _value.items) i.key == key ? i.copyWith(points: pts) : i],
      ),
    );
  }

  void setPoints(String key, int points) {
    if (points < 1 || points > 100) return;
    _set(_value.copyWith(items: [for (final i in _value.items) i.key == key ? i.copyWith(points: points) : i]));
  }

  void reorder(int oldIndex, int newIndex) =>
      _set(_value.copyWith(items: reorderItems(_value.items, oldIndex, newIndex)));

  void move(String key, int toIndex) => _set(_value.copyWith(items: moveItem(_value.items, key, toIndex)));

  RemovedBlock? remove(String key) {
    final index = _value.items.indexWhere((i) => i.key == key);
    if (index < 0) return null;
    final removed = RemovedBlock(index, _value.items[index], _value.drafts[key]);
    _set(_value.copyWith(items: removeItem(_value.items, key), drafts: {..._value.drafts}..remove(key)));
    return removed;
  }

  void restore(RemovedBlock r) => _set(
    _value.copyWith(
      items: insertItems(_value.items, r.index, [r.item]),
      drafts: {..._value.drafts, if (r.draft != null) r.item.key: r.draft!},
    ),
  );

  /// Шинэ бодлого [index]-д. Түлхүүрийг буцаана (засварлагчийг шууд нээхэд).
  String insertNew(int index, String format) {
    _newSeq += 1;
    final key = 'new-$_newSeq-${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}';
    _set(
      _value.copyWith(
        items: insertItems(_value.items, index, [BlockItem(key: key)]),
        drafts: {..._value.drafts, key: newContent(format)},
      ),
    );
    return key;
  }

  /// Сангаас сонгосон бодлогуудыг [index]-д (тестэд байгааг алгасна).
  void addFromBank(int index, List<ServerProblem> problems) {
    if (problems.isEmpty) return;
    _originals = {..._originals, for (final p in problems) p.id: p};
    _originalContents = {..._originalContents, for (final p in problems) p.id: contentOf(p)};
    _set(
      _value.copyWith(
        items: insertItems(_value.items, index, [
          for (final p in problems) BlockItem(key: p.id, problemId: p.id, points: p.points ?? 1),
        ]),
      ),
    );
  }

  // ---------------- Хадгалах ----------------

  /// Вэбийн `save(overwrite)`. [overwrite] — 409-ийн дараа «Миний хувилбарыг хадгалах».
  Future<EditorSaveOutcome> save({bool overwrite = false}) async {
    final test = _test;
    if (test == null || _info == null || _saving) return const EditorSaveOutcome.nothing();
    final state = _value;
    if (state.settings.title.trim().isEmpty) return const EditorSaveOutcome.invalid('Тестийн нэр оруулна уу');

    final errs = <String, String>{};
    for (final item in state.items) {
      if (!isChanged(item)) continue;
      final msg = validateContent(contentOfItem(item, state.drafts));
      if (msg.isNotEmpty) errs[item.key] = msg;
    }
    _errors = errs;
    if (errs.isNotEmpty) {
      _notify();
      final first = state.items.firstWhere((i) => errs.containsKey(i.key));
      return EditorSaveOutcome.invalid('${errs.length} бодлогод засах зүйл байна', jumpKey: first.key);
    }
    if (state.items.any((i) => i.isNew) && state.settings.chapterId.isEmpty && (test.chapterId ?? '').isEmpty) {
      return const EditorSaveOutcome.invalid('Шинэ бодлого нэмэхэд тестийн бүлэг сэдэв хэрэгтэй («Тохиргоо»)');
    }

    final prefix = tokenPrefix([
      for (final i in state.items)
        if (i.problemId != null && (_originals[i.problemId]?.token ?? '').isNotEmpty) _originals[i.problemId]!.token,
    ]);
    String token() => '$prefix-N${_randomSuffix()}';
    final p = planSave(state, _baseline, _context(makeToken: (_, _) => token()));
    if (p.isEmpty) return const EditorSaveOutcome.nothing();

    _saving = true;
    _notify();
    final created = <String, ServerProblem>{};
    final merged = <String>{};
    String? step;
    try {
      for (final c in p.creates) {
        step = c.key;
        ServerProblem res;
        try {
          res = await _repo.createProblem(c.body);
        } on ApiError catch (e) {
          // Код давхардсан (маш ховор) — шинэ кодоор нэг удаа дахин.
          if (e.kind != ApiErrorKind.conflict) rethrow;
          res = await _repo.createProblem({...c.body, 'token': token()});
        }
        created[c.key] = res;
      }
      for (final u in p.updates) {
        step = u.key;
        final res = await _repo.updateProblem(u.problemId, {
          ...u.body,
          'expectedVersion': ?u.expectedVersion,
          if (overwrite) 'overwrite': true,
        });
        merged.addAll(res.mergedWith);
      }
      SaveResponse? testRes;
      if (p.test != null) {
        step = null;
        final body = {...p.test!};
        final rows = body['problems'];
        if (rows is List) {
          body['problems'] = [
            for (final r in rows.cast<Map<String, Object?>>())
              {...r, 'problemId': created[r['problemId']]?.id ?? r['problemId']},
          ];
        }
        testRes = await _repo.updateTest(testId, {
          ...body,
          'expectedVersion': _version,
          if (overwrite) 'overwrite': true,
        });
        merged.addAll(testRes.mergedWith);
      }
      _conflict = null;
      final parts = [
        if (p.creates.isNotEmpty) '${p.creates.length} шинэ бодлого',
        if (p.updates.isNotEmpty) '${p.updates.length} бодлого засагдлаа',
        if (merged.isNotEmpty) '${merged.join(', ')}-ийн өөрчлөлттэй нэгтгэлээ',
        if (testRes?.answerWarning case final AnswerWarning w) w.message,
      ];
      _saving = false;
      await load();
      return EditorSaveOutcome.saved(parts.isEmpty ? 'Хадгаллаа' : 'Хадгаллаа: ${parts.join(', ')}');
    } on ApiError catch (e) {
      _linkCreated(created);
      final conflict = VersionConflict.fromBody(e.message, e.status, e.body);
      if (step != null) _errors = {..._errors, step: e.message};
      _saving = false;
      if (conflict != null) {
        _conflict = conflict;
        _notify();
        return EditorSaveOutcome.conflict(conflict);
      }
      _notify();
      return EditorSaveOutcome.invalid(e.message, jumpKey: step);
    } on Object {
      _linkCreated(created);
      _saving = false;
      _notify();
      return const EditorSaveOutcome.invalid('Хадгалж чадсангүй');
    }
  }

  /// Хэсэгчлэн амжсан: үүссэн бодлогыг дахин үүсгэхгүй — блокыг тэр бодлого руу холбоно (түүхэнд орохгүй).
  void _linkCreated(Map<String, ServerProblem> created) {
    if (created.isEmpty) return;
    final contents = {for (final e in created.entries) e.value.id: _value.drafts[e.key]};
    _originals = {
      ..._originals,
      for (final e in created.entries) e.value.id: e.value.copyWith(version: e.value.version ?? 0),
    };
    _originalContents = {
      ..._originalContents,
      for (final e in contents.entries)
        if (e.value != null) e.key: e.value!,
    };
    final drafts = {..._value.drafts}..removeWhere((k, _) => created.containsKey(k));
    _value = _value.copyWith(
      items: [
        for (final i in _value.items)
          if (created[i.key] case final ServerProblem p) i.copyWith(key: p.id, problemId: p.id) else i,
      ],
      drafts: drafts,
    );
  }

  /// 409 цонхыг хаах.
  void dismissConflict() {
    _conflict = null;
    _notify();
  }

  /// «Хуулах» — хуулбар хувийн ноорог болж үүснэ.
  Future<DuplicatedTest> duplicate() => _repo.duplicate(testId);

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
