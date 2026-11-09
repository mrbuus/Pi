import 'dart:async';
import 'dart:ui' show AccessibilityFeatures;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/app/app.dart';
import 'package:piemath_app/app/router.dart';
import 'package:piemath_app/app/shell/app_shell.dart';
import 'package:piemath_app/app/shell/more_screen.dart';
import 'package:piemath_app/app/shell/section_screen.dart';
import 'package:piemath_app/app/theme_mode.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/exam/ui/exam_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../features/exam/exam_test_app.dart';
import '../features/schedule/staff_fixtures.dart';
import '../helpers/fake_http.dart';
import '../helpers/test_container.dart';

/// iPhone-ийн зүүн ирмэгээс баруун тийш шудрах «буцах» (эзэн: «Apple-ийн апп, Messenger шиг»).
final _ios = TargetPlatformVariant.only(TargetPlatform.iOS);

Future<ProviderContainer> _pumpTeacher(WidgetTester tester) async {
  tester.view.physicalSize = const Size(390, 844) * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final http = staffHttp()..json('GET', '/auth/me', fakeMe(role: 'TEACHER'));
  final container = ProviderContainer(
    overrides: [
      ...testOverrides(
        http: http,
        store: MemoryTokenStore(const StoredAuth(token: 't', userId: 'u1', role: UserRole.teacher)),
      ),
      sharedPreferencesProvider.overrideWithValue(prefs),
    ],
    retry: (_, _) => null,
  );
  addTearDown(container.dispose);
  await tester.pumpWidget(UncontrolledProviderScope(container: container, child: const PiemathApp()));
  await tester.runAsync(() => container.read(sessionProvider.notifier).restore());
  await tester.pumpAndSettle();
  return container;
}

GoRouter _router(ProviderContainer c) => c.read(routerProvider);

String _location(ProviderContainer c) => _router(c).routerDelegate.currentConfiguration.last.matchedLocation;

Future<void> _frames(WidgetTester tester, [int n = 20]) async {
  for (var i = 0; i < n; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

/// Зүүн ирмэгээс (x=5) баруун тийш [dx] шудрана.
Future<void> _edgeSwipe(WidgetTester tester, {double dx = 300, double y = 420}) async {
  await tester.dragFrom(Offset(5, y), Offset(dx, 0));
  await _frames(tester);
}

void main() {
  testWidgets('дэлгэрэнгүй хуудас: хуруу дагаж гулсана, дундуур нь буцаавал цуцлагдана, бүтэн шудралтаар буцна', (
    tester,
  ) async {
    final c = await _pumpTeacher(tester);
    _router(c).go('/app/more');
    await _frames(tester);
    unawaited(_router(c).push('/app/profile'));
    await _frames(tester);
    expect(_location(c), '/app/profile');
    final page = ModalRoute.of(tester.element(find.text('Миний мэдээлэл').last))!;

    // Хуруу дагана: 156pt (өргөний 40%) шудрахад хуудас 40% гарсан.
    final g = await tester.startGesture(const Offset(5, 420));
    for (var i = 0; i < 6; i++) {
      await g.moveBy(const Offset(26, 0));
      await tester.pump(const Duration(milliseconds: 16));
    }
    expect(page.animation!.value, closeTo(1 - 156 / 390, 0.08));
    // Доорх «Бусад» харагдаж эхэлсэн.
    expect(find.byType(MoreScreen), findsOneWidget);
    // Буцааж татаад аажуухан тавина — цуцлагдана.
    for (var i = 0; i < 6; i++) {
      await g.moveBy(const Offset(-24, 0));
      await tester.pump(const Duration(milliseconds: 100));
    }
    await g.up();
    await _frames(tester);
    expect(_location(c), '/app/profile');
    expect(page.animation!.value, 1);

    await _edgeSwipe(tester);
    expect(_location(c), '/app/more');
  }, variant: _ios);

  testWidgets('хурдан шудрах (fling) богино зайд ч буцна', (tester) async {
    final c = await _pumpTeacher(tester);
    _router(c).go('/app/more');
    await _frames(tester);
    unawaited(_router(c).push('/app/profile'));
    await _frames(tester);
    await tester.flingFrom(const Offset(5, 420), const Offset(90, 0), 800);
    await _frames(tester);
    expect(_location(c), '/app/more');
  }, variant: _ios);

  testWidgets('дэд табтай хэсгийн хуудас: ирмэгийн зурвас TabBarView-д булаагдахгүй, өмнөх хуудас руу буцна', (
    tester,
  ) async {
    final c = await _pumpTeacher(tester);
    expect(_location(c), '/app/teacher');
    // Нүүрнээс төлөвлөгч (Хуваарь хэсгийн 2-р дэд таб) нээгдсэн — буцах газартай.
    unawaited(_router(c).push('/app/planner'));
    await _frames(tester);
    expect(find.byType(SectionScreen), findsOneWidget);
    await _edgeSwipe(tester);
    // Дэд таб солигдоогүй (TabBarView шудралт биш) — нүүр рүү буцсан.
    expect(_location(c), '/app/teacher');
    expect(find.byType(SectionScreen), findsNothing);
  }, variant: _ios);

  testWidgets('хэсгийн эхлэл (буцах газаргүй): ирмэгээс шудрахад дэд таб хэвийн солигдоно', (tester) async {
    final c = await _pumpTeacher(tester);
    _router(c).go('/app/planner');
    await _frames(tester);
    await _edgeSwipe(tester);
    expect(_location(c), '/app/schedule');
    expect(find.byType(SectionScreen), findsOneWidget);
  }, variant: _ios);

  testWidgets('deep link (go) + AppBackButton: шудралт яг буцах товчтой ижил газар очно', (tester) async {
    final c = await _pumpTeacher(tester);
    _router(c).go('/app/notifications/abc');
    await _frames(tester);
    expect(_router(c).canPop(), isFalse);
    expect(find.byType(AppBackButton), findsOneWidget);

    // Богино, удаан шудралт — цуцлагдана.
    final g = await tester.startGesture(const Offset(5, 420));
    for (var i = 0; i < 4; i++) {
      await g.moveBy(const Offset(20, 0));
      await tester.pump(const Duration(milliseconds: 100));
    }
    await g.up();
    await _frames(tester);
    expect(_location(c), '/app/notifications/abc');

    await _edgeSwipe(tester);
    // Товч: өмнөх хуудасгүй → нүүр (RULES §5).
    expect(_location(c), '/app/teacher');
  }, variant: _ios);

  testWidgets('бүтэн дэлгэцийн цонх (fullscreenDialog) ч шудралтаар хаагдана', (tester) async {
    final c = await _pumpTeacher(tester);
    final nav = rootNavigatorKey.currentState!;
    unawaited(
      nav.push(
        MaterialPageRoute<void>(
          fullscreenDialog: true,
          builder: (_) => Scaffold(appBar: AppBar(title: const Text('Зураг')), body: const SizedBox.expand()),
        ),
      ),
    );
    await _frames(tester);
    expect(find.text('Зураг'), findsOneWidget);
    await _edgeSwipe(tester);
    expect(find.text('Зураг'), findsNothing);
    expect(_location(c), '/app/teacher');
  }, variant: _ios);

  testWidgets('хөдөлгөөн багасгах горимд ч зангаа ажиллана', (tester) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue = const _ReduceMotion();
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    final c = await _pumpTeacher(tester);
    _router(c).go('/app/more');
    await _frames(tester);
    unawaited(_router(c).push('/app/profile'));
    await _frames(tester);
    final page = ModalRoute.of(tester.element(find.text('Миний мэдээлэл').last))!;
    final g = await tester.startGesture(const Offset(5, 420));
    await g.moveBy(const Offset(40, 0));
    await g.moveBy(const Offset(117, 0));
    await tester.pump(const Duration(milliseconds: 16));
    // Хуруу дагана (бүдгэрэх биш гулсах); эхний ~18pt нь зангаа таних зай.
    expect(page.animation!.value, inInclusiveRange(0.55, 0.8));
    await g.moveBy(const Offset(120, 0));
    await g.up();
    await _frames(tester);
    expect(_location(c), '/app/more');
  }, variant: _ios);

  testWidgets('Android: ирмэгийн зангаа нэмэгдэхгүй (системийн буцах, predictive back)', (tester) async {
    final c = await _pumpTeacher(tester);
    _router(c).go('/app/more');
    await _frames(tester);
    unawaited(_router(c).push('/app/profile'));
    await _frames(tester);
    expect(find.byType(EdgeBackGesture), findsNothing);
    await _edgeSwipe(tester);
    expect(_location(c), '/app/profile');
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('шалгалт: шудрахад чимээгүй гарахгүй — илгээх эсэхийг асууна', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/tests/t1', fakeMeta())
      ..json('POST', '/tests/t1/start', fakeStart())
      ..json('PATCH', '/tests/t1/session', {'status': 'IN_PROGRESS', 'leaveCount': 0, 'remainingSec': 2300});
    final app = ExamTestApp(http);
    await app.pump(tester, location: '/app/student');
    unawaited(app.container.read(routerProvider).push('/app/tests/t1'));
    await ExamTestApp.settle(tester);
    await tester.tap(find.text('Шалгалт эхлүүлэх'));
    await ExamTestApp.settle(tester);
    await tester.tap(find.text('Эхлэх'));
    await ExamTestApp.settle(tester);
    expect(find.text('1-р бодлого'), findsOneWidget);

    await tester.dragFrom(const Offset(5, 420), const Offset(300, 0));
    await ExamTestApp.settle(tester);
    expect(find.text('Илгээхээсээ өмнө шалгах'), findsOneWidget);
    expect(find.byType(ExamScreen), findsOneWidget);
    expect(http.count('POST', '/tests/t1/submit'), 0);
    await app.close(tester);
  }, variant: _ios);
}

class _ReduceMotion implements AccessibilityFeatures {
  const _ReduceMotion();

  @override
  bool get reduceMotion => true;

  @override
  dynamic noSuchMethod(Invocation invocation) => false;
}
