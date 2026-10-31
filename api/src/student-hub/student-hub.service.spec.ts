import { StudentHubService } from './student-hub.service';
import type { PrismaService } from '../prisma/prisma.service';

// УБ 2026-10-31 (Бямба) 18:00
const NOW = new Date('2026-10-31T10:00:00Z');
const d = (k: string) => new Date(`${k}T00:00:00.000Z`);

type Row = Record<string, any>;

function schedule(
  id: string,
  weekday: number,
  startMinute: number,
  room: string | null,
  extra: Row = {},
) {
  return {
    id,
    weekday,
    startMinute,
    endMinute: startMinute + 90,
    room,
    teacherId: 't3',
    effectiveFrom: d('2026-09-01'),
    effectiveTo: null,
    topics: [],
    staffing: [],
    exceptions: [],
    ...extra,
  };
}

/** s1 — 10А (c1), 2026-10-20-нд элссэн */
function makeDb() {
  const enrollment: Row = {
    classroomId: 'c1',
    joinedAt: new Date('2026-10-19T17:00:00Z'), // УБ 10-20 01:00
    classroom: {
      name: '10А',
      attendances: [
        { date: d('2026-10-15'), status: 'PRESENT', lateRange: null }, // элсэхээс өмнө — өөрийн ирц тул харагдана
        { date: d('2026-10-23'), status: 'PRESENT', lateRange: null },
        { date: d('2026-10-27'), status: 'LATE', lateRange: 'FIVE_TO_TEN' },
        { date: d('2026-10-30'), status: 'ABSENT', lateRange: null },
      ],
      dailyHomeworkMarks: [
        { date: d('2026-10-25'), status: 'DONE', comment: 'Сайн' },
        { date: d('2026-10-27'), status: 'PARTIAL', comment: 'Дутуу' },
        { date: d('2026-10-30'), status: 'NOT_DONE', comment: null },
      ],
      classSchedules: [
        schedule('sch1', 2, 900, '201'), // Мягмар
        schedule('sch2', 5, 600, '105', {
          staffing: [
            {
              date: d('2026-10-30'),
              leadTeacherId: 't4',
              assistantTeacherId: null,
            },
          ],
        }), // Баасан
        schedule('sch3', 0, 540, null, {
          topics: [
            {
              date: d('2026-10-25'),
              title: 'Квадрат тэгшитгэл',
              chapterId: 'ch1',
              photoStudentId: 's1',
            },
            {
              date: d('2026-10-18'),
              title: 'Хуучин сэдэв',
              chapterId: null,
              photoStudentId: null,
            }, // элсэхээс өмнө
          ],
        }), // Ням
      ],
    },
  };
  const sessions: Row[] = [
    {
      classroomId: 'c1',
      date: d('2026-10-27'),
      testId: 'A1',
      manualTitle: null,
      manualProblemCount: null,
    },
    {
      classroomId: 'c1',
      date: d('2026-10-27'),
      testId: null,
      manualTitle: 'Гарааны тест',
      manualProblemCount: 10,
    },
    {
      classroomId: 'c1',
      date: d('2026-10-27'),
      testId: 'DEL',
      manualTitle: null,
      manualProblemCount: null,
    },
    {
      classroomId: 'c1',
      date: d('2026-10-31'),
      testId: 'B2',
      manualTitle: null,
      manualProblemCount: null,
    },
    {
      classroomId: 'c1',
      date: d('2026-10-18'),
      testId: 'OLD',
      manualTitle: null,
      manualProblemCount: null,
    }, // элсэхээс өмнө
    {
      classroomId: 'c1',
      date: d('2026-10-23'),
      testId: 'K1',
      manualTitle: null,
      manualProblemCount: null,
    },
  ];
  const tests: Row[] = [
    {
      id: 'A1',
      title: 'Тест 18',
      variantLabel: 'А',
      type: 'DAILY',
      deletedAt: null,
      _count: { problems: 12 },
    },
    {
      id: 'B2',
      title: 'Тест 19',
      variantLabel: 'B',
      type: 'DAILY',
      deletedAt: null,
      _count: { problems: 8 },
    },
    {
      id: 'DEL',
      title: 'Устсан',
      variantLabel: null,
      type: 'DAILY',
      deletedAt: new Date(),
      _count: { problems: 1 },
    },
    {
      id: 'OLD',
      title: 'Хуучин тест',
      variantLabel: 'A',
      type: 'DAILY',
      deletedAt: null,
      _count: { problems: 5 },
    },
    {
      id: 'K1',
      title: '1000 бодлого',
      variantLabel: null,
      type: 'THOUSAND',
      deletedAt: null,
      _count: { problems: 20 },
    },
  ];
  const records: Row[] = [
    {
      classroomId: 'c1',
      date: d('2026-10-27'),
      scheduleId: 'sch1',
      topic: 'Вектор',
      startMinute: 905,
      endMinute: 995,
      room: '202',
      leadTeacherId: 't1',
      leadTeacherName: 'Б. Болортуяа',
      assistantTeacherId: 't2',
      assistantTeacherName: 'У. Эмүжин',
      problemNumbersText: '1-12, 15',
    },
  ];
  const users: Row[] = [
    { id: 't1', firstName: 'Болортуяа', lastName: 'Бат', role: 'TEACHER_PLUS' },
    { id: 't2', firstName: 'Эмүжин', lastName: 'Ууганбаяр', role: 'TEACHER' },
    { id: 't3', firstName: 'Сараа', lastName: 'Ганбат', role: 'TEACHER' },
    { id: 't4', firstName: 'Тэмүүлэн', lastName: 'Дорж', role: 'TEACHER_PLUS' },
    { id: 's1', firstName: 'Анар', lastName: 'Бат', role: 'STUDENT' },
    { id: 's2', firstName: 'Сарнай', lastName: 'Очир', role: 'STUDENT' },
  ];
  const db: any = {
    enrollment: { findMany: jest.fn(async () => [enrollment]) },
    classTestSession: {
      findMany: jest.fn(async ({ where }: any) =>
        sessions.filter((s) => !where.testId || s.testId === where.testId),
      ),
    },
    lessonRecord: {
      findMany: jest.fn(async () => records),
      findFirst: jest.fn(async () => null),
    },
    lessonPhoto: {
      findMany: jest.fn(async () => [
        {
          classroomId: 'c1',
          date: d('2026-10-25'),
          studentId: 's2',
          imageKeys: ['a.jpg', 'b.pdf'],
        },
        {
          classroomId: 'c1',
          date: d('2026-10-25'),
          studentId: 's1',
          imageKeys: ['c.jpg'],
        },
        {
          classroomId: 'c1',
          date: d('2026-10-25'),
          studentId: 's2',
          imageKeys: [],
        },
      ]),
    },
    homeworkPhoto: {
      findMany: jest.fn(async () => [
        {
          id: 'hp2',
          classroomId: 'c1',
          lessonDate: d('2026-10-27'),
          fileKey: 'new.pdf',
          pages: 2,
          createdAt: new Date('2026-10-28T12:00:00Z'),
        },
        {
          id: 'hp1',
          classroomId: 'c1',
          lessonDate: d('2026-10-27'),
          fileKey: 'old.pdf',
          pages: 1,
          createdAt: new Date('2026-10-28T10:00:00Z'),
        },
      ]),
    },
    test: {
      findMany: jest.fn(async ({ where }: any) =>
        tests.filter((t) => where.id.in.includes(t.id)),
      ),
      findUnique: jest.fn(
        async ({ where }: any) => tests.find((t) => t.id === where.id) ?? null,
      ),
    },
    testProblem: { findMany: jest.fn(async () => []) },
    user: {
      findMany: jest.fn(async ({ where }: any) =>
        users.filter((u) => where.id.in.includes(u.id)),
      ),
    },
    chapter: {
      findMany: jest.fn(async ({ where }: any) =>
        [{ id: 'ch1', title: 'Тэгшитгэл ба тэнцэтгэл биш' }].filter((c) =>
          where.id.in.includes(c.id),
        ),
      ),
    },
    attendance: { groupBy: jest.fn(async () => []) },
    dailyHomeworkMark: {
      groupBy: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
    },
    academicCalendarDay: { findMany: jest.fn(async () => []) },
  };
  return { db, enrollment, sessions, tests, records };
}

/** Бүх mock-ийн нийт дуудлага (асуулгын тоо) */
function callCount(db: any): number {
  let n = 0;
  for (const model of Object.values(db))
    for (const fn of Object.values(model as Row))
      if (jest.isMockFunction(fn)) n += fn.mock.calls.length;
  return n;
}

describe('StudentHubService', () => {
  let env: ReturnType<typeof makeDb>;
  let svc: StudentHubService;
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    env = makeDb();
    svc = new StudentHubService(env.db as PrismaService);
  });
  afterEach(() => jest.useRealTimers());

  describe('GET /student-hub/days', () => {
    it('хичээлийн өдрийн нэгдэл: ирц ∪ сэдэв ∪ тест ∪ бүртгэл, элсэхээс өмнөх нь зөвхөн өөрийн ирцтэй бол', async () => {
      const res = await svc.days('s1', '2026-10');
      expect(res).toMatchObject({
        month: '2026-10',
        prevMonth: '2026-09',
        nextMonth: null,
      });
      expect(res.days.map((x) => x.date)).toEqual([
        '2026-10-31',
        '2026-10-30',
        '2026-10-27',
        '2026-10-25',
        '2026-10-23',
        '2026-10-15',
      ]);
    });

    it("батлагдсан бүртгэлтэй өдөр: сэдэв, цаг, багш (Багш+ «+»), бодлого, тест, ирц, D' тэмдэглэгээ, зураг", async () => {
      const res = await svc.days('s1', '2026-10');
      const day = res.days.find((x) => x.date === '2026-10-27')!;
      expect(day).toEqual({
        date: '2026-10-27',
        classroomId: 'c1',
        classroomName: '10А',
        startMinute: 905,
        endMinute: 995,
        room: '202',
        topic: 'Вектор',
        teachers: ['Б. Болортуяа+', 'У. Эмүжин'],
        problemNumbers: '1-12, 15',
        tests: [
          { testId: 'A1', title: 'Тест 18', variant: 'A', open: true },
          { testId: null, title: 'Гарааны тест', variant: null, open: false },
        ],
        attendance: { status: 'LATE', lateRange: 'FIVE_TO_TEN' },
        homework: {
          status: 'NOT_DONE',
          comment: null,
          checkedOn: '2026-10-30',
        },
        theory: { count: 0, mine: false, canUpload: true, assignedToMe: false },
        homeworkPhoto: {
          id: 'hp2',
          fileKey: 'new.pdf',
          pages: 2,
          uploadedAt: '2026-10-28T12:00:00.000Z',
        },
        canSendHomework: true,
      });
    });

    it('бүртгэлгүй өдөр: хуваарийн цаг, сэдэв LessonTopic-оос, онолын зургийн тоо, томилолт', async () => {
      const res = await svc.days('s1', '2026-10');
      const day = res.days.find((x) => x.date === '2026-10-25')!;
      expect(day).toMatchObject({
        startMinute: 540,
        endMinute: 630,
        room: null,
        topic: 'Квадрат тэгшитгэл',
        teachers: ['Г. Сараа'],
        problemNumbers: null,
        tests: [],
        attendance: null,
        homework: {
          status: 'PARTIAL',
          comment: 'Дутуу',
          checkedOn: '2026-10-27',
        },
        theory: { count: 3, mine: true, canUpload: true, assignedToMe: true },
        homeworkPhoto: null,
      });
      // Өдрийн оноолт (LessonStaffing) хуваарийн багшийг давамгайлна
      expect(res.days.find((x) => x.date === '2026-10-30')!.teachers).toEqual([
        'Д. Тэмүүлэн+',
      ]);
    });

    it("өнөөдрийн тест маргааш нээгдэнэ; D' болоогүй бол тэмдэглэгээ null", async () => {
      const res = await svc.days('s1', '2026-10');
      const today = res.days.find((x) => x.date === '2026-10-31')!;
      expect(today.tests).toEqual([
        { testId: 'B2', title: 'Тест 19', variant: 'B', open: false },
      ]);
      expect(today.homework).toEqual({
        status: null,
        comment: null,
        checkedOn: null,
      });
      const fri = res.days.find((x) => x.date === '2026-10-30')!;
      expect(fri.homework).toEqual({
        status: null,
        comment: null,
        checkedOn: '2026-10-31',
      });
      const k1 = res.days.find((x) => x.date === '2026-10-23')!;
      expect(k1.tests).toEqual([
        { testId: 'K1', title: '1000 бодлого', variant: null, open: false },
      ]);
      expect(k1.homework).toEqual({
        status: 'DONE',
        comment: 'Сайн',
        checkedOn: '2026-10-25',
      });
    });

    it('14 хоногоос өмнөх өдөрт зураг илгээхгүй', async () => {
      const res = await svc.days('s1', '2026-10');
      const old = res.days.find((x) => x.date === '2026-10-15')!;
      expect(old.canSendHomework).toBe(false);
      expect(old.theory.canUpload).toBe(false);
      // D' = ангийн дараагийн хичээл (сурагч элсэхээс өмнөх 10-18 ч ангийн хичээлийн өдөр)
      expect(old.homework.checkedOn).toBe('2026-10-18');
    });

    it('нууц талбар сонгогдохгүй: Attendance.note, LessonRecord.description, dismissMode', async () => {
      await svc.days('s1', '2026-10');
      const enr = env.db.enrollment.findMany.mock.calls[0][0];
      expect(enr.where).toEqual({
        studentId: 's1',
        leftAt: null,
        classroom: { archived: false },
      });
      const cls = enr.select.classroom.select;
      expect(cls.attendances.select).not.toHaveProperty('note');
      expect(cls.attendances.where.studentId).toBe('s1');
      expect(cls.dailyHomeworkMarks.where.studentId).toBe('s1');
      expect(cls.classSchedules.select.topics.select).not.toHaveProperty(
        'dismissMode',
      );
      const rec = env.db.lessonRecord.findMany.mock.calls[0][0];
      expect(rec.select).not.toHaveProperty('description');
      expect(rec.where.cancelledAt).toBeNull();
      expect(
        env.db.homeworkPhoto.findMany.mock.calls[0][0].where,
      ).toMatchObject({ studentId: 's1', deletedAt: null });
      const json = JSON.stringify(await svc.days('s1', '2026-10'));
      expect(json).not.toContain('note');
      expect(json).not.toContain('description');
    });

    it("D'-ийг олохын тулд сарын гадна уншина, гэхдээ өнөөдрөөс хэтрэхгүй", async () => {
      await svc.days('s1', '2026-09');
      const range =
        env.db.enrollment.findMany.mock.calls[0][0].select.classroom.select
          .attendances.where.date;
      expect(range.gte).toEqual(d('2026-09-01'));
      expect(range.lte).toEqual(d('2026-10-31')); // 09-30 + 35 = 11-04 → өнөөдөр
      const hw =
        env.db.homeworkPhoto.findMany.mock.calls[0][0].where.lessonDate;
      expect(hw.lte).toEqual(d('2026-09-30'));
    });

    it('асуулга ≤ 8 (3 давалгаа), N+1 үгүй', async () => {
      await svc.days('s1', '2026-10');
      expect(callCount(env.db)).toBeLessThanOrEqual(8);
    });

    it('буруу/хэт эрт/ирээдүйн сар → 400; анги байхгүй бол хоосон', async () => {
      await expect(svc.days('s1', '2026-08')).rejects.toMatchObject({
        status: 400,
      });
      await expect(svc.days('s1', '2026-11')).rejects.toMatchObject({
        status: 400,
      });
      await expect(svc.days('s1', '10-2026')).rejects.toMatchObject({
        status: 400,
      });
      env.db.enrollment.findMany.mockResolvedValue([]);
      await expect(svc.days('s1')).resolves.toEqual({
        month: '2026-10',
        prevMonth: '2026-09',
        nextMonth: null,
        days: [],
      });
    });
  });

  describe('GET /student-hub/overview', () => {
    beforeEach(() => {
      env.db.enrollment.findMany.mockResolvedValue([
        {
          classroomId: 'c1',
          joinedAt: d('2026-09-01'),
          classroom: {
            name: '10А',
            classSchedules: [
              {
                ...schedule('sat', 6, 1080, '301'),
                topics: [{ date: d('2026-10-31'), title: 'Тригонометр' }],
              },
              schedule('sat-early', 6, 600, '101'),
            ],
          },
        },
      ]);
      env.db.attendance.groupBy.mockResolvedValue([
        { status: 'PRESENT', _count: { _all: 6 } },
        { status: 'LATE', _count: { _all: 1 } },
        { status: 'ABSENT', _count: { _all: 1 } },
      ]);
      env.db.dailyHomeworkMark.groupBy.mockResolvedValue([
        { status: 'DONE', _count: { _all: 3 } },
        { status: 'PARTIAL', _count: { _all: 2 } },
      ]);
      env.db.dailyHomeworkMark.findFirst.mockResolvedValue({
        date: d('2026-10-30'),
        status: 'PARTIAL',
        comment: 'Дутуу',
      });
    });

    it('ирц/даалгаврын хувь, өнөөдрийн дуусаагүй хичээл, сүүлийн тэмдэглэгээ', async () => {
      const res = await svc.overview('s1');
      expect(res).toEqual({
        classrooms: [{ id: 'c1', name: '10А' }],
        attendance: {
          total: 8,
          PRESENT: 6,
          LATE: 1,
          ABSENT: 1,
          EXCUSED: 0,
          rate: 88,
        },
        homework: { total: 5, DONE: 3, PARTIAL: 2, NOT_DONE: 0, rate: 80 },
        today: {
          classroomId: 'c1',
          classroomName: '10А',
          date: '2026-10-31',
          startMinute: 1080,
          endMinute: 1170,
          room: '301',
          topic: 'Тригонометр',
        },
        latestMark: { date: '2026-10-30', status: 'PARTIAL', comment: 'Дутуу' },
      });
      expect(env.db.attendance.groupBy.mock.calls[0][0].where).toEqual({
        studentId: 's1',
      });
      expect(callCount(env.db)).toBeLessThanOrEqual(6);
    });

    it('батлагдсан бүртгэлийн сэдэв давамгайлна', async () => {
      env.db.lessonRecord.findFirst.mockResolvedValue({
        topic: 'Синус теорем',
        startMinute: 1085,
        endMinute: 1170,
        room: '302',
      });
      const res = await svc.overview('s1');
      expect(res.today).toMatchObject({
        topic: 'Синус теорем',
        startMinute: 1085,
        room: '302',
      });
      expect(
        env.db.lessonRecord.findFirst.mock.calls[0][0].where,
      ).toMatchObject({ scheduleId: 'sat', cancelledAt: null });
    });

    it('бүх ангийн амралтын өдөр эсвэл цуцалсан бол today = null', async () => {
      env.db.academicCalendarDay.findMany.mockResolvedValue([
        { type: 'HOLIDAY', title: 'Амралт', classrooms: [] },
      ]);
      expect((await svc.overview('s1')).today).toBeNull();
      env.db.academicCalendarDay.findMany.mockResolvedValue([]);
      env.db.enrollment.findMany.mockResolvedValue([
        {
          classroomId: 'c1',
          joinedAt: d('2026-09-01'),
          classroom: {
            name: '10А',
            classSchedules: [
              schedule('sat', 6, 1080, '301', {
                exceptions: [
                  {
                    date: d('2026-10-31'),
                    kind: 'CANCELLED',
                    newDate: null,
                    newStartMinute: null,
                    newEndMinute: null,
                    newRoom: null,
                  },
                ],
              }),
            ],
          },
        },
      ]);
      expect((await svc.overview('s1')).today).toBeNull();
    });

    it('мөргүй сурагч: хувь 0, latestMark null', async () => {
      env.db.enrollment.findMany.mockResolvedValue([]);
      env.db.attendance.groupBy.mockResolvedValue([]);
      env.db.dailyHomeworkMark.groupBy.mockResolvedValue([]);
      env.db.dailyHomeworkMark.findFirst.mockResolvedValue(null);
      const res = await svc.overview('s1');
      expect(res).toMatchObject({
        classrooms: [],
        today: null,
        latestMark: null,
      });
      expect(res.attendance.rate).toBe(0);
      expect(res.homework.rate).toBe(0);
    });
  });

  describe('GET /student-hub/tests', () => {
    it('анги хийсэн тестүүд: нээх дүрэм, гарааны тест, устсан ба элсэхээс өмнөх нь хасагдана', async () => {
      const rows = await svc.tests('s1');
      expect(rows).toEqual([
        {
          testId: 'B2',
          title: 'Тест 19',
          variant: 'B',
          date: '2026-10-31',
          classroomName: '10А',
          problemCount: 8,
          open: false,
        },
        {
          testId: 'A1',
          title: 'Тест 18',
          variant: 'A',
          date: '2026-10-27',
          classroomName: '10А',
          problemCount: 12,
          open: true,
        },
        {
          testId: null,
          title: 'Гарааны тест',
          variant: null,
          date: '2026-10-27',
          classroomName: '10А',
          problemCount: 10,
          open: false,
        },
        {
          testId: 'K1',
          title: '1000 бодлого',
          variant: null,
          date: '2026-10-23',
          classroomName: '10А',
          problemCount: 20,
          open: false,
        },
      ]);
      expect(callCount(env.db)).toBeLessThanOrEqual(3);
    });

    it('хайлт том жижиг үсэг ялгахгүй', async () => {
      expect((await svc.tests('s1', 'тест 18')).map((r) => r.testId)).toEqual([
        'A1',
      ]);
      expect((await svc.tests('s1', 'ГАРААНЫ')).map((r) => r.title)).toEqual([
        'Гарааны тест',
      ]);
      expect(await svc.tests('s1', 'байхгүй')).toEqual([]);
    });
  });

  describe('GET /student-hub/tests/:testId', () => {
    it('нээгдсэн тест: бодлого, сонголт, зөв хариу; YouTube холбоосгүй', async () => {
      env.db.testProblem.findMany.mockResolvedValue([
        {
          problemId: 'p1',
          order: 1,
          problem: {
            id: 'p1',
            format: 'CHOICE',
            statementText: '$2+2$',
            imageKey: 'q.png',
            choices: ['3', '4'],
            correctAnswer: 'B',
            youtubeUrl: 'https://youtu.be/secret',
            choiceOptions: [],
          },
        },
      ]);
      const res = await svc.testDetail('s1', 'A1');
      expect(res).toEqual({
        testId: 'A1',
        title: 'Тест 18',
        variant: 'A',
        date: '2026-10-27',
        problems: [
          {
            id: 'p1',
            order: 1,
            stem: '$2+2$',
            imageKey: 'q.png',
            choices: [
              { label: 'A', text: '3', imageKey: null },
              { label: 'B', text: '4', imageKey: null },
            ],
            correctAnswer: 'B',
            hasVideo: true,
          },
        ],
      });
      expect(JSON.stringify(res)).not.toContain('youtu');
      const q = env.db.testProblem.findMany.mock.calls[0][0];
      expect(q.where).toEqual({ testId: 'A1', problem: { deletedAt: null } });
      expect(q.orderBy).toEqual({ order: 'asc' });
      expect(
        env.db.classTestSession.findMany.mock.calls[0][0].where,
      ).toMatchObject({ testId: 'A1', classroomId: { in: ['c1'] } });
    });

    it('өнөөдөр хийсэн тест 403 (маргааш нээгдэнэ), бодлого уншихгүй', async () => {
      await expect(svc.testDetail('s1', 'B2')).rejects.toMatchObject({
        status: 403,
        message: 'Энэ тест маргааш нээгдэнэ.',
      });
      expect(env.db.testProblem.findMany).not.toHaveBeenCalled();
    });

    it('анги хийгээгүй, элсэхээс өмнөх, 1000 бодлого → 403; устсан → 404', async () => {
      await expect(svc.testDetail('s1', 'NOPE')).rejects.toMatchObject({
        status: 403,
      });
      await expect(svc.testDetail('s1', 'OLD')).rejects.toMatchObject({
        status: 403,
      });
      await expect(svc.testDetail('s1', 'K1')).rejects.toMatchObject({
        status: 403,
      });
      await expect(svc.testDetail('s1', 'DEL')).rejects.toMatchObject({
        status: 404,
      });
      expect(env.db.testProblem.findMany).not.toHaveBeenCalled();
    });

    it('ангигүй сурагч 403', async () => {
      env.db.enrollment.findMany.mockResolvedValue([]);
      await expect(svc.testDetail('s1', 'A1')).rejects.toMatchObject({
        status: 403,
      });
    });
  });

  describe('GET /student-hub/theory', () => {
    it('q-гүй: сүүлийн 60 хоногийн бүх хичээлийн өдөр (зураггүй ч), илгээгчид', async () => {
      const rows = await svc.theory('s1');
      expect(rows.map((r) => r.date)).toEqual([
        '2026-10-31',
        '2026-10-30',
        '2026-10-27',
        '2026-10-25',
        '2026-10-23',
        '2026-10-15',
      ]);
      expect(rows.find((r) => r.date === '2026-10-25')).toEqual({
        classroomId: 'c1',
        classroomName: '10А',
        date: '2026-10-25',
        topic: 'Квадрат тэгшитгэл',
        tests: [],
        count: 3,
        uploaders: ['О. Сарнай', 'Б. Анар'],
        canUpload: true,
      });
      expect(rows.find((r) => r.date === '2026-10-27')).toMatchObject({
        topic: 'Вектор',
        tests: ['Тест 18', 'Гарааны тест'],
        count: 0,
        uploaders: [],
      });
      const range = env.db.lessonPhoto.findMany.mock.calls[0][0].where.date;
      expect(range).toEqual({ gte: d('2026-09-02'), lte: d('2026-10-31') });
    });

    it('хайлт: сэдэв, бүлгийн нэр, тестийн нэрээр (том жижиг үсэг ялгахгүй)', async () => {
      expect((await svc.theory('s1', 'КВАДРАТ')).map((r) => r.date)).toEqual([
        '2026-10-25',
      ]);
      expect((await svc.theory('s1', 'тэнцэтгэл')).map((r) => r.date)).toEqual([
        '2026-10-25',
      ]);
      expect((await svc.theory('s1', 'тест 19')).map((r) => r.date)).toEqual([
        '2026-10-31',
      ]);
      expect((await svc.theory('s1', 'вектор')).map((r) => r.date)).toEqual([
        '2026-10-27',
      ]);
      // q-тэй үед хүрээ 2026-09-01-ээс
      const calls = env.db.lessonPhoto.findMany.mock.calls;
      expect(calls[calls.length - 1][0].where.date.gte).toEqual(
        d('2026-09-01'),
      );
    });

    it('from/to шалгалт', async () => {
      await expect(
        svc.theory('s1', undefined, '2026-10-20', '2026-10-10'),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        svc.theory('s1', undefined, '2026-13-01'),
      ).rejects.toMatchObject({ status: 400 });
      const rows = await svc.theory(
        's1',
        undefined,
        '2026-10-24',
        '2026-10-28',
      );
      expect(rows.map((r) => r.date)).toEqual(['2026-10-27', '2026-10-25']);
    });
  });
});
