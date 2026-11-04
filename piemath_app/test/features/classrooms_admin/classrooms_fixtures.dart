import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/current_user.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/classrooms_admin/application/classrooms_admin_providers.dart';
import 'package:piemath_app/features/teacher/application/teacher_providers.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

/// Зохиомол өгөгдөл — жинхэнэ сурагч, багшийн нэр биш (RULES §6).
final classroomsToday = UbDateTime(2026, 11, 4, 10);

Map<String, Object?> staff(String id, String first, String last, {String role = 'TEACHER'}) => {
  'id': id,
  'firstName': first,
  'lastName': last,
  'role': role,
};

final teacherT1 = staff('t1', 'Болд', 'Дорж');
final teacherT2 = staff('t2', 'Сараа', 'Ганболд', role: 'TEACHER_PLUS');

Map<String, Object?> classroom(
  String id,
  String name, {
  String type = 'IN_PERSON',
  int? grade = 12,
  Map<String, Object?>? teacher,
  Map<String, Object?>? assistant,
  int count = 2,
  String? subject,
}) => {
  'id': id,
  'name': name,
  'type': type,
  'grade': grade,
  'subject': subject,
  'teacherId': teacher?['id'],
  'teacher': teacher,
  'assistantTeacherId': assistant?['id'],
  'assistantTeacher': assistant,
  '_count': {'enrollments': count},
};

Map<String, Object?> student(String id, String first, String last, {String? code, String joined = '2026-09-01'}) => {
  'id': id,
  'firstName': first,
  'lastName': last,
  'studentCode': code,
  'joinedAt': '${joined}T02:00:00.000Z',
};

Map<String, Object?> detail(
  Map<String, Object?> room,
  List<Map<String, Object?>> students, {
  bool canManageStudents = true,
}) => {
  'classroom': {...room}..remove('_count'),
  'students': students,
  'permissions': {'canManageStudents': canManageStudents},
};

Map<String, Object?> unassigned(
  String id,
  String first,
  String last, {
  int grade = 10,
  String school = '1-р сургууль',
}) => {
  'id': id,
  'firstName': first,
  'lastName': last,
  'phone': '99000000',
  'avatarUrl': null,
  'studentProfile': {'grade': grade, 'school': school},
  'waitingSince': '2026-10-01T00:00:00.000Z',
};

final roomA = classroom('c1', '12А', teacher: teacherT1, count: 2);
final roomB = classroom('c2', '11Б', type: 'ONLINE', grade: 11, teacher: teacherT2, count: 1);
final roomC = classroom('c3', '10В', grade: 10, count: 0);

final studentS1 = student('s1', 'Анар', 'Бат', code: 'B27120001');
final studentS2 = student('s2', 'Тэмүүлэн', 'Очир', code: 'B27120002');

/// Ангийн удирдлагын үндсэн mock API.
/// [registry] — `GET /classrooms/registry` хариу (өгөхгүй бол одоогийн сервер шиг 404).
FakeHttp classroomsHttp({bool canManageStudents = true, FakeHandler? registry}) => FakeHttp()
  ..json('GET', '/classrooms', [roomA, roomB, roomC])
  ..json('GET', '/classrooms/c1', detail(roomA, [studentS1, studentS2], canManageStudents: canManageStudents))
  ..json('GET', '/classrooms/c2', detail(roomB, [student('s3', 'Номин', 'Цэцэг', code: 'B27120003')]))
  ..json('GET', '/classrooms/c3', detail(roomC, const []))
  ..json('GET', '/classrooms/unassigned-students', [unassigned('u1', 'Дөлгөөн', 'Мөнх')])
  ..on(
    'GET',
    '/classrooms/registry',
    registry ?? (_) => const FakeResponse({'statusCode': 404, 'message': 'Анги олдсонгүй'}, status: 404),
  )
  ..json('GET', '/schedule/teachers', [
    {...teacherT1, 'displayName': 'Д. Болд'},
    {...teacherT2, 'displayName': 'Г. Сараа'},
  ])
  ..json('GET', '/users/teachers', [teacherT1, teacherT2])
  ..json('POST', '/classrooms/c1/enroll', {'id': 'e1'})
  ..json('POST', '/classrooms/c2/enroll', {'id': 'e2'})
  ..json('POST', '/classrooms/c3/enroll', {'id': 'e3'})
  ..json('POST', '/classrooms/c1/remove-student', {'removed': true})
  ..json('PATCH', '/classrooms/c1', {'id': 'c1'})
  ..json('PATCH', '/classrooms/c1/teachers', {'id': 'c1'})
  ..json('POST', '/classrooms/c1/disband', {'disbanded': true, 'affectedStudentCount': 2});

Map<String, Object?> requestBody(FakeHttp http, String method, String path) =>
    (http.requests.lastWhere((r) => r.method == method && r.path == path).data as Map).cast();

class _FixedSession extends SessionController {
  _FixedSession(this._state);

  final SessionState _state;

  @override
  SessionState build() => _state;
}

SessionState staffSession(String role, {String id = 't1'}) => SignedIn(
  StoredAuth(token: 't', userId: id, role: UserRole.fromApi(role)),
  CurrentUser.fromJson({...fakeMe(id: id, role: role), 'lastName': 'Ажилтан'}),
);

/// Дэлгэцийг router, theme, mock API-тай зурна. Түлхсэн зам `ROUTE:<path>` бичвэрээр харагдана.
Future<void> pumpClassrooms(
  WidgetTester tester,
  Widget screen, {
  required FakeHttp http,
  String role = 'ADMIN',
  String userId = 't1',
  Size size = const Size(390, 844),
  List<Override> overrides = const [],
}) async {
  tester.view.physicalSize = size * 3;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, _) => screen),
      for (final p in ['/app/:a', '/app/:a/:b', '/app/:a/:b/:c', '/app/:a/:b/:c/:d'])
        GoRoute(
          path: p,
          builder: (_, s) => Scaffold(body: Text('ROUTE:${s.uri}')),
        ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...testOverrides(http: http),
        sessionProvider.overrideWith(() => _FixedSession(staffSession(role, id: userId))),
        classroomsTodayProvider.overrideWithValue(classroomsToday),
        teacherTodayProvider.overrideWithValue(classroomsToday),
        presenceEnabledProvider.overrideWithValue(false),
        ...overrides,
      ],
      retry: (_, _) => null,
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        routerConfig: router,
      ),
    ),
  );
  await settle(tester);
}

/// HTTP хариу ирж, дэлгэц шинэчлэгдтэл.
Future<void> settle(WidgetTester tester, {int frames = 12}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 30));
  }
}
