import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/schedule/data/staff_schedule_models.dart';
import 'package:piemath_app/features/schedule/data/staff_schedule_repository.dart';
import 'package:piemath_app/features/schedule/domain/day_overlay.dart';
import 'package:piemath_app/features/schedule/domain/staff_schedule_logic.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'staff_fixtures.dart';

Map<String, Object?> bodyOf(RequestOptions r) => (r.data as Map).cast<String, Object?>();

RequestOptions last(FakeHttp http, String method, String path) =>
    http.requests.lastWhere((r) => r.method == method && r.path == path);

void main() {
  late FakeHttp http;
  late StaffScheduleRepository repo;

  setUp(() {
    http = staffHttp()
      ..json('POST', '/schedule/s1/split', {'ok': true})
      ..json('POST', '/schedule/bulk', {'ok': true})
      ..json('PATCH', '/schedule/s1/topic', {'ok': true})
      ..json('DELETE', '/schedule/s1/topic', {'ok': true})
      ..json('POST', '/schedule/teacher-workdays/exception', {'id': 'x9'})
      ..json('PUT', '/schedule/teacher-workdays/config', {'mode': 'FIXED', 'validFrom': '2026-09-01', 'validTo': null})
      ..json('POST', '/schedule/day/2026-11-05/publish', {'publishedAt': '2026-11-04T10:00:00.000Z', 'recipients': 42});
    repo = testContainer(http: http).read(staffScheduleRepositoryProvider);
  });

  group('унших', () {
    test('day-plan: огноогоор, мөр, эрх, ажиллах багш задална', () async {
      final plan = await repo.dayPlan('2026-11-05');
      expect(http.requests.single.queryParameters['date'], '2026-11-05');
      expect(plan.lessons.map((l) => l.scheduleId), ['s1', 's2']);
      expect(plan.canPlan, isFalse);
      expect(plan.rosterTeachers.single.id, 't1');
      final l = plan.lessons.first;
      expect(l.occurrenceDate, '2026-11-05');
      expect(l.room, '501');
      expect(l.students, 20);
      expect(l.planned, isFalse);
    });

    test('зөөгдсөн хичээл: анхны огноо түлхүүр болно', () {
      final l = DayLesson.fromJson({
        ...lessonJson(id: 's1', date: '2026-11-06'),
        'occurrenceDate': null,
        'exception': {'kind': 'MOVED', 'note': 'Багшийн хүсэлтээр', 'originalDate': '2026-11-05'},
      }, '2026-11-06');
      expect(l.moved?.originalDate, '2026-11-05');
      expect(l.occurrenceDate, '2026-11-05');
    });

    test('эрх: Админ, Багш дуудлагагүй; Багш+ олгогдсон ангиар', () async {
      expect((await repo.access(UserRole.admin)).all, isTrue);
      expect((await repo.access(UserRole.teacher)).any, isFalse);
      expect(http.count('GET', '/staff-capabilities/me'), 0);

      final scoped = staffHttp(
        caps: {
          'administrator': false,
          'grants': [
            {'capability': 'schedule.manage', 'scopeKey': 'c1'},
            {'capability': 'time.review', 'scopeKey': null},
          ],
        },
      );
      final a = await testContainer(http: scoped).read(staffScheduleRepositoryProvider).access(UserRole.teacherPlus);
      expect(a.all, isFalse);
      expect(a.canManage('c1'), isTrue);
      expect(a.canManage('c2'), isFalse);
    });

    test('эрх уншиж чадаагүй Багш+ зөвхөн харна', () async {
      final broken = FakeHttp()..error('GET', '/staff-capabilities/me', 500);
      final a = await testContainer(http: broken).read(staffScheduleRepositoryProvider).access(UserRole.teacherPlus);
      expect(a.any, isFalse);
    });

    test('ажлын өдөр, онцгой өдөр, тохиргоо', () async {
      final d = await repo.workDays(from: '2026-11-02', to: '2026-11-08');
      expect(http.requests.single.queryParameters, {'from': '2026-11-02', 'to': '2026-11-08'});
      expect(d.rows.single.weekday, 1);
      expect(d.exceptions.single.date, '2026-11-05');
      expect(d.exceptions.single.working, isFalse);
      expect(d.config.fixed, isTrue);
    });

    test('тогтмол хуваарийн мөр', () async {
      final slots = await repo.patternSlots();
      expect(slots, hasLength(7));
      expect(slots.first.from, '2026-09-01');
      expect(slots.first.students, 20);
    });
  });

  group('бичих: вэбтэй ижил бие', () {
    test('ахлах/туслах багш — анхны огноо, хоосныг null', () async {
      await repo.setStaffing('s1', date: '2026-11-05', leadId: 't2');
      expect(bodyOf(last(http, 'PUT', '/schedule/s1/staffing')), {
        'date': '2026-11-05',
        'leadTeacherId': 't2',
        'assistantTeacherId': null,
      });
    });

    test('цуцлах = CANCELLED', () async {
      await repo.cancelOccurrence('s1', date: '2026-11-05');
      expect(bodyOf(last(http, 'POST', '/schedule/s1/exceptions')), {'date': '2026-11-05', 'kind': 'CANCELLED'});
    });

    test('зөөх = MOVED, заагаагүй талбар илгээгдэхгүй', () async {
      await repo.moveOccurrence('s1', date: '2026-11-05', startMinute: 840, endMinute: 960);
      expect(bodyOf(last(http, 'POST', '/schedule/s1/exceptions')), {
        'date': '2026-11-05',
        'kind': 'MOVED',
        'newStartMinute': 840,
        'newEndMinute': 960,
      });
    });

    test('энэ ба цаашдын бүх: танхим, багш null бол цэвэрлэнэ', () async {
      await repo.splitSeries('s1', from: '2026-11-05', weekday: 4, startMinute: 600, endMinute: 720);
      expect(bodyOf(last(http, 'POST', '/schedule/s1/split')), {
        'from': '2026-11-05',
        'weekday': 4,
        'startMinute': 600,
        'endMinute': 720,
        'room': null,
        'teacherId': null,
      });
    });

    test('шинэ цаг: JS гарагууд', () async {
      await repo.bulkCreate(
        classroomId: 'c1',
        weekdays: [0, 6],
        startMinute: 600,
        endMinute: 720,
        effectiveFrom: '2026-11-04',
        room: '501',
      );
      expect(bodyOf(last(http, 'POST', '/schedule/bulk')), {
        'classroomId': 'c1',
        'weekdays': [0, 6],
        'startMinute': 600,
        'endMinute': 720,
        'room': '501',
        'effectiveFrom': '2026-11-04',
      });
    });

    test('сэдэв, хасах', () async {
      await repo.setTopic('s1', date: '2026-11-05', title: 'Логарифм');
      await repo.clearTopic('s1', date: '2026-11-05');
      expect(bodyOf(last(http, 'PATCH', '/schedule/s1/topic')), {'date': '2026-11-05', 'title': 'Логарифм'});
      expect(bodyOf(last(http, 'DELETE', '/schedule/s1/topic')), {'date': '2026-11-05'});
    });

    test('ажлын өдөр, онцгой тохиолдол, горим', () async {
      await repo.putWorkDays(teacherId: 't1', weekdays: [1, 3], parity: 2, sortOrder: 4);
      expect(bodyOf(last(http, 'PUT', '/schedule/teacher-workdays')), {
        'teacherId': 't1',
        'weekdays': [1, 3],
        'parity': 2,
        'sortOrder': 4,
      });
      await repo.addWorkException(teacherId: 't1', date: '2026-11-05', working: false);
      expect(bodyOf(last(http, 'POST', '/schedule/teacher-workdays/exception')), {
        'teacherId': 't1',
        'date': '2026-11-05',
        'working': false,
      });
      final cfg = await repo.putRosterConfig(mode: 'FIXED', validFrom: '2026-09-01');
      expect(cfg.validFrom, '2026-09-01');
    });

    test('нийтлэх', () async {
      final p = await repo.publishDay('2026-11-05');
      expect(p.recipients, 42);
    });
  });

  group('логик', () {
    test('эрх: Багш харна, Багш+ оноох ч танхим зөвхөн эрхтэй ангид', () {
      final teacher = StaffPermissions.of(UserRole.teacher, ScheduleAccess.everything);
      expect(teacher.canStaff, isFalse);
      expect(teacher.canManage('c1'), isFalse);
      expect(teacher.canEditRoster, isFalse);
      expect(teacher.canManageAny, isFalse);

      final plus = StaffPermissions.of(UserRole.teacherPlus, const ScheduleAccess(classIds: {'c1'}));
      expect(plus.canStaff, isTrue);
      expect(plus.canEditRoster, isTrue);
      expect(plus.canManage('c1'), isTrue);
      expect(plus.canManage('c2'), isFalse);

      final plusNoGrant = StaffPermissions.of(UserRole.teacherPlus, null);
      expect(plusNoGrant.canStaff, isTrue);
      expect(plusNoGrant.canManageAny, isFalse);

      final admin = StaffPermissions.of(UserRole.admin, ScheduleAccess.everything);
      expect(admin.canManage('c2'), isTrue);
      expect(admin.canPublish, isTrue);
    });

    test('сондгой/тэгш: 2026-08-31 = сондгой', () {
      expect(weekParityOf(UbDateTime(2026, 8, 31)), 1);
      expect(weekParityOf(UbDateTime(2026, 9, 6)), 1);
      expect(weekParityOf(UbDateTime(2026, 9, 7)), 2);
      expect(weekParityOf(UbDateTime(2026, 8, 30)), 2);
    });

    test('анхдагч өдөр: үдээс хойш маргааш', () {
      expect(defaultScheduleDay(UbDateTime(2026, 11, 4, 9)).dateKey, '2026-11-04');
      expect(defaultScheduleDay(UbDateTime(2026, 11, 4, 13)).dateKey, '2026-11-05');
    });

    test('дуусах цаг = эхлэх + хугацаа, 23:59-д хавчина', () {
      expect(endAfter(600, 120), 720);
      expect(endAfter(1380, 120), 1439);
    });

    test('шүүлтүүр: багш (ахлах ч), анги, миний', () {
      final l = DayLesson.fromJson(
        lessonJson(id: 's1', date: '2026-11-05', lead: {'id': 't9', 'name': 'Туяа'}, mine: true),
        '2026-11-05',
      );
      expect(const ScheduleFilter.teacher('t1', '').matchesLesson(l), isTrue);
      expect(const ScheduleFilter.teacher('t9', '').matchesLesson(l), isTrue);
      expect(const ScheduleFilter.teacher('t2', '').matchesLesson(l), isFalse);
      expect(const ScheduleFilter.classroom('c1', '').matchesLesson(l), isTrue);
      expect(const ScheduleFilter.mine().matchesLesson(l), isTrue);
    });

    test('нэг багш давхар цагт хоёр ангид', () {
      final lead = {'id': 't9', 'name': 'Туяа'};
      final a = DayLesson.fromJson(lessonJson(id: 'a', date: 'd', lead: lead), 'd');
      final b = DayLesson.fromJson(lessonJson(id: 'b', date: 'd', start: 660, end: 780, lead: lead), 'd');
      final c = DayLesson.fromJson(lessonJson(id: 'c', date: 'd', start: 720, end: 840, lead: lead), 'd');
      final clashes = teacherClashes([a, b, c]);
      expect(clashes, containsAll(['a|t9', 'b|t9', 'c|t9']));
      expect(teacherClashes([a, c]), isEmpty);
    });

    test('давхарга: нуусан, optimistic багш', () {
      final plan = DayPlan.fromJson(dayPlanJson('2026-11-05'));
      final o = DayOverlayState(
        hidden: {lessonKey('2026-11-05', 's2')},
        staff: {lessonKey('2026-11-05', 's1'): (lead: const StaffRef(id: 't2', name: 'Болд'), assistant: null)},
      );
      final shown = o.apply(plan);
      expect(shown.lessons.map((l) => l.scheduleId), ['s1']);
      expect(shown.lessons.single.lead?.id, 't2');
    });

    test('тогтмол мөр огноонд хүчинтэй эсэх', () {
      final s = PatternSlot.fromJson({...slotJson('p'), 'effectiveTo': '2026-11-10T00:00:00.000Z'});
      expect(isEffectiveOn(s, '2026-11-10'), isTrue);
      expect(isEffectiveOn(s, '2026-11-11'), isFalse);
      expect(isEffectiveOn(s, '2026-08-31'), isFalse);
      expect(nextOnOrAfter(1, UbDateTime(2026, 11, 4)).dateKey, '2026-11-09');
    });
  });
}
