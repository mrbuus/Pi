import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { classTeacherWhere, isClassTeacher } from '../common/class-teachers';
import { ClassroomsController } from '../classrooms/classrooms.controller';
import { ClassroomsService } from '../classrooms/classrooms.service';
import { Role } from '../generated/prisma/enums';
import { ClassDashboardController } from './class-dashboard.controller';
import {
  avgOf,
  classMonthStats,
  daysOfMonth,
  lessonDaysOf,
  monthExamSummary,
  monthWeeks,
  monthWindow,
  shiftMonth,
  studentMonthStats,
  ubDay,
} from './class-month.logic';

const sched = (over: Partial<Parameters<typeof lessonDaysOf>[2]['schedules'][number]> = {}) => ({
  id: 's1',
  classroomId: 'c1',
  classroomName: '12-1',
  weekday: 2, // Мягмар (JS)
  startMinute: 600,
  endMinute: 690,
  teacherId: null,
  teacherName: null,
  room: null,
  subject: null,
  effectiveFrom: '2026-09-01',
  effectiveTo: null,
  ...over,
});

describe('class-month — сарын хүрээ', () => {
  it('УБ-ын сарын цонх: 00:00 УБ = өмнөх өдрийн 16:00 UTC', () => {
    const w = monthWindow('2026-10');
    expect(w.first).toBe('2026-10-01');
    expect(w.last).toBe('2026-10-31');
    expect(w.fromUtc.toISOString()).toBe('2026-09-30T16:00:00.000Z');
    expect(w.toUtc.toISOString()).toBe('2026-10-31T16:00:00.000Z');
    expect(monthWindow('2026-02').last).toBe('2026-02-28');
  });

  it('сар шилжүүлэх нь оны заагийг давна', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('УБ-ын өдөр: 23:30 UTC нь дараагийн өдөр', () => {
    expect(ubDay(new Date('2026-10-12T23:30:00Z'))).toBe('2026-10-13');
    expect(ubDay(new Date('2026-10-12T15:59:00Z'))).toBe('2026-10-12');
  });

  it('7 хоног Даваагаас эхэлж, сараар хязгаарлагдана', () => {
    const w = monthWeeks('2026-10'); // 10/01 = Пүрэв
    expect(w[0]).toEqual({ start: '2026-10-01', end: '2026-10-04' });
    expect(w[1]).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(w.at(-1)).toEqual({ start: '2026-10-26', end: '2026-10-31' });
    expect(daysOfMonth('2026-10')).toHaveLength(31);
  });
});

describe('class-month — бодит хичээлийн өдөр', () => {
  const base = { exceptions: [], topics: [], holidays: [] };

  it('Мягмар бүр (JS гараг 2) — 10-р сард 4 өдөр', () => {
    const days = lessonDaysOf('2026-10', 'c1', { ...base, schedules: [sched()] }, []);
    expect(days.map((d) => d.date)).toEqual(['2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27']);
    expect(days.every((d) => d.scheduled && d.weekday === 2)).toBe(true);
  });

  it('цуцалсан хасагдаж, зөөсөн шинэ өдөртөө, амралт тэмдэглэгдэнэ', () => {
    const days = lessonDaysOf(
      '2026-10',
      'c1',
      {
        schedules: [sched()],
        topics: [],
        exceptions: [
          { scheduleId: 's1', date: '2026-10-06', kind: 'CANCELLED', newDate: null, newStartMinute: null, newEndMinute: null, newRoom: null, note: null },
          { scheduleId: 's1', date: '2026-10-13', kind: 'MOVED', newDate: '2026-10-15', newStartMinute: null, newEndMinute: null, newRoom: null, note: null },
        ],
        holidays: [{ date: '2026-10-20', type: 'HOLIDAY', title: 'Амралт' }],
      },
      [],
    );
    expect(days.map((d) => [d.date, d.scheduled, d.holiday])).toEqual([
      ['2026-10-15', true, null],
      ['2026-10-20', false, 'Амралт'],
      ['2026-10-27', true, null],
    ]);
  });

  it('хуваарьгүй ч тэмдэглэгээтэй өдрийг нуухгүй, батлагдсаныг тэмдэглэнэ', () => {
    const days = lessonDaysOf('2026-10', 'c1', { ...base, schedules: [sched()] }, ['2026-10-08', '2026-09-30'], ['2026-10-13']);
    expect(days.find((d) => d.date === '2026-10-08')).toMatchObject({ scheduled: false, holiday: null });
    expect(days.find((d) => d.date === '2026-10-13')?.confirmed).toBe(true);
    expect(days.some((d) => d.date === '2026-09-30')).toBe(false);
  });

  it('өөр ангид хамаарах онцгой өдөр энэ ангид нөлөөлөхгүй', () => {
    const days = lessonDaysOf(
      '2026-10',
      'c1',
      { ...base, schedules: [sched()], holidays: [{ date: '2026-10-06', type: 'NO_CLASS', title: 'Өөр анги', classroomIds: ['c2'] }] },
      [],
    );
    expect(days[0]).toMatchObject({ date: '2026-10-06', scheduled: true, holiday: null });
  });
});

describe('class-month — статистик', () => {
  it('сурагчийн сарын тоо: ирц, даалгавар, шалгалт, бие даасан', () => {
    const s = studentMonthStats({
      attendance: { '2026-10-06': 'PRESENT', '2026-10-13': 'LATE', '2026-10-20': 'ABSENT', '2026-10-27': 'EXCUSED' },
      homework: { '2026-10-06': 'DONE', '2026-10-13': 'PARTIAL' },
      exams: [
        { percent: 80, absent: false },
        { percent: null, absent: true },
        { percent: null, absent: false },
      ],
      independent: {
        '2026-10-01': { problems: 10, correct: 6, judged: 8, tests: 0 },
        '2026-10-02': { problems: 0, correct: 0, judged: 0, tests: 1 },
      },
      testPercents: [70],
    });
    expect(s.attendance).toEqual({ rate: 67, present: 1, late: 1, absent: 1, excused: 1 });
    expect(s.homework).toEqual({ rate: 75, done: 1, partial: 1, notDone: 0 });
    expect(s.exam).toEqual({ avg: 80, taken: 1, missed: 1 });
    expect(s.independent).toEqual({ problems: 10, accuracy: 75, activeDays: 2, tests: 1, testAvg: 70 });
  });

  it('ангийн дундаж: өгөгдөлгүй сурагчийг хувиас хасна, бодлогын тоог бүгдээр', () => {
    const empty = studentMonthStats({ attendance: {}, homework: {}, exams: [], independent: {}, testPercents: [] });
    const full = studentMonthStats({
      attendance: { a: 'PRESENT' },
      homework: { a: 'DONE' },
      exams: [{ percent: 60, absent: false }],
      independent: { d: { problems: 8, correct: 4, judged: 4, tests: 0 } },
      testPercents: [],
    });
    const c = classMonthStats([empty, full]);
    expect(c.attendance).toBe(100);
    expect(c.homework).toBe(100);
    expect(c.exam).toBe(60);
    expect(c.problems).toBe(4);
    expect(classMonthStats([empty, empty, empty, empty, full]).problems).toBe(1.6);
    expect(c.accuracy).toBe(100);
    expect(avgOf([null, undefined, 1, 2])).toBe(2);
    expect(avgOf([])).toBeNull();
  });

  it('шалгалтын нэгтгэл: дүнтэй нь ирээгүйд тооцогдохгүй', () => {
    const e = monthExamSummary(['a', 'b', 'c'], new Map([['a', 90], ['b', 30]]), new Set(['b', 'c']));
    expect(e).toMatchObject({ students: 3, taken: 2, absent: 1, absentIds: ['c'], avg: 60, results: { a: 90, b: 30 } });
    expect(e.bins).toEqual([0, 1, 0, 0, 1]);
  });
});

describe('Ангийн хоёр багш', () => {
  it('туслах багш энгийн Багшийн эрхэд ангийн багштай адил', () => {
    expect(isClassTeacher({ teacherId: 'a', assistantTeacherId: 'b' }, 'b')).toBe(true);
    expect(isClassTeacher({ teacherId: 'a', assistantTeacherId: null }, 'b')).toBe(false);
    expect(isClassTeacher(null, 'a')).toBe(false);
    expect(classTeacherWhere('u')).toEqual({ OR: [{ teacherId: 'u' }, { assistantTeacherId: 'u' }] });
  });

  it('илгээгээгүй талбар хэвээр, хоосон бол чөлөөлнө, давхар хүн болохгүй', () => {
    const cur = { teacherId: 'a', assistantTeacherId: 'b' };
    expect(ClassroomsService.nextTeachers(cur, { assistantTeacherId: 'c' })).toEqual({ teacherId: 'a', assistantTeacherId: 'c' });
    expect(ClassroomsService.nextTeachers(cur, { teacherId: '' })).toEqual({ teacherId: null, assistantTeacherId: 'b' });
    expect(ClassroomsService.nextTeachers(cur, { teacherId: null, assistantTeacherId: null })).toEqual({ teacherId: null, assistantTeacherId: null });
    expect(() => ClassroomsService.nextTeachers(cur, { teacherId: 'b' })).toThrow('өөр хүн');
  });

  it('setTeachers: энгийн Багш солих эрхгүй, хичээл заадаггүй хүнийг татгалзана, аудит бичнэ', async () => {
    const audit = { record: jest.fn(async () => undefined) };
    const update = jest.fn(async (args: { data: unknown }) => ({ id: 'c1', ...(args.data as object) }));
    const prisma = {
      classroom: {
        findUnique: async () => ({ id: 'c1', archived: false, teacherId: 'a', assistantTeacherId: null }),
        update,
      },
      user: { findMany: jest.fn(async (args: { where: { id: { in: string[] } } }) => args.where.id.in.filter((id) => id !== 'x').map((id) => ({ id }))) },
    } as never;
    const svc = new ClassroomsService(prisma, audit as never);
    await expect(svc.setTeachers('c1', { assistantTeacherId: 'b' }, 'u', Role.TEACHER)).rejects.toThrow('Багш+');
    await expect(svc.setTeachers('c1', { assistantTeacherId: 'x' }, 'u', Role.TEACHER_PLUS)).rejects.toThrow('жагсаалтад алга');
    await svc.setTeachers('c1', { assistantTeacherId: 'b' }, 'u', Role.TEACHER_PLUS);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { teacherId: 'a', assistantTeacherId: 'b' } }));
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'Classroom', entityId: 'c1', before: { teacherId: 'a', assistantTeacherId: null }, after: { teacherId: 'a', assistantTeacherId: 'b' } }),
    );
  });

  it('маршрутын эрх: сарын тор — Багш ч; багш солих — Багш+/Админ', () => {
    const month = ClassDashboardController.prototype.month;
    expect(Reflect.getMetadata(ROLES_KEY, ClassDashboardController)).toEqual([Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER]);
    expect(Reflect.getMetadata(ROLES_KEY, month) ?? null).toBeNull();
    const set = ClassroomsController.prototype.setTeachers;
    expect(Reflect.getMetadata(ROLES_KEY, set)).toEqual([Role.ADMIN, Role.TEACHER_PLUS]);
    expect(Reflect.getMetadata(GUARDS_METADATA, ClassroomsController)).toContain(RolesGuard);
  });
});
