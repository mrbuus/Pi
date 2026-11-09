import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/store_admin/ui/store_admin_screen.dart';

import '../../helpers/fake_http.dart';
import 'staff_harness.dart';

FakeHttp _http() => FakeHttp()
  ..json('GET', '/store/admin/products', [
    {'id': 'pr1', 'kind': 'TEST', 'refId': 'x1', 'price': 15000, 'active': true, 'title': 'ЭЕШ сорил 1', 'purchaseCount': 3},
    {'id': 'pr2', 'kind': 'BOOK', 'refId': 'b1', 'price': 30000, 'active': false, 'title': 'Алгебр', 'purchaseCount': 1},
  ])
  ..json('GET', '/store/admin/purchases', [
    {
      'id': 'pu1',
      'userName': 'Сараа Бат',
      'userPhone': '99001122',
      'productKind': 'TEST',
      'productTitle': 'ЭЕШ сорил 1',
      'price': 15000,
      'createdAt': '2026-11-09T02:00:00.000Z',
      'paymentStatus': 'PENDING',
    },
  ])
  ..json('GET', '/store/admin/revenue', {
    'totalPurchases': 4,
    'totalRevenue': 75000,
    'confirmedRevenue': 60000,
    'pendingRevenue': 15000,
  });

void main() {
  testWidgets('Админ: бүтээгдэхүүн, худалдан авалт, орлого; идэвхгүй болгох', (tester) async {
    final http = _http()..json('POST', '/store/admin/products/pr1/deactivate', {'ok': true});
    await pumpStaff(tester, const StoreAdminScreen(), http: http);
    expect(find.text('ЭЕШ сорил 1'), findsOneWidget);
    expect(find.text('Идэвхгүй'), findsWidgets);
    expect(find.text('Орлого'), findsOneWidget);

    await tester.tap(find.text('ЭЕШ сорил 1'));
    await settle(tester);
    expect(find.text('Үнэ солих'), findsOneWidget);
    await tester.tap(find.text('Идэвхгүй болгох'));
    await settle(tester);
    await tester.tap(find.widgetWithText(FilledButton, 'Идэвхгүй болгох'));
    await settle(tester);
    expect(http.count('POST', '/store/admin/products/pr1/deactivate'), 1);

    await tester.tap(find.text('Худалдан авалт'));
    await settle(tester, frames: 20);
    expect(find.text('Сараа Бат'), findsOneWidget);
    expect(find.text('Хүлээгдэж буй'), findsOneWidget);

    await tester.tap(find.text('Орлого'));
    await settle(tester, frames: 20);
    expect(find.text('75,000₮'), findsOneWidget);
  });

  testWidgets('Багш+: орлогын нийт харагдахгүй, үнэ солих эрхгүй', (tester) async {
    final http = _http();
    await pumpStaff(tester, const StoreAdminScreen(), http: http, role: 'TEACHER_PLUS');
    expect(find.text('Орлого'), findsNothing);
    await tester.tap(find.text('ЭЕШ сорил 1'));
    await settle(tester);
    expect(find.text('Үнэ солих'), findsNothing);
    expect(find.text('Идэвхгүй болгох'), findsOneWidget);
    expect(http.count('GET', '/store/admin/revenue'), 0);
  });

  testWidgets('Багш эрхгүй', (tester) async {
    await pumpStaff(tester, const StoreAdminScreen(), http: FakeHttp(), role: 'TEACHER');
    expect(find.text('Энэ хэсгийг харах эрх танд алга.'), findsOneWidget);
  });
}
