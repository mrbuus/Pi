import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/push/push_messaging.dart';
import 'package:piemath_app/features/push/push_service.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'fake_push_messaging.dart';

void main() {
  late FakeHttp http;
  late FakePushMessaging push;

  setUp(() {
    http = FakeHttp()
      ..json('GET', '/auth/me', fakeMe())
      ..json('POST', '/devices', {
        'registered': true,
        'device': {'id': 'd1', 'platform': 'android', 'lastSeenAt': '2026-11-02T00:00:00.000Z'},
        'pushEnabled': true,
      })
      ..json('DELETE', '/devices/fcm%3Atok%2F1', {'registered': false});
    push = FakePushMessaging();
  });

  Future<void> signIn(ProviderContainer c) =>
      c.read(sessionProvider.notifier).signIn(token: 'tok', userId: 'u1', role: UserRole.student, remember: true);

  group('PushConfig', () {
    test('утга дутуу бол унтраалттай', () {
      expect(PushConfig.fromEnvironment().appIdFor(TargetPlatform.android), isNull);
      const partial = PushConfig(apiKey: 'k', projectId: 'p', senderId: '', androidAppId: 'a', iosAppId: 'i');
      expect(partial.appIdFor(TargetPlatform.android), isNull);
    });

    test('платформын appId-г сонгоно', () {
      const full = PushConfig(apiKey: 'k', projectId: 'p', senderId: 's', androidAppId: 'a', iosAppId: '');
      expect(full.appIdFor(TargetPlatform.android), 'a');
      expect(full.appIdFor(TargetPlatform.iOS), isNull);
    });

    test('тохиргоогүй үед провайдер DisabledPushMessaging', () {
      final c = testContainer(http: http);
      expect(c.read(pushMessagingProvider), isA<DisabledPushMessaging>());
    });
  });

  group('PushService', () {
    test('нэвтэрмэгц POST /devices (токен, платформ)', () async {
      final c = testContainer(http: http, extra: [pushMessagingProvider.overrideWithValue(push)]);
      c.read(pushSyncProvider);
      await signIn(c);
      await pumpEventQueue();
      expect(http.count('POST', '/devices'), 1);
      final req = http.requests.firstWhere((r) => r.path == '/devices');
      expect(req.data, {'token': 'fcm:tok/1', 'platform': 'android'});
      expect(req.headers['Authorization'], 'Bearer tok');
      expect(push.permissionCalls, 1);
      expect(c.read(pushServiceProvider).registeredToken, 'fcm:tok/1');
    });

    test('Firebase тохируулаагүй бол сервер рүү юу ч илгээхгүй', () async {
      push.enabled = false;
      final c = testContainer(http: http, extra: [pushMessagingProvider.overrideWithValue(push)]);
      c.read(pushSyncProvider);
      await signIn(c);
      await pumpEventQueue();
      expect(http.count('POST', '/devices'), 0);
      expect(push.initCalls, 0);
    });

    test('бүртгэл бүтэлгүйтсэн ч алдаа шидэхгүй', () async {
      http = FakeHttp()
        ..json('GET', '/auth/me', fakeMe())
        ..error('POST', '/devices', 500);
      final c = testContainer(http: http, extra: [pushMessagingProvider.overrideWithValue(push)]);
      await signIn(c);
      expect(await c.read(pushServiceProvider).register(), isFalse);
    });

    test('токен шинэчлэгдвэл дахин бүртгэнэ', () async {
      final c = testContainer(http: http, extra: [pushMessagingProvider.overrideWithValue(push)]);
      await signIn(c);
      await c.read(pushServiceProvider).register();
      push.refresh.add('fresh');
      await pumpEventQueue();
      expect(http.requests.where((r) => r.path == '/devices').last.data, {'token': 'fresh', 'platform': 'android'});
    });

    test('unregisterPush: URL-encode хийсэн DELETE, дараа нь утсан дээрх токен устна', () async {
      final c = testContainer(http: http, extra: [pushMessagingProvider.overrideWithValue(push)]);
      await signIn(c);
      final service = c.read(pushServiceProvider);
      await service.register();
      await service.unregisterPush();
      expect(http.count('DELETE', '/devices/fcm%3Atok%2F1'), 1);
      expect(push.deleteCalls, 1);
      expect(service.registeredToken, isNull);
    });

    test('гарахад (SignedOut) зөвхөн утсан дээрх токеныг устгана', () async {
      final c = testContainer(http: http, extra: [pushMessagingProvider.overrideWithValue(push)]);
      c.read(pushSyncProvider);
      await signIn(c);
      await pumpEventQueue();
      await c.read(sessionProvider.notifier).signOut();
      await pumpEventQueue();
      expect(push.deleteCalls, 1);
      expect(http.requests.where((r) => r.method == 'DELETE'), isEmpty);
    });

    test('шалгалтын чимээгүй горимд апп доторх мэдэгдэл шүүгдэнэ', () async {
      final c = testContainer(http: http, extra: [pushMessagingProvider.overrideWithValue(push)]);
      final got = <String?>[];
      final sub = c.read(pushServiceProvider).foregroundMessages.listen((m) => got.add(m.title));
      addTearDown(sub.cancel);
      push.messages.add(const PushMessage(title: 'a'));
      await pumpEventQueue();
      c.read(pushQuietProvider.notifier).set(quiet: true);
      push.messages.add(const PushMessage(title: 'b'));
      await pumpEventQueue();
      c.read(pushQuietProvider.notifier).set(quiet: false);
      push.messages.add(const PushMessage(title: 'c'));
      await pumpEventQueue();
      expect(got, ['a', 'c']);
    });
  });
}
