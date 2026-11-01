import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/my_class/data/hub_models.dart';
import 'package:piemath_app/features/schedule/data/schedule_models.dart';
import 'package:piemath_app/shared/marks/marks.dart';

import '../student_fixtures.dart';

void main() {
  test('HubOverview: өнөөдөр, сүүлийн тэмдэглэгээ', () {
    final o = HubOverview.fromJson(overviewJson());
    expect(o.classrooms.single.name, '12-р анги, Үдээс хойш');
    expect(o.attendance.rate, 85);
    expect(o.homework.notDone, 2);
    expect(o.today!.room, '501');
    expect(o.latestMark!.status, HomeworkStatus.partial);
    final empty = HubOverview.fromJson(overviewJson(inClass: false, withToday: false, withMark: false));
    expect(empty.today, isNull);
    expect(empty.latestMark, isNull);
  });

  test('HubDays: ирц, хоцролт, тест, даалгавар', () {
    final d = HubDays.fromJson(daysJson());
    expect(d.prevMonth, '2026-10');
    expect(d.nextMonth, isNull);
    final first = d.days.first;
    expect(first.attendance!.status, AttendanceStatus.late);
    expect(first.attendance!.lateRange, LateRange.tenToThirty);
    expect(first.homework.status, isNull);
    expect(first.tests.last.closedReason, TestClosedReason.tomorrow);
    expect(first.theory.assignedToMe, isTrue);
    expect(first.teachers.single, 'Б. Сараа+');
  });

  test('танихгүй enum утга — алдаа биш, null', () {
    final day = HubDay.fromJson({
      ...dayJson(),
      'attendance': {'status': 'SOMETHING_NEW', 'lateRange': null},
      'homework': {'status': 'NEW', 'comment': null, 'checkedOn': null},
    });
    expect(day.attendance!.status, isNull);
    expect(day.homework.status, isNull);
  });

  test('HubTestDetail ба тест жагсаалт', () {
    final d = HubTestDetail.fromJson(testDetailJson());
    expect(d.problems.length, 2);
    expect(d.problems.last.choices.length, 3);
    final rows = [for (final j in testsJson()) HubTestRow.fromJson(j)];
    expect(rows.last.testId, isNull);
    expect(rows.last.closedReason, TestClosedReason.notAvailable);
  });

  test('AttendanceRow: @db.Date, анги null байж болно', () {
    final rows = [for (final j in attendanceJson()) AttendanceRow.fromJson(j)];
    expect(rows.first.lateRange, LateRange.fiveToTen);
    expect(rows[2].classroom, isNull);
  });

  test('MakeupItem: нээлттэй эсэх', () {
    final items = [for (final j in makeupJson()) MakeupItem.fromJson(j)];
    expect(items.first.isOpen, isTrue);
    expect(items.first.reason, MakeupReason.absent);
    expect(items.first.tests[2].online, isFalse);
    expect(items.last.isOpen, isFalse);
  });

  test('TheoryDay', () {
    final t = TheoryDay.fromJson(theoryDayJson());
    expect(t.photos.single.imageKeys, ['th1.jpg', 'th2.pdf']);
    expect(t.uploader!.name, 'Т. Ану');
  });

  test('Schedule: JS гараг хадгалагдана', () {
    final me = ScheduleMe.fromJson(scheduleMeJson());
    expect(me.entries.map((e) => e.weekday), [1, 3, 0]);
    expect(me.entries.first.teacher!.role, 'TEACHER_PLUS');
    final w = ScheduleWeek.fromJson(weekJson('2026-11-02'));
    expect(w.days.length, 7);
    expect(w.days.first.weekday, 1);
    expect(w.days.last.weekday, 0);
    expect(w.days[4].entries.single.exception!.kind, 'MOVED');
  });
}
