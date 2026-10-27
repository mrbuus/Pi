import { Role } from '../generated/prisma/enums';
import { AssignmentsService } from './assignments.service';
import {
  loadLessonTopics,
  resolveAssignmentLessonDate,
  withHomeworkLessons,
} from './homework-lesson';
import {
  assignmentLessonKey,
  buildHomeworkLesson,
  dayGenitive,
  mnWeekday,
  resolveLessonTopic,
} from './homework-lesson.logic';

const d = (key: string) => new Date(`${key}T00:00:00.000Z`);

describe('homework lesson label (эзэн 2026-10-27)', () => {
  it('topic known: «10-р сарын 26 — Логарифм тэгшитгэл 4-5»', () => {
    const lesson = buildHomeworkLesson('2026-10-26', 'Логарифм тэгшитгэл 4-5');
    expect(lesson).toEqual({
      date: '2026-10-26',
      weekday: 'Даваа',
      dateText: '10-р сарын 26',
      topic: 'Логарифм тэгшитгэл 4-5',
      label: '10-р сарын 26 — Логарифм тэгшитгэл 4-5',
    });
    expect(lesson.label).not.toContain('·');
  });

  it('topic unknown: «10-р сарын 26-ны даалгавар»', () => {
    for (const topic of [null, undefined, '', '   ']) {
      const lesson = buildHomeworkLesson('2026-10-26', topic);
      expect(lesson.topic).toBeNull();
      expect(lesson.label).toBe('10-р сарын 26-ны даалгавар');
    }
  });

  it('genitive suffix follows the spoken last digit', () => {
    expect(dayGenitive(1)).toBe('1-ний');
    expect(dayGenitive(4)).toBe('4-ний');
    expect(dayGenitive(9)).toBe('9-ний');
    expect(dayGenitive(21)).toBe('21-ний');
    expect(dayGenitive(10)).toBe('10-ны');
    expect(dayGenitive(26)).toBe('26-ны');
    expect(dayGenitive(30)).toBe('30-ны');
    expect(buildHomeworkLesson('2026-11-01', null).label).toBe(
      '11-р сарын 1-ний даалгавар',
    );
  });

  it('weekday uses the calendar day (Monday 2026-10-26, Wednesday 2026-10-28)', () => {
    expect(mnWeekday('2026-10-26')).toBe('Даваа');
    expect(mnWeekday('2026-10-28')).toBe('Лхагва');
  });

  it('free-text topic is kept as written (whitespace collapsed)', () => {
    const topic = resolveLessonTopic({
      planTitle: '  Давталт:   $\\log_2 x$ бодлого ',
    });
    expect(topic).toBe('Давталт: $\\log_2 x$ бодлого');
    expect(buildHomeworkLesson('2026-10-26', topic).label).toBe(
      '10-р сарын 26 — Давталт: $\\log_2 x$ бодлого',
    );
  });

  it('topic source order: confirmed lesson (free text), then plan title, then linked tests', () => {
    expect(
      resolveLessonTopic({
        planTitle: 'Төлөвлөсөн',
        testTitles: ['Т1'],
        recordTopic: 'Ангид орсон чөлөөт сэдэв',
      }),
    ).toBe('Ангид орсон чөлөөт сэдэв');
    expect(
      resolveLessonTopic({
        planTitle: 'Төлөвлөсөн',
        testTitles: ['Т1'],
        recordTopic: '  ',
      }),
    ).toBe('Төлөвлөсөн');
    expect(
      resolveLessonTopic({
        planTitle: '',
        testTitles: ['Логарифм  1', 'Логарифм 2'],
        recordTopic: null,
      }),
    ).toBe('Логарифм 1, Логарифм 2');
    expect(resolveLessonTopic({})).toBeNull();
  });

  it('lesson key: stored lessonDate wins, legacy rows fall back to UB day of createdAt', () => {
    expect(
      assignmentLessonKey({
        lessonDate: d('2026-10-26'),
        createdAt: new Date('2026-10-27T03:00:00Z'),
      }),
    ).toBe('2026-10-26');
    // 2026-10-26 20:00 UTC = 2026-10-27 04:00 УБ
    expect(
      assignmentLessonKey({
        lessonDate: null,
        createdAt: new Date('2026-10-26T20:00:00Z'),
      }),
    ).toBe('2026-10-27');
  });
});

describe('lesson topics from the day plan', () => {
  function prismaWith(opts: {
    plans?: unknown[];
    records?: unknown[];
    tests?: unknown[];
  }) {
    return {
      lessonTopic: { findMany: jest.fn().mockResolvedValue(opts.plans ?? []) },
      lessonRecord: {
        findMany: jest.fn().mockResolvedValue(opts.records ?? []),
      },
      test: { findMany: jest.fn().mockResolvedValue(opts.tests ?? []) },
    };
  }

  it('reads free-text title, linked tests and lesson record per (class, date)', async () => {
    const prisma = prismaWith({
      plans: [
        {
          date: d('2026-10-26'),
          title: 'Логарифм тэгшитгэл 4-5',
          testIds: ['t1'],
          schedule: { classroomId: 'c1', startMinute: 540 },
        },
        {
          date: d('2026-10-27'),
          title: '',
          testIds: ['t2'],
          schedule: { classroomId: 'c1', startMinute: 540 },
        },
      ],
      records: [
        {
          classroomId: 'c2',
          date: d('2026-10-26'),
          topic: 'Бичлэгийн сэдэв',
          startMinute: 600,
        },
        // баталгаажсан бичлэгийн чөлөөт сэдэв төлөвлөгөөнөөс давамгайлна
        {
          classroomId: 'c1',
          date: d('2026-10-26'),
          topic: 'Логарифм тэгшитгэл, давталт',
          startMinute: 540,
        },
      ],
      tests: [{ id: 't2', title: 'Урвуу функц  1' }],
    });
    const map = await loadLessonTopics(prisma as never, [
      { classroomId: 'c1', date: '2026-10-26' },
      { classroomId: 'c1', date: '2026-10-27' },
      { classroomId: 'c2', date: '2026-10-26' },
      { classroomId: 'c2', date: '2026-10-28' },
    ]);
    expect(map.get('c1|2026-10-26')).toBe('Логарифм тэгшитгэл, давталт');
    expect(map.get('c1|2026-10-27')).toBe('Урвуу функц 1');
    expect(map.get('c2|2026-10-26')).toBe('Бичлэгийн сэдэв');
    expect(map.get('c2|2026-10-28')).toBeNull();
    // Тестийн нэрийг зөвхөн гарчиггүй төлөвлөгөөнд уншина
    expect(prisma.test.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['t2'] } } }),
    );
  });

  it('labels assignments; falls back to the date label when topics cannot be read', async () => {
    const ok = prismaWith({
      plans: [
        {
          date: d('2026-10-26'),
          title: 'Логарифм',
          testIds: [],
          schedule: { classroomId: 'c1', startMinute: 540 },
        },
      ],
    });
    const [a] = await withHomeworkLessons(ok as never, [
      {
        id: 'a1',
        classroomId: 'c1',
        lessonDate: d('2026-10-26'),
        createdAt: new Date('2026-10-27T02:00:00Z'),
      },
    ]);
    expect(a.id).toBe('a1');
    expect(a.lesson.label).toBe('10-р сарын 26 — Логарифм');

    const broken = {
      lessonTopic: { findMany: jest.fn().mockRejectedValue(new Error('db')) },
      lessonRecord: { findMany: jest.fn().mockResolvedValue([]) },
      test: { findMany: jest.fn() },
    };
    const [b] = await withHomeworkLessons(broken as never, [
      { classroomId: 'c1', lessonDate: d('2026-10-26'), createdAt: new Date() },
    ]);
    expect(b.lesson.label).toBe('10-р сарын 26-ны даалгавар');
  });
});

describe('submission linking: new homework is tied to the lesson it was given in', () => {
  function lessonDb(weekdays: number[]) {
    return {
      classSchedule: {
        findMany: jest.fn().mockResolvedValue(
          weekdays.map((weekday, i) => ({
            id: `s${i}`,
            weekday,
            effectiveFrom: d('2026-09-01'),
            effectiveTo: null,
          })),
        ),
      },
      classTestSession: { findMany: jest.fn().mockResolvedValue([]) },
      scheduleException: { findMany: jest.fn().mockResolvedValue([]) },
      academicCalendarDay: { findMany: jest.fn().mockResolvedValue([]) },
    };
  }

  it('keeps a lesson day, snaps a non-lesson day back to the previous lesson', async () => {
    const prisma = lessonDb([1, 3]); // Даваа, Лхагва
    expect(
      await resolveAssignmentLessonDate(prisma as never, 'c1', '2026-10-26'),
    ).toBe('2026-10-26');
    // Мягмар үүсгэсэн → Даваагийн хичээл
    expect(
      await resolveAssignmentLessonDate(prisma as never, 'c1', '2026-10-27'),
    ).toBe('2026-10-26');
  });

  it('falls back to the requested day when the class has no schedule', async () => {
    expect(
      await resolveAssignmentLessonDate(
        lessonDb([]) as never,
        'c1',
        '2026-10-27',
      ),
    ).toBe('2026-10-27');
  });

  it('create() stores lessonDate and returns the lesson label; student list carries it', async () => {
    const db = {
      ...lessonDb([1]),
      classroom: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'c1', archived: false, teacherId: 't' }),
      },
      storedFile: { findMany: jest.fn().mockResolvedValue([]) },
      assignment: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'a1',
            ...data,
            createdAt: new Date('2026-10-27T05:00:00Z'),
          }),
        ),
        findMany: jest.fn(),
      },
      enrollment: { findMany: jest.fn().mockResolvedValue([]) },
      lessonTopic: {
        findMany: jest.fn().mockResolvedValue([
          {
            date: d('2026-10-26'),
            title: 'Логарифм тэгшитгэл 4-5',
            testIds: [],
            schedule: { classroomId: 'c1', startMinute: 540 },
          },
        ]),
      },
      lessonRecord: { findMany: jest.fn().mockResolvedValue([]) },
      test: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const notify = jest.fn();
    const service = new AssignmentsService(
      db as never,
      {} as never,
      { notify } as never,
    );
    const created = await service.create(
      'c1',
      { title: 'Дэвтрийн 5-8', lessonDate: '2026-10-27' },
      't',
      Role.TEACHER,
    );
    const createArg = db.assignment.create.mock.calls[0] as [
      { data: { lessonDate: Date } },
    ];
    expect(createArg[0].data.lessonDate).toEqual(d('2026-10-26'));
    expect(created.lesson.label).toBe('10-р сарын 26 — Логарифм тэгшитгэл 4-5');
    expect(notify).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        body: '10-р сарын 26 — Логарифм тэгшитгэл 4-5',
      }),
    );

    db.enrollment.findMany.mockResolvedValue([
      {
        classroomId: 'c1',
        joinedAt: d('2026-09-01'),
        leftAt: null,
        classroom: { id: 'c1', name: '12-1', type: 'ONLINE' },
      },
    ]);
    db.assignment.findMany.mockResolvedValue([
      {
        id: 'a1',
        classroomId: 'c1',
        lessonDate: d('2026-10-26'),
        createdAt: new Date('2026-10-27T05:00:00Z'),
        deletedAt: null,
        submissions: [],
      },
      {
        id: 'a0',
        classroomId: 'c1',
        lessonDate: null,
        createdAt: new Date('2026-10-19T05:00:00Z'),
        deletedAt: null,
        submissions: [],
      },
    ]);
    const mine = await service.myAssignments('s1');
    expect(mine.map((a) => a.lesson.label)).toEqual([
      '10-р сарын 26 — Логарифм тэгшитгэл 4-5',
      '10-р сарын 19-ний даалгавар',
    ]);
    expect(mine[0].canSubmit).toBe(true);
  });

  it('rejects a malformed lessonDate with 400', async () => {
    const db = {
      classroom: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'c1', archived: false, teacherId: 't' }),
      },
      storedFile: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AssignmentsService(
      db as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.create(
        'c1',
        { title: 'x', lessonDate: '2026-02-30' },
        't',
        Role.TEACHER,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
