import { BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { countStatuses, monthRange, summarizeRecorders } from './board-logic';
import { AttendanceStatus, Role } from '../generated/prisma/enums';

const d = (k: string) => new Date(`${k}T00:00:00.000Z`);

describe('Төлөв бүрийн тоо (эзэн 2026-10-22)', () => {
  it('Ирсэн ба Хоцорсон ТУСДАА; тэмдэглээгүй = хүлээгдэж буй түлхүүрээс мөргүй нь', () => {
    const c = countStatuses(
      [
        { key: 'a', status: 'PRESENT' },
        { key: 'b', status: 'LATE' },
        { key: 'c', status: 'ABSENT' },
        { key: 'd', status: 'EXCUSED' },
        { key: 'e', status: 'PRESENT' },
      ],
      [
        { key: 'a', status: 'DONE' },
        { key: 'b', status: 'PARTIAL' },
        { key: 'c', status: 'NOT_DONE' },
        // тайлбар л бичсэн (төлөвгүй) мөр тоонд орохгүй, «тэмдэглээгүй» хэвээр
        { key: 'd', status: null },
      ],
      ['a', 'b', 'c', 'd', 'e', 'f'],
    );
    expect(c.attendance).toEqual({
      PRESENT: 2,
      LATE: 1,
      ABSENT: 1,
      EXCUSED: 1,
      unmarked: 1,
    });
    expect(c.homework).toEqual({ DONE: 1, PARTIAL: 1, NOT_DONE: 1, unmarked: 3 });
  });

  it('хүлээгдэх түлхүүргүй бол тэмдэглээгүй 0 (бүх хугацааны нийт)', () => {
    const c = countStatuses([{ key: 'x', status: 'LATE' }], []);
    expect(c.attendance.LATE).toBe(1);
    expect(c.attendance.unmarked).toBe(0);
    expect(c.homework.unmarked).toBe(0);
  });

  it('сарын муж: буруу формат null, 2-р сарын сүүлийн өдөр зөв', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthRange('2026-13')).toBeNull();
    expect(monthRange('2026-1')).toBeNull();
  });
});

describe('Хэн тэмдэглэсэн (эзэн 2026-10-22)', () => {
  it('багш тус бүрийн тоо, сүүлийн цаг; сүүлд нь эхэнд, цаггүй нь хойно', () => {
    const names = new Map([
      ['m', 'Б. Марал-Эрдэнэ'],
      ['b', 'Д. Болд'],
      ['x', 'А. Анар'],
    ]);
    const out = summarizeRecorders(
      [
        { markedById: 'm', at: new Date('2026-10-22T07:30:00Z') },
        { markedById: 'm', at: new Date('2026-10-22T07:32:00Z') },
        { markedById: 'b', at: new Date('2026-10-22T07:40:00Z') },
        { markedById: 'x', at: null },
      ],
      names,
    );
    expect(out).toEqual([
      { id: 'b', name: 'Д. Болд', at: '2026-10-22T07:40:00.000Z', count: 1 },
      { id: 'm', name: 'Б. Марал-Эрдэнэ', at: '2026-10-22T07:32:00.000Z', count: 2 },
      { id: 'x', name: 'А. Анар', at: null, count: 1 },
    ]);
  });

  function boardDb() {
    return {
      classroom: {
        findUnique: jest.fn().mockResolvedValue({ id: 'class', teacherId: 't', archived: false, riskCriteria: null }),
      },
      enrollment: { findMany: jest.fn().mockResolvedValue([{ studentId: 's1' }, { studentId: 's2' }]) },
      attendance: {
        findMany: jest.fn(({ select }: { select: Record<string, boolean> }) =>
          Promise.resolve(
            select.id
              ? [
                  { id: 'a1', markedById: 'maral' },
                  { id: 'a2', markedById: 'maral' },
                ]
              : [],
          ),
        ),
      },
      dailyHomeworkMark: {
        findMany: jest.fn(({ select }: { select: Record<string, boolean> }) =>
          Promise.resolve(
            select.updatedAt && !select.studentId
              ? [{ markedById: 'bold', updatedAt: new Date('2026-10-22T08:05:00Z') }]
              : [],
          ),
        ),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          { entityId: 'a1', actorId: 'maral', at: new Date('2026-10-22T07:31:00Z') },
          { entityId: 'a2', actorId: 'maral', at: new Date('2026-10-22T07:32:00Z') },
          // өөр багш өмнө нь тэмдэглэсэн (одоо сүүлийнх биш) — цагт нөлөөлөхгүй
          { entityId: 'a2', actorId: 'bold', at: new Date('2026-10-22T09:00:00Z') },
        ]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'maral', firstName: 'Марал-Эрдэнэ', lastName: 'Батаа' },
          { id: 'bold', firstName: 'Болд', lastName: 'Дорж' },
        ]),
      },
      assignment: { findMany: jest.fn().mockResolvedValue([]) },
      submission: { findMany: jest.fn().mockResolvedValue([]) },
    };
  }

  it('самбарын 15 сек шинэчлэлд: ирц — аудитын цаг, даалгавар — updatedAt, нэр «Б. Нэр»', async () => {
    const db = boardDb();
    const svc = new AttendanceService(db as never, {} as never, { record: jest.fn() } as never);
    const res = await svc.marks('class', '2026-10-22', 't', Role.TEACHER);
    expect(res.recordedBy).toEqual({
      attendance: [{ id: 'maral', name: 'Б. Марал-Эрдэнэ', at: '2026-10-22T07:32:00.000Z', count: 2 }],
      homework: [{ id: 'bold', name: 'Д. Болд', at: '2026-10-22T08:05:00.000Z', count: 1 }],
    });
    expect(db.auditLog.findMany.mock.calls[0][0].where).toEqual({
      entity: 'Attendance',
      entityId: { in: ['a1', 'a2'] },
    });
  });

  it('ирц аваагүй бол аудит руу хандахгүй, хоосон жагсаалт', async () => {
    const db = boardDb();
    db.attendance.findMany.mockResolvedValue([] as never);
    db.dailyHomeworkMark.findMany.mockResolvedValue([] as never);
    const svc = new AttendanceService(db as never, {} as never, { record: jest.fn() } as never);
    const res = await svc.marks('class', '2026-10-22', 't', Role.TEACHER);
    expect(res.recordedBy).toEqual({ attendance: [], homework: [] });
    expect(db.auditLog.findMany).not.toHaveBeenCalled();
  });
});

describe('Сурагчийн drawer — бүх ирц/даалгавар, сараар (эзэн 2026-10-22)', () => {
  function cardDb() {
    const att = [
      { date: d('2026-10-20'), status: AttendanceStatus.LATE, lateRange: null, note: 'автобус', classroomId: 'class', markedById: 't' },
      { date: d('2026-10-15'), status: AttendanceStatus.PRESENT, lateRange: null, note: null, classroomId: 'class', markedById: 't' },
      { date: d('2026-09-10'), status: AttendanceStatus.ABSENT, lateRange: null, note: null, classroomId: 'old', markedById: 't' },
    ];
    const hw = [
      { date: d('2026-10-20'), status: 'PARTIAL', comment: null, classroomId: 'class', markedById: 't' },
      { date: d('2026-09-10'), status: 'NOT_DONE', comment: null, classroomId: 'old', markedById: 't' },
    ];
    return {
      classroom: {
        findUnique: jest.fn().mockResolvedValue({ id: 'class', teacherId: 't', archived: false }),
        findMany: jest.fn().mockResolvedValue([{ id: 'old', name: '10-1' }]),
      },
      enrollment: { findFirst: jest.fn().mockResolvedValue({ joinedAt: d('2026-09-01') }) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's1',
          firstName: 'Сараа',
          lastName: 'Бат',
          studentCode: null,
          phone: null,
          createdAt: d('2026-09-01'),
          lastSeenAt: null,
          studentProfile: null,
        }),
        findMany: jest.fn().mockResolvedValue([{ id: 't', firstName: 'Марал', lastName: 'Батаа' }]),
      },
      attendance: { findMany: jest.fn().mockResolvedValue(att) },
      dailyHomeworkMark: { findMany: jest.fn().mockResolvedValue(hw) },
      submission: { count: jest.fn().mockResolvedValue(4) },
    };
  }
  const schedule = {
    // 10-р сард энэ ангийн хичээл: 13, 15, 20 (+ ирээдүйн 2099-д биш — өнгөрсөн л тоологдоно)
    expandDays: jest.fn().mockResolvedValue([
      { date: '2026-10-13', classes: [{}] },
      { date: '2026-10-14', classes: [] },
      { date: '2026-10-15', classes: [{}] },
      { date: '2026-10-20', classes: [{}] },
    ]),
  };

  it('сарын тоо (өнгөрсөн тэмдэглээгүй хичээл орно), бүх хугацааны нийт, Илгээсэн, эхний огноо', async () => {
    const db = cardDb();
    const svc = new AttendanceService(db as never, schedule as never, { record: jest.fn() } as never);
    const res = await svc.studentCard('class', 's1', '2026-10-20', 't', Role.TEACHER);
    expect(res.month.from).toBe('2026-10-01');
    expect(res.month.counts.attendance).toEqual({ PRESENT: 1, LATE: 1, ABSENT: 0, EXCUSED: 0, unmarked: 1 });
    expect(res.month.counts.homework).toEqual({ DONE: 0, PARTIAL: 1, NOT_DONE: 0, unmarked: 2 });
    expect(res.month.attendance[0]).toMatchObject({ date: '2026-10-20', status: 'LATE', note: 'автобус', markedBy: 'Б. Марал', classroom: null });
    expect(res.history.totals.attendance).toEqual({ PRESENT: 1, LATE: 1, ABSENT: 1, EXCUSED: 0, unmarked: 0 });
    expect(res.history.totals.homework).toMatchObject({ PARTIAL: 1, NOT_DONE: 1 });
    expect(res.history.sent).toBe(4);
    expect(res.history.first).toBe('2026-09-10');
    // Бүх ангийн мөр (анги сольсон ч түүх алдагдахгүй)
    expect(db.attendance.findMany.mock.calls[0][0].where).toEqual({ studentId: 's1' });
  });

  it('өөр сар руу: өмнөх ангийн мөр ангийн нэртэй; буруу сар 400', async () => {
    const db = cardDb();
    const svc = new AttendanceService(db as never, schedule as never, { record: jest.fn() } as never);
    const res = await svc.studentCard('class', 's1', '2026-10-20', 't', Role.TEACHER, '2026-09');
    expect(res.month.from).toBe('2026-09-01');
    expect(res.month.attendance).toEqual([
      expect.objectContaining({ date: '2026-09-10', status: 'ABSENT', classroom: '10-1' }),
    ]);
    expect(res.month.homework).toEqual([expect.objectContaining({ date: '2026-09-10', status: 'NOT_DONE', classroom: '10-1' })]);
    await expect(svc.studentCard('class', 's1', '2026-10-20', 't', Role.TEACHER, '2026/09')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
