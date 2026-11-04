import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/authoring_models.dart';
import '../data/authoring_repository.dart';
import '../domain/builder_logic.dart';
import 'draft_autosaver.dart';

/// Тест амжилттай үүссэн.
@immutable
class CreatedResult {
  const CreatedResult({required this.id, required this.title, this.warning, this.writeLater = false});

  final String id;
  final String title;

  /// Сервер буцаасан хариуны түлхүүрийн анхааруулга.
  final String? warning;

  /// Бодлогогүй хаалттай хичээлийн тест — засварлагч руу шууд.
  final bool writeLater;
}

/// `/app/tests/new` төлөв — вэбийн `NewTestPage`.
class NewTestController extends ChangeNotifier {
  NewTestController({required TestAuthoringRepository repository, required this.autosaver, String initialSubject = ''})
    : _repo = repository,
      _initialSubject = Subjects.creatable.contains(initialSubject) ? initialSubject : Subjects.all {
    _form = BuilderForm(subject: _initialSubject);
    autosaver.addListener(_onDraft);
  }

  final TestAuthoringRepository _repo;

  /// `?subject=` (номын сангаас ирсэн холбоос).
  final String _initialSubject;
  final DraftAutosaver autosaver;

  late BuilderForm _form;
  List<ClassroomOption> _classrooms = const [];
  List<ChapterOption> _chapters = const [];
  List<ServerProblem> _problems = const [];
  bool _loadingProblems = false;
  String _problemsError = '';
  String _catalogError = '';
  String _templateNotice = '';
  String _formError = '';
  bool _attempted = false;
  bool _submitting = false;
  bool _uploadingPdf = false;
  CreatedResult? _created;
  int _problemsLoad = 0;

  /// Нооргоос сэргээхэд — бүлгийн бодлого ачаалагдмагц сонголтыг тавина.
  ({String chapterId, List<String> selected, Map<String, int> overrides})? _restoreProblems;
  bool _disposed = false;

  BuilderForm get form => _form;
  List<ClassroomOption> get classrooms => _classrooms;
  List<ChapterOption> get chapters => _chapters;
  List<ServerProblem> get problems => _problems;
  bool get loadingProblems => _loadingProblems;
  String get problemsError => _problemsError;
  String get catalogError => _catalogError;
  String get templateNotice => _templateNotice;
  String get formError => _formError;
  bool get submitting => _submitting;
  bool get uploadingPdf => _uploadingPdf;
  CreatedResult? get created => _created;

  bool get titleMissing => _attempted && _form.title.trim().isEmpty;
  bool get classesMissing => _attempted && !_form.writeLater && _form.selectedClasses.isEmpty;

  /// Хадгалаагүй ажил (буцахад асууна).
  bool get hasUnsavedWork => _created == null && _form.hasContent;

  BuilderSummary get summary => summarize(_form, _problems);
  List<ServerProblem> get selected => selectedProblemObjects(_form, _problems);
  List<ClassroomOption> get mismatched => mismatchedClasses(_form, _classrooms);

  ChapterOption? get chapter => _chapters.where((c) => c.id == _form.chapterId).firstOrNull;

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  void _onDraft() => _notify();

  /// Каталог, өмнөх ноорог.
  Future<void> start() async {
    await Future.wait([_loadClassrooms(), _loadChapters(), autosaver.restore()]);
  }

  Future<void> _loadClassrooms() async {
    try {
      _classrooms = await _repo.classrooms();
    } on ApiError catch (e) {
      _catalogError = e.message;
    }
    _notify();
  }

  Future<void> _loadChapters() async {
    final subject = _form.subject;
    try {
      final rows = await _repo.chapters(subject: subject);
      if (subject != _form.subject) return;
      _chapters = rows;
    } on ApiError catch (e) {
      _chapters = const [];
      _catalogError = e.message;
    }
    _notify();
  }

  Future<void> _loadProblems(String chapterId) async {
    final load = ++_problemsLoad;
    if (chapterId.isEmpty) {
      _problems = const [];
      _loadingProblems = false;
      _form = _form.copyWith(selectedProblems: const [], pointOverrides: const {});
      _notify();
      return;
    }
    _loadingProblems = true;
    _problemsError = '';
    _notify();
    try {
      final rows = await _repo.chapterProblems(chapterId);
      if (load != _problemsLoad) return;
      _problems = rows;
      final restore = _restoreProblems;
      if (restore != null && restore.chapterId == chapterId) {
        _form = _form.copyWith(selectedProblems: restore.selected, pointOverrides: restore.overrides);
        _restoreProblems = null;
      } else {
        _form = _form.copyWith(selectedProblems: const [], pointOverrides: const {});
      }
    } on ApiError catch (e) {
      if (load != _problemsLoad) return;
      _problems = const [];
      _problemsError = e.message;
    } finally {
      if (load == _problemsLoad) _loadingProblems = false;
    }
    _notify();
    autosaver.schedule(_form);
  }

  /// Маягтын өөрчлөлт: бүлэг солигдвол бодлого дахин ачаална, хичээл солигдвол бүлгүүд.
  void update(BuilderForm next) {
    final prev = _form;
    var f = next;
    if (f.subject != prev.subject) f = f.copyWith(chapterId: '');
    _form = f;
    _formError = '';
    _notify();
    if (f.subject != prev.subject) unawaited(_loadChapters());
    if (f.chapterId != prev.chapterId) unawaited(_loadProblems(f.chapterId));
    autosaver.schedule(_form);
  }

  void applyTemplate() {
    _templateNotice = '';
    if (_form.chapterId.isEmpty) {
      _templateNotice = 'Эхлээд бүлэг сэдэв сонгож бодлогуудыг ачаална уу';
    } else if (_loadingProblems) {
      _templateNotice = 'Бодлогууд ачаалж дуустал түр хүлээнэ үү';
    } else {
      final (next, notice) = applyEeshTemplate(_form, _problems);
      _templateNotice = notice ?? '';
      if (!identical(next, _form)) update(next);
    }
    _notify();
  }

  /// Эх PDF-ийг байршуулсан түлхүүрээр.
  Future<void> uploadPdf(Future<String?> Function() upload) async {
    _uploadingPdf = true;
    _formError = '';
    _notify();
    try {
      final key = await upload();
      if (key != null) update(_form.copyWith(pdfKey: key));
    } on ApiError catch (e) {
      _formError = e.message;
    } on Object {
      _formError = 'Файл байршуулахад алдаа гарлаа';
    } finally {
      _uploadingPdf = false;
      _notify();
    }
  }

  // ---------------- Ноорог ----------------

  void _applyDraft(BuilderForm restored) {
    final chapterChanged = restored.chapterId != _form.chapterId;
    _restoreProblems = chapterChanged
        ? (chapterId: restored.chapterId, selected: restored.selectedProblems, overrides: restored.pointOverrides)
        : null;
    final subjectChanged = restored.subject != _form.subject;
    _form = chapterChanged ? restored.copyWith(selectedProblems: const [], pointOverrides: const {}) : restored;
    _notify();
    if (subjectChanged) unawaited(_loadChapters());
    if (chapterChanged) unawaited(_loadProblems(restored.chapterId));
  }

  void continueDraft() {
    final restored = autosaver.continueCandidate();
    if (restored != null) _applyDraft(restored);
  }

  Future<void> startFresh() async {
    await autosaver.startFresh();
    _resetForm();
  }

  void loadLatestDraft() {
    final restored = autosaver.loadLatest();
    if (restored != null) _applyDraft(restored);
  }

  Future<void> saveLocalAsNewDraft() => autosaver.saveLocalAsNew(_form);

  // ---------------- Үүсгэх ----------------

  /// Тест үүсгэнэ. Амжилттай бол [created] тавигдана.
  Future<void> create() async {
    _formError = '';
    _attempted = true;
    final invalid = validateBuilder(_form, _problems);
    if (invalid != null) {
      _formError = invalid;
      _notify();
      return;
    }
    _submitting = true;
    _notify();
    await autosaver.beginPublish();
    try {
      final f = _form;
      String? chapterId;
      if (f.gated && f.chapterId.isEmpty) {
        chapterId = await _repo.ensureSubjectChapter(subject: f.subject, title: f.title.trim());
      }
      final created = await _repo.createTest(createTestBody(f, _problems, chapterId: chapterId));
      await autosaver.publishSucceeded();
      _created = CreatedResult(
        id: created.id,
        title: f.title.trim(),
        warning: created.answerWarning?.message,
        writeLater: f.writeLater,
      );
    } on ApiError catch (e) {
      _formError = e.message;
      autosaver.publishFailed();
    } on Object {
      _formError = AppStrings.genericError;
      autosaver.publishFailed();
    } finally {
      _submitting = false;
      _notify();
    }
  }

  /// «Шинэ тест үүсгэх» (амжилтын дараа).
  void resetAfterCreate() {
    autosaver.reset();
    _resetForm();
  }

  void _resetForm() {
    final subject = _form.subject;
    _form = BuilderForm(subject: _initialSubject);
    _templateNotice = '';
    _formError = '';
    _attempted = false;
    _created = null;
    _restoreProblems = null;
    _problems = const [];
    _notify();
    if (subject != _form.subject) unawaited(_loadChapters());
  }

  @override
  void dispose() {
    _disposed = true;
    autosaver.removeListener(_onDraft);
    super.dispose();
  }
}
