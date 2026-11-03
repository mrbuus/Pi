import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/app/app.dart';
import 'package:piemath_app/app/router.dart';
import 'package:piemath_app/app/shell/app_nav_bar.dart';
import 'package:piemath_app/app/shell/more_screen.dart';
import 'package:piemath_app/app/shell/pending_screen.dart';
import 'package:piemath_app/app/shell/section_screen.dart';
import 'package:piemath_app/app/theme_mode.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/auth/ui/login_screen.dart';
import 'package:piemath_app/features/notifications/ui/notifications_screen.dart';
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
    await pumpApp(
      tester,
      auth: const StoredAuth(token: 't', userId: 'u1', role: UserRole.student),
      http: http,
    );
    expect(find.byType(AppNavBar), findsOneWidget);
    for (final label in ['Нүүр', 'Даалгавар', 'Хичээл', 'Суралцах', 'Бусад']) {
      expect(find.text(label), findsWidgets, reason: label);
    }
    // Сурагчийн нүүр (M3) — хоосон цагаан биш (mock-д самбарын endpoint байхгүй тул алдааны төлөв).
    expect(find.text('Миний самбар'), findsOneWidget);
    expect(find.byType(PendingScreen), findsNothing);

    await tester.tap(find.text('Бусад'));
    await tester.pumpAndSettle();
    expect(find.byType(MoreScreen), findsOneWidget);
    expect(find.text('С. Тест'), findsOneWidget);
    expect(find.text('Төлбөр'), findsOneWidget);
  });

  testWidgets('«Бусад» табад уншаагүй мэдэгдлийн тоо', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/auth/me', fakeMe())
      ..json('GET', '/notifications/my/unread-count', {'count': 3});
    await pumpApp(
      tester,
      auth: const StoredAuth(token: 't', userId: 'u1', role: UserRole.student),
      http: http,
    );
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
    expect(find.byType(AppNavBar), findsNothing);
  });

  testWidgets('гарах: баталгаажуулаад нэвтрэх рүү', (tester) async {
    final http = FakeHttp()..json('GET', '/auth/me', fakeMe());
    final c = await pumpApp(
      tester,
      auth: const StoredAuth(token: 't', userId: 'u1', role: UserRole.student),
      http: http,
    );
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
    final c = await pumpApp(
      tester,
      auth: const StoredAuth(token: 't', userId: 'u1', role: UserRole.student),
      http: http,
    );
    expect(c.read(sessionProvider), isA<SignedOut>());
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('өнгөний горим сонголт хадгалагдана', (tester) async {
    final http = FakeHttp()..json('GET', '/auth/me', fakeMe());
    final c = await pumpApp(
      tester,
      auth: const StoredAuth(token: 't', userId: 'u1', role: UserRole.student),
      http: http,
    );
    await tester.tap(find.text('Бусад'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Хар'), 200);
    await tester.tap(find.text('Хар'));
    await tester.pumpAndSettle();
    expect(c.read(themeModeProvider), ThemeMode.dark);
    expect(c.read(sharedPreferencesProvider).getString('theme_mode'), 'dark');
  });

  group('табын навигаци', () {
    GoRouter router(ProviderContainer c) => c.read(routerProvider);
    String location(ProviderContainer c) => router(c).routerDelegate.currentConfiguration.uri.toString();
    Finder navItem(String label) => find.descendant(of: find.byType(AppNavBar), matching: find.text(label));
    int navIndex(WidgetTester t) => t.widget<AppNavBar>(find.byType(AppNavBar)).currentIndex;
    ScrollPosition moreScroll(WidgetTester t) => t
        .state<ScrollableState>(find.descendant(of: find.byType(MoreScreen), matching: find.byType(Scrollable)))
        .position;
    int subTab(WidgetTester t) =>
        t.widget<TabBar>(find.descendant(of: find.byType(SubTabBar), matching: find.byType(TabBar))).controller!.index;

    Future<(ProviderContainer, FakeHttp)> pumpRole(WidgetTester tester, UserRole role) async {
      final http = FakeHttp()..json('GET', '/auth/me', fakeMe(role: role.apiValue));
      final c = await pumpApp(
        tester,
        auth: StoredAuth(token: 't', userId: 'u1', role: role),
        http: http,
      );
      return (c, http);
    }

    testWidgets('таб солиход хуудас, гүйлгэлт хадгалагдана, дахин ачаалахгүй', (tester) async {
      final (c, http) = await pumpRole(tester, UserRole.student);
      final homeRequests = http.requests.length;
      await tester.tap(navItem('Бусад'));
      await tester.pumpAndSettle();
      await tester.drag(find.byType(MoreScreen), const Offset(0, -300));
      await tester.pumpAndSettle();
      final more = tester.state(find.byType(Scrollable).first);
      final offset = moreScroll(tester).pixels;
      expect(offset, greaterThan(0));

      await tester.tap(navItem('Нүүр'));
      await tester.pumpAndSettle();
      expect(location(c), '/app/student');
      expect(find.byType(MoreScreen), findsNothing); // offstage
      final afterHome = http.requests.length;
      await tester.tap(navItem('Бусад'));
      await tester.pumpAndSettle();
      expect(moreScroll(tester).pixels, offset);
      expect(tester.state(find.byType(Scrollable).first), same(more));
      await tester.tap(navItem('Нүүр'));
      await tester.pumpAndSettle();
      // Нүүр дахин build/ачаалал хийгээгүй (эхний ачааллаас хойш шинэ хүсэлт алга).
      expect(http.requests.length, afterHome);
      expect(afterHome, homeRequests);
    });

    testWidgets('идэвхтэй табыг дахин товшвол дээш гүйлгэнэ', (tester) async {
      await pumpRole(tester, UserRole.student);
      await tester.tap(navItem('Бусад'));
      await tester.pumpAndSettle();
      await tester.drag(find.byType(MoreScreen), const Offset(0, -300));
      await tester.pumpAndSettle();
      expect(moreScroll(tester).pixels, greaterThan(0));
      await tester.tap(navItem('Бусад'));
      await tester.pumpAndSettle();
      expect(moreScroll(tester).pixels, 0);
    });

    testWidgets('идэвхтэй табыг дахин товшвол табын эхэнд буцна', (tester) async {
      final (c, _) = await pumpRole(tester, UserRole.student);
      await tester.tap(navItem('Бусад'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Мэдэгдэл'), 200);
      await tester.drag(find.byType(MoreScreen), const Offset(0, -200));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Мэдэгдэл'));
      await tester.pumpAndSettle();
      expect(find.byType(NotificationsScreen), findsOneWidget);
      expect(navIndex(tester), 4);
      await tester.tap(navItem('Бусад'));
      await tester.pumpAndSettle();
      expect(find.byType(NotificationsScreen), findsNothing);
      expect(find.byType(MoreScreen), findsOneWidget);
      expect(location(c), '/app/more');
    });

    testWidgets('өөр табын хуудсыг push хийвэл одоогийн табдаа нээгдэнэ', (tester) async {
      final (c, _) = await pumpRole(tester, UserRole.student);
      unawaited(router(c).push<void>('/app/tests/t1/result'));
      await tester.pumpAndSettle();
      expect(navIndex(tester), 0);
      expect(location(c), '/app/student');
      // Буцахад нүүр (өмнөх дэлгэц) хэвээр.
      router(c).pop();
      await tester.pumpAndSettle();
      expect(navIndex(tester), 0);
      expect(find.text('Миний самбар'), findsOneWidget);
    });

    testWidgets('Андройдын «буцах» табын эхэнд — нүүр таб руу', (tester) async {
      final (c, _) = await pumpRole(tester, UserRole.student);
      await tester.tap(navItem('Суралцах'));
      await tester.pumpAndSettle();
      expect(navIndex(tester), 3);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(navIndex(tester), 0);
      expect(location(c), '/app/student');
    });

    testWidgets('дэд таб: товшиход зам солигдоно, буцаж ирэхэд сүүлийнх нь санагдана', (tester) async {
      final (c, _) = await pumpRole(tester, UserRole.teacher);
      await tester.tap(navItem('Хуваарь'));
      await tester.pumpAndSettle();
      expect(find.byType(SectionScreen), findsOneWidget);
      expect(subTab(tester), 0);
      final section = tester.state(find.byType(SectionScreen));

      await tester.tap(find.descendant(of: find.byType(SubTabBar), matching: find.text('Ангиуд')));
      await tester.pumpAndSettle();
      expect(location(c), '/app/classes');
      expect(subTab(tester), 2);
      // Дэд таб солиход хуудас шинээр үүсээгүй.
      expect(tester.state(find.byType(SectionScreen)), same(section));

      await tester.tap(navItem('Нүүр'));
      await tester.pumpAndSettle();
      await tester.tap(navItem('Хуваарь'));
      await tester.pumpAndSettle();
      expect(location(c), '/app/classes');
      expect(subTab(tester), 2);
    });

    testWidgets('дэд таб: хуруугаар гулгуулж шилжинэ', (tester) async {
      final (c, _) = await pumpRole(tester, UserRole.teacher);
      await tester.tap(navItem('Хуваарь'));
      await tester.pumpAndSettle();
      await tester.fling(find.byType(TabBarView), const Offset(-300, 0), 1000);
      await tester.pumpAndSettle();
      expect(location(c), '/app/planner');
      expect(subTab(tester), 1);
    });

    // Role бүрийн дэд таб: deep link (go) нь зөв доод таб + зөв дэд таб нээнэ.
    const deepLinks = <UserRole, List<(String, int, int)>>{
      UserRole.student: [('/app/tests', 1, 1), ('/app/homework', 1, 0), ('/app/study', 3, 0), ('/app/theory', 3, 1), ('/app/library', 3, 2)],
      UserRole.teacher: [('/app/admin/students', 1, 3), ('/app/videos', 2, 1), ('/app/tools', 2, 3)],
      UserRole.teacherPlus: [('/app/admin/reconcile', 2, 1), ('/app/admin/leads', 3, 1), ('/app/sms', 3, 5)],
      UserRole.admin: [
        ('/app/admin/finance', 0, 3),
        ('/app/sms', 1, 1),
        ('/app/admin/placement', 2, 2),
        ('/app/teacher-hours', 3, 3),
      ],
      UserRole.buyer: [('/app/study/history', 1, 3), ('/app/tests', 1, 1)],
      UserRole.groupTeacher: [('/app/tools', 1, 1)],
    };
    for (final MapEntry(key: role, value: links) in deepLinks.entries) {
      testWidgets('дэд табын deep link: ${role.name}', (tester) async {
        final (c, _) = await pumpRole(tester, role);
        for (final (path, tab, sub) in links) {
          router(c).go(path);
          await tester.pumpAndSettle();
          expect(location(c), path);
          expect(navIndex(tester), tab, reason: path);
          expect(find.byType(SectionScreen), findsOneWidget, reason: path);
          expect(subTab(tester), sub, reason: path);
        }
      });
    }

    testWidgets('дэд табгүй хэсэг, «Бусад»-ын хуудас зөв табад', (tester) async {
      final (c, _) = await pumpRole(tester, UserRole.parent);
      router(c).go('/app/schedule');
      await tester.pumpAndSettle();
      expect(navIndex(tester), 1);
      expect(find.byType(SubTabBar), findsNothing);
      router(c).go('/app/notifications');
      await tester.pumpAndSettle();
      expect(navIndex(tester), 2);
    });
  });
}
