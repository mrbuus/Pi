import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/integrity/integrity.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('LifecycleEventMapper', () {
    test('inactive (дуудлага, системийн цонх) гаралт биш', () {
      final m = LifecycleEventMapper();
      expect(m.map(AppLifecycleState.inactive), isNull);
      expect(m.map(AppLifecycleState.resumed), isNull);
    });

    test('hidden → paused нэг backgrounded, resumed нэг удаа', () {
      final m = LifecycleEventMapper();
      expect(m.map(AppLifecycleState.inactive), isNull);
      expect(m.map(AppLifecycleState.hidden), IntegrityEventType.backgrounded);
      expect(m.map(AppLifecycleState.paused), isNull);
      expect(m.isAway, isTrue);
      expect(m.map(AppLifecycleState.hidden), isNull);
      expect(m.map(AppLifecycleState.inactive), isNull);
      expect(m.map(AppLifecycleState.resumed), IntegrityEventType.resumed);
      expect(m.map(AppLifecycleState.resumed), isNull);
    });
  });

  group('FakeExamGuard', () {
    test('exit давтан дуудахад аюулгүй, идэвхгүй үед үйл явдал үгүй', () async {
      final g = FakeExamGuard();
      final got = <IntegrityEventType>[];
      g.events.listen((e) => got.add(e.type));
      g.emit(IntegrityEventType.screenshot);
      await g.enter();
      g.emit(IntegrityEventType.screenshot);
      await g.exit();
      await g.exit();
      g.emit(IntegrityEventType.screenshot);
      expect(got, [IntegrityEventType.screenshot]);
      expect(g.exitCalls, 1);
      await g.dispose();
    });
  });

  group('MethodChannelExamGuard', () {
    const method = MethodChannel(MethodChannelExamGuard.methodChannelName);
    const eventName = MethodChannelExamGuard.eventChannelName;
    final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    late List<String> calls;

    /// Натив талаас EventChannel-ээр мессеж илгээх.
    Future<void> sendNative(Object? value) async {
      await messenger.handlePlatformMessage(
        eventName,
        const StandardMethodCodec().encodeSuccessEnvelope(value),
        (_) {},
      );
    }

    setUp(() {
      calls = [];
      messenger.setMockMethodCallHandler(method, (call) async {
        calls.add(call.method);
        return call.method == 'enter' ? true : null;
      });
      // EventChannel-ийн listen/cancel-д хариулах.
      messenger.setMockMessageHandler(eventName, (msg) async {
        final call = const StandardMethodCodec().decodeMethodCall(msg);
        calls.add('events.${call.method}');
        return const StandardMethodCodec().encodeSuccessEnvelope(null);
      });
    });

    tearDown(() {
      messenger.setMockMethodCallHandler(method, null);
      messenger.setMockMessageHandler(eventName, null);
    });

    test('enter/exit натив руу дамжина, exit idempotent', () async {
      final g = MethodChannelExamGuard();
      await g.enter();
      expect(g.isActive, isTrue);
      expect(g.platformSecured, isTrue);
      await g.enter(); // давхар enter — натив руу дахин явахгүй
      await g.exit();
      await g.exit();
      expect(g.isActive, isFalse);
      expect(calls.where((c) => c == 'enter'), hasLength(1));
      expect(calls.where((c) => c == 'exit'), hasLength(1));
      expect(calls, contains('events.listen'));
      expect(calls, contains('events.cancel'));
      await g.dispose();
    });

    test('натив үйл явдлыг шалгаж задална, буруу хэлбэрийг хаяна', () async {
      final at = DateTime.utc(2026, 11, 1);
      final g = MethodChannelExamGuard(now: () => at);
      final got = <IntegrityEvent>[];
      final sub = g.events.listen(got.add);
      await g.enter();
      await sendNative({'type': 'screenshot'});
      await sendNative({'type': 'recordingStarted'});
      await sendNative({'type': 'нууц'});
      await sendNative('screenshot');
      await sendNative({'type': 42});
      await sendNative(null);
      await sendNative({'type': 'recordingStopped'});
      await pumpEventQueue();
      expect(got.map((e) => e.type), [
        IntegrityEventType.screenshot,
        IntegrityEventType.recordingStarted,
        IntegrityEventType.recordingStopped,
      ]);
      expect(got.first.at, at);
      await sub.cancel();
      await g.dispose();
    });

    test('lifecycle: inactive тоогдохгүй, paused → backgrounded, resumed → resumed', () async {
      final g = MethodChannelExamGuard();
      final got = <IntegrityEventType>[];
      final sub = g.events.listen((e) => got.add(e.type));
      final binding = TestWidgetsFlutterBinding.instance;
      binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await g.enter();
      binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await pumpEventQueue();
      expect(got, [IntegrityEventType.backgrounded, IntegrityEventType.resumed]);

      await g.exit();
      binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      await pumpEventQueue();
      expect(got, hasLength(2), reason: 'exit-ийн дараа үйл явдал үгүй');
      binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await sub.cancel();
      await g.dispose();
    });

    test('платформ дэмжээгүй (MissingPlugin) үед шалгалт унахгүй', () async {
      messenger.setMockMethodCallHandler(method, null);
      messenger.setMockMessageHandler(eventName, null);
      final g = MethodChannelExamGuard();
      await g.enter();
      expect(g.isActive, isTrue);
      expect(g.platformSecured, isFalse);
      await g.exit();
      expect(g.isActive, isFalse);
      await g.dispose();
    });

    test('натив enter алдаа өгвөл (PlatformException) platformSecured=false', () async {
      messenger.setMockMethodCallHandler(method, (call) async {
        if (call.method == 'enter') throw PlatformException(code: 'NO_WINDOW');
        return null;
      });
      final g = MethodChannelExamGuard();
      await g.enter();
      expect(g.platformSecured, isFalse);
      await g.dispose();
    });

    test('parseNativeEvent', () {
      expect(MethodChannelExamGuard.parseNativeEvent({'type': 'screenshot'}), IntegrityEventType.screenshot);
      expect(
        MethodChannelExamGuard.parseNativeEvent({'type': 'backgrounded'}),
        isNull,
        reason: 'lifecycle-ийг натив талаас хүлээж авахгүй',
      );
      expect(MethodChannelExamGuard.parseNativeEvent(<String, Object>{}), isNull);
      expect(MethodChannelExamGuard.parseNativeEvent([1, 2]), isNull);
    });
  });

  test('LeaveTracker + FakeExamGuard хамт: гаралт autosave дараалалд орно', () async {
    var now = DateTime.utc(2026, 11, 1, 9);
    final g = FakeExamGuard(now: () => now);
    final t = LeaveTracker(now: () => now, timer: (d, cb) => Timer(const Duration(days: 1), cb));
    final sub = g.events.listen(t.handle);
    await g.enter();
    g.emit(IntegrityEventType.backgrounded);
    now = now.add(const Duration(seconds: 4));
    g.emit(IntegrityEventType.resumed);
    expect(t.leaveCount, 1);
    expect(t.nextPending, ExamSessionEvent.leave);
    await g.exit();
    await sub.cancel();
    t.dispose();
    await g.dispose();
  });
}
