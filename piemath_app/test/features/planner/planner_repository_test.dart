import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/features/planner/data/planner_models.dart';
import 'package:piemath_app/features/planner/data/planner_repository.dart';

import '../../helpers/fake_http.dart';
import 'planner_fixtures.dart';

void main() {
  late FakeHttp http;
  late PlannerRepository repo;

  setUp(() {
    http = FakeHttp();
    repo = PlannerRepository(ApiClient(baseUrl: 'https://api.test/api', tokens: TokenHolder(), dio: http.dio()));
  });

  test('list: даалгавар, дэд даалгавар, хариуцагч, анги задална', () async {
    http.json('GET', '/tasks', [
      taskJson(
        'a',
        title: 'Шалгалт бэлтгэх',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        dueDate: '2026-11-04T00:00:00.000Z',
        assignees: ['t1'],
        classroom: {'id': 'c1', 'name': '11-1'},
        subject: 'MATH',
        estimateHours: 3,
        subtasks: [
          taskJson('a1', parentTaskId: 'a', status: 'DONE', assignees: ['t2']),
        ],
      ),
    ]);
    final tasks = await repo.list();
    expect(tasks, hasLength(1));
    final t = tasks.single;
    expect(t.title, 'Шалгалт бэлтгэх');
    expect(t.status, TaskStatus.inProgress);
    expect(t.priority, TaskPriority.urgent);
    expect(t.dueDate, DateTime.utc(2026, 11, 4));
    expect(t.assignees.single.id, 't1');
    expect(t.classroom?.name, '11-1');
    expect(t.subject, TaskSubject.math);
    expect(t.estimateHours, 3);
    expect(t.createdById, 'admin1');
    expect(t.subtasks.single.status, TaskStatus.done);
    expect(t.subtasks.single.parentTaskId, 'a');
    expect(t.subtasks.single.createdById, 'admin1');
  });

  test('list: серверийн шүүлтүүрийг query-гээр илгээнэ', () async {
    http.json('GET', '/tasks', <Object?>[]);
    await repo.list((assigneeId: 't1', classroomId: 'c1', subject: TaskSubject.socialStudies));
    final q = http.requests.single.queryParameters;
    expect(q, {'assigneeId': 't1', 'classroomId': 'c1', 'subject': 'SOCIAL_STUDIES'});
  });

  test('create: вэбтэй ижил бие, хоосон талбаргүй', () async {
    http.json('POST', '/tasks', taskJson('n'));
    await repo.create(
      TaskDraft(title: '  Шинэ  ', dueDate: DateTime.utc(2026, 11, 10), assigneeIds: const ['t1'], parentTaskId: 'a'),
    );
    final body = http.requests.single.data as Map;
    expect(body, {
      'title': 'Шинэ',
      'status': 'PLANNED',
      'priority': 'NORMAL',
      'dueDate': '2026-11-10T00:00:00.000Z',
      'assigneeIds': ['t1'],
      'parentTaskId': 'a',
    });
  });

  test('update: цэвэрлэсэн талбарыг null-аар, эцгийг илгээхгүй', () async {
    http.json('PATCH', '/tasks/a', taskJson('a'));
    await repo.update('a', const TaskDraft(title: 'Засвар', parentTaskId: 'p'));
    final body = http.requests.single.data as Map;
    expect(body['title'], 'Засвар');
    expect(body.containsKey('dueDate'), isTrue);
    expect(body['dueDate'], isNull);
    expect(body['classroomId'], isNull);
    expect(body.containsKey('parentTaskId'), isFalse);
  });

  test('setStatus: зөвхөн төлөв (Багшид зөвшөөрөгдөх цорын ганц бие)', () async {
    http.json('PATCH', '/tasks/a', taskJson('a', status: 'DONE'));
    final saved = await repo.setStatus('a', TaskStatus.done);
    expect(http.requests.single.data, {'status': 'DONE'});
    expect(saved.status, TaskStatus.done);
  });

  test('серверийн монгол алдаа ApiError болно', () async {
    http.error('PATCH', '/tasks/a', 403, 'Танд оноогдоогүй даалгаварт өөрчлөлт оруулах эрхгүй');
    await expectLater(
      repo.setStatus('a', TaskStatus.done),
      throwsA(isA<ApiError>().having((e) => e.message, 'message', contains('оноогдоогүй'))),
    );
  });

  test('staffDirectory, classrooms, workload', () async {
    http
      ..json('GET', '/tasks/staff-directory', [staffJson('t2', role: 'TEACHER_PLUS')])
      ..json('GET', '/classrooms', [
        {'id': 'c1', 'name': '11-1', 'extra': 1},
      ])
      ..json('GET', '/tasks/workload', [
        {
          'user': staffJson('t1'),
          'counts': {'PLANNED': 2, 'IN_PROGRESS': 1, 'DONE': 4, 'BLOCKED': 0, 'CANCELLED': 0},
          'totalEstimateHours': 12,
          'openCount': 3,
        },
      ]);
    expect((await repo.staffDirectory()).single.role, 'TEACHER_PLUS');
    expect((await repo.classrooms()).single.name, '11-1');
    final w = (await repo.workload(2026)).single;
    expect(w.counts[TaskStatus.done], 4);
    expect(w.totalEstimateHours, 12);
    expect(w.openCount, 3);
    expect(http.requests.last.queryParameters, {'from': '2026-01-01', 'to': '2026-12-31'});
  });
}
