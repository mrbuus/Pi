import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/app/app.dart';
import 'package:piemath_app/app/shell/more_screen.dart';
import 'package:piemath_app/app/shell/pending_screen.dart';
import 'package:piemath_app/app/theme_mode.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/auth/ui/login_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fake_http.dart';
import '../helpers/test_container.dart';

Future<ProviderContainer> pumpApp(
  WidgetTester tester, {
  StoredAuth? auth,
  FakeHttp? http,
  Size size = const Size(390, 844),
}) async {
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final h = http ?? FakeHttp();
  final container = ProviderContainer(
    overrides: [
      ...testOverrides(http: h, store: MemoryTokenStore(auth)),
      sharedPreferencesProvider.overrideWithValue(prefs),
    ],
    retry: (_, _) => null,
  );
  addTearDown(container.dispose);
  await tester.pumpWidget(UncontrolledProviderScope(container: container, child: const PiemathApp()));
  // Dio-гийн хариуны stream бодит async-д дуусна (FakeAsync дотор гацна).
  await tester.runAsync(() => container.read(sessionProvider.notifier).restore());
  await tester.pumpAndSettle();
  return container;
}

void main() {
  testWidgets('нэвтрээгүй бол нэвтрэх дэлгэц', (tester) async {
    await pumpApp(tester);
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('сурагч: доод таб, «Бусад» руу шилжинэ', (tester) async {
    final http = FakeHttp()..json('GET', '/auth/me', fakeMe());
    await pumpApp(tester, auth: const StoredAuth(token: 't', userId: 'u1', role: UserRole.student), http: http);
    expect(find.byType(NavigationBar), findsOneWidget);
    for (final label in ['Нүүр', 'Даалгавар', 'Хичээл', 'Онол', 'Бусад']) {
      expect(find.text(label), findsWidgets, reason: label);
    }
    // Сурагчийн нүүр (M3) — хоосон цагаан биш (mock-д самбарын endpoint байхгүй тул алдааны төлөв).
    expect(find.text('Миний самбар'), findsOneWidget);
    expect(find.byType(PendingScreen), findsNothing);

    await tester.tap(find.text('Бусад'));
    await tester.pumpAndSettle();
    expect(find.byType(MoreScreen), findsOneWidget);
    expect(find.text('С. Тест'), findsOneWidget);
    expect(find.text('Шалгалт'), findsOneWidget);
  });

  testWidgets('«Бусад» табад уншаагүй мэдэгдлийн тоо', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/auth/me', fakeMe())
      ..json('GET', '/notifications/my/unread-count', {'count': 3});
    await pumpApp(tester, auth: const StoredAuth(token: 't', userId: 'u1', role: UserRole.student), http: http);
    await tester.pumpAndSettle();
    expect(find.descendant(of: find.byType(Badge), matching: find.text('3')), findsOneWidget);
  });

  testWidgets('таблет (768dp+) дээр зүүн rail', (tester) async {
    final http = FakeHttp()..json('GET', '/auth/me', fakeMe(role: 'PARENT'));
    await pumpApp(
      tester,
      auth: const StoredAuth(token: 't', userId: 'u1', role: UserRole.parent),
      http: http,
      size: const Size(1024, 768),
    );
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
  });

  testWidgets('гарах: баталгаажуулаад нэвтрэх рүү', (tester) async {
    final http = FakeHttp()..json('GET', '/auth/me', fakeMe());
    final c = await pumpApp(tester, auth: const StoredAuth(token: 't', userId: 'u1', role: UserRole.student), http: http);
    await tester.tap(find.text('Бусад'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Гарах'), 200);
    await tester.tap(find.text('Гарах'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Гарах'));
    await tester.pumpAndSettle();
    expect(c.read(sessionProvider), isA<SignedOut>());
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('сесс дуусвал (401) шалтгаантай нэвтрэх рүү', (tester) async {
    final http = FakeHttp()..error('GET', '/auth/me', 401, 'Нууц үг өөрчлөгдсөн тул дахин нэвтэрнэ үү');
    final c = await pumpApp(tester, auth: const StoredAuth(token: 't', userId: 'u1', role: UserRole.student), http: http);
    expect(c.read(sessionProvider), isA<SignedOut>());
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('өнгөний горим сонголт хадгалагдана', (tester) async {
    final http = FakeHttp()..json('GET', '/auth/me', fakeMe());
    final c = await pumpApp(tester, auth: const StoredAuth(token: 't', userId: 'u1', role: UserRole.student), http: http);
    await tester.tap(find.text('Бусад'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Хар'), 200);
    await tester.tap(find.text('Хар'));
    await tester.pumpAndSettle();
    expect(c.read(themeModeProvider), ThemeMode.dark);
    expect(c.read(sharedPreferencesProvider).getString('theme_mode'), 'dark');
  });
}
