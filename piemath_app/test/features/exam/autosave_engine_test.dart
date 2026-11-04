import 'dart:async';
import 'dart:math' as math;

import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart';
import 'package:piemath_app/features/exam/domain/answer.dart';
import 'package:piemath_app/features/exam/domain/autosave_engine.dart';

/// Санамсаргүйг тогтмол болгох (0.5 → jitter-гүй дунд утга).
class _HalfRandom implements math.Random {
  @override
  double nextDouble() => 0.5;
  @override
  int nextInt(int max) => max ~/ 2;
  @override
  bool nextBool() => false;
}

void main() {
  late List<Map<String, Object?>> sent;
  late bool online;
  late SaveResponse response;
  late List<SaveState> states;
  late List<SaveResponse> responses;

  AutosaveEngine make({String? Function()? nextEvent, void Function()? ack}) => AutosaveEngine(
    send: (body) async {
      sent.add(body);
      if (!online) throw const ApiError(ApiErrorKind.network, 'x');
      return response;
    },
    random: _HalfRandom(),
    nextEvent: nextEvent,
    ackEvent: ack,
    onStateChanged: states.add,
    onResponse: responses.add,
  );

  setUp(() {
    sent = [];
    online = true;
    response = const SaveResponse(status: SessionStatus.inProgress, remainingSec: 100, leaveCount: 0);
    states = [];
    responses = [];
  });

  test('1.2с debounce, зөвхөн өөрчлөгдсөн түлхүүр', () {
    fakeAsync((fa) {
      final e = make()..start();
      e.answerChanged('p1', 2);
      fa.elapse(const Duration(milliseconds: 1100));
      e.answerChanged('p2', '3_5');
      fa.elapse(const Duration(milliseconds: 1100));
      expect(sent, isEmpty);
      fa.elapse(const Duration(milliseconds: 200));
      expect(sent, [
        {
          'answers': {'p1': 2, 'p2': '3_5'},
        },
      ]);
      expect(e.hasDirty, isFalse);
      expect(e.state, SaveState.saved);
      e.stop();
    });
  });

  test('heartbeat: dirty-гүй бол 90с хүртэл хүсэлт илгээхгүй, дараа нь хоосон keepalive', () {
    fakeAsync((fa) {
      final e = make()..start();
      fa.elapse(const Duration(seconds: 80));
      expect(sent, isEmpty);
      fa.elapse(const Duration(seconds: 20)); // 100с: 20с тик дээр 90с давсан
      expect(sent, [<String, Object?>{}]);
      expect(responses, hasLength(1));
      e.stop();
    });
  });

  test('heartbeat 20с ± 20% — dirty бол жинхэнэ save (debounce-ийг алгассан ч)', () {
    fakeAsync((fa) {
      final e = make()..start();
      e.setTimes({'p1': 5});
      fa.elapse(const Duration(seconds: 20));
      // Зөвхөн секунд өөрчлөгдсөн — тусдаа хүсэлт хийхгүй.
      expect(sent, isEmpty);
      e.stop();
    });
  });

  test('офлайн: dirty хадгалагдана, backoff-оор дахин, сүлжээ сэргэхэд илгээгдэнэ', () {
    fakeAsync((fa) {
      online = false;
      final e = make()..start();
      e.answerChanged('p1', 1);
      fa.elapse(const Duration(milliseconds: 1200));
      expect(sent, hasLength(1));
      expect(e.state, SaveState.offline);
      expect(e.dirtyAnswers, {'p1': 1});
      // backoff #0 = 2с·(0.7+0.5·0.6) = 2с
      fa.elapse(const Duration(milliseconds: 1999));
      expect(sent, hasLength(1));
      fa.elapse(const Duration(milliseconds: 1));
      expect(sent, hasLength(2));
      // backoff #1 = 4с
      online = true;
      fa.elapse(const Duration(seconds: 4));
      expect(sent, hasLength(3));
      expect(e.hasDirty, isFalse);
      expect(e.state, SaveState.saved);
      e.stop();
    });
  });

  test('хоосон keepalive бүтэлгүйтвэл офлайн гэж харуулахгүй', () {
    fakeAsync((fa) {
      online = false;
      final e = make()..start();
      unawaited(e.flush(keepalive: true));
      fa.flushMicrotasks();
      expect(sent, hasLength(1));
      expect(e.state, SaveState.saved);
      e.stop();
    });
  });

  test('илгээх явцад өөрчлөгдсөн утга цэвэрлэгдэхгүй', () {
    fakeAsync((fa) {
      final gate = Completer<SaveResponse>();
      var first = true;
      final e = AutosaveEngine(
        send: (body) {
          sent.add(body);
          if (first) {
            first = false;
            return gate.future;
          }
          return Future.value(response);
        },
        random: _HalfRandom(),
      )..start();
      e.answerChanged('p1', 1);
      fa.elapse(const Duration(milliseconds: 1200));
      e.answerChanged('p1', 2); // явцад
      gate.complete(response);
      fa.flushMicrotasks();
      expect(e.dirtyAnswers, {'p1': 2});
      fa.elapse(const Duration(milliseconds: 1200));
      expect(sent.last, {
        'answers': {'p1': 2},
      });
      expect(e.hasDirty, isFalse);
      e.stop();
    });
  });

  test('LEAVE үйл явдал: амжилттай бол ack, бүтэлгүйтвэл үлдэнэ', () {
    fakeAsync((fa) {
      final queue = ['LEAVE'];
      online = false;
      final e = make(nextEvent: () => queue.isEmpty ? null : queue.first, ack: () => queue.removeAt(0))..start();
      e.flushSoon();
      fa.flushMicrotasks();
      expect(sent.single['event'], 'LEAVE');
      expect(queue, ['LEAVE']);
      expect(e.state, SaveState.offline);
      online = true;
      fa.elapse(const Duration(seconds: 2));
      expect(sent.last['event'], 'LEAVE');
      expect(queue, isEmpty);
      e.stop();
    });
  });

  test('selfStates, problemTimes зөвхөн өөрчлөгдсөн нь', () {
    fakeAsync((fa) {
      final e = make()..start();
      e.tickTime('p1');
      e.tickTime('p1');
      e.stateChanged('p1', SelfState.failed);
      fa.elapse(const Duration(milliseconds: 1200));
      expect(sent.single, {
        'selfStates': {'p1': 'FAILED'},
        'problemTimes': {'p1': 2},
      });
      e.answerChanged('p2', 0);
      fa.elapse(const Duration(milliseconds: 1200));
      expect(sent.last, {
        'answers': {'p2': 0},
      });
      e.stop();
    });
  });

  test('backoff томьёо: min(30с, 2с·2^n)·(0.7..1.3)', () {
    const c = AutosaveConfig();
    final r = _HalfRandom();
    expect(c.backoff(0, r), const Duration(seconds: 2));
    expect(c.backoff(3, r), const Duration(seconds: 16));
    expect(c.backoff(8, r), const Duration(seconds: 30));
    expect(c.backoff(99, r), const Duration(seconds: 30));
    expect(c.jitteredHeartbeat(r), const Duration(seconds: 20));
  });

  test('stop-ийн дараа юу ч илгээхгүй', () {
    fakeAsync((fa) {
      final e = make()..start();
      e.answerChanged('p1', 1);
      e.stop();
      fa.elapse(const Duration(minutes: 5));
      expect(sent, isEmpty);
      expect(e.dirtyAnswers, {'p1': 1});
    });
  });
}
