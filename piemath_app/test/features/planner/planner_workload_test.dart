import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/features/planner/planner_routes.dart';
import 'package:piemath_app/features/planner/ui/planner_screen.dart';
import 'package:piemath_app/features/planner/ui/workload_screen.dart';

import 'planner_fixtures.dart';

void main() {
  test('маршрут: /app/planner бүрхүүл дотор, дэд нь workload', () {
    final route = plannerRoutes.shell.single as GoRoute;
    expect(route.path, '/app/planner');
    expect((route.routes.single as GoRoute).path, 'workload');
    expect(plannerRoutes.public, isEmpty);
    expect(plannerRoutes.fullscreen, isEmpty);
  });

  testWidgets('«Ачаалал» товч дэд хуудас руу', (tester) async {
    await pumpPlanner(
      tester,
      const PlannerScreen(),
      http: plannerHttp([
        taskJson('a', assignees: ['t1']),
      ]),
    );
    await tester.tap(find.byKey(const ValueKey('planner-workload')));
    await settle(tester);
    expect(find.text('ROUTE:/app/planner/workload'), findsOneWidget);
  });

  testWidgets('ачаалал: цаг, нээлттэй тоо, «Ачаалал ихтэй», он солих', (tester) async {
    final http = plannerHttp([])
      ..json('GET', '/tasks/workload', [
        {
          'user': staffJson('t2', first: 'Дорж', last: 'Цэрэн', role: 'TEACHER_PLUS'),
          'counts': {'PLANNED': 4, 'IN_PROGRESS': 2, 'DONE': 1, 'BLOCKED': 0, 'CANCELLED': 0},
          'totalEstimateHours': 20,
          'openCount': 6,
        },
        {
          'user': staffJson('t1', first: 'Сараа', last: 'Бат'),
          'counts': {'PLANNED': 0, 'IN_PROGRESS': 0, 'DONE': 0, 'BLOCKED': 0, 'CANCELLED': 0},
          'totalEstimateHours': 0,
          'openCount': 0,
        },
      ]);
    await pumpPlanner(tester, const WorkloadScreen(), http: http);
    expect(find.text('Ц. Дорж+'), findsOneWidget);
    expect(find.text('20 цаг'), findsOneWidget);
    expect(find.text('Ачаалал ихтэй'), findsOneWidget);
    expect(find.text('Төлөвлөсөн 4'), findsOneWidget);
    expect(find.text('Энэ хугацаанд даалгавар алга'), findsOneWidget);
    expect(http.requests.last.queryParameters['from'], '2026-01-01');

    await tester.tap(find.byTooltip('Өмнөх жил'));
    await settle(tester);
    expect(find.text('2025'), findsOneWidget);
    expect(http.requests.last.queryParameters['from'], '2025-01-01');
  });
}
