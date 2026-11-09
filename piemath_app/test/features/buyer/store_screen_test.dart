import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/buyer/ui/store_screen.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import '../student_harness.dart';

final _now = DateTime.utc(2026, 11, 10, 6);

final _products = [
  {'id': 'pi1', 'kind': 'TEST', 'refId': 't1', 'price': 15000, 'active': true, 'title': 'ЭЕШ жишиг тест 1'},
  {'id': 'pi2', 'kind': 'BOOK', 'refId': 'b1', 'price': 45000, 'active': true, 'title': 'Алгебр', 'includesVideo': true},
  {'id': 'pi3', 'kind': 'PASS', 'refId': 'p1', 'price': 90000, 'active': true},
];

final _purchases = [
  {
    'id': 'u1',
    'productItemId': 'pi2',
    'kind': 'BOOK',
    'price': 45000,
    'title': 'Алгебр',
    'grantedAt': '2026-11-01T00:00:00.000Z',
    'expiresAt': null,
    'createdAt': '2026-11-01T00:00:00.000Z',
  },
];

Future<void> _pump(WidgetTester tester, FakeHttp http) async {
  tester.view.physicalSize = const Size(390, 844) * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(() => FixedSession(signedInAs(UserRole.student))),
      ],
      retry: (_, _) => null,
      child: MaterialApp(theme: AppTheme.light(), home: StoreScreen(now: _now)),
    ),
  );
  await settle(tester);
}

void main() {
  testWidgets('бүлгээр каталог, эрхийн төлөв; үнэ, худалдах товч, вэб холбоос БАЙХГҮЙ', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/store/products', _products)
      ..json('GET', '/store/my-purchases', _purchases);
    await _pump(tester, http);
    expect(find.text('Нэг удаагийн шалгалт'), findsOneWidget);
    expect(find.text('Номын дэлгүүр'), findsOneWidget);
    expect(find.text('Сургалтын багц'), findsNWidgets(2), reason: 'гарчиг ба нэргүй багцын нэр');
    expect(find.text('ЭЕШ жишиг тест 1'), findsOneWidget);
    expect(find.text('Видео тайлбартай'), findsOneWidget);
    expect(find.text('Эрх олгогдсон'), findsOneWidget);
    expect(find.textContaining('₮'), findsNothing);
    expect(find.textContaining('Худалдаж авах'), findsNothing);
    expect(find.textContaining('Вэбээр'), findsNothing);
    expect(find.byType(FilledButton), findsNothing);
  });

  testWidgets('«Миний авсан» таб', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/store/products', _products)
      ..json('GET', '/store/my-purchases', _purchases);
    await _pump(tester, http);
    await tester.tap(find.text('Миний авсан'));
    await settle(tester);
    expect(find.text('Алгебр'), findsWidgets);
    expect(find.text('Эрх олгогдсон'), findsWidgets);
  });

  testWidgets('хоосон каталог ба алдаа: дахин оролдох', (tester) async {
    final http = FakeHttp()
      ..on('GET', '/store/products', (_) => const FakeResponse({'message': 'x'}, status: 500))
      ..on('GET', '/store/products', (_) => const FakeResponse(<Object?>[]))
      ..json('GET', '/store/my-purchases', <Object?>[]);
    await _pump(tester, http);
    expect(find.byType(ErrorState), findsOneWidget);
    await tester.tap(find.text(AppStrings.retry));
    await settle(tester);
    expect(find.text('Бүтээгдэхүүн олдсонгүй'), findsOneWidget);
  });
}
