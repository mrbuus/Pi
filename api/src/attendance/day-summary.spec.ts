import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { AttendanceController } from './attendance.controller';
import { summarizeDay } from './day-summary.logic';

describe('summarizeDay — «Өнөөдөр» тойм (эзэн 2026-10-31)', () => {
  const classes = [
    { id: 'c1', name: '12-2', type: 'CLASSROOM', lessons: [{ scheduleId: 's2', startMinute: 900, room: '502' }, { scheduleId: 's1', startMinute: 600, room: '501' }] },
    { id: 'c2', name: 'Онлайн', type: 'ONLINE', lessons: [{ scheduleId: 's3', startMinute: 1080, room: null }] },
  ];
  const enrolled = ['a', 'b', 'c', 'd'].map((studentId) => ({ classroomId: 'c1', studentId })).concat([{ classroomId: 'c2', studentId: 'x' }]);

  it('ирц, даалгаврыг төрлөөр тоолж, тэмдэглээгүйг үлдэгдлээр; гарсан сурагчийг тоолохгүй', () => {
    const [c1] = summarizeDay(
      classes,
      enrolled,
      [
        { classroomId: 'c1', studentId: 'a', status: 'PRESENT' },
        { classroomId: 'c1', studentId: 'b', status: 'LATE' },
        { classroomId: 'c1', studentId: 'c', status: 'ABSENT' },
        { classroomId: 'c1', studentId: 'gone', status: 'PRESENT' },
      ],
      [
        { classroomId: 'c1', studentId: 'a', status: 'DONE' },
        { classroomId: 'c1', studentId: 'b', status: 'NOT_DONE' },
        { classroomId: 'c1', studentId: 'c', status: null },
      ],
      new Set(['s1']),
    );
    expect(c1).toMatchObject({
      students: 4,
      startMinute: 600,
      room: '501',
      attendance: { present: 1, late: 1, absent: 1, excused: 0, unmarked: 1 },
      homework: { done: 1, partial: 0, notDone: 1, unmarked: 2 },
      confirmed: false,
    });
  });

  it('онлайн ангид даалгавар null; бүх хичээл батлагдсан бол confirmed', () => {
    const [, c2] = summarizeDay(classes, enrolled, [], [], new Set(['s3']));
    expect(c2.homework).toBeNull();
    expect(c2.confirmed).toBe(true);
    expect(c2.attendance.unmarked).toBe(1);
  });

  it('маршрут: ажилтан бүгд (самбартай ижил эрх)', () => {
    const roles = [...Reflect.getMetadata(ROLES_KEY, AttendanceController.prototype.daySummary)].sort();
    expect(roles).toEqual([Role.ADMIN, Role.TEACHER, Role.TEACHER_PLUS].sort());
  });
});
