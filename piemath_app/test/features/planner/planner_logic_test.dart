import 'package:flutter/material.dart' show TimeOfDay;
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/planner/data/planner_models.dart';
import 'package:piemath_app/features/planner/domain/planner_logic.dart';
import 'package:piemath_app/features/planner/ui/task_form.dart';
import 'package:piemath_app/shared/native/native.dart';

import 'planner_fixtures.dart';

StaffTask task(String id, {String status = 'PLANNED', String? due, List<String> assignees = const [], String? by}) =>
    StaffTask.fromJson(taskJson(id, status: status, dueDate: due, assignees: assignees, createdById: by ?? 'admin1'));

void main() {
  group('бүлэглэх (Улаанбаатарын цагаар)', () {
    // plannerNow = 2026-11-04 Лхагва UB 10:00
    test('өнгөрсөн, өнөөдөр, энэ 7 хоног (Ням хүртэл), дараа, хугацаагүй', () {
      expect(groupOf(task('a', due: '2026-11-02T00:00:00.000Z'), plannerNow), PlannerGroup.overdue);
      expect(groupOf(task('b', due: '2026-11-04T00:00:00.000Z'), plannerNow), PlannerGroup.today);
      expect(groupOf(task('c', due: '2026-11-07T00:00:00.000Z'), plannerNow), PlannerGroup.thisWeek);
      expect(groupOf(task('d', due: '2026-11-08T12:00:00.000Z'), plannerNow), PlannerGroup.thisWeek);
      expect(groupOf(task('e', due: '2026-11-09T00:00:00.000Z'), plannerNow), PlannerGroup.later);
      expect(groupOf(task('f'), plannerNow), PlannerGroup.later);
    });

    test('UTC-ийн огноогоор биш, UB-ийн өдрөөр', () {
      // UTC 11-04 17:00 = UB 11-05 01:00 → маргааш
      expect(groupOf(task('a', due: '2026-11-04T17:00:00.000Z'), plannerNow), PlannerGroup.thisWeek);
      // UTC 11-03 16:30 = UB 11-04 00:30 → өнөөдөр (UTC-ээр өчигдөр)
      expect(groupOf(task('b', due: '2026-11-03T16:30:00.000Z'), plannerNow), PlannerGroup.today);
      // UTC 11-01 15:59 = UB 11-01 23:59 → хожимдсон
      expect(groupOf(task('c', due: '2026-11-01T15:59:00.000Z'), plannerNow), PlannerGroup.overdue);
    });

    test('өнөөдрийн цаг өнгөрсөн ч «Өнөөдөр»-т үлдэнэ', () {
      // UB 08:00 (вэбийн огноо) — одоо 10:00
      expect(groupOf(task('a', due: '2026-11-04T00:00:00.000Z'), plannerNow), PlannerGroup.today);
    });

    test('дууссан, цуцалсан нь хугацаанаас үл хамааран «Дууссан»', () {
      expect(groupOf(task('a', status: 'DONE', due: '2026-10-01T00:00:00.000Z'), plannerNow), PlannerGroup.done);
      expect(groupOf(task('b', status: 'CANCELLED'), plannerNow), PlannerGroup.done);
      expect(groupOf(task('c', status: 'BLOCKED', due: '2026-10-01T00:00:00.000Z'), plannerNow), PlannerGroup.overdue);
    });

    test('Ням гарагт «Энэ 7 хоног» хоосон, Даваа нь «Дараа»', () {
      final sunday = UbDateTime(2026, 11, 8, 9);
      expect(groupOf(task('a', due: '2026-11-09T00:00:00.000Z'), sunday), PlannerGroup.later);
      expect(groupOf(task('b', due: '2026-11-08T00:00:00.000Z'), sunday), PlannerGroup.today);
    });

    test('buildRows: гарчигтай, дарааллаар, хоосон бүлэггүй', () {
      final items = flattenTasks([
        task('later', due: '2026-12-01T00:00:00.000Z'),
        task('today2', due: '2026-11-04T06:00:00.000Z'),
        task('today1', due: '2026-11-04T00:00:00.000Z'),
        task('done', status: 'DONE'),
      ]);
      final rows = buildRows(items, plannerNow);
      final labels = [
        for (final r in rows)
          switch (r) {
            PlannerHeaderRow(:final group, :final count) => '${group.label} $count',
            PlannerTaskRow(:final item) => item.task.id,
          },
      ];
      expect(labels, ['Өнөөдөр 2', 'today1', 'today2', 'Дараа 1', 'later', 'Дууссан 1', 'done']);
    });

    test('flattenTasks: дэд даалгавар эцгийнхээ дараа, эцэгтэйгээ', () {
      final parent = StaffTask.fromJson(
        taskJson(
          'p',
          subtasks: [
            taskJson('s1', parentTaskId: 'p'),
            taskJson('s2', parentTaskId: 'p'),
          ],
        ),
      );
      final flat = flattenTasks([parent]);
      expect([for (final i in flat) i.task.id], ['p', 's1', 's2']);
      expect(flat[1].parent?.id, 'p');
    });

    test('dueCountsByDay: нээлттэйг л UB өдрөөр тоолно', () {
      final counts = dueCountsByDay(
        flattenTasks([
          task('a', due: '2026-11-03T16:30:00.000Z'),
          task('b', due: '2026-11-04T00:00:00.000Z'),
          task('c', status: 'DONE', due: '2026-11-04T00:00:00.000Z'),
        ]),
      );
      expect(counts, {'2026-11-04': 2});
    });
  });

  group('эрх ба хүрээ (сервертэй ижил)', () {
    test('Багш «Миний өгсөн» хүрээгүй, удирдлагад гурвуулаа', () {
      expect(scopesFor(UserRole.teacher), [PlannerScope.mine, PlannerScope.all]);
      expect(scopesFor(UserRole.teacherPlus), PlannerScope.values);
      expect(scopesFor(UserRole.admin), PlannerScope.values);
      expect(defaultScope(UserRole.teacher), PlannerScope.mine);
      expect(defaultScope(UserRole.admin), PlannerScope.all);
    });

    test('засах, үүсгэх — зөвхөн Админ, Багш+', () {
      expect(canEditAll(UserRole.admin), isTrue);
      expect(canEditAll(UserRole.teacherPlus), isTrue);
      expect(canEditAll(UserRole.teacher), isFalse);
      expect(canEditAll(UserRole.student), isFalse);
    });

    test('Багш зөвхөн өөрт оноогдсон даалгаврын төлөвийг солино', () {
      final mine = task('a', assignees: ['t1']);
      final other = task('b', assignees: ['t2']);
      expect(canChangeStatus(mine, role: UserRole.teacher, userId: 't1'), isTrue);
      expect(canChangeStatus(other, role: UserRole.teacher, userId: 't1'), isFalse);
      expect(canChangeStatus(other, role: UserRole.teacherPlus, userId: 'x'), isTrue);
      expect(canChangeStatus(mine, role: UserRole.student, userId: 't1'), isFalse);
    });

    test('inScope: Миний = оноогдсон, Миний өгсөн = үүсгэсэн (дэд даалгаварт ч)', () {
      final parent = StaffTask.fromJson(
        taskJson(
          'p',
          createdById: 'boss',
          assignees: ['t2'],
          subtasks: [
            taskJson('s', parentTaskId: 'p', createdById: 'boss', assignees: ['t1']),
          ],
        ),
      );
      final flat = flattenTasks([parent]);
      expect(
        [
          for (final i in flat)
            if (inScope(i, PlannerScope.mine, 't1')) i.task.id,
        ],
        ['s'],
      );
      expect(
        [
          for (final i in flat)
            if (inScope(i, PlannerScope.created, 'boss')) i.task.id,
        ],
        ['p', 's'],
      );
      expect([
        for (final i in flat)
          if (inScope(i, PlannerScope.created, 't1')) i.task.id,
      ], isEmpty);
      expect(
        [
          for (final i in flat)
            if (inScope(i, PlannerScope.all, null)) i.task.id,
        ],
        ['p', 's'],
      );
      expect(inScope(flat.first, PlannerScope.created, null), isFalse);
    });

    test('matchesServerFilter, matchesSearch', () {
      final t = PlannerItem(
        StaffTask.fromJson(
          taskJson('a', title: 'Шалгалт', assignees: ['t1'], classroom: {'id': 'c1', 'name': '11-1'}, subject: 'MATH'),
        ),
      );
      expect(matchesServerFilter(t, (assigneeId: 't1', classroomId: 'c1', subject: TaskSubject.math)), isTrue);
      expect(matchesServerFilter(t, (assigneeId: 't2', classroomId: null, subject: null)), isFalse);
      expect(
        matchesServerFilter(t, (assigneeId: null, classroomId: null, subject: TaskSubject.socialStudies)),
        isFalse,
      );
      expect(matchesSearch(t, 'шалга'), isTrue);
      expect(matchesSearch(t, '11-1'), isTrue);
      expect(matchesSearch(t, 'овог нэр'), isTrue);
      expect(matchesSearch(t, 'байхгүй'), isFalse);
    });
  });

  group('маягтын шалгалт', () {
    test('гарчиг заавал', () {
      expect(validateTaskForm(title: '   '), PlannerMessages.titleRequired);
      expect(validateTaskForm(title: 'Ажил'), isNull);
    });

    test('дуусах огноо эхлэхээс өмнө байж болохгүй (UB өдрөөр)', () {
      expect(
        validateTaskForm(title: 'A', startDay: UbDateTime(2026, 11, 5), dueDay: UbDateTime(2026, 11, 4)),
        PlannerMessages.dateOrder,
      );
      expect(validateTaskForm(title: 'A', startDay: UbDateTime(2026, 11, 4), dueDay: UbDateTime(2026, 11, 4)), isNull);
      // Ижил өдөр, эрт цагтай ч зөв
      expect(
        validateTaskForm(
          title: 'A',
          startDay: UbDateTime(2026, 11, 4),
          dueDay: UbDateTime(2026, 11, 4),
          dueTime: const TimeOfDay(hour: 7, minute: 0),
        ),
        isNull,
      );
    });

    test('огноогүй цаг, сөрөг цаг', () {
      expect(
        validateTaskForm(title: 'A', dueTime: const TimeOfDay(hour: 9, minute: 0)),
        PlannerMessages.timeWithoutDate,
      );
      expect(validateTaskForm(title: 'A', estimateHours: -1), PlannerMessages.hoursNegative);
    });

    test('composeInstant: цаггүй = UTC шөнө дунд (вэбтэй ижил), цагтай = UB цаг', () {
      final day = UbDateTime(2026, 11, 4);
      expect(composeInstant(day), DateTime.utc(2026, 11, 4));
      expect(composeInstant(day, const TimeOfDay(hour: 14, minute: 30)), DateTime.utc(2026, 11, 4, 6, 30));
      expect(composeInstant(null, const TimeOfDay(hour: 1, minute: 0)), isNull);
    });

    test('composeStart: ижил өдрийн эрт цагтай дуусах бол эхлэх нь UB 00:00', () {
      final day = UbDateTime(2026, 11, 4);
      final early = composeInstant(day, const TimeOfDay(hour: 7, minute: 0));
      expect(composeStart(day, early), DateTime.utc(2026, 11, 3, 16));
      expect(composeStart(day, composeInstant(day)), DateTime.utc(2026, 11, 4));
      expect(composeStart(day, null), DateTime.utc(2026, 11, 4));
    });

    test('draftFromForm: алдааг маягт дотор (ApiError), зөв бол серверийн утга', () {
      expect(
        () =>
            draftFromForm(FormValues({'title': 'A', 'start': UbDateTime(2026, 11, 5), 'due': UbDateTime(2026, 11, 4)})),
        throwsA(isA<ApiError>().having((e) => e.message, 'message', PlannerMessages.dateOrder)),
      );
      final d = draftFromForm(
        FormValues({
          'title': ' Шалгалт ',
          'description': '',
          'status': TaskStatus.inProgress,
          'priority': TaskPriority.high,
          'due': UbDateTime(2026, 11, 6),
          'dueTime': const TimeOfDay(hour: 18, minute: 0),
          'assignees': const <Object?>{'t1', 't2'},
          'classroom': '',
          'subject': 'MATH',
          'hours': 4,
        }),
        parentTaskId: 'p',
      );
      expect(d.title, 'Шалгалт');
      expect(d.status, TaskStatus.inProgress);
      expect(d.dueDate, DateTime.utc(2026, 11, 6, 10));
      expect(d.classroomId, isNull);
      expect(d.subject, TaskSubject.math);
      expect(d.estimateHours, 4);
      expect(d.assigneeIds, unorderedEquals(['t1', 't2']));
      expect(d.parentTaskId, 'p');
    });

    test('splitInstant, hasTime', () {
      final dateOnly = splitInstant(DateTime.utc(2026, 11, 4));
      expect(dateOnly.day!.dateKey, '2026-11-04');
      expect(dateOnly.time, isNull);
      final timed = splitInstant(DateTime.utc(2026, 11, 4, 6, 30));
      expect(timed.time, const TimeOfDay(hour: 14, minute: 30));
      expect(hasTime(DateTime.utc(2026, 11, 4)), isFalse);
    });
  });

  group('replaceTask, insertTask, removeTask', () {
    test('дэд даалгаврын дотор ч ажиллана', () {
      final list = [
        StaffTask.fromJson(taskJson('p', subtasks: [taskJson('s', parentTaskId: 'p')])),
      ];
      final replaced = replaceTask(list, 's', (t) => t.copyWith(status: TaskStatus.done));
      expect(findTask(replaced, 's')!.status, TaskStatus.done);
      final inserted = insertTask(replaced, const StaffTask(id: 'n', title: 'N', parentTaskId: 'p'));
      expect(inserted.single.subtasks.map((s) => s.id), ['s', 'n']);
      expect(removeTask(inserted, 'n').single.subtasks.map((s) => s.id), ['s']);
      expect(removeTask(inserted, 'p'), isEmpty);
    });
  });
}
