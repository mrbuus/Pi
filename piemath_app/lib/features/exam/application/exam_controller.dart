import 'dart:async';
import 'dart:math' as math;

import 'package:clock/clock.dart';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/integrity/integrity.dart';
import '../../../core/network/api_error.dart';
import '../data/exam_draft_store.dart';
import '../data/exam_models.dart';
import '../data/exam_repository.dart';
import '../domain/answer.dart';
import '../domain/autosave_engine.dart';

/// Шалгалтын хамгаалалт үүсгэгч — тестэд `FakeExamGuard`-аар override.
final examGuardFactoryProvider = Provider<ExamGuard Function()>((ref) => MethodChannelExamGuard.new);

/// Autosave-ийн хэмнэл (тестэд богиносгож болно).
final autosaveConfigProvider = Provider<AutosaveConfig>((ref) => const AutosaveConfig());

enum ExamPhase { loading, intro, taking, finished, error }

/// Яагаад дууссан.
enum FinishReason { user, time, leaves, server, alreadyDone }

/// Буцаж ирэхэд харуулах тайлбар.
@immutable
class LeaveNotice {
  const LeaveNotice({required this.leaveCount, required this.away, required this.finalWarning});

  final int leaveCount;
  final Duration? away;
  final bool finalWarning;
}

/// Нэг шалгалтын төлөв ба урсгал: интро → эхлэх → хариулах (autosave, офлайн) → илгээх.
///
/// Цаг: зөвхөн серверийн `remainingSec`-ээс (autosave бүрд дахин тохируулна); хоорондох тоололд
/// монотон [Stopwatch] — утасны ханын цагийг хэзээ ч ашиглахгүй.
class ExamController extends ChangeNotifier {
  ExamController({
    required this.testId,
    required this.userId,
    required ExamRepository repository,
    required this.drafts,
    required this.guardFactory,
    this.config = const AutosaveConfig(),
    this.policy = const LeavePolicy(),
    math.Random? random,
  }) : _repo = repository,
       _random = random ?? math.Random();

  final String testId;
  final String userId;
  final ExamRepository _repo;
  final ExamDraftStore drafts;
  final ExamGuard Function() guardFactory;
  final AutosaveConfig config;
  final LeavePolicy policy;
  final math.Random _random;

  static const fiveMinutes = 300;

  ExamPhase phase = ExamPhase.loading;
  TestMeta? meta;
  String? errorMessage;
  bool starting = false;
  bool submitting = false;
  String? submitError;
  FinishReason? finishReason;
  ScorePair? result;

  List<ExamProblem> problems = const [];
  final answers = <String, Object?>{};
  final states = <String, SelfState>{};
  final flagged = <String>{};
  int index = 0;

  int leaveCount = 0;
  LeaveNotice? notice;
  bool covered = false;
  String? toast;
  SaveState saveState = SaveState.saved;

  /// Таймерын тоолуур тусдаа — секунд тутам бүх дэлгэцийг (томьёо) дахин зурахгүй.
  final remaining = ValueNotifier<int?>(null);

  int? _serverRemaining;
  final _sinceSync = clock.stopwatch();
  Timer? _ticker;
  Timer? _submitRetry;
  bool _fiveMinShown = false;
  bool _away = false;
  bool _disposed = false;
  bool _deadlineHandled = false;

  AutosaveEngine? _engine;
  LeaveTracker? _tracker;
  ExamGuard? _guard;
  // ignore: cancel_subscriptions — _teardown()-д цуцлагдана.
  StreamSubscription<IntegrityEvent>? _guardSub;
  Future<void> _draftWrite = Future.value();

  /// Үлдсэн секунд (null = хугацаагүй).
  int? get remainingSec {
    final r = _serverRemaining;
    if (r == null) return null;
    final left = r - _sinceSync.elapsed.inSeconds;
    return left < 0 ? 0 : left;
  }

  ExamProblem? get current => index >= 0 && index < problems.length ? problems[index] : null;
  int get answeredCount => problems.where((p) => isAnswered(answers[p.id])).length;
  int get unansweredCount => problems.length - answeredCount;

  /// Хэсэг II (тоо нөхөх) эхлэх индекс.
  int? get partIIStart {
    final i = problems.indexWhere((p) => p.format == ProblemFormat.fillNumber);
    return i < 0 ? null : i;
  }

  bool get isGuardSecured => _guard is MethodChannelExamGuard && (_guard! as MethodChannelExamGuard).platformSecured;

  // ---------------------------------------------------------------- ачаалах

  Future<void> load() async {
    phase = ExamPhase.loading;
    errorMessage = null;
    _notify();
    try {
      final m = await _repo.meta(testId);
      meta = m;
      if (m.finished) {
        result = m.myResult;
        finishReason = FinishReason.alreadyDone;
        phase = ExamPhase.finished;
      } else {
        phase = ExamPhase.intro;
      }
    } on ApiError catch (e) {
      errorMessage = _friendly(e);
      phase = ExamPhase.error;
    }
    _notify();
  }

  // ---------------------------------------------------------------- эхлэх

  Future<void> begin() async {
    if (starting || phase == ExamPhase.taking) return;
    starting = true;
    errorMessage = null;
    _notify();
    try {
      final r = await _repo.start(testId);
      if (r.status == SessionStatus.submitted) {
        result = r.result;
        finishReason = FinishReason.alreadyDone;
        phase = ExamPhase.finished;
        await drafts.clear(userId, testId);
        return;
      }
      problems = r.problems;
      answers
        ..clear()
        ..addAll(r.draftAnswers);
      states
        ..clear()
        ..addAll(r.draftStates);
      leaveCount = r.leaveCount;
      _setRemaining(r.remainingSec);
      index = 0;

      // Серверт хүрээгүй (офлайнаар хадгалсан) хариу — сервер дээрхээс шинэ.
      final local = await drafts.read(userId, testId);
      final known = {for (final p in problems) p.id};
      final restoredAnswers = {
        for (final e in local.answers.entries)
          if (known.contains(e.key)) e.key: e.value,
      };
      final restoredStates = {
        for (final e in local.states.entries)
          if (known.contains(e.key)) e.key: e.value,
      };
      answers.addAll(restoredAnswers);
      for (final e in restoredStates.entries) {
        final s = SelfState.fromWire(e.value);
        if (s == null) {
          states.remove(e.key);
        } else {
          states[e.key] = s;
        }
      }

      _tracker = LeaveTracker(policy: policy, initialLeaveCount: leaveCount, onLeave: _onLeave, onReturn: _onReturn);
      _engine = AutosaveEngine(
        send: (body) => _repo.save(testId, body),
        config: config,
        random: _random,
        nextEvent: () => _tracker?.nextPending?.wire,
        ackEvent: () => _tracker?.ackPending(),
        onResponse: _onSaveResponse,
        onStateChanged: (s) {
          saveState = s;
          _notify();
        },
        onDirtyChanged: _persistDraft,
      )..restoreDirty(answers: restoredAnswers, states: restoredStates);
      _engine!.start();
      if (_engine!.hasDirty) _engine!.flushSoon();

      final guard = guardFactory();
      _guard = guard;
      _guardSub = guard.events.listen(_onIntegrity);
      await guard.enter();

      _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
      phase = ExamPhase.taking;
    } on ApiError catch (e) {
      errorMessage = _friendly(e);
    } finally {
      starting = false;
      _notify();
    }
  }

  // ---------------------------------------------------------------- хариулах

  void setAnswer(String problemId, Object? value) {
    if (phase != ExamPhase.taking || submitting) return;
    final v = normalizeAnswer(value);
    if (answerEquals(answers[problemId], v)) return;
    if (v == null || (v is String && v.isEmpty)) {
      answers.remove(problemId);
    } else {
      answers[problemId] = v;
    }
    _engine?.answerChanged(problemId, v ?? '');
    _notify();
  }

  void setSelfState(String problemId, SelfState? state) {
    if (phase != ExamPhase.taking || submitting) return;
    if (states[problemId] == state) return;
    if (state == null) {
      states.remove(problemId);
    } else {
      states[problemId] = state;
    }
    _engine?.stateChanged(problemId, state);
    _notify();
  }

  /// «Дараа эргэж харах» — зөвхөн апп-д (серверт илгээдэггүй).
  void toggleFlag(String problemId) {
    if (!flagged.remove(problemId)) flagged.add(problemId);
    _notify();
  }

  void goTo(int i) {
    if (i < 0 || i >= problems.length || i == index) return;
    index = i;
    _notify();
  }

  void next() => goTo(index + 1);
  void previous() => goTo(index - 1);

  void dismissNotice() {
    notice = null;
    _notify();
  }

  void clearToast() {
    toast = null;
    _notify();
  }

  // ---------------------------------------------------------------- илгээх

  Future<void> submit({FinishReason reason = FinishReason.user}) async {
    if (phase != ExamPhase.taking || submitting) return;
    submitting = true;
    submitError = null;
    _submitRetry?.cancel();
    _engine?.stop();
    _notify();
    try {
      final body = <String, Object?>{
        'answers': {for (final e in answers.entries) e.key: e.value},
        'selfStates': {for (final e in states.entries) e.key: e.value.wire},
        'problemTimes': _engine?.times ?? const <String, int>{},
      };
      final r = await _repo.submit(testId, body);
      await _finish(reason, r);
    } on ApiError catch (e) {
      submitting = false;
      submitError = _friendly(e);
      if (reason != FinishReason.user && e.isRetryable && !_disposed) {
        // Хугацаа дууссан / гарах хязгаар — холбогдмогц өөрөө дахин илгээнэ.
        _submitRetry = Timer(config.backoff(1, _random), () => unawaited(submit(reason: reason)));
      } else {
        // Хэрэглэгч дахин оролдоно — хадгалалт үргэлжилнэ.
        _engine?.start();
      }
      _notify();
    }
  }

  Future<void> _finish(FinishReason reason, ScorePair? r) async {
    result = r ?? result;
    finishReason = reason;
    submitting = false;
    phase = ExamPhase.finished;
    await _teardown();
    await drafts.clear(userId, testId);
    _notify();
  }

  // ---------------------------------------------------------------- дотоод

  void _setRemaining(int? sec) {
    _serverRemaining = sec;
    _sinceSync
      ..reset()
      ..start();
    remaining.value = remainingSec;
  }

  void _tick() {
    if (phase != ExamPhase.taking) return;
    final cur = current;
    if (cur != null && !_away) _engine?.tickTime(cur.id);
    final left = remainingSec;
    remaining.value = left;
    if (left != null) {
      if (left <= fiveMinutes && !_fiveMinShown && left > 0) {
        _fiveMinShown = true;
        toast = '5 минут үлдлээ — $unansweredCount бодлого хариулаагүй байна';
        _notify();
      }
      if (left <= 0 && !_deadlineHandled) {
        _deadlineHandled = true;
        unawaited(submit(reason: FinishReason.time));
      }
    }
  }

  void _onSaveResponse(SaveResponse r) {
    if (r.status == SessionStatus.submitted) {
      // Сервер хугацааг хаасан (deadline + 30с) — дүн рүү.
      unawaited(_finish(FinishReason.server, r.result));
      return;
    }
    if (r.remainingSec != null) _setRemaining(r.remainingSec);
    if (r.leaveCount != null) {
      _tracker?.syncServerCount(r.leaveCount!);
      leaveCount = math.max(leaveCount, r.leaveCount!);
    }
    _notify();
  }

  void _onIntegrity(IntegrityEvent e) {
    if (phase != ExamPhase.taking) return;
    switch (e.type) {
      case IntegrityEventType.backgrounded:
        _away = true;
        // Илгээгээгүй хариуг шууд (debounce-гүй) хадгалах.
        if (_engine?.hasDirty ?? false) _engine!.flushSoon();
      case IntegrityEventType.resumed:
        _away = false;
      case IntegrityEventType.recordingStarted:
        covered = true;
      case IntegrityEventType.recordingStopped:
        covered = false;
      case IntegrityEventType.screenshot:
        toast = 'Шалгалтын үеэр дэлгэцийн зураг авахгүй байхыг хүсье';
    }
    _tracker?.handle(e);
    _notify();
  }

  void _onLeave(LeaveOutcome o) {
    leaveCount = math.max(leaveCount, o.leaveCount);
    _engine?.flushSoon();
    if (o.decision == LeaveDecision.autoSubmit) {
      unawaited(submit(reason: FinishReason.leaves));
    }
    _notify();
  }

  void _onReturn(LeaveRecord record) {
    if (phase != ExamPhase.taking || submitting) return;
    _engine?.flushSoon(); // RETURN-ийг хүлээлгүй илгээнэ

    notice = LeaveNotice(leaveCount: leaveCount, away: record.away, finalWarning: policy.isFinalWarning(leaveCount));
    _notify();
  }

  void _persistDraft() {
    final engine = _engine;
    if (engine == null) return;
    final draft = ExamDraft(answers: engine.dirtyAnswers, states: engine.dirtyStates);
    _draftWrite = _draftWrite.then((_) => drafts.write(userId, testId, draft)).catchError((Object _) {});
  }

  Future<void> _teardown() async {
    _ticker?.cancel();
    _ticker = null;
    _submitRetry?.cancel();
    _engine?.dispose();
    _tracker?.dispose();
    // cancel()-ийг хүлээхгүй — хамгаалалтыг унтраах нь ЮУНААС Ч хамаарахгүй байх ёстой.
    final sub = _guardSub;
    _guardSub = null;
    if (sub != null) unawaited(sub.cancel());
    final g = _guard;
    _guard = null;
    // ЗААВАЛ: шалгалт дууссаны дараа скриншот хориотой хэвээр үлдэх ёсгүй.
    await g?.exit();
    covered = false;
  }

  static String _friendly(ApiError e) => e.message;

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _persistDraft();
    unawaited(_teardown());
    remaining.dispose();
    super.dispose();
  }
}
