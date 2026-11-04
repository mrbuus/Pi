import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/exam/ui/tests_list_screen.dart';
import 'package:piemath_app/features/test_authoring/data/authoring_storage.dart';
import 'package:piemath_app/features/test_authoring/test_authoring_routes.dart';
import 'package:piemath_app/features/test_authoring/ui/edit_test_screen.dart';
import 'package:piemath_app/features/test_authoring/ui/new_test_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';
import 'authoring_fixtures.dart';

const _denied = 'Энэ хэсэг танд нээгдээгүй';

FakeHttp _editHttp({String mode = 'FULL', Map<String, Object?>? test}) => FakeHttp()
  ..json('GET', '/tests/tst1', test ?? testJson())
  ..json('GET', '/tests/tst1/edit-info', {'mode': mode});

FakeHttp _newHttp() => FakeHttp()
  ..json('GET', '/classrooms', classroomsJson)
  ..json('GET', '/chapters', chaptersJson)
  ..json('GET', '/chapters/ch1/problems', chapterProblemsJson());

/// Үндсэн жагсаалтыг [f] харагдтал доош гүйлгэнэ.
Future<void> _scroll(WidgetTester tester, Finder f) async {
  await tester.scrollUntilVisible(f, 300, scrollable: find.byType(Scrollable).first);
  await settle(tester);
}

void main() {
  group('эрх', () {
    for (final role in ['STUDENT', 'PARENT', 'BUYER', 'GROUP_TEACHER']) {
      testWidgets('$role: үүсгэх, засах хаалттай, ямар ч хүсэлтгүй', (tester) async {
        for (final screen in const [NewTestScreen(), EditTestScreen(testId: 'tst1')]) {
          final h = FakeHttp();
          await pumpAuthoring(tester, screen, http: h, role: role);
          expect(find.text(_denied), findsOneWidget, reason: '$role ${screen.runtimeType}');
          expect(h.requests, isEmpty);
        }
      });
    }

    testWidgets('маршрут: /app/tests/new, /app/tests/:id/edit бүтэн дэлгэц', (tester) async {
      final paths = [for (final r in testAuthoringRoutes.fullscreen) (r as GoRoute).path];
      expect(paths, ['/app/tests/new', '/app/tests/:id/edit']);
      expect(testAuthoringRoutes.shell, isEmpty);
    });

    testWidgets('Багш: байгаа бодлогыг нээхэд зөвхөн харна, төлбөрийн талбаргүй', (tester) async {
      await pumpAuthoring(
        tester,
        const EditTestScreen(testId: 'tst1'),
        http: _editHttp(),
        role: 'TEACHER',
      );
      await tester.tap(find.text('1').first);
      await settle(tester, frames: 20);
      expect(find.text('Бодлогын агуулгыг Багш+ эсвэл админ засна'), findsOneWidget);
      await tester.tap(find.text('Болсон'));
      await settle(tester, frames: 20);
      expect(find.text('Хадгалсан'), findsOneWidget, reason: 'зөвхөн харсан — өөрчлөлтгүй');
    });

    testWidgets('Багшид бусдын тест (403): серверийн мессеж, «Дахин оролдох»-гүй', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/tests/tst1', testJson())
        ..error('GET', '/tests/tst1/edit-info', 403, 'Та зөвхөн өөрийн үүсгэсэн тестийг засах боломжтой');
      await pumpAuthoring(
        tester,
        const EditTestScreen(testId: 'tst1'),
        http: h,
        role: 'TEACHER',
      );
      expect(find.text('Та зөвхөн өөрийн үүсгэсэн тестийг засах боломжтой'), findsOneWidget);
      expect(find.text(AppStrings.retry), findsNothing);
    });
  });

  group('тест засах', () {
    testWidgets('карт, бариулаар чирж эрэмбэлэх → «Хадгалах (1)»', (tester) async {
      await pumpAuthoring(tester, const EditTestScreen(testId: 'tst1'), http: _editHttp());
      expect(find.text('Илтгэгч тэгшитгэл 1'), findsOneWidget);
      expect(find.text('Хадгалсан'), findsOneWidget);
      expect(find.byIcon(AppIcons.menu), findsNWidgets(2));
      final first = tester.getCenter(find.byIcon(AppIcons.menu).first);
      final second = tester.getCenter(find.byIcon(AppIcons.menu).last);
      final gesture = await tester.startGesture(first);
      await tester.pump(const Duration(milliseconds: 50));
      for (var i = 0; i < 10; i++) {
        await gesture.moveBy(Offset(0, (second.dy - first.dy + 120) / 10));
        await tester.pump(const Duration(milliseconds: 16));
      }
      await gesture.up();
      await settle(tester, frames: 30);
      expect(find.text('Хадгалах (1)'), findsOneWidget);
      // Шинэ дараалал: нөхөх бодлого эхэнд
      final chipsY = tester.getCenter(find.text('Нөхөх').first).dy;
      expect(chipsY, lessThan(tester.getCenter(find.text('Сонгох').first).dy));
    });

    testWidgets('чирэхгүйгээр «Доош зөөх», «Буцаах»', (tester) async {
      await pumpAuthoring(tester, const EditTestScreen(testId: 'tst1'), http: _editHttp());
      await tester.tap(find.byTooltip('Үйлдэл').first);
      await settle(tester);
      await tester.tap(find.text('Доош зөөх'));
      await settle(tester);
      expect(find.text('Хадгалах (1)'), findsOneWidget);
      await tester.tap(find.byTooltip('Буцаах'));
      await settle(tester);
      expect(find.text('Хадгалсан'), findsOneWidget);
    });

    testWidgets('сурагч өгсөн (LIMITED): бариул, нэмэх товчгүй, анхааруулгатай', (tester) async {
      await pumpAuthoring(
        tester,
        const EditTestScreen(testId: 'tst1'),
        http: _editHttp(mode: 'LIMITED'),
      );
      expect(find.byIcon(AppIcons.menu), findsNothing);
      expect(find.byKey(const Key('add-choice')), findsNothing);
      expect(find.textContaining('Сурагч өгсөн тест'), findsOneWidget);
    });

    testWidgets('шинэ сонгох бодлого нэмээд засварлагч нээгдэнэ; хадгалаагүй бол буцахад асууна', (tester) async {
      await pumpAuthoring(tester, const EditTestScreen(testId: 'tst1'), http: _editHttp());
      await _scroll(tester, find.byKey(const Key('add-choice')));
      await tester.tap(find.byKey(const Key('add-choice')));
      await settle(tester, frames: 20);
      expect(find.text('3-р бодлого'), findsOneWidget);
      await tester.tap(find.text('Болсон'));
      await settle(tester, frames: 20);
      expect(find.text('Шинэ'), findsOneWidget);
      expect(find.text('Хадгалах (2)'), findsOneWidget);
    });
  });

  group('тест үүсгэх', () {
    testWidgets('өмнөх ноорог: «Үргэлжлүүлэх» маягтыг сэргээнэ', (tester) async {
      final store = MemoryDraftPointerStore({'u1': 'd1'});
      final h = _newHttp()
        ..json('GET', '/tests/drafts/d1', {
          'id': 'd1',
          'revision': 2,
          'state': {'title': 'Хагас бичсэн тест', 'type': 'DAILY'},
        });
      await pumpAuthoring(tester, const NewTestScreen(), http: h, store: store);
      expect(find.byKey(const Key('draft-candidate')), findsOneWidget);
      expect(find.textContaining('Хагас бичсэн тест'), findsOneWidget);
      await tester.tap(find.text('Үргэлжлүүлэх'));
      await settle(tester);
      expect(find.byKey(const Key('draft-candidate')), findsNothing);
      final title = tester.widget<TextField>(find.byKey(const Key('test-title')));
      expect(title.controller!.text, 'Хагас бичсэн тест');
      expect(find.text('Өдрийн тест'), findsOneWidget);
    });

    testWidgets('нэр, анги дутуу бол үүсгэхгүй; бөглөөд үүсгэнэ', (tester) async {
      final h = _newHttp()
        ..json('POST', '/tests/drafts', {'id': 'd1', 'revision': 1, 'state': <String, Object?>{}})
        ..json('POST', '/tests', {'id': 'new1'});
      await pumpAuthoring(tester, const NewTestScreen(), http: h);
      await _scroll(tester, find.byKey(const Key('create-test')));
      await tester.tap(find.byKey(const Key('create-test')));
      await settle(tester);
      expect(find.textContaining('Дараах талбарууд дутуу байна'), findsOneWidget);
      expect(h.count('POST', '/tests'), 0);

      await tester.scrollUntilVisible(
        find.byKey(const Key('test-title')),
        -300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.enterText(find.byKey(const Key('test-title')), 'Логарифмын тест');
      await settle(tester);
      await _scroll(tester, find.byKey(const Key('class-c1')));
      await tester.tap(find.byKey(const Key('class-c1')));
      await settle(tester);
      await _scroll(tester, find.byKey(const Key('create-test')));
      await tester.tap(find.byKey(const Key('create-test')));
      await settle(tester, frames: 20);
      final body = h.requests.firstWhere((r) => r.path == '/tests' && r.method == 'POST').data as Map;
      expect(body['title'], 'Логарифмын тест');
      expect(body['classroomIds'], ['c1']);
      expect(body['type'], 'CHAPTER_EXAM');
      expect(body['timeLimitMin'], 100);
      expect(find.text('«Логарифмын тест» тест амжилттай үүслээ'), findsOneWidget);
      expect(h.requests.where((r) => r.method == 'DELETE'), isEmpty, reason: 'ноорог жинхэнээр устгагдахгүй');
    });

    testWidgets('бүлэг сонгоод сангаас бодлого сонгоно; сонгосон дарааллаар жагсана', (tester) async {
      final h = _newHttp();
      await pumpAuthoring(tester, const NewTestScreen(), http: h);
      await _scroll(tester, find.byKey(const Key('chapter-row')));
      await tester.tap(find.byKey(const Key('chapter-row')));
      await settle(tester);
      await tester.tap(find.text('100 — Илтгэгч тэгшитгэл'));
      await settle(tester, frames: 15);
      await _scroll(tester, find.byKey(const Key('pick-problems')));
      await tester.tap(find.byKey(const Key('pick-problems')));
      await settle(tester, frames: 20);
      expect(find.text('Бодлого сонгох'), findsWidgets);
      await tester.enterText(find.byKey(const Key('bank-search')), '100-31');
      await settle(tester);
      expect(find.text('Нөхөх'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('bank-search')), '');
      await settle(tester);
      await tester.tap(find.text('Эхний 40'));
      await settle(tester);
      await tester.tap(find.byKey(const Key('bank-done')));
      await settle(tester, frames: 20);
      expect(find.text('Одоогоор 4 бодлого сонгосон'), findsOneWidget);
    });
  });

  testWidgets('ажилтны /app/tests: «Шинэ тест», сурагчийн API дуудахгүй', (tester) async {
    final h = FakeHttp()
      ..json('GET', '/tests', [
        {
          'id': 't1',
          'title': 'Миний тест',
          'type': 'DAILY',
          'createdById': 'u1',
          '_count': {'problems': 5, 'results': 0},
        },
        {
          'id': 't2',
          'title': 'Бусдын тест',
          'type': 'DAILY',
          'createdById': 'u9',
          '_count': {'problems': 5, 'results': 2},
        },
      ]);
    await pumpAuthoring(tester, const TestsListScreen(), http: h, role: 'TEACHER');
    expect(find.byKey(const Key('new-test')), findsOneWidget);
    expect(find.text('Миний тест'), findsOneWidget);
    expect(find.byIcon(AppIcons.pencilLine), findsOneWidget, reason: 'Багш зөвхөн өөрийн тестийг засна');
    expect(h.requests.where((r) => r.path.contains('my-results') || r.path.contains('/exams')), isEmpty);
    await tester.tap(find.byKey(const Key('new-test')));
    await settle(tester);
    expect(find.text('ROUTE:/app/tests/new'), findsOneWidget);
  });
}
