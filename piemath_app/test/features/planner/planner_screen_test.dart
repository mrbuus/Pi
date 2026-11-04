import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/planner/domain/planner_logic.dart';
import 'package:piemath_app/features/planner/ui/planner_screen.dart';
import 'package:piemath_app/features/planner/ui/task_tile.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/fake_http.dart';
import 'planner_fixtures.dart';

List<PlannerGroup> shownGroups(WidgetTester tester) => [
  for (final w in tester.widgetList<PlannerGroupHeader>(find.byType(PlannerGroupHeader))) w.group,
];

PlannerGroup? groupOfTile(WidgetTester tester, String title) {
  PlannerGroup? current;
  // Мөрүүд дарааллаар зурагдана — гарчгийн дараах даалгавар тэр бүлэгт.
  for (final e in find.byWidgetPredicate((w) => w is PlannerGroupHeader || w is TaskTile).evaluate()) {
    final w = e.widget;
    if (w is PlannerGroupHeader) current = w.group;
    if (w is TaskTile && w.item.task.title == title) return current;
  }
  return null;
}

void main() {
  final tasks = [
    taskJson('late', title: 'Хоцорсон ажил', dueDate: '2026-11-02T00:00:00.000Z', assignees: ['t1']),
    taskJson('today', title: 'Өнөөдрийн ажил', dueDate: '2026-11-04T00:00:00.000Z', assignees: ['t1']),
    taskJson('week', title: 'Баасан гарагийн ажил', dueDate: '2026-11-06T00:00:00.000Z', assignees: ['t2']),
    taskJson('later', title: 'Хожмын ажил', assignees: ['t1']),
    taskJson('done', title: 'Хийсэн ажил', status: 'DONE', assignees: ['t1']),
  ];

  testWidgets('бүлэглэсэн жагсаалт: Хожимдсон, Өнөөдөр, Энэ 7 хоног, Дараа, Дууссан', (tester) async {
    await pumpPlanner(
      tester,
      const PlannerScreen(),
      http: plannerHttp(tasks),
      session: staffSession(role: 'ADMIN', id: 'admin1'),
    );
    expect(shownGroups(tester), PlannerGroup.values);
    expect(groupOfTile(tester, 'Хоцорсон ажил'), PlannerGroup.overdue);
    expect(groupOfTile(tester, 'Өнөөдрийн ажил'), PlannerGroup.today);
    expect(groupOfTile(tester, 'Баасан гарагийн ажил'), PlannerGroup.thisWeek);
    expect(find.text('5 даалгавар'), findsOneWidget);
  });

  testWidgets('шудрахад «Дууссан», «Буцаах» дарвал өмнөх төлөв', (tester) async {
    final http = plannerHttp(tasks)
      ..on(
        'PATCH',
        '/tasks/today',
        (r) => FakeResponse(
          taskJson(
            'today',
            title: 'Өнөөдрийн ажил',
            status: (r.data as Map)['status'] as String,
            dueDate: '2026-11-04T00:00:00.000Z',
            assignees: ['t1'],
          ),
        ),
      );
    await pumpPlanner(tester, const PlannerScreen(), http: http);

    expect(groupOfTile(tester, 'Өнөөдрийн ажил'), PlannerGroup.today);
    await tester.drag(find.byKey(const ValueKey('swipe:today')), const Offset(320, 0));
    await settle(tester, frames: 20);

    expect(groupOfTile(tester, 'Өнөөдрийн ажил'), PlannerGroup.done);
    expect(http.requests.last.data, {'status': 'DONE'});
    expect(find.text('Дууссан гэж тэмдэглэлээ'), findsOneWidget);

    await tester.tap(find.text('Буцаах'));
    await settle(tester, frames: 20);
    expect(http.requests.last.data, {'status': 'PLANNED'});
    expect(groupOfTile(tester, 'Өнөөдрийн ажил'), PlannerGroup.today);
  });

  testWidgets('шудралт амжилтгүй бол буцаад алдаа харагдана', (tester) async {
    final http = plannerHttp(tasks)
      ..error('PATCH', '/tasks/today', 403, 'Танд оноогдоогүй даалгаварт өөрчлөлт оруулах эрхгүй');
    await pumpPlanner(tester, const PlannerScreen(), http: http);

    await tester.drag(find.byKey(const ValueKey('swipe:today')), const Offset(320, 0));
    await settle(tester, frames: 20);
    expect(groupOfTile(tester, 'Өнөөдрийн ажил'), PlannerGroup.today);
    expect(find.text('Танд оноогдоогүй даалгаварт өөрчлөлт оруулах эрхгүй'), findsOneWidget);
  });

  testWidgets('Багш: «Миний» анхдагч, «Миний өгсөн» байхгүй, нэмэх товчгүй, бусдынхыг шудрахгүй', (tester) async {
    await pumpPlanner(tester, const PlannerScreen(), http: plannerHttp(tasks));
    expect(find.byKey(const ValueKey('scope:created')), findsNothing);
    expect(find.byType(FloatingActionButton), findsNothing);
    // «Миний»: t2-д оноогдсон даалгавар харагдахгүй
    expect(find.text('Баасан гарагийн ажил'), findsNothing);
    expect(find.text('4 даалгавар'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('scope:all')));
    await settle(tester);
    expect(find.text('Баасан гарагийн ажил'), findsOneWidget);
    expect(find.byKey(const ValueKey('swipe:week')), findsNothing);
    expect(find.byKey(const ValueKey('swipe:today')), findsOneWidget);
  });

  testWidgets('Админ: «Миний өгсөн» нь үүсгэсэн даалгаврыг л харуулна', (tester) async {
    final mixed = [
      taskJson('a', title: 'Миний өгсөн ажил', createdById: 'admin1'),
      taskJson('b', title: 'Өөр хүний ажил', createdById: 'boss2'),
    ];
    await pumpPlanner(
      tester,
      const PlannerScreen(),
      http: plannerHttp(mixed),
      session: staffSession(role: 'ADMIN', id: 'admin1'),
    );
    expect(find.byType(FloatingActionButton), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('scope:created')));
    await settle(tester);
    expect(find.text('Миний өгсөн ажил'), findsOneWidget);
    expect(find.text('Өөр хүний ажил'), findsNothing);
  });

  testWidgets('төлөвийн шүүлтүүр', (tester) async {
    await pumpPlanner(
      tester,
      const PlannerScreen(),
      http: plannerHttp(tasks),
      session: staffSession(role: 'TEACHER_PLUS', id: 'tp'),
    );
    final chip = find.byKey(const ValueKey('filter:DONE'));
    await tester.scrollUntilVisible(
      chip,
      150,
      scrollable: find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first,
    );
    await settle(tester);
    await tester.tap(chip);
    await settle(tester);
    expect(shownGroups(tester), [PlannerGroup.done]);
    expect(find.text('1 даалгавар'), findsOneWidget);
  });

  testWidgets('маягт: гарчиггүй бол хадгалахгүй, бөглөвөл түр мөр шууд гарч POST илгээнэ', (tester) async {
    final http = plannerHttp(tasks)..json('POST', '/tasks', taskJson('new1', title: 'Улирлын шалгалт'));
    await pumpPlanner(
      tester,
      const PlannerScreen(),
      http: http,
      session: staffSession(role: 'ADMIN', id: 'admin1'),
    );

    await tester.tap(find.byType(FloatingActionButton));
    await settle(tester, frames: 20);
    expect(find.text('Шинэ даалгавар'), findsWidgets);
    await tester.tap(find.widgetWithText(FilledButton, 'Хадгалах'));
    await settle(tester);
    expect(find.text(FormMessages.required), findsOneWidget);
    expect(http.count('POST', '/tasks'), 0);

    final titleField = find.descendant(
      of: find.byWidgetPredicate((w) => w is FormSheet),
      matching: find.byType(TextField),
    );
    await tester.enterText(titleField.first, 'Улирлын шалгалт');
    await tester.tap(find.widgetWithText(FilledButton, 'Хадгалах'));
    await settle(tester, frames: 30);
    expect(http.count('POST', '/tasks'), 1);
    expect((http.requests.lastWhere((r) => r.method == 'POST').data as Map)['title'], 'Улирлын шалгалт');
    expect(find.text('Улирлын шалгалт'), findsOneWidget);
  });

  testWidgets('дарахад дэлгэрэнгүй, Багш өөрийнхөө төлөвийг солино', (tester) async {
    final http = plannerHttp(tasks)
      ..json(
        'PATCH',
        '/tasks/today',
        taskJson(
          'today',
          title: 'Өнөөдрийн ажил',
          status: 'IN_PROGRESS',
          dueDate: '2026-11-04T00:00:00.000Z',
          assignees: ['t1'],
        ),
      );
    await pumpPlanner(tester, const PlannerScreen(), http: http);

    await tester.tap(find.text('Өнөөдрийн ажил'));
    await settle(tester, frames: 20);
    expect(find.text('Хариуцах ажилтан'), findsOneWidget);
    expect(find.text('Засах'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('status:IN_PROGRESS')));
    await settle(tester, frames: 20);
    expect(http.requests.last.data, {'status': 'IN_PROGRESS'});
  });
}
