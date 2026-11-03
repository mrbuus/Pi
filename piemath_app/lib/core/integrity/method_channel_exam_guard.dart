import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'exam_guard.dart';
import 'integrity_event.dart';

/// Платформын хамгаалалт (Android `MainActivity.kt`, iOS `AppDelegate.swift`).
///
/// - MethodChannel [methodChannelName]: `enter`, `exit`.
///   Android: `FLAG_SECURE` (скриншот, бичлэг, «сүүлийн апп»-ын зураг хар), Android 14+
///   скриншотын callback. iOS: скриншот, дэлгэц бичлэгийн мэдэгдэл ажиглана (хориглох
///   API байхгүй — зөвхөн илрүүлнэ).
/// - EventChannel [eventChannelName]: `{'type': 'screenshot' | 'recordingStarted' |
///   'recordingStopped'}`. Бусад утгыг үл тооно.
/// - Апп-ын lifecycle ([AppLifecycleListener]) → `backgrounded` / `resumed`.
///
/// Платформын хэрэгжүүлэлт байхгүй бол (тест, desktop) lifecycle-ийг л ажиглана —
/// шалгалтыг ХЭЗЭЭ Ч унагахгүй.
class MethodChannelExamGuard implements ExamGuard {
  MethodChannelExamGuard({MethodChannel? methodChannel, EventChannel? eventChannel, DateTime Function()? now})
    : _method = methodChannel ?? const MethodChannel(methodChannelName),
      _event = eventChannel ?? const EventChannel(eventChannelName),
      _now = now ?? DateTime.now;

  static const methodChannelName = 'mn.piemath.app/exam_guard';
  static const eventChannelName = 'mn.piemath.app/exam_guard/events';

  /// Натив талаас ирж болох үйл явдал (wire нэр → төрөл).
  static const nativeEventTypes = <String, IntegrityEventType>{
    'screenshot': IntegrityEventType.screenshot,
    'recordingStarted': IntegrityEventType.recordingStarted,
    'recordingStopped': IntegrityEventType.recordingStopped,
  };

  final MethodChannel _method;
  final EventChannel _event;
  final DateTime Function() _now;
  final _controller = StreamController<IntegrityEvent>.broadcast();
  final _mapper = LifecycleEventMapper();

  StreamSubscription<Object?>? _nativeSub;
  AppLifecycleListener? _lifecycle;
  bool _active = false;
  bool _platformSecured = false;

  /// Натив хамгаалалт (FLAG_SECURE / iOS ажиглагч) амжилттай асаасан эсэх.
  /// `false` бол платформ дэмжээгүй — зөвхөн lifecycle ажиглагдаж байна.
  bool get platformSecured => _platformSecured;

  @override
  bool get isActive => _active;

  @override
  Stream<IntegrityEvent> get events => _controller.stream;

  @override
  Future<void> enter() async {
    if (_active) return;
    _active = true;
    _mapper.reset();
    _lifecycle = AppLifecycleListener(onStateChange: _onLifecycle);
    _nativeSub = _event.receiveBroadcastStream().listen(_onNative, onError: (Object _) {}, cancelOnError: false);
    try {
      final ok = await _method.invokeMethod<bool>('enter');
      _platformSecured = ok ?? false;
    } on MissingPluginException {
      _platformSecured = false;
    } on PlatformException {
      _platformSecured = false;
    }
  }

  @override
  Future<void> exit() async {
    if (!_active) return;
    _active = false;
    _platformSecured = false;
    _lifecycle?.dispose();
    _lifecycle = null;
    try {
      await _nativeSub?.cancel();
    } on MissingPluginException {
      // Натив тал байхгүй — цуцлах зүйл ч байхгүй.
    } on PlatformException {
      // Цуцлах үеийн алдаа шалгалтыг саатуулах ёсгүй.
    } finally {
      _nativeSub = null;
    }
    try {
      await _method.invokeMethod<void>('exit');
    } on MissingPluginException {
      // Платформ дэмжээгүй.
    } on PlatformException {
      // FLAG_SECURE-ийг цэвэрлэж чадаагүй ч Dart талын төлөв унтарсан.
    }
  }

  void _onLifecycle(AppLifecycleState state) {
    if (!_active) return;
    final type = _mapper.map(state);
    if (type != null) _controller.add(IntegrityEvent(type, _now()));
  }

  void _onNative(Object? raw) {
    if (!_active) return;
    final type = parseNativeEvent(raw);
    if (type != null) _controller.add(IntegrityEvent(type, _now()));
  }

  /// Натив мессежийг шалгаж задлах. Буруу хэлбэр бол `null`.
  static IntegrityEventType? parseNativeEvent(Object? raw) {
    if (raw is! Map) return null;
    final type = raw['type'];
    if (type is! String) return null;
    return nativeEventTypes[type];
  }

  Future<void> dispose() async {
    await exit();
    await _controller.close();
  }
}
