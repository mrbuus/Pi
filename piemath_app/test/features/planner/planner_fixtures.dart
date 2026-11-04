import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/current_user.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/planner/application/planner_controller.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

/// Тогтмол «одоо»: 2026-11-04 (Лхагва) UB 10:00. Бүх нэр зохиомол.
final plannerNow = UbDateTime(2026, 11, 4, 10);

Map<String, Object?> staffJson(String id, {String first = 'Нэр', String last = 'Овог', String role = 'TEACHER'}) => {
  'id': id,
  'firstName': first,
  'lastName': last,
  'avatarUrl': null,
  'role': role,
};

Map<String, Object?> taskJson(
  String id, {
  String? title,
  String status = 'PLANNED',
  String priority = 'NORMAL',
  String? startDate,
  String? dueDate,
  String? parentTaskId,
  String createdById = 'admin1',
  List<String> assignees = const [],
  List<Map<String, Object?>> subtasks = const [],
  Map<String, Object?>? classroom,
  String? subject,
  int? estimateHours,
  String? description,
}) => {
  'id': id,
  'title': title ?? 'Даалгавар $id',
  'description': description,
  'status': status,
  'priority': priority,
  'startDate': startDate,
  'dueDate': dueDate,
  'parentTaskId': parentTaskId,
  'classroomId': classroom?['id'],
  'classroom': classroom,
  'subject': subject,
  'estimateHours': estimateHours,
  'orderIndex': 0,
  'createdAt': '2026-11-01T00:00:00.000Z',
  'updatedAt': '2026-11-01T00:00:00.000Z',
  'createdById': createdById,
  'createdBy': parentTaskId == null ? {'id': createdById, 'firstName': 'Админ', 'lastName': 'Тест'} : null,
  'assignees': [
    for (final a in assignees) {'userId': a, 'assignedAt': '2026-11-01T00:00:00.000Z', 'user': staffJson(a)},
  ],
  'subtasks': subtasks,
};

class _FixedSession extends SessionController {
  _FixedSession(this._state);

  final SessionState _state;

  @override
  SessionState build() => _state;
}

SessionState staffSession({String role = 'TEACHER', String id = 't1'}) => SignedIn(
  StoredAuth(token: 't', userId: id, role: UserRole.fromApi(role)),
  CurrentUser.fromJson({...fakeMe(id: id, role: role), 'lastName': 'Ажилтан'}),
);

/// Төлөвлөгчийн API-ийн хуурамч хариу.
FakeHttp plannerHttp(List<Map<String, Object?>> tasks) => FakeHttp()
  ..json('GET', '/tasks', tasks)
  ..json('GET', '/tasks/staff-directory', [
    staffJson('t1', first: 'Сараа', last: 'Бат'),
    staffJson('t2', first: 'Дорж', last: 'Цэрэн', role: 'TEACHER_PLUS'),
  ])
  ..json('GET', '/classrooms', [
    {'id': 'c1', 'name': '11-1'},
  ]);

/// [screen]-ийг router, theme, mock API-тай зурна.
Future<void> pumpPlanner(
  WidgetTester tester,
  Widget screen, {
  required FakeHttp http,
  SessionState? session,
  // Өндөр — бүх бүлэг нэг дор харагдана (жагсаалт зөвхөн харагдаж буйг зурдаг).
  Size size = const Size(390, 1600),
}) async {
  tester.view.physicalSize = size * 3;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, _) => screen),
      GoRoute(
        path: '/app/planner/workload',
        builder: (_, s) => Scaffold(body: Text('ROUTE:${s.uri}')),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(() => _FixedSession(session ?? staffSession())),
        plannerClockProvider.overrideWithValue(() => plannerNow),
      ],
      retry: (_, _) => null,
      child: MaterialApp.router(debugShowCheckedModeBanner: false, theme: AppTheme.light(), routerConfig: router),
    ),
  );
  await settle(tester);
}

/// HTTP хариу ирж, дэлгэц шинэчлэгдтэл (skeleton анимацтай тул pumpAndSettle биш).
Future<void> settle(WidgetTester tester, {int frames = 12}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 30));
  }
}
