import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/integrity/integrity.dart';

/// Гараар удирддаг цаг ба timer.
class _FakeClock {
  DateTime now = DateTime.utc(2026, 11, 1, 10);
  final timers = <_FakeTimer>[];

  Timer create(Duration d, void Function() cb) {
    final t = _FakeTimer(now.add(d), cb);
    timers.add(t);
    return t;
  }

  /// Цагийг урагшлуулж, хугацаа нь болсон timer-уудыг ажиллуулна.
  void advance(Duration d) {
    now = now.add(d);
    for (final t in List.of(timers)) {
      if (t.isActive && !t.due.isAfter(now)) t.fire();
    }
  }
}

class _FakeTimer implements Timer {
  _FakeTimer(this.due, this._cb);
  final DateTime due;
  final void Function() _cb;
  bool _active = true;

  void fire() {
    _active = false;
    _cb();
  }

  @override
  void cancel() => _active = false;

  @override
  bool get isActive => _active;

  @override
  int get tick => 0;
}

void main() {
  late _FakeClock clock;
  late List<LeaveOutcome> leaves;
  late List<LeaveRecord> returns;
  late LeaveTracker tracker;

  LeaveTracker make({int initial = 0}) => LeaveTracker(
    now: () => clock.now,
    timer: clock.create,
    initialLeaveCount: initial,
    onLeave: leaves.add,
    onReturn: returns.add,
  );

  void away() => tracker.handle(IntegrityEvent(IntegrityEventType.backgrounded, clock.now));
  void back() => tracker.handle(IntegrityEvent(IntegrityEventType.resumed, clock.now));

  List<String> drain() {
    final out = <String>[];
    while (tracker.nextPending != null) {
      out.add(tracker.nextPending!.wire);
      tracker.ackPending();
    }
    return out;
  }

  setUp(() {
    clock = _FakeClock();
    leaves = [];
    returns = [];
    tracker = make();
  });

  tearDown(() => tracker.dispose());

  group('LeavePolicy (вэбийн LEAVE_WARN=1, LEAVE_MAX=3)', () {
    const p = LeavePolicy();
    test('шийдвэр', () {
      expect(p.decide(0), LeaveDecision.none);
      expect(p.decide(1), LeaveDecision.warn);
      expect(p.decide(2), LeaveDecision.warn);
      expect(p.decide(3), LeaveDecision.autoSubmit);
      expect(p.decide(7), LeaveDecision.autoSubmit);
    });
    test('сүүлчийн анхааруулга, үлдсэн', () {
      expect(p.isFinalWarning(1), isFalse);
      expect(p.isFinalWarning(2), isTrue);
      expect(p.remaining(1), 2);
      expect(p.remaining(5), 0);
    });
  });

  group('LeavePolicy.fromLeaveLimit (шалгалт бүрийн горим)', () {
    test('Хатуу (2): 1 дэх гаралтад сүүлчийн анхааруулга, 2 дахьд илгээнэ', () {
      final p = LeavePolicy.fromLeaveLimit(2);
      expect(p.isStrict, isTrue);
      expect(p.warnAt, 1);
      expect(p.maxLeaves, 2);
      expect(p.decide(0), LeaveDecision.none);
      expect(p.decide(1), LeaveDecision.warn);
      expect(p.isFinalWarning(1), isTrue);
      expect(p.decide(2), LeaveDecision.autoSubmit);
      expect(p.decide(3), LeaveDecision.autoSubmit);
      expect(p.minAway, const Duration(seconds: 2));
    });
    test('Зөөлөн (3): 1, 2 дахьд анхааруулга, 3 дахьд илгээнэ', () {
      final p = LeavePolicy.fromLeaveLimit(3);
      expect(p.isStrict, isFalse);
      expect(p.decide(1), LeaveDecision.warn);
      expect(p.isFinalWarning(1), isFalse);
      expect(p.decide(2), LeaveDecision.warn);
      expect(p.isFinalWarning(2), isTrue);
      expect(p.decide(3), LeaveDecision.autoSubmit);
    });
    test('сервер утга илгээхгүй эсвэл буруу утга бол 3', () {
      for (final v in [null, 0, 1, 4, 10]) {
        expect(LeavePolicy.fromLeaveLimit(v).maxLeaves, 3, reason: '$v');
      }
    });
    test('Хатуу tracker: 2 дахь тоологдсон гаралт autoSubmit', () {
      tracker = LeaveTracker(
        policy: LeavePolicy.fromLeaveLimit(2),
        now: () => clock.now,
        timer: clock.create,
        onLeave: leaves.add,
      );
      away();
      clock.advance(const Duration(seconds: 3));
      back();
      expect(leaves.last.decision, LeaveDecision.warn);
      away();
      clock.advance(const Duration(seconds: 3));
      expect(leaves.last.decision, LeaveDecision.autoSubmit);
      expect(tracker.pendingLeaves, 2);
    });
  });

  test('ackFirstLeave нь эхний LEAVE-ийг л хасна, бусдыг хадгална', () {
    tracker.handle(IntegrityEvent(IntegrityEventType.screenshot, clock.now));
    away();
    clock.advance(const Duration(seconds: 3));
    back();
    away();
    clock.advance(const Duration(seconds: 3));
    expect(tracker.pending, [
      ExamSessionEvent.screenshot,
      ExamSessionEvent.leave,
      ExamSessionEvent.returned,
      ExamSessionEvent.leave,
    ]);
    tracker.ackFirstLeave();
    expect(tracker.pending, [ExamSessionEvent.screenshot, ExamSessionEvent.returned, ExamSessionEvent.leave]);
    expect(tracker.pendingLeaves, 1);
  });

  test('дараалал дүүрэхэд LEAVE-ээс бусдыг түрүүлж хаяна', () {
    away();
    clock.advance(const Duration(seconds: 3));
    for (var i = 0; i < LeaveTracker.maxPending + 5; i++) {
      tracker.handle(IntegrityEvent(IntegrityEventType.screenshot, clock.now));
    }
    expect(tracker.pending.length, LeaveTracker.maxPending);
    expect(tracker.pending.first, ExamSessionEvent.leave);
    expect(tracker.leaveCount, 1);
  });

  test('2 секундээс богино алга болохыг тоохгүй', () {
    away();
    clock.advance(const Duration(milliseconds: 1999));
    back();
    expect(tracker.leaveCount, 0);
    expect(leaves, isEmpty);
    expect(returns, isEmpty);
    expect(tracker.hasPending, isFalse);
  });

  test('арын дэвсгэрт 2 сек болмогц тоолно (timer), буцахад RETURN', () {
    away();
    clock.advance(const Duration(seconds: 2));
    expect(tracker.leaveCount, 1);
    expect(leaves.single.decision, LeaveDecision.warn);
    expect(tracker.isAway, isTrue);

    clock.advance(const Duration(seconds: 8));
    back();
    expect(returns.single.away, const Duration(seconds: 10));
    expect(drain(), ['LEAVE', 'RETURN']);
    expect(tracker.leaveCount, 1, reason: 'буцах нь тоо нэмэхгүй');
  });

  test('timer ажиллаагүй ч (iOS апп-ыг зогсоосон) буцахад нөхөж тоолно', () {
    away();
    // Цагийг timer-гүйгээр шилжүүлнэ — арын дэвсгэрт Dart зогссоныг дуурайна.
    clock.now = clock.now.add(const Duration(seconds: 30));
    back();
    expect(tracker.leaveCount, 1);
    expect(leaves.single.record.leftAt, DateTime.utc(2026, 11, 1, 10));
    expect(returns.single.away, const Duration(seconds: 30));
    expect(drain(), ['LEAVE', 'RETURN']);
  });

  test('давхар backgrounded (hidden → paused) нэг л гаралт', () {
    away();
    clock.advance(const Duration(seconds: 1));
    away();
    clock.advance(const Duration(seconds: 3));
    back();
    expect(tracker.leaveCount, 1);
    expect(drain(), ['LEAVE', 'RETURN']);
  });

  test('3 дахь гаралтад автоматаар илгээх шийдвэр', () {
    for (var i = 0; i < 3; i++) {
      away();
      clock.advance(const Duration(seconds: 3));
      back();
      clock.advance(const Duration(seconds: 20));
    }
    expect(leaves.map((o) => o.decision).toList(), [LeaveDecision.warn, LeaveDecision.warn, LeaveDecision.autoSubmit]);
    expect(tracker.history, hasLength(3));
  });

  test('скриншот, бичлэгийн үйл явдал серверт илгээгдэх ч гаралтад тоологдохгүй', () {
    tracker.handle(IntegrityEvent(IntegrityEventType.screenshot, clock.now));
    tracker.handle(IntegrityEvent(IntegrityEventType.recordingStarted, clock.now));
    tracker.handle(IntegrityEvent(IntegrityEventType.recordingStopped, clock.now));
    expect(tracker.leaveCount, 0);
    expect(tracker.decision, LeaveDecision.none);
    expect(tracker.pendingLeaves, 0);
    expect(tracker.pending, [
      ExamSessionEvent.screenshot,
      ExamSessionEvent.recordingStart,
      ExamSessionEvent.recordingStop,
    ]);
    expect([for (final e in tracker.pending) e.wire], ['SCREENSHOT', 'RECORDING_START', 'RECORDING_STOP']);
  });

  test('resumed нь өмнө нь гараагүй бол юу ч биш', () {
    back();
    expect(tracker.hasPending, isFalse);
  });

  test('илгээж чадаагүй бол дараалалд үлдэнэ (ack-гүй)', () {
    away();
    clock.advance(const Duration(seconds: 5));
    back();
    expect(tracker.nextPending, ExamSessionEvent.leave);
    // Сүлжээгүй — ack хийгээгүй.
    expect(tracker.nextPending, ExamSessionEvent.leave);
    tracker.ackPending();
    expect(tracker.nextPending, ExamSessionEvent.returned);
  });

  test('серверийн тоо их бол түүнийг авна, бага бол үгүй', () {
    tracker = make(initial: 1);
    tracker.syncServerCount(2);
    expect(tracker.leaveCount, 2);
    tracker.syncServerCount(0);
    expect(tracker.leaveCount, 2);
  });

  test('сөрөг эхлэх утгыг 0 болгоно', () {
    tracker = make(initial: -4);
    expect(tracker.leaveCount, 0);
  });

  test('dispose-ийн дараа timer тоолохгүй', () {
    away();
    tracker.dispose();
    clock.advance(const Duration(seconds: 5));
    expect(tracker.leaveCount, 0);
  });

  test('дараалал 100-аас хэтрэхгүй, эхлээд RETURN хаягдана', () {
    for (var i = 0; i < 80; i++) {
      away();
      clock.advance(const Duration(seconds: 3));
      back();
    }
    var leavesLeft = 0, returnsLeft = 0;
    while (tracker.nextPending != null) {
      tracker.nextPending == ExamSessionEvent.leave ? leavesLeft++ : returnsLeft++;
      tracker.ackPending();
    }
    expect(leavesLeft + returnsLeft, LeaveTracker.maxPending);
    expect(leavesLeft, 80, reason: 'LEAVE бүгд үлдэнэ');
  });
}
