import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/notifications/data/notification_models.dart';
import 'package:piemath_app/features/notifications/ui/notification_detail_screen.dart';
import 'package:piemath_app/features/notifications/ui/notification_settings_screen.dart';
import 'package:piemath_app/features/notifications/ui/notifications_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_fixtures.dart';
import '../m7_harness.dart';

FakeHttp _http(List<Map<String, Object?>> items, {String? next, int unread = 1}) => FakeHttp()
  ..json('GET', '/notifications/my', {'notifications': items, 'nextCursor': next})
  ..json('GET', '/notifications/my/unread-count', {'count': unread});

void main() {
  testWidgets('жагсаалт: шинэ/уншсан шошго, харьцангуй цаг', (tester) async {
    await pumpM7(
      tester,
      const NotificationsScreen(),
      http: _http([notification('n1', link: '/app/homework'), notification('n2', read: true)]),
    );
    expect(find.text('Шинэ даалгавар n1'), findsOneWidget);
    expect(find.text('Шинэ'), findsOneWidget);
    expect(find.text('Уншсан'), findsWidgets);
    expect(find.text('5 минутын өмнө'), findsNWidgets(2));
    expect(find.text('Холбогдох хэсэг рүү очих'), findsOneWidget);
  });

  testWidgets('холбоос дарахад уншсан болгож, апп-ын зам руу', (tester) async {
    final http = _http([notification('n1', link: '/app/homework')])..json('POST', '/notifications/n1/read', {'read': true});
    await pumpM7(tester, const NotificationsScreen(), http: http);
    await tester.tap(find.text('Холбогдох хэсэг рүү очих'));
    await settle(tester);
    expect(find.text('ROUTE:/app/homework'), findsOneWidget);
    expect(http.count('POST', '/notifications/n1/read'), 1);
  });

  testWidgets('апп-д тохирох хэсэггүй холбоос → дэлгэрэнгүй (хөтөч нээхгүй)', (tester) async {
    final http = _http([notification('n1', link: 'https://example.com/promo')])
      ..json('POST', '/notifications/n1/read', {'read': true});
    await pumpM7(tester, const NotificationsScreen(), http: http);
    expect(find.text('Холбогдох хэсэг рүү очих'), findsNothing);
    await tester.tap(find.text('Дэлгэрэнгүй'));
    await settle(tester);
    expect(find.text('ROUTE:/app/notifications/n1'), findsOneWidget);
  });

  testWidgets('дэлгэрэнгүй дэлгэц: гарчиг, бичвэр, апп доторх холбоос', (tester) async {
    final item = AppNotification.fromJson(notification('n1', link: '/app/homework'));
    await pumpM7(tester, NotificationDetailScreen(id: 'n1', initial: item), http: _http(const []));
    expect(find.text('Шинэ даалгавар n1'), findsOneWidget);
    expect(find.text('Логарифмын 5 бодлого'), findsOneWidget);
    await tester.tap(find.text('Холбогдох хэсэг рүү очих'));
    await settle(tester);
    expect(find.text('ROUTE:/app/homework'), findsOneWidget);
  });

  testWidgets('дэлгэрэнгүй: олдохгүй бол тайлбар', (tester) async {
    await pumpM7(tester, const NotificationDetailScreen(id: 'zz'), http: _http(const []));
    await settle(tester);
    expect(find.text('Мэдэгдэл олдсонгүй'), findsOneWidget);
  });

  testWidgets('«Уншсан болгох»', (tester) async {
    final http = _http([notification('n1')])..json('POST', '/notifications/n1/read', {'read': true});
    await pumpM7(tester, const NotificationsScreen(), http: http);
    await tester.tap(find.text('Уншсан болгох'));
    await settle(tester);
    expect(find.text('Уншсан болгох'), findsNothing);
    expect(find.text('Шинэ'), findsNothing);
  });

  testWidgets('хоосон', (tester) async {
    await pumpM7(tester, const NotificationsScreen(), http: _http(const [], unread: 0));
    expect(find.text('Мэдэгдэл алга'), findsOneWidget);
  });

  testWidgets('алдаа → дахин оролдох', (tester) async {
    final http = FakeHttp()
      ..on('GET', '/notifications/my', (_) => const FakeResponse.network())
      ..json('GET', '/notifications/my/unread-count', {'count': 0});
    await pumpM7(tester, const NotificationsScreen(), http: http);
    await settle(tester, frames: 40);
    expect(find.text(AppStrings.networkError), findsOneWidget);
    expect(find.text(AppStrings.retry), findsOneWidget);
  });

  testWidgets('дараагийн хуудас', (tester) async {
    final http = FakeHttp()
      ..on('GET', '/notifications/my', (req) => FakeResponse(
            req.queryParameters['cursor'] == null
                ? {'notifications': [notification('n1')], 'nextCursor': 'n1'}
                : {'notifications': [notification('n9')], 'nextCursor': null},
          ))
      ..json('GET', '/notifications/my/unread-count', {'count': 2});
    await pumpM7(tester, const NotificationsScreen(), http: http);
    await tester.tap(find.text('Дараагийн мэдэгдлүүд'));
    await settle(tester);
    expect(find.text('Шинэ даалгавар n9'), findsOneWidget);
    expect(find.text('Дараагийн мэдэгдлүүд'), findsNothing);
  });

  testWidgets('имэйлийн тохиргоо: солих ба хадгалах', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/notifications/settings', {'userId': 'u1', 'emailWeekly': true, 'emailReminders': true})
      ..json('PATCH', '/notifications/settings', {'userId': 'u1', 'emailWeekly': false, 'emailReminders': true});
    await pumpM7(tester, const NotificationSettingsScreen(), http: http);
    await tester.tap(find.text('Долоо хоногийн тайлан'));
    await tester.pump();
    await tester.tap(find.text(AppStrings.save));
    await settle(tester);
    final patch = http.requests.singleWhere((r) => r.method == 'PATCH');
    expect(patch.data, {'emailWeekly': false, 'emailReminders': true});
    expect(find.text('Тохиргоо хадгалагдлаа'), findsOneWidget);
    expect(tester.widget<SwitchListTile>(find.byType(SwitchListTile).first).value, isFalse);
  });
}
