import 'dart:async';
import 'dart:collection';

import 'package:flutter/foundation.dart';

import 'integrity_event.dart';

/// Серверийн `PATCH /tests/:id/session` (мөн `POST /tests/:id/heartbeat`) `event` талбарын
/// утга — `api/src/tests/dto/submit-test.dto.ts` `SaveSessionDto.event`.
///
/// Сервер НЭГ хүсэлтэд НЭГ л үйл явдал хүлээн авна, цагийг өөрөө тавьж (`t`), сүүлийн
/// 100-г хадгална. `LEAVE` ирэх бүрд `leaveCount` нэмэгдэнэ, `RETURN` нэмэгдүүлэхгүй.
enum ExamSessionEvent {
  leave('LEAVE'),
  returned('RETURN');

  const ExamSessionEvent(this.wire);

  /// Сервер рүү илгээх утга.
  final String wire;
}

/// Гаралтын дараах шийдвэр.
enum LeaveDecision {
  /// Юу ч хийхгүй.
  none,

  /// Анхааруулга харуулах («Шалгалтын үеэр аппаас гарсан нь багшид харагдана»).
  warn,

  /// Шалгалтыг автоматаар илгээх.
  autoSubmit,
}

/// Гаралтын дүрэм — вэбийн `app/tests/[id]/page.tsx`-тэй ИЖИЛ (`LEAVE_WARN = 1`,
/// `LEAVE_MAX = 3`): 1, 2 дахь удаа анхааруулга, 3 дахь удаад автоматаар илгээнэ.
/// 2 секундээс богино алга болохыг тоохгүй (STATUS §7.3) — мэдэгдэл, дуудлагад шударга
/// бус шийтгэл өгөхгүй.
@immutable
class LeavePolicy {
  const LeavePolicy({
    this.warnAt = 1,
    this.maxLeaves = 3,
    this.minAway = const Duration(seconds: 2),
  }) : assert(warnAt >= 1 && maxLeaves >= warnAt);

  final int warnAt;
  final int maxLeaves;
  final Duration minAway;

  LeaveDecision decide(int leaveCount) {
    if (leaveCount >= maxLeaves) return LeaveDecision.autoSubmit;
    if (leaveCount >= warnAt) return LeaveDecision.warn;
    return LeaveDecision.none;
  }

  /// Дараагийн гаралт автомат илгээлт үүсгэх эсэх (сүүлчийн анхааруулга).
  bool isFinalWarning(int leaveCount) => leaveCount >= maxLeaves - 1;

  /// Автомат илгээлт хүртэл үлдсэн гаралт.
  int remaining(int leaveCount) => (maxLeaves - leaveCount).clamp(0, maxLeaves);
}

/// Нэг гаралтын бүртгэл (апп доторх анхааруулгад: хэдэн удаа, хэр удсан).
@immutable
class LeaveRecord {
  const LeaveRecord({required this.leftAt, this.returnedAt});

  final DateTime leftAt;
  final DateTime? returnedAt;

  /// Буцаж ирээгүй бол `null`.
  Duration? get away => returnedAt?.difference(leftAt);

  LeaveRecord returned(DateTime at) => LeaveRecord(leftAt: leftAt, returnedAt: at);
}

/// Гаралт тоологдсон мөчийн үр дүн.
@immutable
class LeaveOutcome {
  const LeaveOutcome({required this.leaveCount, required this.decision, required this.record});

  final int leaveCount;
  final LeaveDecision decision;
  final LeaveRecord record;
}

typedef TimerFactory = Timer Function(Duration duration, void Function() callback);

/// Шалгалтын үеэр апп-аас гарсныг тоолох цэвэр логик (I/O-гүй, цагийг гаднаас авна).
///
/// Оролт: [ExamGuard]-ийн `backgrounded` / `resumed` үйл явдал ([handle]).
/// Гаралт:
/// - [onLeave] — гаралт ТООЛОГДСОН мөчид (арын дэвсгэрт [LeavePolicy.minAway] өнгөрөхөд,
///   эсвэл түүнээс хойш буцаж ирэхэд) — UI анхааруулах / автоматаар илгээх.
/// - [onReturn] — тоологдсон гаралтаас буцаж ирэхэд (бүтэн дэлгэцийн тайлбар).
/// - [nextPending] / [ackPending] — серверт илгээх үйл явдлын дараалал (нэг PATCH-д нэг).
///   Илгээж чадаагүй бол ack хийхгүй — сүлжээ сэргэхэд дахин илгээнэ.
class LeaveTracker {
  LeaveTracker({
    this.policy = const LeavePolicy(),
    DateTime Function()? now,
    TimerFactory? timer,
    int initialLeaveCount = 0,
    this.onLeave,
    this.onReturn,
  })  : _now = now ?? DateTime.now,
        _timer = timer ?? Timer.new,
        _leaveCount = initialLeaveCount < 0 ? 0 : initialLeaveCount;

  /// Серверийн хадгалах дээд хэмжээ (`MAX_EVENTS = 100`) — дараалал үүнээс хэтрэхгүй.
  static const maxPending = 100;

  final LeavePolicy policy;
  final DateTime Function() _now;
  final TimerFactory _timer;
  final void Function(LeaveOutcome outcome)? onLeave;
  final void Function(LeaveRecord record)? onReturn;

  int _leaveCount;
  DateTime? _leftAt;
  bool _counted = false;
  Timer? _pendingTimer;
  bool _disposed = false;
  final _history = <LeaveRecord>[];
  final _queue = Queue<ExamSessionEvent>();

  /// Тоологдсон гаралт (серверийн тоотой [syncServerCount]-аар тулгагдана).
  int get leaveCount => _leaveCount;

  /// Одоо арын дэвсгэрт байгаа эсэх.
  bool get isAway => _leftAt != null;

  /// Тоологдсон гаралтын түүх.
  List<LeaveRecord> get history => List.unmodifiable(_history);

  /// Одоогийн тоонд тохирох шийдвэр.
  LeaveDecision get decision => policy.decide(_leaveCount);

  /// Серверт илгээгээгүй үйл явдал байгаа эсэх.
  bool get hasPending => _queue.isNotEmpty;

  /// Дараагийн илгээх үйл явдал (дарааллаас хасахгүй).
  ExamSessionEvent? get nextPending => _queue.isEmpty ? null : _queue.first;

  /// [nextPending]-ийг сервер хүлээн авсан — дарааллаас хасна.
  void ackPending() {
    if (_queue.isNotEmpty) _queue.removeFirst();
  }

  /// Серверийн `leaveCount` (PATCH-ийн хариу) — их нь үнэн (өөр төхөөрөмжөөс үргэлжилсэн,
  /// эсвэл илгээгээгүй үйл явдал байгаа үед).
  void syncServerCount(int serverCount) {
    if (serverCount > _leaveCount) _leaveCount = serverCount;
  }

  /// Хамгаалалтын үйл явдлыг боловсруулна. `backgrounded`, `resumed`-аас бусдыг үл тооно.
  void handle(IntegrityEvent event) {
    if (_disposed) return;
    switch (event.type) {
      case IntegrityEventType.backgrounded:
        _onAway(event.at);
      case IntegrityEventType.resumed:
        _onBack(event.at);
      case IntegrityEventType.screenshot:
      case IntegrityEventType.recordingStarted:
      case IntegrityEventType.recordingStopped:
        break;
    }
  }

  void _onAway(DateTime at) {
    if (_leftAt != null) return;
    _leftAt = at;
    _counted = false;
    _pendingTimer?.cancel();
    // Арын дэвсгэрт Dart-ын timer тасарч болно (iOS апп-ыг түр зогсооно) — тэгвэл
    // буцаж ирэхэд [_onBack] нөхөж тоолно.
    _pendingTimer = _timer(policy.minAway, () {
      _pendingTimer = null;
      if (_disposed || _leftAt == null || _counted) return;
      _count(_leftAt!);
    });
  }

  void _onBack(DateTime at) {
    final leftAt = _leftAt;
    if (leftAt == null) return;
    _pendingTimer?.cancel();
    _pendingTimer = null;
    if (!_counted && at.difference(leftAt) >= policy.minAway) {
      _count(leftAt);
    }
    _leftAt = null;
    if (!_counted) return; // богино алга болсон — тоохгүй
    _counted = false;
    final record = _history.removeLast().returned(at);
    _history.add(record);
    _enqueue(ExamSessionEvent.returned);
    onReturn?.call(record);
  }

  void _count(DateTime leftAt) {
    _counted = true;
    _leaveCount++;
    final record = LeaveRecord(leftAt: leftAt);
    _history.add(record);
    _enqueue(ExamSessionEvent.leave);
    onLeave?.call(
      LeaveOutcome(leaveCount: _leaveCount, decision: policy.decide(_leaveCount), record: record),
    );
  }

  void _enqueue(ExamSessionEvent e) {
    _queue.add(e);
    while (_queue.length > maxPending) {
      // Эхлээд хуучин RETURN-ийг хаяна (LEAVE нь серверийн тоонд нөлөөлдөг).
      final idx = _queue.toList().indexOf(ExamSessionEvent.returned);
      if (idx >= 0) {
        final list = _queue.toList()..removeAt(idx);
        _queue
          ..clear()
          ..addAll(list);
      } else {
        _queue.removeFirst();
      }
    }
  }

  /// Одоогийн цаг (тест, UI-д «хэр удсан» тооцох).
  DateTime now() => _now();

  void dispose() {
    _disposed = true;
    _pendingTimer?.cancel();
    _pendingTimer = null;
  }
}
