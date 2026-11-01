import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/notifications/domain/notification_link.dart';
import 'package:piemath_app/features/notifications/domain/notifications_controller.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import '../m7_fixtures.dart';

void main() {
  group('мэдэгдлийн холбоос → апп-ын зам', () {
    String? t(String? l) => notificationTarget(l, webHost: 'pimath.mn');

    test('дотоод /app/... зам', () {
      expect(t('/app/homework'), '/app/homework');
      expect(t('/app/tests/abc?x=1'), '/app/tests/abc?x=1');
    });

    test('манай вэбийн бүтэн хаяг', () {
      expect(t('https://pimath.mn/app/schedule'), '/app/schedule');
      expect(t('https://evil.mn/app/schedule'), isNull);
    });

    test('гадаад, аюултай, нэвтрэх зам → null', () {
      expect(t(null), isNull);
      expect(t('//evil.com/app/x'), isNull);
      expect(t('/login'), isNull);
      expect(t('/books'), isNull);
      expect(t('/app/a b'), isNull);
    });
  });

  group('NotificationsController', () {
    late FakeHttp http;
    setUp(() {
      http = FakeHttp()
        ..json('GET', '/notifications/my', {
          'notifications': [notification('n1'), notification('n2', read: true)],
          'nextCursor': 'n2',
        })
        ..json('GET', '/notifications/my/unread-count', {'count': 1});
    });

    test('эхний хуудас + уншаагүй тоо', () async {
      final c = testContainer(http: http);
      final s = await c.read(notificationsControllerProvider.future);
      expect(s.items.length, 2);
      expect(s.unread, 1);
      expect(http.requests.first.queryParameters['limit'], 20);
    });

    test('шүүлтүүр', () async {
      final c = testContainer(http: http);
      final sub = c.listen(notificationsControllerProvider, (_, _) {});
      addTearDown(sub.close);
      await c.read(notificationsControllerProvider.future);
      c.read(notificationsControllerProvider.notifier).setFilter(NotificationFilter.unread);
      expect(c.read(notificationsControllerProvider).value!.visible.map((n) => n.id), ['n1']);
    });

    test('уншсан болгох → тоо буурна', () async {
      http.json('POST', '/notifications/n1/read', {'read': true});
      final c = testContainer(http: http);
      final sub = c.listen(notificationsControllerProvider, (_, _) {});
      addTearDown(sub.close);
      await c.read(notificationsControllerProvider.future);
      await c.read(notificationsControllerProvider.notifier).markRead('n1');
      final s = c.read(notificationsControllerProvider).value!;
      expect(s.unread, 0);
      expect(s.items.first.readAt, isNotNull);
    });

    test('бүгдийг уншсан болгох', () async {
      http.json('POST', '/notifications/read-all', {'updated': 1});
      final c = testContainer(http: http);
      final sub = c.listen(notificationsControllerProvider, (_, _) {});
      addTearDown(sub.close);
      await c.read(notificationsControllerProvider.future);
      await c.read(notificationsControllerProvider.notifier).markAllRead();
      final s = c.read(notificationsControllerProvider).value!;
      expect(s.unread, 0);
      expect(s.items.every((n) => n.readAt != null), isTrue);
    });

    test('дараагийн хуудас cursor-оор', () async {
      http.on('GET', '/notifications/my', (req) => FakeResponse(
            req.queryParameters['cursor'] == null
                ? {'notifications': [notification('n1')], 'nextCursor': 'n1'}
                : {'notifications': [notification('n9')], 'nextCursor': null},
          ));
      final c = testContainer(http: http);
      final sub = c.listen(notificationsControllerProvider, (_, _) {});
      addTearDown(sub.close);
      await c.read(notificationsControllerProvider.future);
      await c.read(notificationsControllerProvider.notifier).loadMore();
      final s = c.read(notificationsControllerProvider).value!;
      expect(s.items.map((n) => n.id), contains('n9'));
      expect(s.nextCursor, isNull);
    });

    test('уншсан болгох алдаа → жагсаалт хэвээр, монгол мессеж', () async {
      http.error('POST', '/notifications/n1/read', 404, 'Мэдэгдэл олдсонгүй.');
      final c = testContainer(http: http);
      final sub = c.listen(notificationsControllerProvider, (_, _) {});
      addTearDown(sub.close);
      await c.read(notificationsControllerProvider.future);
      await c.read(notificationsControllerProvider.notifier).markRead('n1');
      final s = c.read(notificationsControllerProvider).value!;
      expect(s.actionError, 'Мэдэгдэл олдсонгүй.');
      expect(s.items.length, 2);
      expect(s.unread, 1);
    });

    test('уншаагүй тооны provider', () async {
      final c = testContainer(http: http);
      final sub = c.listen(unreadNotificationsCountProvider, (_, _) {});
      addTearDown(sub.close);
      expect(await c.read(unreadNotificationsCountProvider.future), 1);
    });
  });
}
