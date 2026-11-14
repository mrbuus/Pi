import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/planner/application/planner_controller.dart';
import 'package:piemath_app/features/planner/data/planner_models.dart';
import 'package:piemath_app/features/planner/domain/planner_logic.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'planner_fixtures.dart';

void main() {
  test('setStatus: шууд солигдоно, серверийн хариугаар баталгаажна', () async {
    final done = Completer<FakeResponse>();
    final http = plannerHttp([
      taskJson('a', assignees: ['t1']),
    ])..on('PATCH', '/tasks/a', (_) => done.future);
    final c = testContainer(http: http);
    final sub = c.listen(plannerControllerProvider, (_, _) {});
    addTearDown(sub.close);
    final ctrl = c.read(plannerControllerProvider.notifier);
    await ctrl.load();

    final pending = ctrl.setStatus('a', TaskStatus.done);
    expect(findTask(c.read(plannerControllerProvider), 'a')!.status, TaskStatus.done);
    done.complete(FakeResponse(taskJson('a', status: 'DONE', title: 'Серверийн')));
    final r = await pending;
    expect(r.isOk, isTrue);
    expect(findTask(c.read(plannerControllerProvider), 'a')!.title, 'Серверийн');
  });

  test('setStatus: сервер татгалзвал зөвхөн тэр даалгавар буцна', () async {
    final http = plannerHttp([taskJson('a'), taskJson('b')])
      ..error('PATCH', '/tasks/a', 403, 'Танд оноогдоогүй даалгаварт өөрчлөлт оруулах эрхгүй');
    http.json('PATCH', '/tasks/b', taskJson('b', status: 'BLOCKED'));
    final c = testContainer(http: http);
    final sub = c.listen(plannerControllerProvider, (_, _) {});
    addTearDown(sub.close);
    final ctrl = c.read(plannerControllerProvider.notifier);
    await ctrl.load();

    final results = await Future.wait([ctrl.setStatus('a', TaskStatus.done), ctrl.setStatus('b', TaskStatus.blocked)]);
    expect(results.first.isOk, isFalse);
    expect(results.first.message, contains('оноогдоогүй'));
    final state = c.read(plannerControllerProvider);
    expect(findTask(state, 'a')!.status, TaskStatus.planned);
    expect(findTask(state, 'b')!.status, TaskStatus.blocked);
  });

  test('edit: шууд харагдаж, алдаа бол өмнөх утга сэргэнэ', () async {
    final http = plannerHttp([
      taskJson('a', title: 'Хуучин', assignees: ['t1']),
    ])..error('PATCH', '/tasks/a', 400, 'Дуусах огноо эхлэх огнооноос өмнө байж болохгүй');
    final c = testContainer(http: http);
    final sub = c.listen(plannerControllerProvider, (_, _) {});
    addTearDown(sub.close);
    final ctrl = c.read(plannerControllerProvider.notifier);
    await ctrl.load();

    final pending = ctrl.edit(
      'a',
      const TaskDraft(title: 'Шинэ', assigneeIds: ['t2']),
      staff: [StaffMember.fromJson(staffJson('t2', first: 'Дорж'))],
    );
    final optimistic = findTask(c.read(plannerControllerProvider), 'a')!;
    expect(optimistic.title, 'Шинэ');
    expect(optimistic.assignees.single.firstName, 'Дорж');
    final r = await pending;
    expect(r.isOk, isFalse);
    final back = findTask(c.read(plannerControllerProvider), 'a')!;
    expect(back.title, 'Хуучин');
    expect(back.assignees.single.id, 't1');
  });

  test('create: түр мөр шууд, хадгалагдмагц серверийнхээр солигдоно', () async {
    final saved = Completer<FakeResponse>();
    final http = plannerHttp([taskJson('p')])..on('POST', '/tasks', (_) => saved.future);
    final c = testContainer(http: http);
    final sub = c.listen(plannerControllerProvider, (_, _) {});
    addTearDown(sub.close);
    final ctrl = c.read(plannerControllerProvider.notifier);
    await ctrl.load();

    final pending = ctrl.create(
      const TaskDraft(title: 'Дэд', parentTaskId: 'p'),
      createdById: 'admin1',
    );
    final temp = c.read(plannerControllerProvider).single.subtasks.single;
    expect(isPendingTask(temp), isTrue);
    expect(temp.title, 'Дэд');
    saved.complete(FakeResponse(taskJson('s9', title: 'Дэд', parentTaskId: 'p')));
    await pending;
    final sub2 = c.read(plannerControllerProvider).single.subtasks.single;
    expect(sub2.id, 's9');
  });

  test('create: алдаа бол түр мөр алга болно', () async {
    final http = plannerHttp([])..error('POST', '/tasks', 500);
    final c = testContainer(http: http);
    final sub = c.listen(plannerControllerProvider, (_, _) {});
    addTearDown(sub.close);
    final ctrl = c.read(plannerControllerProvider.notifier);
    await ctrl.load();
    final r = await ctrl.create(const TaskDraft(title: 'Шинэ'));
    expect(r.isOk, isFalse);
    expect(c.read(plannerControllerProvider), isEmpty);
  });
}
