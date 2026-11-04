import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/schedule/data/lesson_plan_models.dart';
import 'package:piemath_app/features/schedule/data/staff_schedule_models.dart';
import 'package:piemath_app/features/schedule/domain/staff_schedule_logic.dart';
import 'package:piemath_app/features/schedule/ui/staff/lesson_detail.dart';
import 'package:piemath_app/features/schedule/ui/staff/plan_sheets.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../../helpers/test_container.dart';
import '../student_harness.dart';
import 'staff_fixtures.dart';

// Зохиомол өгөгдөл (жинхэнэ сурагч, багшийн нэр биш).

const _date = '2026-11-04';

Map<String, Object?> _roadmap() => {
  'books': [
    {
      'code': '100',
      'title': '100x100',
      'topics': [
        {
          'name': 'Квадрат тэгшитгэл',
          'chapters': [
            {
              'chapterId': 'k1',
              'tests': [
                {'testId': 'tA', 'short': 'Квадрат 1', 'variant': 'A', 'status': 'DONE'},
              ],
            },
            {
              'chapterId': 'k2',
              'tests': [
                {'testId': 'tB2', 'short': 'Квадрат 2 B', 'variant': 'B', 'status': 'TODO'},
                {'testId': 'tB', 'short': 'Квадрат 2', 'variant': 'A', 'status': 'TODO'},
              ],
            },
            {
              'chapterId': 'k3',
              'tests': [
                {'testId': 'tC', 'short': 'Квадрат 3', 'variant': 'A', 'status': 'SKIPPED', 'plannedOn': '2026-11-06'},
              ],
            },
          ],
        },
      ],
    },
  ],
  'next': ['tB', 'tC'],
};

const _planContext = {
  'scheduleId': 's1',
  'classroomId': 'c1',
  'date': _date,
  'occurrenceDate': _date,
  'plan': {
    'testIds': ['tA'],
    'customTopics': <String>[],
    'dismissMode': null,
    'photoStudentId': null,
  },
  'roster': [
    {'id': 'p1', 'name': 'Т. Анар'},
    {'id': 'p2', 'name': 'Т. Номин'},
  ],
  'photoSuggestion': 'p2',
};

FakeHttp _http() => FakeHttp()
  ..json('GET', '/schedule/s1/plan', _planContext)
  ..json('GET', '/classrooms/c1/roadmap', _roadmap())
  ..json('PUT', '/schedule/s1/plan', {'ok': true})
  ..json('PUT', '/lesson-records/s1/note', {'ok': true})
  ..json('PUT', '/classrooms/c1/tests/tC/status', {'ok': true})
  ..json('PUT', '/lesson-records/s1/confirm', {'ok': true})
  ..json('DELETE', '/lesson-records/s1/confirm?date=$_date', {'confirmed': false})
  ..json('GET', '/schedule/plan-tests', [
    {
      'testId': 'tB',
      'title': 'Квадрат 2',
      'short': 'Квадрат 2',
      'problemIds': ['q1', 'q2'],
    },
  ]);

DayLesson _lesson({Map<String, Object?>? record, List<Object?> done = const []}) =>
    DayLesson.fromJson({...lessonJson(id: 's1', date: _date), 'record': record, 'done': done}, _date);

const _tests = {
  'tA': PlanTest(id: 'tA', title: 'Квадрат 1', short: 'Квадрат 1', problemIds: ['p1', 'p2', 'p3']),
};

Map<String, Object?> _body(RequestOptions r) => (r.data as Map).cast<String, Object?>();

Future<void> _pump(WidgetTester tester, FakeHttp http, Future<void> Function(BuildContext) open) async {
  tester.view.physicalSize = const Size(390, 844) * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(() => FixedSession(signedInAs(UserRole.teacherPlus))),
      ],
      retry: (_, _) => null,
      child: MaterialApp(
        theme: AppTheme.light(),
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: FilledButton(onPressed: () => open(context), child: const Text('Нээх')),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Нээх'));
  await settle(tester, frames: 20);
}

Finder get _sheetScroll =>
    find.descendant(of: find.byType(DraggableScrollableSheet), matching: find.byType(Scrollable)).first;

Future<void> _scrollTo(WidgetTester tester, Finder f) async {
  await tester.scrollUntilVisible(f, 150, scrollable: _sheetScroll);
  await settle(tester);
}

void main() {
  setUpAll(loadAppFonts);

  group('логик', () {
    test('бодлогын дугаар задлах (API-тай ижил дүрэм)', () {
      expect(parseProblemNumbers('1-5, 7'), [1, 2, 3, 4, 5, 7]);
      expect(parseProblemNumbers('3;1 2'), [1, 2, 3]);
      expect(parseProblemNumbers('5-3'), isNull);
      expect(parseProblemNumbers('1-а'), isNull);
      expect(parseProblemNumbers('  '), isNull);
      expect(parseProblemNumbers('1-999'), isNull, reason: '500-аас олон');
    });

    test('замын зураг: A хувилбар, төлөв, санал, номын дараалал', () {
      final map = Roadmap.fromJson(_roadmap());
      expect(map.units.map((u) => u.testId), ['tA', 'tB', 'tC']);
      expect(map.unit('tA')!.status, RoadmapStatus.done);
      expect(map.unit('tC')!.status, RoadmapStatus.skipped);
      expect(map.unit('tC')!.plannedOn, '2026-11-06');
      expect(map.sortIds(['tC', 'x', 'tA']), ['tA', 'tC', 'x']);
      expect(map.next, ['tB', 'tC']);
    });

    test('төлөвлөгөөний эхний утга', () {
      final ctx = PlanContext.fromJson(_planContext);
      expect(ctx.testIds, ['tA']);
      expect(ctx.nameOf('p2'), 'Т. Номин');
      expect(ctx.photoSuggestion, 'p2');
    });
  });

  testWidgets('төлөвлөгөө засах: тест, сэдэв, тарах, зургийн ээлж, тэмдэглэл', (tester) async {
    final http = _http();
    await _pump(tester, http, (c) => showPlanEditor(c, lesson: _lesson(), date: _date));
    expect(find.text('12-1, төлөвлөгөө'), findsOneWidget);
    // Хийсэн тест сонголтод харагдахгүй ч сонгогдсон бол чип.
    expect(find.byKey(const ValueKey('picked:tA')), findsOneWidget);
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Хадгалах')).onPressed, isNull);

    await tester.tap(find.byKey(const ValueKey('suggest:tB')));
    await settle(tester);
    await tester.enterText(find.byKey(const ValueKey('picker:search')), 'Давталт');
    await settle(tester);
    await tester.tap(find.byKey(const ValueKey('picker:add-topic')));
    await settle(tester);
    expect(find.byKey(const ValueKey('topic:Давталт')), findsOneWidget);

    await _scrollTo(tester, find.text('Тарах'));
    await tester.tap(find.text('Тарах'));
    await settle(tester);
    await _scrollTo(tester, find.text('Ээлж: Т. Номин'));
    await tester.tap(find.text('Ээлж: Т. Номин'));
    await settle(tester);
    await _scrollTo(tester, find.byKey(const ValueKey('plan:note')));
    await tester.enterText(find.byKey(const ValueKey('plan:note')), 'Тооны машин авчирна');
    await settle(tester);

    await tester.tap(find.widgetWithText(FilledButton, 'Хадгалах'));
    await settle(tester, frames: 20);
    final plan = http.requests.lastWhere((r) => r.path == '/schedule/s1/plan' && r.method == 'PUT');
    expect(_body(plan), {
      'date': _date,
      'testIds': ['tA', 'tB'],
      'customTopics': ['Давталт'],
      'dismissMode': 'DISMISS',
      'photoStudentId': 'p2',
    });
    final note = http.requests.lastWhere((r) => r.path == '/lesson-records/s1/note');
    expect(_body(note), {'date': _date, 'body': 'Тооны машин авчирна'});
    expect(find.byType(DraggableScrollableSheet), findsNothing);
    expect(find.text('Төлөвлөгөө хадгалагдлаа'), findsOneWidget);
  });

  testWidgets('хадгалаагүй өөрчлөлттэй хаахад асууна, тестийг ангиас хасах «Буцаах»-тай', (tester) async {
    final http = _http();
    await _pump(tester, http, (c) => showPlanEditor(c, lesson: _lesson(), date: _date));

    // Квадрат 3-ыг ангиас хасна (5 секундын дараа серверт).
    await tester.tap(find.byTooltip('Квадрат 3, энэ ангиас хасах'));
    await settle(tester);
    expect(find.byKey(const ValueKey('unit:tC')), findsNothing);
    expect(http.count('PUT', '/classrooms/c1/tests/tC/status'), 0);
    await tester.pump(const Duration(seconds: 6));
    await settle(tester, frames: 20);
    final status = http.requests.lastWhere((r) => r.path == '/classrooms/c1/tests/tC/status');
    expect(_body(status), {'status': 'REMOVED'});

    await tester.tap(find.byKey(const ValueKey('suggest:tB')));
    await settle(tester);
    await tester.tap(find.widgetWithText(OutlinedButton, 'Болих'));
    await settle(tester);
    expect(find.text('Хадгалаагүй өөрчлөлт байна'), findsOneWidget);
    await tester.tap(find.text('Үргэлжлүүлэх'));
    await settle(tester);
    expect(find.byType(DraggableScrollableSheet), findsOneWidget);
    await tester.tap(find.widgetWithText(OutlinedButton, 'Болих'));
    await settle(tester);
    await tester.tap(find.text('Хаах'));
    await settle(tester, frames: 20);
    expect(find.byType(DraggableScrollableSheet), findsNothing);
    expect(http.count('PUT', '/schedule/s1/plan'), 0);
  });

  testWidgets('батлах: хийсэн тест, хассан бодлого, бодсон дугаар', (tester) async {
    final http = _http();
    final lesson = _lesson(
      done: [
        {'sessionId': 'x1', 'testId': 'tA', 'manualTitle': null, 'excludedProblemIds': <String>[]},
      ],
    );
    await _pump(tester, http, (c) => showConfirmSheet(c, lesson: lesson, date: _date, tests: _tests));
    expect(find.text('Квадрат 1'), findsOneWidget);

    await tester.tap(find.text('Хассан бодлого'));
    await settle(tester);
    await tester.tap(find.byKey(const ValueKey('num:tA:2')));
    await settle(tester);
    expect(find.text('Хассан: 2'), findsOneWidget);

    await _scrollTo(tester, find.byKey(const ValueKey('confirm:numbers')));
    await tester.enterText(find.byKey(const ValueKey('confirm:numbers')), '1-5, 7');
    await settle(tester);
    expect(find.text('6 бодлого'), findsOneWidget);
    await tester.enterText(find.byKey(const ValueKey('confirm:numbers')), 'эхний хуудас');
    await settle(tester);
    expect(find.text('Тоогоор задлах боломжгүй, бичсэнээр нь хадгална'), findsOneWidget);
    await tester.enterText(find.byKey(const ValueKey('confirm:numbers')), '1-5, 7');
    await settle(tester);

    await tester.tap(find.widgetWithText(FilledButton, 'Батлах'));
    await settle(tester, frames: 20);
    final put = http.requests.lastWhere((r) => r.path == '/lesson-records/s1/confirm');
    expect(_body(put), {
      'date': _date,
      'tests': [
        {
          'testId': 'tA',
          'excludedProblemIds': ['p2'],
        },
      ],
      'topic': null,
      'description': null,
      'problemNumbers': '1-5, 7',
    });
    expect(find.text('Батлагдлаа'), findsOneWidget);
  });

  testWidgets('батламж цуцлах нь баталгаатай, зөөлөн (DELETE ?date=)', (tester) async {
    final http = _http();
    final lesson = _lesson(
      record: {
        'confirmedByName': 'Болд+',
        'confirmedAt': '2026-11-04T10:00:00.000Z',
        'presentCount': 18,
        'absentCount': 2,
        'topic': null,
        'description': 'Давтлага',
        'problemNumbersText': '1-10',
      },
    );
    await _pump(tester, http, (c) => showConfirmSheet(c, lesson: lesson, date: _date, tests: _tests));
    expect(find.textContaining('Болд+ баталсан'), findsOneWidget);
    await tester.tap(find.text('Батламж цуцлах'));
    await settle(tester);
    expect(find.text('Батламжийг цуцлах уу'), findsOneWidget);
    await tester.tap(find.text('Цуцлах'));
    await settle(tester, frames: 20);
    expect(http.count('DELETE', '/lesson-records/s1/confirm?date=$_date'), 1);
    expect(find.text('Батламж цуцлагдлаа'), findsOneWidget);
  });

  testWidgets('нэмсэн тестийн бодлогын дарааллыг татна', (tester) async {
    final http = _http();
    await _pump(tester, http, (c) => showConfirmSheet(c, lesson: _lesson(), date: _date, tests: _tests));
    expect(find.text('Тест сонгоогүй, ирц ба багшийг л батална'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('confirm:add')));
    await settle(tester);
    await tester.tap(find.byKey(const ValueKey('suggest:tB')));
    await settle(tester, frames: 20);
    expect(http.requests.lastWhere((r) => r.path == '/schedule/plan-tests').queryParameters, {'ids': 'tB'});
    expect(find.byKey(const ValueKey('done:tB')), findsOneWidget);
  });

  testWidgets('дэлгэрэнгүйд: Багш+ «Төлөвлөгөө засах», «Батлах»', (tester) async {
    final http = staffHttp(canPlan: true);
    tester.view.physicalSize = const Size(390, 844) * 2;
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          ...testOverrides(http: http),
          sessionProvider.overrideWith(() => FixedSession(signedInAs(UserRole.teacherPlus))),
        ],
        retry: (_, _) => null,
        child: MaterialApp(
          theme: AppTheme.light(),
          home: const Scaffold(
            body: LessonDetail(
              date: _date,
              scheduleId: 's1',
              perms: StaffPermissions(role: UserRole.teacherPlus, canPlan: true),
            ),
          ),
        ),
      ),
    );
    await settle(tester, frames: 20);
    await tester.scrollUntilVisible(find.text('Батлах'), 150, scrollable: find.byType(Scrollable).first);
    expect(find.text('Төлөвлөгөө засах'), findsOneWidget);
    expect(find.text('Батлах'), findsOneWidget);
  });
}
