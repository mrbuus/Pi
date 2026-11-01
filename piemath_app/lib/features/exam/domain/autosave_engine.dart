import 'dart:async';
import 'dart:math' as math;

import 'package:clock/clock.dart';

import '../data/exam_models.dart';
import 'answer.dart';

/// Серверт хадгалах хүсэлт (`PATCH /tests/:id/session`).
typedef SaveSender = Future<SaveResponse> Function(Map<String, Object?> body);

enum SaveState {
  /// Бүх хариу серверт хадгалагдсан.
  saved,

  /// Илгээж байна.
  saving,

  /// Жинхэнэ хадгалалт бүтэлгүйтсэн — хариу утсанд хадгалагдсан, холбогдмогц илгээнэ.
  offline,
}

/// Хадгалалтын хэмнэл — вэбийн `app/tests/[id]/page.tsx`-тэй ИЖИЛ (серверийн ачааллын тооцоо
/// үүн дээр суурилсан, `docs/api-contract/exam.md` §3.4).
class AutosaveConfig {
  const AutosaveConfig({
    this.debounce = const Duration(milliseconds: 1200),
    this.heartbeat = const Duration(seconds: 20),
    this.heartbeatJitter = 0.2,
    this.idleKeepalive = const Duration(seconds: 90),
    this.retryBase = const Duration(seconds: 2),
    this.retryMax = const Duration(seconds: 30),
    this.retryMaxExponent = 8,
  });

  final Duration debounce;
  final Duration heartbeat;
  final double heartbeatJitter;
  final Duration idleKeepalive;
  final Duration retryBase;
  final Duration retryMax;
  final int retryMaxExponent;

  /// Дараагийн heartbeat-ын хугацаа: 20с ± 20% (тик бүрд шинэ санамсаргүй).
  Duration jitteredHeartbeat(math.Random r) => heartbeat * (1 - heartbeatJitter + r.nextDouble() * 2 * heartbeatJitter);

  /// Бүтэлгүйтлийн дараах саатал: `min(30с, 2с * 2^n) * (0.7..1.3)`.
  Duration backoff(int attempt, math.Random r) {
    final n = attempt.clamp(0, retryMaxExponent);
    final base = math.min(retryMax.inMilliseconds, retryBase.inMilliseconds * math.pow(2, n).toInt());
    return Duration(milliseconds: (base * (0.7 + r.nextDouble() * 0.6)).round());
  }
}

/// Шалгалтын autosave-ийн цэвэр хөдөлгүүр (UI-гүй, цагийг `Timer`-оор — тестэд fake_async).
///
/// - Хариу/тэмдэглэгээ өөрчлөгдмөгц 1.2с debounce → зөвхөн ӨӨРЧЛӨГДСӨН түлхүүрийг илгээнэ.
/// - Heartbeat 20с ±20%: dirty бол жинхэнэ save; dirty-гүй бол сүүлийн холбооноос 90с өнгөрсөн
///   үед л хоосон `{}` keepalive. Юу ч шаардлагагүй бол хүсэлт илгээхгүй.
/// - Жинхэнэ save бүтэлгүйтвэл dirty хэвээр (алдагдахгүй), [SaveState.offline], backoff-оор
///   дахин. Хоосон keepalive бүтэлгүйтвэл офлайн гэж ХАРУУЛАХГҮЙ (сурагчийг дэмий айлгахгүй).
/// - Амжилттай: илгээсэн snapshot-тай ижил хэвээр байгаа dirty түлхүүрийг л цэвэрлэнэ.
/// - Нэг зэрэг нэг л хүсэлт: явцад байхад дахин дуудвал дууссаны дараа нэг удаа давтана.
class AutosaveEngine {
  AutosaveEngine({
    required this.send,
    this.config = const AutosaveConfig(),
    math.Random? random,
    this.nextEvent,
    this.ackEvent,
    this.onResponse,
    this.onStateChanged,
    this.onDirtyChanged,
  }) : _random = random ?? math.Random();

  final SaveSender send;
  final AutosaveConfig config;
  final math.Random _random;

  /// Илгээх дараагийн үйл явдал (`LEAVE`/`RETURN`) — [LeaveTracker.nextPending].
  final String? Function()? nextEvent;

  /// Үйл явдлыг сервер хүлээн авсан — [LeaveTracker.ackPending].
  final void Function()? ackEvent;

  /// Амжилттай хариу (remainingSec, leaveCount, SUBMITTED).
  final void Function(SaveResponse response)? onResponse;
  final void Function(SaveState state)? onStateChanged;

  /// Илгээгээгүй өөрчлөлт өөрчлөгдсөн — локал ноорогт хадгалах.
  final void Function()? onDirtyChanged;

  final _dirtyAnswers = <String, Object?>{};
  final _dirtyStates = <String, String>{};
  final _times = <String, int>{};
  final _lastSavedTimes = <String, int>{};

  Timer? _debounce;
  Timer? _retry;
  Timer? _heartbeat;
  int _retryCount = 0;
  bool _inFlight = false;
  bool _again = false;
  bool _stopped = false;
  SaveState _state = SaveState.saved;

  /// Сервертэй сүүлд амжилттай холбогдсон мөч (монотон цаг).
  final Stopwatch _sinceContact = clock.stopwatch();

  SaveState get state => _state;
  bool get hasDirty => _dirtyAnswers.isNotEmpty || _dirtyStates.isNotEmpty;
  Map<String, Object?> get dirtyAnswers => Map.unmodifiable(_dirtyAnswers);
  Map<String, String> get dirtyStates => Map.unmodifiable(_dirtyStates);
  Map<String, int> get times => Map.unmodifiable(_times);
  bool get stopped => _stopped;

  /// Heartbeat эхлүүлэх (шалгалт эхэлсэн мөчөөс).
  void start() {
    _stopped = false;
    _sinceContact
      ..reset()
      ..start();
    _scheduleHeartbeat();
  }

  /// Бүх timer зогсооно (илгээсэн, гарсан). Dirty устахгүй.
  void stop() {
    _stopped = true;
    _debounce?.cancel();
    _retry?.cancel();
    _heartbeat?.cancel();
    _debounce = _retry = _heartbeat = null;
  }

  /// Өмнө илгээгээгүй (офлайнаар хадгалсан) өөрчлөлтийг сэргээх — дараагийн save-д орно.
  void restoreDirty({Map<String, Object?> answers = const {}, Map<String, String> states = const {}}) {
    _dirtyAnswers.addAll(answers);
    _dirtyStates.addAll(states);
  }

  /// Бодлого бүрийн хуримтлагдсан секунд (сервер 0..86400).
  void setTimes(Map<String, int> times) => _times
    ..clear()
    ..addAll(times);

  void tickTime(String problemId) {
    final v = (_times[problemId] ?? 0) + 1;
    _times[problemId] = v > 86400 ? 86400 : v;
  }

  void answerChanged(String problemId, Object? value) {
    _dirtyAnswers[problemId] = value;
    onDirtyChanged?.call();
    _scheduleDebounce();
  }

  void stateChanged(String problemId, SelfState? state) {
    _dirtyStates[problemId] = state?.wire ?? '';
    onDirtyChanged?.call();
    _scheduleDebounce();
  }

  void _scheduleDebounce() {
    if (_stopped) return;
    _debounce?.cancel();
    // Шинэ засвар ирлээ — хүлээгдэж буй backoff-ийн давталт илүү болно.
    _retry?.cancel();
    _retry = null;
    _debounce = Timer(config.debounce, () {
      _debounce = null;
      unawaited(flush());
    });
  }

  /// Үйл явдал хүлээгдэж байвал шууд илгээх (гаралт тоологдсон, апп арын дэвсгэрт орсон).
  void flushSoon() {
    if (_stopped) return;
    _debounce?.cancel();
    _debounce = null;
    unawaited(flush());
  }

  void _scheduleHeartbeat() {
    if (_stopped) return;
    _heartbeat?.cancel();
    _heartbeat = Timer(config.jitteredHeartbeat(_random), () {
      if (_stopped) return;
      if (hasDirty || (nextEvent?.call() != null)) {
        unawaited(flush());
      } else if (_sinceContact.elapsed >= config.idleKeepalive) {
        unawaited(flush(keepalive: true));
      }
      _scheduleHeartbeat();
    });
  }

  /// Нэг удаагийн хадгалалт. [keepalive] бол хоосон ч илгээнэ (remainingSec, SUBMITTED-ийг мэдэх).
  /// Жинхэнэ save амжилттай бол `true`.
  Future<bool> flush({bool keepalive = false}) async {
    if (_stopped) return false;
    if (_inFlight) {
      _again = true;
      return false;
    }
    final answers = Map<String, Object?>.of(_dirtyAnswers);
    final states = Map<String, String>.of(_dirtyStates);
    final times = <String, int>{
      for (final e in _times.entries)
        if (_lastSavedTimes[e.key] != e.value) e.key: e.value,
    };
    final event = nextEvent?.call();
    final body = <String, Object?>{
      if (answers.isNotEmpty) 'answers': answers,
      if (states.isNotEmpty) 'selfStates': states,
      if (times.isNotEmpty) 'problemTimes': times,
      'event': ?event,
    };
    final real = answers.isNotEmpty || states.isNotEmpty || event != null;
    if (body.isEmpty && !keepalive) return false;
    // Зөвхөн секунд л өөрчлөгдсөн бол тусдаа хүсэлт хийхгүй — heartbeat/keepalive-д хамт явна.
    if (!real && !keepalive && times.isNotEmpty) return false;

    _inFlight = true;
    if (real) _setState(SaveState.saving);
    var ok = false;
    try {
      final res = await send(body);
      ok = true;
      for (final e in answers.entries) {
        if (_dirtyAnswers.containsKey(e.key) && answerEquals(_dirtyAnswers[e.key], e.value)) {
          _dirtyAnswers.remove(e.key);
        }
      }
      for (final e in states.entries) {
        if (_dirtyStates[e.key] == e.value) _dirtyStates.remove(e.key);
      }
      _lastSavedTimes.addAll(times);
      if (event != null) ackEvent?.call();
      _sinceContact
        ..reset()
        ..start();
      _retryCount = 0;
      _retry?.cancel();
      _retry = null;
      _setState(hasDirty ? SaveState.saving : SaveState.saved);
      onDirtyChanged?.call();
      onResponse?.call(res);
    } catch (_) {
      if (real && !_stopped) {
        _setState(SaveState.offline);
        _retry?.cancel();
        final delay = config.backoff(_retryCount, _random);
        _retryCount = math.min(_retryCount + 1, config.retryMaxExponent);
        _retry = Timer(delay, () {
          _retry = null;
          unawaited(flush());
        });
      }
    } finally {
      _inFlight = false;
    }
    if (_again && !_stopped) {
      _again = false;
      unawaited(flush());
    } else if (ok && !_stopped && (hasDirty || nextEvent?.call() != null) && _debounce == null) {
      // Илгээж байх хооронд шинэ өөрчлөлт/үйл явдал нэмэгдсэн.
      unawaited(flush());
    }
    return ok && real;
  }

  void _setState(SaveState s) {
    if (_state == s) return;
    _state = s;
    onStateChanged?.call(s);
  }

  void dispose() => stop();
}
