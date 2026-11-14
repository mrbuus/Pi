import 'dart:math' as math;

import 'package:clock/clock.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/integrity/integrity.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/features/exam/application/exam_controller.dart';
import 'package:piemath_app/features/exam/data/exam_draft_store.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart';
import 'package:piemath_app/features/exam/data/exam_repository.dart';
import 'package:piemath_app/features/exam/domain/answer.dart';
import 'package:piemath_app/features/exam/domain/autosave_engine.dart';

class _HalfRandom implements math.Random {
  @override
  double nextDouble() => 0.5;
  @override
  int nextInt(int max) => max ~/ 2;
  @override
  bool nextBool() => false;
}

/// Хуурамч репозитор — серверийн хариуг тестээс удирдана.
class FakeRepo implements ExamRepository {
  TestMeta metaValue = TestMeta.fromJson(const {
    'id': 't1',
    'title': 'Илтгэгч тэгшитгэл 1',
    'type': 'DAILY',
    'timeLimitMin': 40,
    'problemCount': 3,
    'totalPoints': 3,
  });
  StartResult startResult = StartResult.fromJson(const {
    'session': {'status': 'IN_PROGRESS', 'remainingSec': 600, 'leaveCount': 0},
    'problems': [
      {
        'id': 'p1',
        'format': 'CHOICE',
        'choiceMode': 'TEXT',
        'choices': ['1', '2', '3', '4', '5'],
        'points': 1,
      },
      {'id': 'p2', 'format': 'FILL_NUMBER', 'statementText': 'Хариу [ab]', 'points': 1},
      {'id': 'p3', 'format': 'OPEN', 'points': 1},
    ],
  });
  bool online = true;
  SaveResponse Function(Map<String, Object?> body)? onSave;
  final saves = <Map<String, Object?>>[];
  final submits = <Map<String, Object?>>[];
  ScorePair? submitResult = const ScorePair(2, 3);

  @override
  Future<TestMeta> meta(String testId) async => metaValue;

  @override
  Future<StartResult> start(String testId) async {
    if (!online) throw const ApiError(ApiErrorKind.network, 'Интернэт');
    return startResult;
  }

  @override
  Future<SaveResponse> save(String testId, Map<String, Object?> body) async {
    saves.add(body);
    if (!online) throw const ApiError(ApiErrorKind.network, 'Интернэт');
    return onSave?.call(body) ??
        SaveResponse(status: SessionStatus.inProgress, remainingSec: null, leaveCount: _leaves(body));
  }

  int _serverLeaves = 0;
  int _leaves(Map<String, Object?> body) {
    if (body['event'] == 'LEAVE') _serverLeaves++;
    return _serverLeaves;
  }

  @override
  Future<ScorePair?> submit(String testId, Map<String, Object?> body) async {
    submits.add(body);
    if (!online) throw const ApiError(ApiErrorKind.network, 'Интернэт');
    return submitResult;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  late FakeRepo repo;
  late MemoryExamDraftStore drafts;
  late FakeExamGuard guard;

  ExamController make() => ExamController(
    testId: 't1',
    userId: 'u1',
    repository: repo,
    drafts: drafts,
    guardFactory: () => guard = FakeExamGuard(now: () => clock.now()),
    random: _HalfRandom(),
  );

  setUp(() {
    repo = FakeRepo();
    drafts = MemoryExamDraftStore();
  });

  test('ачаалах: интро; аль хэдийн өгсөн бол дүн', () {
    fakeAsync((fa) {
      final c = make()..load();
      fa.flushMicrotasks();
      expect(c.phase, ExamPhase.intro);
      repo.metaValue = TestMeta.fromJson(const {
        'id': 't1',
        'title': 'Т',
        'type': 'DAILY',
        'sessionStatus': 'SUBMITTED',
      });
      c.load();
      fa.flushMicrotasks();
      expect(c.phase, ExamPhase.finished);
      expect(c.finishReason, FinishReason.alreadyDone);
      c.dispose();
    });
  });

  test('эхлэх: хамгаалалт асна, хариу autosave-аар, илгээхэд хамгаалалт унтарна', () {
    fakeAsync((fa) {
      final c = make()..load();
      fa.flushMicrotasks();
      c.begin();
      fa.flushMicrotasks();
      expect(c.phase, ExamPhase.taking);
      expect(guard.isActive, isTrue);
      expect(c.remainingSec, 600);

      c.setAnswer('p1', 2);
      c.setAnswer('p2', '3_');
      expect(c.answeredCount, 2);
      fa.elapse(const Duration(milliseconds: 1200));
      expect(repo.saves.last['answers'], {'p1': 2, 'p2': '3_'});

      c.setSelfState('p1', SelfState.guessed);
      c.toggleFlag('p3');
      fa.elapse(const Duration(seconds: 5));
      expect(c.remainingSec, 594);

      c.submit();
      fa.flushMicrotasks();
      expect(c.phase, ExamPhase.finished);
      expect(c.result, const ScorePair(2, 3));
      expect(repo.submits.single['answers'], {'p1': 2, 'p2': '3_'});
      expect(repo.submits.single['selfStates'], {'p1': 'GUESSED'});
      expect((repo.submits.single['problemTimes']! as Map)['p1'], greaterThan(0));
      expect(guard.isActive, isFalse);
      expect(guard.exitCalls, 1);
      c.dispose();
    });
  });

  test('офлайн: хариу утсанд хадгалагдаж, дахин эхлэхэд сэргээгээд илгээнэ', () {
    fakeAsync((fa) {
      final c = make()..load();
      fa.flushMicrotasks();
      c.begin();
      fa.flushMicrotasks();
      repo.online = false;
      c.setAnswer('p1', 4);
      fa.elapse(const Duration(milliseconds: 1200));
      expect(c.saveState, SaveState.offline);
      fa.flushMicrotasks();
      expect(drafts.data['u1:t1']!.answers, {'p1': 4});
      // Апп хаагдав.
      c.dispose();
      fa.flushMicrotasks();
      expect(guard.isActive, isFalse);

      // Дахин нээхэд сервер хуучин хариутай (p1 хариугүй), холболт сэргэсэн.
      repo.online = true;
      final c2 = make()..load();
      fa.flushMicrotasks();
      c2.begin();
      fa.flushMicrotasks();
      expect(c2.answers['p1'], 4);
      fa.flushMicrotasks();
      expect(repo.saves.last['answers'], {'p1': 4});
      fa.flushMicrotasks();
      expect(drafts.data.containsKey('u1:t1'), isFalse);
      c2.dispose();
    });
  });

  test('аппаас гарах: 2с-ээс богиныг тоохгүй; тоолсон бол LEAVE, буцахад тайлбар; 3 дахь удаад илгээнэ', () {
    fakeAsync((fa) {
      final c = make()..load();
      fa.flushMicrotasks();
      c.begin();
      fa.flushMicrotasks();

      // Богино (1с) — тоохгүй.
      guard.emit(IntegrityEventType.backgrounded);
      fa.elapse(const Duration(seconds: 1));
      guard.emit(IntegrityEventType.resumed);
      fa.flushMicrotasks();
      expect(c.leaveCount, 0);
      expect(c.notice, isNull);

      for (var i = 1; i <= 2; i++) {
        guard.emit(IntegrityEventType.backgrounded);
        fa.elapse(const Duration(seconds: 3));
        expect(c.leaveCount, i);
        guard.emit(IntegrityEventType.resumed);
        fa.flushMicrotasks();
        expect(c.notice, isNotNull);
        expect(c.notice!.finalWarning, i == 2);
        c.dismissNotice();
        fa.elapse(const Duration(seconds: 2));
      }
      expect(repo.saves.where((b) => b['event'] == 'LEAVE'), hasLength(2));
      expect(repo.saves.where((b) => b['event'] == 'RETURN'), hasLength(2));

      guard.emit(IntegrityEventType.backgrounded);
      fa.elapse(const Duration(seconds: 3));
      fa.flushMicrotasks();
      expect(c.finishReason, FinishReason.leaves);
      expect(c.phase, ExamPhase.finished);
      expect(repo.submits, hasLength(1));
      expect(guard.isActive, isFalse);
      c.dispose();
    });
  });

  test('дэлгэц бичлэг: агуулгыг нууна; дуусахад нээнэ', () {
    fakeAsync((fa) {
      final c = make()..load();
      fa.flushMicrotasks();
      c.begin();
      fa.flushMicrotasks();
      guard.emit(IntegrityEventType.recordingStarted);
      expect(c.covered, isTrue);
      guard.emit(IntegrityEventType.recordingStopped);
      expect(c.covered, isFalse);
      guard.emit(IntegrityEventType.screenshot);
      expect(c.toast, isNotNull);
      c.dispose();
    });
  });

  test('хугацаа дуусахад өөрөө илгээнэ; 5 минутын сануулга нэг удаа', () {
    fakeAsync((fa) {
      repo.startResult = StartResult.fromJson(const {
        'session': {'status': 'IN_PROGRESS', 'remainingSec': 302},
        'problems': [
          {'id': 'p1', 'format': 'OPEN'},
        ],
      });
      final c = make()..load();
      fa.flushMicrotasks();
      c.begin();
      fa.flushMicrotasks();
      fa.elapse(const Duration(seconds: 3));
      expect(c.toast, contains('5 минут үлдлээ'));
      expect(c.toast, contains('1 бодлого'));
      c.clearToast();
      fa.elapse(const Duration(seconds: 300));
      fa.flushMicrotasks();
      expect(c.finishReason, FinishReason.time);
      expect(c.phase, ExamPhase.finished);
      c.dispose();
    });
  });

  test('сервер хугацааг хаасан (SUBMITTED) — дүн рүү, хамгаалалт унтарна', () {
    fakeAsync((fa) {
      repo.onSave = (_) => const SaveResponse(status: SessionStatus.submitted, result: ScorePair(1, 3));
      final c = make()..load();
      fa.flushMicrotasks();
      c.begin();
      fa.flushMicrotasks();
      c.setAnswer('p1', 0);
      fa.elapse(const Duration(milliseconds: 1200));
      fa.flushMicrotasks();
      expect(c.phase, ExamPhase.finished);
      expect(c.finishReason, FinishReason.server);
      expect(c.result, const ScorePair(1, 3));
      expect(guard.isActive, isFalse);
      c.dispose();
    });
  });

  test('хугацаа дууссан боловч офлайн — холбогдмогц дахин илгээнэ', () {
    fakeAsync((fa) {
      repo.startResult = StartResult.fromJson(const {
        'session': {'status': 'IN_PROGRESS', 'remainingSec': 2},
        'problems': [
          {'id': 'p1', 'format': 'OPEN'},
        ],
      });
      final c = make()..load();
      fa.flushMicrotasks();
      c.begin();
      fa.flushMicrotasks();
      repo.online = false;
      fa.elapse(const Duration(seconds: 3));
      expect(c.phase, ExamPhase.taking);
      expect(c.submitError, isNotNull);
      repo.online = true;
      fa.elapse(const Duration(seconds: 10));
      fa.flushMicrotasks();
      expect(c.phase, ExamPhase.finished);
      expect(c.finishReason, FinishReason.time);
      c.dispose();
    });
  });

  test('эхлүүлэх алдаа — монгол мессеж, интро хэвээр', () {
    fakeAsync((fa) {
      repo.online = false;
      final c = make()..load();
      fa.flushMicrotasks();
      c.begin();
      fa.flushMicrotasks();
      expect(c.phase, ExamPhase.intro);
      expect(c.errorMessage, 'Интернэт');
      c.dispose();
    });
  });
}
