// ignore_for_file: prefer_const_literals_to_create_immutables
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/buyer/buyer_routes.dart';
import 'package:piemath_app/features/buyer/data/buyer_models.dart';
import 'package:piemath_app/features/buyer/ui/buyer_home_screen.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import '../student_harness.dart';

final _now = DateTime.utc(2026, 11, 3, 6);

FakeHttp _http({Object? passes, Object? purchases, Object? payments, bool purchasesFail = false}) => FakeHttp()
  ..json('GET', '/me/passes', passes ?? <Object?>[])
  ..on(
    'GET',
    '/store/my-purchases',
    (_) =>
        purchasesFail ? const FakeResponse({'statusCode': 500}, status: 500) : FakeResponse(purchases ?? <Object?>[]),
  )
  ..json('GET', '/payments/my', payments ?? <Object?>[]);

Future<GoRouter> _pump(WidgetTester tester, FakeHttp http, {bool dark = false}) async {
  tester.view.physicalSize = const Size(390, 844) * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    initialLocation: '/app/buyer',
    routes: [
      GoRoute(
        path: '/app/buyer',
        builder: (_, _) => BuyerHomeScreen(now: _now),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(() => FixedSession(signedInAs(UserRole.buyer))),
      ],
      retry: (_, _) => null,
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        routerConfig: router,
      ),
    ),
  );
  await settle(tester);
  return router;
}

void main() {
  test('маршрут: /app/buyer shell-д', () {
    expect(buyerRoutes.shell.whereType<GoRoute>().map((r) => r.path), ['/app/buyer']);
  });

  test('BuyerPass / BuyerPurchase: төлөв серверийн огнооноос', () {
    final active = BuyerPass.fromJson({
      'id': 'u1',
      'expiresAt': '2026-12-01T00:00:00.000Z',
      'pass': {'name': 'Жилийн эрх', 'durationDays': 365},
    });
    expect(active.isActive(_now), isTrue);
    expect(
      BuyerPass.fromJson({
        'id': 'u2',
        'expiresAt': '2026-10-01T00:00:00.000Z',
        'pass': {'name': 'X'},
      }).isActive(_now),
      isFalse,
    );
    expect(
      BuyerPass.fromJson({
        'id': 'u3',
        'pass': {'name': 'X'},
      }).isActive(_now),
      isFalse,
    );
    BuyerPurchase p(Object? granted, Object? exp) => BuyerPurchase.fromJson({
      'id': 'p',
      'title': 'Ном',
      'kind': 'BOOK',
      'price': 50000,
      'grantedAt': granted,
      'expiresAt': exp,
      'createdAt': '2026-10-01T00:00:00.000Z',
    });
    expect(p(null, null).state(_now), PurchaseState.waiting);
    expect(p('2026-10-02T00:00:00.000Z', null).state(_now), PurchaseState.granted);
    expect(p('2026-10-02T00:00:00.000Z', '2026-10-30T00:00:00.000Z').state(_now), PurchaseState.expired);
  });

  testWidgets('эрх, худалдан авалт, төлбөр; зөвхөн унших (худалдах товч байхгүй)', (tester) async {
    final http = _http(
      passes: [
        {
          'id': 'u1',
          'expiresAt': '2026-12-01T00:00:00.000Z',
          'pass': {'name': 'Жилийн эрх', 'durationDays': 365},
        },
        {
          'id': 'u2',
          'expiresAt': '2026-10-01T00:00:00.000Z',
          'pass': {'name': 'Хуучин багц', 'durationDays': 30},
        },
      ],
      purchases: [
        {
          'id': 'p1',
          'productItemId': 'i',
          'kind': 'BOOK',
          'price': 50000,
          'grantedAt': null,
          'expiresAt': null,
          'createdAt': '2026-11-01T00:00:00.000Z',
          'title': 'Алгебр 10',
        },
        {
          'id': 'p2',
          'productItemId': 'j',
          'kind': 'TEST',
          'price': 10000,
          'grantedAt': '2026-10-05T00:00:00.000Z',
          'expiresAt': null,
          'createdAt': '2026-10-04T00:00:00.000Z',
          'title': 'Сорил 1',
        },
      ],
      payments: [
        {
          'id': 'y1',
          'amount': 50000,
          'method': 'QPAY',
          'status': 'CONFIRMED',
          'description': 'Алгебр 10',
          'forMonth': null,
          'paidAt': '2026-11-01T01:00:00.000Z',
          'createdAt': '2026-11-01T00:00:00.000Z',
        },
      ],
    );
    await _pump(tester, http);
    expect(find.text('Миний эрхүүд'), findsOneWidget);
    expect(find.text('Жилийн эрх'), findsOneWidget);
    expect(find.text('Хуучин багц'), findsOneWidget);
    expect(find.textContaining('Хүчинтэй'), findsOneWidget);
    expect(find.textContaining('Дууссан'), findsOneWidget);
    expect(find.text('Алгебр 10'), findsWidgets);
    expect(find.text('Хүлээгдэж байна, эрх олгогдоогүй'), findsOneWidget);
    expect(find.text('Эрх олгогдсон'), findsOneWidget);
    expect(find.textContaining('50,000₮'), findsWidgets);
    // ЗӨВХӨН унших: апп дотор худалдан авах/төлөх үйлдэл байхгүй
    expect(http.requests.every((r) => r.method == 'GET'), isTrue);
    expect(find.textContaining('Худалдаж авах'), findsNothing);
    expect(find.textContaining('QPay-ээр төлөх'), findsNothing);
  });

  testWidgets('хоосон: тайлбартай төлөв, вэбээр нээх холбоос', (tester) async {
    await _pump(tester, _http());
    expect(find.text('Эрх байхгүй'), findsOneWidget);
    expect(find.text('Худалдан авалт байхгүй'), findsOneWidget);
    expect(find.text('Эрх нээх, багц сонгох'), findsOneWidget);
    expect(find.text('Вэбээр нээх'), findsWidgets);
  });

  testWidgets('нэг хэсэг алдаатай бол бусад нь гарна; дахин оролдох', (tester) async {
    final http = _http(
      passes: [
        {
          'id': 'u1',
          'expiresAt': '2026-12-01T00:00:00.000Z',
          'pass': {'name': 'Жилийн эрх'},
        },
      ],
      purchasesFail: true,
    );
    await _pump(tester, http);
    expect(find.text('Жилийн эрх'), findsOneWidget);
    expect(find.text('Дахин оролдох'), findsOneWidget);
  });

  testWidgets('хар горимд ч гарна', (tester) async {
    await _pump(tester, _http(), dark: true);
    expect(find.text('Эрх байхгүй'), findsOneWidget);
  });
}
