import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { HomeworkPracticeService } from './homework-practice.service';
import { HomeworkMarksService } from '../assignments/homework-marks.service';
import { Role } from '../generated/prisma/enums';
import { buildSlots, gradingInput, lessonsPassedAfter, mergeAnswers, redoOpen, remainingSec } from './homework-logic';

// УБ 2026-10-28 18:00 — анги 10-27-нд A хувилбар хийсэн, дараагийн хичээл 10-29
const NOW = new Date('2026-10-28T10:00:00Z');
const d = (k: string) => new Date(`${k}T00:00:00.000Z`);

type Row = Record<string, any>;

function problem(id: string, correct: string, extra: Row = {}) {
  return {
    problemId: id,
    order: Number(id.replace(/\D/g, '')) || 1,
    problem: {
      id,
      format: 'CHOICE',
      statementText: `$x$ ${id}`,
      imageKey: null,
      choices: ['1', '2', '3', '4', '5'],
      correctAnswer: correct,
      choiceOptions: [],
      ...extra,
    },
  };
}

function makeDb() {
  const tests: Row[] = [
    { id: 'A1', title: 'Тест 18', groupKey: 'G1', variantLabel: 'А', type: 'DAILY', deletedAt: null, isDraft: false, gradingMode: 'AUTO', timeLimitMin: 30, _count: { problems: 2 } },
    { id: 'B1', title: 'Тест 18', groupKey: 'G1', variantLabel: 'B', type: 'DAILY', deletedAt: null, isDraft: false, gradingMode: 'AUTO', timeLimitMin: 30, _count: { problems: 2 } },
    { id: 'T1', title: '1000 бодлого', groupKey: 'G2', variantLabel: 'A', type: 'THOUSAND', deletedAt: null, isDraft: false, gradingMode: 'AUTO', timeLimitMin: null, _count: { problems: 1 } },
    { id: 'T2', title: '1000 бодлого', groupKey: 'G2', variantLabel: 'B', type: 'THOUSAND', deletedAt: null, isDraft: false, gradingMode: 'AUTO', timeLimitMin: null, _count: { problems: 1 } },
  ];
  const sessions: Row[] = [
    { classroomId: 'c1', date: d('2026-10-27'), testId: 'A1' },
    { classroomId: 'c1', date: d('2026-10-27'), testId: 'T1' },
    { classroomId: 'c1', date: d('2026-10-29'), testId: null },
  ];
  const problems: Record<string, Row[]> = {
    B1: [problem('p1', 'B'), problem('p2', 'C')],
  };
  const enrollments: Row[] = [
    { studentId: 's1', classroomId: 'c1', joinedAt: d('2026-09-01'), classroom: { name: '10А' } },
  ];
  const attempts: Row[] = [];
  const accesses: Row[] = [];
  // Хичээлийн өдрийн нэгдэл (СУРАГЧ V2): өөрийн ирц, сэдэв, батлагдсан бүртгэл
  const attendance: Row[] = [];
  const topics: Row[] = [];
  const records: Row[] = [];
  // Хуваарь — ирээдүйн хичээл (урьдчилан илгээх)
  const schedules: Row[] = [];
  // Амралт/онцгой өдөр (AcademicCalendarDay) — ирээдүйн хичээлээс хасагдана
  const holidays: Row[] = [];
  const marks: Row[] = [{ classroomId: 'c1', date: d('2026-10-29'), status: 'PARTIAL', comment: null }];
  const inRange = (date: Date, r: any) =>
    (!r?.gte || date >= r.gte) &&
    (!r?.lte || date <= r.lte) &&
    (!r?.gt || date > r.gt) &&
    (!r?.in || r.in.some((x: Date) => x.getTime() === date.getTime()));
  const checks: Row[] = [];
  const photos: Row[] = [];
  const comments: Row[] = [];
  // Багшийн тохируулсан хугацаа (HomeworkDeadline)
  const deadlines: Row[] = [];
  const files: Record<string, Row> = {
    'f1.pdf': { ownerId: 's1', mime: 'application/pdf', size: 1000, pages: 3, expiresAt: new Date() },
    'f2.pdf': { ownerId: 's1', mime: 'application/pdf', size: 1000, pages: 2, expiresAt: new Date() },
    'x.pdf': { ownerId: 's2', mime: 'application/pdf', size: 1000, pages: 1, expiresAt: new Date() },
    'img.jpg': { ownerId: 's1', mime: 'image/jpeg', size: 1000, pages: null, expiresAt: new Date() },
    'nopages.pdf': { ownerId: 's1', mime: 'application/pdf', size: 1000, pages: null, expiresAt: new Date() },
  };
  let seq = 0;
  const matchAttempt = (a: Row, w: Row) =>
    (!w.id || a.id === w.id) &&
    (!w.status || a.status === w.status) &&
    (w.checksUsed === undefined || a.checksUsed === w.checksUsed);
  const db: any = {
    studentProfile: {
      findUnique: jest.fn(async ({ where }: any) =>
        ['s1', 's2'].includes(where.userId) ? { type: 'CLASSROOM', activatedAt: d('2026-09-01') } : null,
      ),
    },
    enrollment: {
      findMany: jest.fn(async ({ where }: any) =>
        enrollments.filter(
          (e) =>
            (!where.studentId || e.studentId === where.studentId) &&
            (!where.classroomId || e.classroomId === where.classroomId),
        ),
      ),
      findFirst: jest.fn(async ({ where }: any) =>
        enrollments.find(
          (e) =>
            e.studentId === where.studentId &&
            e.classroomId === where.classroomId &&
            !e.leftAt,
        ) ?? null,
      ),
    },
    classTestSession: {
      findMany: jest.fn(async ({ where }: any) =>
        sessions.filter(
          (s) =>
            (!where.classroomId || (where.classroomId.in ? where.classroomId.in.includes(s.classroomId) : s.classroomId === where.classroomId)) &&
            (!where.date?.gte || s.date >= where.date.gte) &&
            (!where.date?.lte || s.date <= where.date.lte) &&
            (!where.date?.lt || s.date < where.date.lt) &&
            (!where.date?.gt || s.date > where.date.gt) &&
            (!where.date?.in || where.date.in.some((x: Date) => x.getTime() === s.date.getTime())) &&
            (!where.testId?.in || where.testId.in.includes(s.testId)),
        ),
      ),
      findFirst: jest.fn(async ({ where }: any) =>
        sessions.find(
          (s) =>
            (where.classroomId === undefined || s.classroomId === where.classroomId) &&
            s.testId === where.testId &&
            (!(where.date instanceof Date) || s.date.getTime() === where.date.getTime()) &&
            (!where.date?.gte || s.date >= where.date.gte) &&
            (!where.date?.gt || s.date > where.date.gt),
        ) ?? null,
      ),
    },
    testAccess: {
      findMany: jest.fn(async ({ where }: any) =>
        accesses.filter(
          (a) =>
            (!where.classroomId || where.classroomId.in.includes(a.classroomId)) &&
            (!where.testId?.in || where.testId.in.includes(a.testId)) &&
            (!where.assignedAt?.gt || a.assignedAt > where.assignedAt.gt),
        ),
      ),
      findFirst: jest.fn(async ({ where }: any) =>
        accesses.find(
          (a) =>
            (where.classroomId === undefined || a.classroomId === where.classroomId) &&
            a.testId === where.testId &&
            (!where.assignedAt?.gt || a.assignedAt > where.assignedAt.gt),
        ) ?? null,
      ),
    },
    test: {
      findMany: jest.fn(async ({ where }: any) =>
        tests.filter(
          (t) =>
            (!where.id || where.id.in.includes(t.id)) &&
            (!where.groupKey || where.groupKey.in.includes(t.groupKey)) &&
            (!where.type || !where.type.notIn.includes(t.type)) &&
            (where.deletedAt !== null || t.deletedAt === null) &&
            (where.isDraft === undefined || t.isDraft === where.isDraft) &&
            (!where.gradingMode || t.gradingMode === where.gradingMode),
        ),
      ),
      findUnique: jest.fn(async ({ where }: any) => {
        const t = tests.find((x) => x.id === where.id);
        return t ? { timeLimitMin: (t as any).timeLimitMin ?? null } : null;
      }),
      findFirst: jest.fn(
        async ({ where }: any) =>
          tests.find(
            (t) =>
              t.id === where.id &&
              t.deletedAt === null &&
              (where.isDraft === undefined || t.isDraft === where.isDraft) &&
              (!where.gradingMode || t.gradingMode === where.gradingMode) &&
              (!where.type || !where.type.notIn.includes(t.type)),
          ) ?? null,
      ),
    },
    testProblem: {
      findMany: jest.fn(async ({ where }: any) => problems[where.testId] ?? []),
    },
    homeworkAttempt: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id) return attempts.find((a) => a.id === where.id) ?? null;
        const k = where.studentId_testId_lessonDate_round;
        return (
          attempts.find(
            (a) =>
              a.studentId === k.studentId &&
              a.testId === k.testId &&
              a.lessonDate.getTime() === k.lessonDate.getTime() &&
              (a.round ?? 1) === k.round,
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `att${++seq}`,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          answers: {},
          firstAnswers: null,
          checksUsed: 0,
          score: null,
          total: null,
          submittedAt: null,
          activeSec: 0,
          awaySec: 0,
          leaveCount: 0,
          openCount: 0,
          round: 1,
          ...data,
        };
        attempts.push(row);
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hit = attempts.filter((a) => matchAttempt(a, where));
        for (const a of hit)
          for (const [k, v] of Object.entries<any>(data))
            a[k] = v && typeof v === 'object' && 'increment' in v ? (a[k] ?? 0) + v.increment : v;
        return { count: hit.length };
      }),
      findMany: jest.fn(async ({ where }: any) =>
        attempts.filter(
          (a) =>
            a.studentId === where.studentId &&
            (!where.testId || where.testId.in.includes(a.testId)),
        ),
      ),
    },
    homeworkCheck: {
      create: jest.fn(async ({ data }: any) => {
        checks.push({ ...data, createdAt: new Date() });
        return data;
      }),
      findFirst: jest.fn(async ({ where, orderBy }: any) => {
        let list = checks.filter((c) => c.attemptId === where.attemptId);
        if (where.n?.gt !== undefined) list = list.filter((c) => c.n > where.n.gt);
        if (typeof where.n === 'number') list = list.filter((c) => c.n === where.n);
        list.sort((a, b) => (orderBy?.n === 'desc' ? b.n - a.n : a.n - b.n));
        return list[0] ?? null;
      }),
    },
    homeworkDeadline: {
      findMany: jest.fn(async ({ where }: any) =>
        deadlines.filter(
          (r) => where.classroomId.in.includes(r.classroomId) && inRange(r.lessonDate, where.lessonDate),
        ),
      ),
      findUnique: jest.fn(async ({ where }: any) => {
        const k = where.classroomId_lessonDate;
        return (
          deadlines.find(
            (r) => r.classroomId === k.classroomId && r.lessonDate.getTime() === k.lessonDate.getTime(),
          ) ?? null
        );
      }),
    },
    homeworkPhoto: {
      findFirst: jest.fn(async ({ where }: any) =>
        photos
          .filter(
            (p) =>
              p.studentId === where.studentId &&
              p.classroomId === where.classroomId &&
              p.lessonDate.getTime() === where.lessonDate.getTime() &&
              p.deletedAt === null &&
              (where.returnedAt?.not !== null || !!p.returnedAt),
          )
          .slice(-1)[0] ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const row = photos.find((p) => p.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
      findUnique: jest.fn(async ({ where }: any) => photos.find((p) => p.id === where.id) ?? null),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hit = photos.filter(
          (p) =>
            p.deletedAt === null &&
            (!where.id || p.id === where.id) &&
            (!where.studentId || p.studentId === where.studentId),
        );
        for (const p of hit) Object.assign(p, data);
        return { count: hit.length };
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `ph${++seq}`, createdAt: new Date(), deletedAt: null, ...data };
        photos.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        photos.filter((p) => p.studentId === where.studentId && p.deletedAt === null),
      ),
    },
    homeworkComment: {
      findMany: jest.fn(async ({ where }: any) =>
        comments.filter((c) => c.studentId === where.studentId && c.deletedAt === null),
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `cm${++seq}`, createdAt: new Date(), deletedAt: null, kind: 'NOTE', ...data };
        comments.push(row);
        return row;
      }),
    },
    user: { findMany: jest.fn(async () => [{ id: "t1", firstName: "Болор", lastName: "Бат", role: "TEACHER_PLUS" }]) },
    storedFile: { findUnique: jest.fn(async ({ where }: any) => files[where.key] ?? null) },
    dailyHomeworkMark: {
      findMany: jest.fn(async ({ where }: any) =>
        marks.filter(
          (m) =>
            where.classroomId.in.includes(m.classroomId) &&
            where.date.in.some((x: Date) => x.getTime() === m.date.getTime()),
        ),
      ),
    },
    attendance: {
      findMany: jest.fn(async ({ where }: any) =>
        attendance.filter(
          (a) =>
            a.studentId === where.studentId &&
            (!where.classroomId || a.classroomId === where.classroomId) &&
            inRange(a.date, where.date),
        ),
      ),
    },
    lessonTopic: {
      findMany: jest.fn(async ({ where }: any) =>
        topics
          .filter(
            (t) =>
              (!where.schedule || where.schedule.classroomId.in.includes(t.classroomId)) &&
              inRange(t.date, where.date) &&
              // Төлөвлөсөн тест (planned-tests) — testIds хоосон биш мөр л
              (where.testIds?.isEmpty !== false || (t.testIds ?? []).length > 0) &&
              (!where.testIds?.hasSome || (t.testIds ?? []).some((id: string) => where.testIds.hasSome.includes(id))),
          )
          .map((t) => ({
            ...t,
            testIds: t.testIds ?? [],
            schedule: { classroomId: t.classroomId, endMinute: t.endMinute ?? 0 },
          })),
      ),
      findFirst: jest.fn(async ({ where }: any) =>
        topics.find(
          (t) =>
            (!where.schedule || t.classroomId === where.schedule.classroomId) &&
            (t.testIds ?? []).includes(where.testIds.has) &&
            (!where.date?.gte || t.date >= where.date.gte) &&
            (!where.date?.gt || t.date > where.date.gt),
        ) ?? null,
      ),
    },
    lessonRecord: {
      findMany: jest.fn(async ({ where }: any) =>
        records.filter((r) => where.classroomId.in.includes(r.classroomId) && inRange(r.date, where.date)),
      ),
    },
    classSchedule: {
      findMany: jest.fn(async ({ where }: any) =>
        schedules.filter((r) => where.classroomId.in.includes(r.classroomId)),
      ),
    },
    // Сэдвийн анхны огнооны цуцлалт/зөөлт (loadLessonDays)
    scheduleException: {
      findMany: jest.fn(async () =>
        schedules.flatMap((r) =>
          (r.exceptions ?? []).map((x: Row) => ({ scheduleId: r.id, ...x })),
        ),
      ),
    },
    academicCalendarDay: { findMany: jest.fn(async () => holidays) },
    // Илгээсний дараах зөв хариу/бодолт (reviewOf): VERIFIED бодолттой бодлого
    problem: {
      findMany: jest.fn(async ({ where }: any) =>
        where.id.in.map((id: string) => ({
          id,
          youtubeUrl: id === 'p2' ? 'https://youtu.be/abcdefghijk' : null,
          analysis: id === 'p1' ? { status: 'VERIFIED', solutionOutline: '$x=2$' } : { status: 'AUTO_DRAFT', solutionOutline: 'ноорог' },
        })),
      ),
    },
    chapter: { findMany: jest.fn(async () => [{ id: 'ch1', title: 'Вектор' }]) },
    $transaction: jest.fn(async (fn: any) => fn(db)),
  };
  return { db, attempts, accesses, checks, photos, comments, deadlines, enrollments, sessions, tests, attendance, topics, records, marks, schedules, holidays };
}

describe('HomeworkPracticeService — танхимын сурагчийн гэрийн даалгавар', () => {
  let env: ReturnType<typeof makeDb>;
  let svc: HomeworkPracticeService;
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    env = makeDb();
    svc = new HomeworkPracticeService(env.db);
  });
  afterEach(() => jest.useRealTimers());

  it('жагсаалт: ангид A хийсэн өдөр → B хувилбар; 1000 бодлого хасагдана; хугацаа = дараагийн хичээл', async () => {
    const res = await svc.my('s1');
    expect(res.days).toHaveLength(1);
    const day = res.days[0];
    expect(day).toMatchObject({
      date: '2026-10-27',
      classroomId: 'c1',
      classroomName: '10А',
      deadlineAt: '2026-10-28T16:00:00.000Z',
      photo: null,
      mark: 'PARTIAL',
    });
    expect(day.items).toEqual([
      {
        testId: 'B1',
        title: 'Тест 18',
        variantLabel: 'B',
        problemCount: 2,
        timeLimitMin: 30,
        status: 'NOT_STARTED',
        attemptId: null,
        checksUsed: 0,
        maxChecks: 2,
        score: null,
        submittedAt: null,
        late: false,
      },
    ]);
    // THOUSAND хасагдсан
    expect(JSON.stringify(res)).not.toContain('T2');
  });

  it('ангид элсээгүй / өөр ангийн сурагчид юу ч гарахгүй', async () => {
    await expect(svc.my('s2')).resolves.toEqual({ days: [] });
    await expect(svc.start('s2', { testId: 'B1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('эрхгүй тест/огноо: ангийн өөрийн A, буруу өдөр, ирээдүй, 1000 бодлого — 403', async () => {
    await expect(svc.start('s1', { testId: 'A1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.start('s1', { testId: 'B1', date: '2026-10-26' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.start('s1', { testId: 'B1', date: '2026-10-29' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.start('s1', { testId: 'T2', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('start: зөв хариу, isCorrect хэзээ ч ирэхгүй; давтан дуудвал нэг оролдлого', async () => {
    const res = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    const json = JSON.stringify(res);
    expect(json).not.toMatch(/correctAnswer|isCorrect|solution|token/);
    expect(res).toMatchObject({
      status: 'IN_PROGRESS',
      deadlineAt: '2026-10-28T16:00:00.000Z',
      remainingSec: 1800,
      checksUsed: 0,
      maxChecks: 2,
      answers: {},
      lastCheck: null,
    });
    expect(res.problems[0]).toEqual({
      id: 'p1',
      order: 1,
      format: 'CHOICE',
      statementText: '$x$ p1',
      imageKey: null,
      choices: [
        { label: 'A', text: '1', imageKey: null },
        { label: 'B', text: '2', imageKey: null },
        { label: 'C', text: '3', imageKey: null },
        { label: 'D', text: '4', imageKey: null },
        { label: 'E', text: '5', imageKey: null },
      ],
    });
    const again = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(again.attemptId).toBe(res.attemptId);
    expect(env.attempts).toHaveLength(1);
  });

  it('өөр сурагчийн оролдлогыг хадгалах/шалгах/илгээх — 404', async () => {
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    await expect(svc.save('s2', attemptId, { p1: 'B' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.check('s2', attemptId, { p1: 'B' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.submit('s2', attemptId, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ангиас гарсан бол эхлүүлэх/илгээх үед бүтэн эрхийг дахин шалгана', async () => {
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    env.enrollments.length = 0;
    await expect(svc.start('s1', { testId: 'B1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.submit('s1', attemptId, { p1: 'B' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('autosave/шалгах хөнгөн: бүтэн жагсаалт дахин босгохгүй, Test уншихгүй, бодлого санах ойгоос', async () => {
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(env.attempts[0].timeLimitMin).toBe(30);
    const counts = () => ({
      enroll: env.db.enrollment.findMany.mock.calls.length,
      sess: env.db.classTestSession.findMany.mock.calls.length,
      tests: env.db.test.findMany.mock.calls.length,
      problems: env.db.testProblem.findMany.mock.calls.length,
    });
    const before = counts();
    await svc.save('s1', attemptId, { p1: 'B' });
    await svc.check('s1', attemptId, { p2: 'C' });
    expect(counts()).toEqual(before);
    expect(env.db.test.findUnique).not.toHaveBeenCalled();
    // MAX_DAYS цонхноос гадуурх хичээлийн өдрийн оролдлого — хадгалахгүй
    jest.setSystemTime(new Date('2026-12-15T02:00:00Z'));
    await expect(svc.save('s1', attemptId, { p1: 'A' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('эхэлсний дараа B-г ангид товловол «Шалгах» зөв/бурууг ХЭЛЭХГҮЙ (403)', async () => {
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    env.sessions.push({ classroomId: 'c1', date: d('2026-11-20'), testId: 'B1' });
    await expect(svc.check('s1', attemptId, { p1: 'B' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('B хувилбарыг анги дараа нь танхимд бодох бол гэрийн даалгавар болохгүй', async () => {
    env.sessions.push({ classroomId: 'c1', date: d('2026-11-20'), testId: 'B1' });
    // Хичээлийн өдөр хэвээр (зураг илгээнэ), онлайн даалгавар байхгүй
    expect((await svc.my('s1')).days.map((x) => [x.date, x.items])).toEqual([['2026-10-27', []]]);
    await expect(svc.start('s1', { testId: 'B1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('B хувилбар ирээдүйд ангид оноогдсон (TestAccess.assignedAt > одоо) бол гэрийн даалгавар болохгүй', async () => {
    env.accesses.push({ classroomId: 'c1', testId: 'B1', assignedAt: new Date('2026-11-05T00:00:00Z') });
    expect((await svc.my('s1')).days.map((x) => x.items)).toEqual([[]]);
    // Өмнө оноосон (өнгөрсөн) бол саад болохгүй
    env.accesses[0].assignedAt = new Date('2026-10-01T00:00:00Z');
    expect((await svc.my('s1')).days[0].items.map((i) => i.testId)).toEqual(['B1']);
  });

  it('шалгах: зөвхөн зөв/буруу, 2 удаа; 3 дахь нь 409; эхний хариу хадгалагдана', async () => {
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    await svc.save('s1', attemptId, { p1: 'A', bogus: 'X' });
    const first = await svc.check('s1', attemptId, {});
    expect(first).toEqual({ checksUsed: 1, results: { p1: 'WRONG', p2: 'BLANK' }, correct: 0, total: 2 });
    const second = await svc.check('s1', attemptId, { p1: 'B', p2: 'C' });
    expect(second).toEqual({ checksUsed: 2, results: { p1: 'CORRECT', p2: 'CORRECT' }, correct: 2, total: 2 });
    await expect(svc.check('s1', attemptId, { p1: 'B' })).rejects.toBeInstanceOf(ConflictException);
    const a = env.attempts[0];
    expect(a.firstAnswers).toEqual({ p1: 'A' });
    expect(env.checks.map((c) => c.n)).toEqual([1, 2]);
    expect(JSON.stringify(first)).not.toMatch(/"B"|"C"/); // зөв үсэг задрахгүй
    const resumed = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(resumed.lastCheck).toEqual({ p1: 'CORRECT', p2: 'CORRECT' });
    expect(resumed.answers).toEqual({ p1: 'B', p2: 'C' });
  });

  it('илгээх: оноо хадгална, давтан дуудвал ижил хариу, дараа нь autosave/шалгах 409', async () => {
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect((await svc.start('s1', { testId: 'B1', date: '2026-10-27' })).score).toBeNull();
    const res = await svc.submit('s1', attemptId, { p1: 'B', p2: 'D' });
    expect(res.score).toEqual({ correct: 1, total: 2 });
    const view = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(view).toMatchObject({ status: 'SUBMITTED', score: { correct: 1, total: 2 }, remainingSec: null });
    expect(res.results).toEqual({ p1: 'CORRECT', p2: 'WRONG' });
    expect(env.attempts[0]).toMatchObject({ status: 'SUBMITTED', score: 1, total: 2 });
    const again = await svc.submit('s1', attemptId, { p1: 'A' });
    expect(again).toEqual(res);
    await expect(svc.save('s1', attemptId, { p1: 'A' })).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.check('s1', attemptId, {})).rejects.toBeInstanceOf(ConflictException);
    const list = await svc.my('s1');
    expect(list.days[0].items[0]).toMatchObject({
      status: 'SUBMITTED',
      score: { correct: 1, total: 2 },
      late: false,
    });
  });

  it('хоцорсон: хугацаа (дараагийн хичээлийн 00:00) өнгөрсний дараа илгээвэл late', async () => {
    jest.setSystemTime(new Date('2026-10-28T10:00:00Z')); // УБ 10-28 18:00
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    jest.setSystemTime(new Date('2026-10-29T02:00:00Z')); // УБ 10-29 10:00 — хугацаа өнгөрсөн
    await svc.submit('s1', attemptId, { p1: 'B' });
    const list = await svc.my('s1');
    // 10-29 (дараагийн хичээл) өөрөө B-гүй хичээлийн өдөр болж эхэнд гарна
    expect(list.days.map((x) => [x.date, x.items.length])).toEqual([
      ['2026-10-29', 0],
      ['2026-10-27', 1],
    ]);
    expect(list.days[1].items[0].late).toBe(true);
  });

  it('багшийн хугацаа (эзэн 2026-11-05): цагаар хоцорсон тооцно; «хаагдана» бол хугацааны дараа эхлэх/илгээх/зураг 403', async () => {
    jest.setSystemTime(new Date('2026-10-28T10:00:00Z')); // УБ 10-28 18:00
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    // Багш: 10-28 21:00 хүртэл, хоцорч илгээж болно
    env.deadlines.push({ classroomId: 'c1', lessonDate: d('2026-10-27'), dueAt: new Date('2026-10-28T13:00:00Z'), allowLate: true });
    jest.setSystemTime(new Date('2026-10-28T14:00:00Z')); // УБ 22:00
    await svc.submit('s1', attemptId, { p1: 'B' });
    let list = await svc.my('s1');
    const day = list.days.find((x: any) => x.date === '2026-10-27')!;
    expect(day.deadlineAt).toBe('2026-10-28T13:00:00.000Z');
    expect(day.items[0].late).toBe(true);
    expect(day.closed).toBe(false);
    // «Хаагдана» болговол: хугацаа өнгөрсөн тул зураг ба шинэ оролдлого татгалзана
    env.deadlines[0].allowLate = false;
    list = await svc.my('s1');
    expect(list.days.find((x: any) => x.date === '2026-10-27')!.closed).toBe(true);
    await expect(
      svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f1.pdf', pages: 3 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    // Илгээсэн дүнгээ хаагдсан ч нээж харна
    await expect(svc.start('s1', { testId: 'B1', date: '2026-10-27' })).resolves.toBeTruthy();
    // Илгээгээгүй оролдлого хаагдсаны дараа эхлэхгүй
    env.attempts.splice(0, env.attempts.length);
    await expect(svc.start('s1', { testId: 'B1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('буцаасан даалгавар (эзэн 2026-11-05): хаагдсан ч дахин илгээнэ, тайлбар хадгалагдана, сурагч хариулна; дотоод тэмдэглэл очихгүй', async () => {
    jest.setSystemTime(new Date('2026-10-28T10:00:00Z'));
    const first = await svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f1.pdf', pages: 3, caption: '  3-р бодлого ойлгосонгүй  ' });
    expect(first).toMatchObject({ caption: '3-р бодлого ойлгосонгүй', returnedAt: null });
    // Хугацаа хаагдсан
    env.deadlines.push({ classroomId: 'c1', lessonDate: d('2026-10-27'), dueAt: new Date('2026-10-28T09:00:00Z'), allowLate: false });
    await expect(
      svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f2.pdf', pages: 2 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    // Багш буцаасан (returnedAt) + сурагчид харагдах сэтгэгдэл
    env.photos[env.photos.length - 1].returnedAt = new Date();
    env.comments.push({ id: 'cmT', classroomId: 'c1', studentId: 's1', lessonDate: d('2026-10-27'), authorId: 't1', authorRole: 'TEACHER_PLUS', kind: 'RETURN', body: '2-р хуудас бүдэг', createdAt: new Date(), deletedAt: null });
    const again = await svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f2.pdf', pages: 2 });
    expect(again).toMatchObject({ fileKey: 'f2.pdf', returnedAt: null, caption: null });
    // Хуучин зураг (тайлбартайгаа) зөөлөн устсан ч мөр үлдэнэ
    expect(env.photos.find((p) => p.fileKey === 'f1.pdf')).toMatchObject({ caption: '3-р бодлого ойлгосонгүй' });
    expect(env.photos.find((p) => p.fileKey === 'f1.pdf')!.deletedAt).toBeInstanceOf(Date);
    // Сурагч хариулна
    const reply = await svc.addComment('s1', { classroomId: 'c1', date: '2026-10-27', body: 'Дахин илгээлээ' });
    expect(reply.comments.map((c: any) => [c.kind, c.fromTeacher, c.mine])).toEqual([
      ['RETURN', true, false],
      ['NOTE', false, true],
    ]);
    expect(reply.comments[0].authorName).toBe('Б. Болор+');
    await expect(svc.addComment('s1', { classroomId: 'c1', date: '2026-10-27', body: '   ' })).rejects.toBeInstanceOf(BadRequestException);
    const day = (await svc.my('s1')).days.find((x: any) => x.date === '2026-10-27')!;
    expect(day.comments).toHaveLength(2);
    expect(day).not.toHaveProperty('markComment');
  });

  it('хугацааны хязгаар серверт: 30 мин + 60с-ийн дараа хадгалах/шалгах 409, илгээхэд шинэ хариуг авахгүй', async () => {
    jest.setSystemTime(new Date('2026-10-28T10:00:00Z'));
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    await svc.save('s1', attemptId, { p1: 'B' });
    jest.setSystemTime(new Date('2026-10-28T10:31:30Z')); // 31.5 мин — зай өнгөрсөн
    await expect(svc.save('s1', attemptId, { p2: 'C' })).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.check('s1', attemptId, { p2: 'C' })).rejects.toBeInstanceOf(ConflictException);
    const res = await svc.submit('s1', attemptId, { p2: 'C' });
    expect(res.score).toEqual({ correct: 1, total: 2 }); // p2-ийн хожуу хариу тооцогдоогүй
  });

  it('урьдчилан: ирэх 7 хоногийн хичээлийн өдөрт зураг илгээнэ; цуцалсан, 7 хоногоос цааш, хичээлгүй өдөр татгалзана', async () => {
    jest.setSystemTime(new Date('2026-10-28T10:00:00Z')); // УБ 10-28 Лхагва
    // Баасан (5) гараг, 10-30-ны хичээл; 11-06-нд цуцалсан
    env.schedules.push({
      id: 'sch5', classroomId: 'c1', weekday: 5, startMinute: 1080, endMinute: 1170, room: null,
      effectiveFrom: d('2026-09-01'), effectiveTo: null,
      exceptions: [{ date: d('2026-11-06'), kind: 'CANCELLED', newDate: null }],
    });
    const my = await svc.my('s1');
    const up = my.days.filter((x: any) => x.upcoming).map((x: any) => x.date);
    expect(up).toEqual(['2026-10-30']);
    await expect(
      svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-30', fileKey: 'f1.pdf', pages: 3 }),
    ).resolves.toMatchObject({ fileKey: 'f1.pdf' });
    // Пүрэв — хичээлгүй
    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-29', fileKey: 'f1.pdf', pages: 3 })).rejects.toBeInstanceOf(ForbiddenException);
    // 7 хоногоос цааш
    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-11-06', fileKey: 'f1.pdf', pages: 3 })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.addPhoto('s1', { classroomId: 'c9', date: '2026-10-30', fileKey: 'f1.pdf', pages: 3 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('урьдчилан: амралт (бүх анги / энэ анги) ба цуцалсан хичээлийн сэдэв хасагдана; зөөсөн сэдэв шинэ өдөрт', async () => {
    jest.setSystemTime(new Date('2026-10-28T10:00:00Z')); // УБ 10-28 Лхагва
    env.schedules.push(
      {
        id: 'sch5', classroomId: 'c1', weekday: 5, startMinute: 1080, endMinute: 1170, room: null,
        effectiveFrom: d('2026-09-01'), effectiveTo: null, exceptions: [],
      },
      {
        // Даваа 11-02 цуцалсан, Даваа 11-02-ны сэдэв анхны огноогоороо үлдсэн
        id: 'sch1', classroomId: 'c1', weekday: 1, startMinute: 600, endMinute: 690, room: null,
        effectiveFrom: d('2026-09-01'), effectiveTo: null,
        exceptions: [{ date: d('2026-11-02'), kind: 'CANCELLED', newDate: null }],
      },
      {
        // Ням 11-01-ний хичээлийг Мягмар 11-03 руу зөөсөн
        id: 'sch0', classroomId: 'c1', weekday: 0, startMinute: 600, endMinute: 690, room: null,
        effectiveFrom: d('2026-09-01'), effectiveTo: null,
        exceptions: [{ date: d('2026-11-01'), kind: 'MOVED', newDate: d('2026-11-03') }],
      },
    );
    env.topics.push(
      { scheduleId: 'sch1', classroomId: 'c1', date: d('2026-11-02'), title: 'Цуцлагдсан', chapterId: null },
      { scheduleId: 'sch0', classroomId: 'c1', date: d('2026-11-01'), title: 'Зөөгдсөн', chapterId: null },
    );
    let up = (await svc.my('s1')).days.filter((x: any) => x.upcoming).map((x: any) => x.date);
    expect(up).toEqual(['2026-11-03', '2026-10-30']);
    // Бүх ангийн амралт
    env.holidays.push({ date: d('2026-10-30'), type: 'HOLIDAY', title: 'Амралт', classrooms: [] });
    up = (await svc.my('s1')).days.filter((x: any) => x.upcoming).map((x: any) => x.date);
    expect(up).toEqual(['2026-11-03']);
    await expect(
      svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-30', fileKey: 'f1.pdf', pages: 3 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    // Зөвхөн өөр ангийн амралт — хичээл хэвээр; энэ ангийнх — хасагдана
    env.holidays[0].classrooms = [{ classroomId: 'c9' }];
    await expect(
      svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-30', fileKey: 'f1.pdf', pages: 3 }),
    ).resolves.toMatchObject({ fileKey: 'f1.pdf' });
    env.holidays[0].classrooms = [{ classroomId: 'c1' }];
    await expect(
      svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-30', fileKey: 'f2.pdf', pages: 2 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      svc.addPhoto('s1', { classroomId: 'c1', date: '2026-11-02', fileKey: 'f2.pdf', pages: 2 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('урьдчилан илгээх эрх: нэг элсэлтийн асуулга (loadLessonDays-гүй), элсэхээс өмнөх өдөр татгалзана', async () => {
    jest.setSystemTime(new Date('2026-10-28T10:00:00Z'));
    env.schedules.push({
      id: 'sch5', classroomId: 'c1', weekday: 5, startMinute: 1080, endMinute: 1170, room: null,
      effectiveFrom: d('2026-09-01'), effectiveTo: null, exceptions: [],
    });
    const before = {
      att: env.db.attendance.findMany.mock.calls.length,
      rec: env.db.lessonRecord.findMany.mock.calls.length,
      enrMany: env.db.enrollment.findMany.mock.calls.length,
    };
    await expect(
      svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-30', fileKey: 'f1.pdf', pages: 3 }),
    ).resolves.toMatchObject({ fileKey: 'f1.pdf' });
    expect(env.db.attendance.findMany.mock.calls.length).toBe(before.att);
    expect(env.db.lessonRecord.findMany.mock.calls.length).toBe(before.rec);
    expect(env.db.enrollment.findMany.mock.calls.length).toBe(before.enrMany);
    const q = env.db.enrollment.findFirst.mock.calls.at(-1)[0];
    expect(q.where).toEqual({
      studentId: 's1', classroomId: 'c1', leftAt: null, classroom: { archived: false },
    });
    expect(q.orderBy).toEqual({ joinedAt: 'asc' });
    // УБ 11-01-нд элссэн → 10-30-ны хичээлд урьдчилан илгээхгүй
    env.enrollments[0].joinedAt = new Date('2026-10-31T17:00:00Z');
    await expect(
      svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-30', fileKey: 'f2.pdf', pages: 2 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('зураг: өөрийн PDF, шинээр илгээвэл хуучныг зөөлөн устгана; бусдын/зураг файл татгалзана', async () => {
    const p1 = await svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f1.pdf', pages: 3 });
    expect(p1).toMatchObject({ fileKey: 'f1.pdf', pages: 3 });
    const same = await svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f1.pdf', pages: 3 });
    expect(same.id).toBe(p1.id);
    const p2 = await svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f2.pdf', pages: 5 });
    expect(p2.pages).toBe(2); // StoredFile-ийн бодит хуудас
    expect(env.photos.find((p) => p.id === p1.id)!.deletedAt).toBeInstanceOf(Date);
    expect((await svc.my('s1')).days[0].photo).toMatchObject({ id: p2.id, fileKey: 'f2.pdf' });

    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'x.pdf', pages: 1 })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'img.jpg', pages: 1 })).rejects.toThrow('PDF');
    // Серверт хуудас тоолоогүй PDF — клиентийн тоонд итгэхгүй
    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'nopages.pdf', pages: 2 })).rejects.toThrow('хуудс');
    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f1.pdf', pages: 7 })).rejects.toThrow('хуудас');
    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-26', fileKey: 'f1.pdf', pages: 1 })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.addPhoto('s1', { classroomId: 'c9', date: '2026-10-27', fileKey: 'f1.pdf', pages: 1 })).rejects.toBeInstanceOf(ForbiddenException);

    await expect(svc.deletePhoto('s2', p2.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.deletePhoto('s1', p2.id)).resolves.toEqual({ deleted: true });
    await expect(svc.deletePhoto('s1', p2.id)).resolves.toEqual({ deleted: true });
    expect((await svc.my('s1')).days[0].photo).toBeNull();
  });

  describe('хичээлийн өдөр бүр (СУРАГЧ V2)', () => {
    beforeEach(() => {
      // 10-24: зөвхөн ирц (B хувилбаргүй), 10-25: сэдэв + бүртгэл, 10-20: элсэхээс өмнө биш, 14 хоногт
      env.attendance.push(
        { studentId: 's1', classroomId: 'c1', date: d('2026-10-24') },
        { studentId: 's1', classroomId: 'c1', date: d('2026-10-27') },
        { studentId: 's2', classroomId: 'c1', date: d('2026-10-22') },
      );
      env.topics.push(
        { classroomId: 'c1', date: d('2026-10-25'), title: 'Сэдэв LessonTopic', chapterId: null },
        { classroomId: 'c1', date: d('2026-10-21'), title: ' ', chapterId: 'ch1' },
      );
      env.records.push({ classroomId: 'c1', date: d('2026-10-25'), topic: 'Батлагдсан сэдэв' });
      env.marks.push(
        { classroomId: 'c1', date: d('2026-10-25'), status: 'DONE', comment: 'Сайн хийсэн' },
        { classroomId: 'c1', date: d('2026-10-27'), status: 'NOT_DONE', comment: 'Дэвтэргүй' },
      );
    });

    it('GET /homework/my: цуцалсан хичээлийн сэдэв хуурамч өдөр үүсгэхгүй, зөөсөн нь шинэ огноонд', async () => {
      env.schedules.push({
        id: 'sch2', classroomId: 'c1', weekday: 2, startMinute: 600, endMinute: 690, room: null,
        effectiveFrom: d('2026-09-01'), effectiveTo: null,
        exceptions: [
          { date: d('2026-10-20'), kind: 'CANCELLED', newDate: null },
          { date: d('2026-10-16'), kind: 'MOVED', newDate: d('2026-10-19') },
        ],
      });
      env.topics.push(
        { scheduleId: 'sch2', classroomId: 'c1', date: d('2026-10-20'), title: 'Цуцлагдсан', chapterId: null },
        { scheduleId: 'sch2', classroomId: 'c1', date: d('2026-10-16'), title: 'Зөөгдсөн', chapterId: null },
      );
      const my = await svc.my('s1');
      const dates = my.days.map((x: any) => x.date);
      expect(dates).not.toContain('2026-10-20');
      expect(dates).not.toContain('2026-10-16');
      expect(my.days.find((x: any) => x.date === '2026-10-19')).toMatchObject({ topic: 'Зөөгдсөн' });
      const q = env.db.scheduleException.findMany.mock.calls[0][0];
      expect(q.where.schedule).toEqual({ classroomId: { in: ['c1'] } });
    });

    it('GET /homework/my: B-гүй өдөр items: [], topic; багшийн дотоод тэмдэглэл (markComment) сурагчид очихгүй', async () => {
      const res = await svc.my('s1');
      expect(res.days.map((x) => x.date)).toEqual(['2026-10-27', '2026-10-25', '2026-10-24', '2026-10-21']);
      const b = res.days[0];
      expect(b.items.map((i) => i.testId)).toEqual(['B1']);
      expect(b).toMatchObject({ deadlineAt: '2026-10-28T16:00:00.000Z', mark: 'PARTIAL', comments: [], topic: null });
      for (const d of res.days) expect(d).not.toHaveProperty('markComment');
      expect(res.days[1]).toMatchObject({
        date: '2026-10-25',
        classroomName: '10А',
        items: [],
        photo: null,
        mark: 'NOT_DONE',
        topic: 'Батлагдсан сэдэв',
      });
      expect(res.days[2]).toMatchObject({ date: '2026-10-24', items: [], mark: 'DONE', topic: null });
      // Хоосон сэдэвтэй бол бүлгийн нэр
      expect(res.days[3]).toMatchObject({ date: '2026-10-21', topic: 'Вектор' });
      // Бусдын ирц (s2) хичээлийн өдөрт тооцогдохгүй, сонголтод note байхгүй
      expect(env.db.attendance.findMany.mock.calls[0][0].where.studentId).toBe('s1');
      expect(env.db.attendance.findMany.mock.calls[0][0].select).not.toHaveProperty('note');
      expect(env.db.lessonRecord.findMany.mock.calls[0][0].select).not.toHaveProperty('description');
      expect(env.db.lessonTopic.findMany.mock.calls[0][0].select).not.toHaveProperty('dismissMode');
    });

    it('POST /homework/photos: B хувилбаргүй хичээлийн өдөрт илгээнэ', async () => {
      const p = await svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-24', fileKey: 'f1.pdf', pages: 3 });
      expect(p).toMatchObject({ fileKey: 'f1.pdf', pages: 3 });
      expect(env.photos[0]).toMatchObject({ classroomId: 'c1', lessonDate: d('2026-10-24') });
      const day = (await svc.my('s1')).days.find((x) => x.date === '2026-10-24')!;
      expect(day.photo).toMatchObject({ id: p.id });
    });

    it('POST /homework/photos: хичээлгүй өдөр, өөр анги, бусдын ирцтэй өдөр — 403', async () => {
      await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-23', fileKey: 'f1.pdf', pages: 1 })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-22', fileKey: 'f1.pdf', pages: 1 })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.addPhoto('s1', { classroomId: 'c9', date: '2026-10-24', fileKey: 'f1.pdf', pages: 1 })).rejects.toBeInstanceOf(ForbiddenException);
      expect(env.photos).toHaveLength(0);
    });

    it('POST /homework/photos: 14 хоногоос өмнөх B-гүй өдөр 403, B хувилбартай өдөр 31 хоногийн дүрмээр хэвээр', async () => {
      env.attendance.push({ studentId: 's1', classroomId: 'c1', date: d('2026-10-10') });
      await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-10', fileKey: 'f1.pdf', pages: 1 })).rejects.toBeInstanceOf(ForbiddenException);
      env.sessions.push({ classroomId: 'c1', date: d('2026-10-10'), testId: 'A1' });
      await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-10', fileKey: 'f1.pdf', pages: 1 })).resolves.toMatchObject({ fileKey: 'f1.pdf' });
    });

    it('ангид элсэхээс өмнөх (өөрийн ирцгүй) өдөр жагсаалтад орохгүй', async () => {
      env.enrollments[0].joinedAt = d('2026-10-25');
      const res = await svc.my('s1');
      // 10-24 нь өөрийн ирцтэй тул үлдэнэ, 10-21 (зөвхөн сэдэв) хасагдана
      expect(res.days.map((x) => x.date)).toEqual(['2026-10-27', '2026-10-25', '2026-10-24']);
    });
  });
});

describe('homework-logic — цэвэр функцууд', () => {
  it('buildSlots: ангид орохоос өмнөх өдөр алгасна, B хийсэн бол A', () => {
    const slots = buildSlots({
      enrollments: [{ classroomId: 'c', classroomName: 'C', joinedKey: '2026-10-20' }],
      sessions: [
        { classroomId: 'c', date: '2026-10-18', testId: 'a' },
        { classroomId: 'c', date: '2026-10-22', testId: 'b' },
      ],
      done: [
        { id: 'a', groupKey: 'g', variantLabel: 'A' },
        { id: 'b', groupKey: 'g', variantLabel: 'B' },
      ],
      siblings: [
        { id: 'a', groupKey: 'g', variantLabel: 'A', title: 'A', timeLimitMin: null, problemCount: 1 },
        { id: 'b', groupKey: 'g', variantLabel: 'B', title: 'B', timeLimitMin: null, problemCount: 1 },
      ],
      fromKey: '2026-10-01',
      toKey: '2026-10-29',
    });
    expect(slots.map((s) => [s.date, s.items.map((i) => i.id), s.deadlineAt])).toEqual([
      ['2026-10-22', ['a'], null],
    ]);
  });

  it('gradingInput: TEXT горимд үсэг → индекс; mergeAnswers: null арилгана, бусад түлхүүр хаягдана', () => {
    const g = { id: 'p', format: 'CHOICE' as const, choices: ['1', '2'], correctAnswer: 'B' };
    expect(gradingInput(g, 'b')).toBe(1);
    expect(gradingInput(g, 1)).toBe(1);
    const rows = [{ problemId: 'p', problem: { format: 'CHOICE', correctAnswer: 'B' } }];
    expect(mergeAnswers(rows, { p: 'A', old: 'x' }, { p: null, q: 'B' })).toEqual({});
    expect(mergeAnswers(rows, {}, { p: 'C', __proto__: 'x' })).toEqual({ p: 'C' });
  });

  it('remainingSec: хязгааргүй бол null, хэтэрвэл 0', () => {
    const start = new Date('2026-10-29T00:00:00Z');
    expect(remainingSec(null, start)).toBeNull();
    expect(remainingSec(10, start, new Date('2026-10-29T00:05:00Z'))).toBe(300);
    expect(remainingSec(10, start, new Date('2026-10-29T01:00:00Z'))).toBe(0);
  });
});

describe('Багшийн самбар «Онлайн» — илгээсэн гэрийн даалгаврын оноо', () => {
  it('TestResult-гүй сурагчид HomeworkAttempt (SUBMITTED)-ын зөв/нийт харагдана, TestResult давхардахгүй', async () => {
    const env = makeDb();
    const db = env.db;
    db.classroom = { findUnique: jest.fn(async () => ({ id: 'c1', archived: false, teacherId: 't' })) };
    db.classSchedule = { findMany: jest.fn(async () => []) };
    db.scheduleException = { findMany: jest.fn(async () => []) };
    db.academicCalendarDay = { findMany: jest.fn(async () => []) };
    db.enrollment.findMany = jest.fn(async () => [{ studentId: 's1' }, { studentId: 's2' }, { studentId: 's3' }]);
    db.testResult = {
      findMany: jest.fn(async () => [{ testId: 'B1', studentId: 's2', totalScore: 2, maxScore: 2 }]),
    };
    db.homeworkAttempt.findMany = jest.fn(async () => [
      { testId: 'B1', studentId: 's1', score: 1, total: 2 },
      { testId: 'B1', studentId: 's2', score: 0, total: 2 }, // TestResult байгаа — тоологдохгүй
    ]);
    const svc = new HomeworkMarksService(db, { record: jest.fn() } as never);
    const res = await svc.online('c1', '2026-10-29', 'admin', Role.ADMIN);
    expect(res.previousLessonDate).toBe('2026-10-27');
    expect(res.tests.map((t) => t.testId)).toContain('B1');
    expect(res.students).toEqual({
      s1: { score: 1, max: 2, testId: 'B1', taken: 1 },
      s2: { score: 2, max: 2, testId: 'B1', taken: 1 },
    });
    expect(db.homeworkAttempt.findMany.mock.calls[0][0].where).toMatchObject({
      classroomId: 'c1',
      status: 'SUBMITTED',
      lessonDate: d('2026-10-27'),
    });
  });
});


describe('Хуваарьт төлөвлөсөн тест = гэрийн даалгавар (эзэн 2026-11-03)', () => {
  let env: ReturnType<typeof makeDb>;
  let svc: HomeworkPracticeService;
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    env = makeDb();
    env.sessions.length = 0; // хичээл БАТЛАГДААГҮЙ — зөвхөн төлөвлөгөө
    svc = new HomeworkPracticeService(env.db);
  });
  afterEach(() => jest.useRealTimers());

  const plan = (date: string, testIds: string[], endMinute: number) =>
    env.topics.push({ scheduleId: 'sch1', classroomId: 'c1', date: d(date), title: '', chapterId: null, testIds, endMinute });

  it('хичээл тарсны дараа (өнгөрсөн өдөр) төлөвлөсөн A тестийн B хувилбар даалгавар болно', async () => {
    plan('2026-10-27', ['A1'], 17 * 60);
    const res = await svc.my('s1');
    const day = res.days.find((x) => x.date === '2026-10-27');
    expect(day?.items.map((i) => i.testId)).toEqual(['B1']);
    const a = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(a.status).toBe('IN_PROGRESS');
  });

  it('өнөөдрийн хичээл ДУУСААГҮЙ бол нээгдэхгүй, дууссан бол нээгдэнэ', async () => {
    plan('2026-10-28', ['A1'], 19 * 60); // одоо УБ 18:00
    expect((await svc.my('s1')).days.find((x) => x.date === '2026-10-28')?.items ?? []).toEqual([]);
    await expect(svc.start('s1', { testId: 'B1', date: '2026-10-28' })).rejects.toBeInstanceOf(ForbiddenException);
    jest.setSystemTime(new Date('2026-10-28T12:30:00Z')); // УБ 20:30 — хичээл тарсан
    expect((await svc.my('s1')).days.find((x) => x.date === '2026-10-28')?.items.map((i) => i.testId)).toEqual(['B1']);
  });

  it('хичээл батлагдсан өдөр батлагдсан тест давамгайлна (төлөвлөгөөг үл тооно)', async () => {
    plan('2026-10-27', ['B1'], 17 * 60); // төлөвлөгөө: B → даалгавар нь A1
    env.sessions.push({ classroomId: 'c1', date: d('2026-10-27'), testId: 'A1' }); // бодит: A хийсэн
    const day = (await svc.my('s1')).days.find((x) => x.date === '2026-10-27');
    expect(day?.items.map((i) => i.testId)).toEqual(['B1']);
  });

  it('ирээдүйд ангид бодогдохоор төлөвлөсөн B хувилбар даалгавар болохгүй', async () => {
    plan('2026-10-27', ['A1'], 17 * 60);
    plan('2026-11-03', ['B1'], 17 * 60); // B-г ангид хийнэ
    const day = (await svc.my('s1')).days.find((x) => x.date === '2026-10-27');
    expect(day?.items ?? []).toEqual([]);
  });

  it('хэдэн сарын дараа ангид бодогдохоор төлөвлөсөн B ч нөөцлөгдөнө (хугацааны цонхгүй)', async () => {
    plan('2026-10-27', ['A1'], 17 * 60);
    plan('2027-03-01', ['B1'], 17 * 60);
    expect((await svc.my('s1')).days.find((x) => x.date === '2026-10-27')?.items ?? []).toEqual([]);
  });

  it('төлөвлөсөн тестийн даалгаврын хугацаа = дараагийн хичээлийн өдрийн 00:00 (УБ)', async () => {
    plan('2026-10-27', ['A1'], 17 * 60);
    env.topics.push({ scheduleId: 'sch1', classroomId: 'c1', date: d('2026-10-29'), title: 'Дараагийн сэдэв', chapterId: null });
    await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(env.attempts[0].deadlineAt.toISOString()).toBe('2026-10-28T16:00:00.000Z');
    const day = (await svc.my('s1')).days.find((x) => x.date === '2026-10-27');
    expect(day?.deadlineAt).toBe('2026-10-28T16:00:00.000Z');
  });

  it('цуцалсан хичээлийн төлөвлөгөө даалгавар болохгүй', async () => {
    env.schedules.push({
      id: 'sch1', classroomId: 'c1', weekday: 2, startMinute: 600, endMinute: 690, room: null,
      effectiveFrom: d('2026-09-01'), effectiveTo: null,
      exceptions: [{ date: d('2026-10-27'), kind: 'CANCELLED', newDate: null }],
    });
    plan('2026-10-27', ['A1'], 17 * 60);
    expect((await svc.my('s1')).days.find((x) => x.date === '2026-10-27')?.items ?? []).toEqual([]);
  });
});

describe('Гэрийн даалгавар: идэвхийн хяналт ба илгээсний дараах хариу', () => {
  let env: ReturnType<typeof makeDb>;
  let svc: HomeworkPracticeService;
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    env = makeDb();
    svc = new HomeworkPracticeService(env.db);
  });
  afterEach(() => jest.useRealTimers());

  it('нээх бүрт openCount өснө; идэвх зөвхөн өснө, бодит хугацаанаас хэтрэхгүй', async () => {
    const a = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(a.activity).toEqual({ activeSec: 0, awaySec: 0, leaveCount: 0, openCount: 1 });
    expect((await svc.start('s1', { testId: 'B1', date: '2026-10-27' })).activity.openCount).toBe(2);
    jest.setSystemTime(new Date(NOW.getTime() + 100_000)); // 100 секунд өнгөрсөн
    await svc.save('s1', a.attemptId, { p1: 'B' }, { activeSec: 90, awaySec: 5, leaveCount: 2 });
    expect(env.attempts[0]).toMatchObject({ activeSec: 90, awaySec: 5, leaveCount: 2 });
    // 0-ээс эхэлсэн (дахин ачаалсан) тоолуур буурахгүй; хэт том утга бодит хугацаагаар хязгаарлагдана
    await svc.save('s1', a.attemptId, { p1: 'B' }, { activeSec: 3, awaySec: 99999, leaveCount: 1 });
    expect(env.attempts[0]).toMatchObject({ activeSec: 90, awaySec: 100, leaveCount: 2 });
    await svc.save('s1', a.attemptId, {}, { activeSec: 'x', leaveCount: -5 });
    expect(env.attempts[0]).toMatchObject({ activeSec: 90, leaveCount: 2 });
  });

  it('илгээхэд идэвх хадгалагдана; зөв хариу, бодолт ЗӨВХӨН илгээсний дараа, алдсан бодлогод л', async () => {
    const a = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    // илгээхээс өмнө (шалгах хүртэл) зөв хариу огт гарахгүй
    expect(a.review).toBeNull();
    const chk = await svc.check('s1', a.attemptId, { p1: 'A', p2: 'C' }, { activeSec: 10, awaySec: 0, leaveCount: 0 });
    expect(JSON.stringify(chk)).not.toMatch(/correctAnswer|solution/);
    jest.setSystemTime(new Date(NOW.getTime() + 60_000));
    const res = await svc.submit('s1', a.attemptId, { p1: 'A', p2: 'C' }, { activeSec: 55, awaySec: 3, leaveCount: 1 });
    expect(res.results).toEqual({ p1: 'WRONG', p2: 'CORRECT' });
    expect(Object.keys(res.review.items)).toEqual(['p1']); // зөв бодсон p2 орохгүй
    expect(res.review).toMatchObject({ locked: false, opensAt: null });
    expect(res.review.items.p1).toEqual({ correct: 'B', solution: '$x=2$', video: null });
    expect(env.attempts[0]).toMatchObject({ status: 'SUBMITTED', activeSec: 55, awaySec: 3, leaveCount: 1 });
    // дахин нээхэд ч мөн адил
    const again = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(again.review).toEqual(res.review);
  });

  it('хоосон илгээсэн бодлогын зөв хариу дараагийн хичээл (хугацаа) хүртэл нээгдэхгүй', async () => {
    const a = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    const res = await svc.submit('s1', a.attemptId, { p1: 'A' }); // p2 хоосон
    expect(res.results).toEqual({ p1: 'WRONG', p2: 'BLANK' });
    expect(Object.keys(res.review.items)).toEqual(['p1']);
    expect(res.review.opensAt).toBe('2026-10-28T16:00:00.000Z'); // дараагийн хичээл 10-29 00:00 УБ
    jest.setSystemTime(new Date('2026-10-29T02:00:00Z'));
    const later = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(Object.keys(later.review!.items).sort()).toEqual(['p1', 'p2']);
    expect(later.review!.opensAt).toBeNull();
  });

  it('тест ирээдүйд ангид бодогдохоор төлөвлөгдсөн (ямар ч ангид) бол зөв хариу огт нээгдэхгүй', async () => {
    env.topics.push({ scheduleId: 'schX', classroomId: 'c2', date: d('2026-11-10'), title: '', chapterId: null, testIds: ['B1'], endMinute: 600 });
    const a = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    const res = await svc.submit('s1', a.attemptId, { p1: 'A', p2: 'A' });
    expect(res.results).toEqual({ p1: 'WRONG', p2: 'WRONG' });
    expect(res.review).toEqual({ locked: true, opensAt: null, items: {} });
  });

  it('ноорог (VERIFIED биш) бодолт сурагчид харагдахгүй', async () => {
    const a = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    const res = await svc.submit('s1', a.attemptId, { p1: 'B', p2: 'A' });
    expect(res.review.items.p2).toEqual({ correct: 'C', solution: null, video: { url: 'https://www.youtube.com/watch?v=abcdefghijk', embedUrl: expect.stringContaining('abcdefghijk') } });
  });
});

describe('Багшийн самбар «Онлайн» дэлгэрэнгүй (эзэн 2026-11-03)', () => {
  function setup() {
    const env = makeDb();
    const db = env.db;
    db.classroom = { findUnique: jest.fn(async () => ({ id: 'c1', archived: false, teacherId: 't' })) };
    db.classSchedule = { findMany: jest.fn(async () => []) };
    db.scheduleException = { findMany: jest.fn(async () => []) };
    db.academicCalendarDay = { findMany: jest.fn(async () => []) };
    db.enrollment.findFirst = jest.fn(async ({ where }: any) =>
      where.studentId === 's1' ? { student: { firstName: 'Бат', lastName: 'Болд' } } : null,
    );
    db.testResult = { findMany: jest.fn(async () => []) };
    db.homeworkPhoto = {
      findFirst: jest.fn(async () => ({ fileKey: 'hw.pdf', pages: 3, createdAt: new Date('2026-10-28T09:00:00Z') })),
    };
    db.testProblem = {
      findMany: jest.fn(async () =>
        [problem('p1', 'B'), problem('p2', 'C')].map((r) => ({ ...r, testId: 'B1' })),
      ),
    };
    db.homeworkAttempt.findMany = jest.fn(async () => [
      {
        id: 'att1', testId: 'B1', status: 'SUBMITTED', answers: { p1: 'A', p2: 'C' },
        startedAt: new Date('2026-10-28T08:00:00Z'), submittedAt: new Date('2026-10-28T08:30:00Z'),
        deadlineAt: new Date('2026-10-28T16:00:00Z'), activeSec: 1500, awaySec: 300, leaveCount: 4, openCount: 2,
        checksUsed: 1, score: 1, total: 2,
      },
    ]);
    db.homeworkCheck.findMany = jest.fn(async () => [{ attemptId: 'att1', results: { p1: 'WRONG', p2: 'CORRECT' } }]);
    return { db, svc: new HomeworkMarksService(db, { record: jest.fn() } as never) };
  }

  it('оноо, хугацаа, вэбээс гарсан тоо, хариу + зөв хариу, зураг; бодлогын агуулга илгээхгүй', async () => {
    const { svc } = setup();
    const res = await svc.onlineDetail('c1', '2026-10-29', 's1', 'admin', Role.ADMIN);
    expect(res.student).toMatchObject({ firstName: 'Бат' });
    expect(res.photo).toMatchObject({ fileKey: 'hw.pdf', pages: 3 });
    const b1 = (res.tests as any[]).find((t) => t.testId === 'B1');
    const a = b1?.attempt as any;
    expect(a).toMatchObject({ durationSec: 1800, activeSec: 1500, awaySec: 300, leaveCount: 4, openCount: 2, score: 1, total: 2, late: false });
    expect(a.items).toEqual([
      { n: 1, problemId: 'p1', mine: 'A', correct: 'B', result: 'WRONG' },
      { n: 2, problemId: 'p2', mine: 'C', correct: 'C', result: 'CORRECT' },
    ]);
    expect(JSON.stringify(res)).not.toContain('statementText');
  });

  it('дахин бодсон (2-р оролдлого) багшид тусдаа харагдана, анхных холилдохгүй', async () => {
    const { db, svc } = setup();
    const first = await db.homeworkAttempt.findMany({});
    db.homeworkAttempt.findMany = jest.fn(async ({ where }: any) =>
      where.round?.gt
        ? [
            {
              id: 'att2', testId: 'A1', round: 2, status: 'SUBMITTED',
              startedAt: new Date('2026-11-05T08:00:00Z'), submittedAt: new Date('2026-11-05T08:20:00Z'),
              activeSec: 1100, awaySec: 60, leaveCount: 1, openCount: 1, score: 2, total: 2,
            },
          ]
        : where.round === 1
          ? first
          : [],
    );
    const res: any = await svc.onlineDetail('c1', '2026-10-29', 's1', 'admin', Role.ADMIN);
    expect(res.tests.find((t: any) => t.testId === 'B1').attempt).toMatchObject({ score: 1, total: 2 });
    expect(res.redos).toEqual([
      expect.objectContaining({ testId: 'A1', kind: 'CLASS', round: 2, score: 2, total: 2, activeSec: 1100, leaveCount: 1 }),
    ]);
  });

  it('ангид байхгүй сурагч 404', async () => {
    const { svc } = setup();
    await expect(svc.onlineDetail('c1', '2026-10-29', 'zzz', 'admin', Role.ADMIN)).rejects.toBeInstanceOf(NotFoundException);
  });
});


describe('Дахин бодох: 2 хичээл өнгөрсний дараа А, Б нэг удаа (эзэн 2026-11-03)', () => {
  let env: ReturnType<typeof makeDb>;
  let svc: HomeworkPracticeService;
  // 10-27 хичээл (A1 ангид) → дараагийн хичээл 10-29, 11-02 → 11-05-д 2 хичээл өнгөрсөн
  const LATER = new Date('2026-11-05T05:00:00Z');
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    env = makeDb();
    env.attendance.push({ studentId: 's1', classroomId: 'c1', date: d('2026-11-02') });
    svc = new HomeworkPracticeService(env.db);
  });
  afterEach(() => jest.useRealTimers());

  it('lessonsPassedAfter: өнөөдрийн хичээл өнгөрсөнд тооцогдохгүй; redoOpen = 2 хичээл', () => {
    const lessons = ['2026-10-27', '2026-10-29', '2026-11-02', '2026-11-05'];
    expect(lessonsPassedAfter(lessons, '2026-10-27', '2026-11-05')).toBe(2);
    expect(redoOpen(lessons, '2026-10-27', '2026-11-05')).toBe(true);
    expect(redoOpen(lessons, '2026-10-27', '2026-11-02')).toBe(false);
    expect(redoOpen(lessons, '2026-10-29', '2026-11-05')).toBe(false);
  });

  it('жагсаалт: 2 хичээл өнгөрөөгүй бол хаалттай (үлдсэн тоотой), А ба Б хоёул харагдана', async () => {
    const res = await svc.redoList('s1');
    expect(res.days).toHaveLength(1);
    expect(res.days[0]).toMatchObject({ date: '2026-10-27', opened: false, lessonsLeft: 2 });
    expect(res.days[0].items.map((i) => `${i.kind}:${i.testId}`)).toEqual(['CLASS:A1', 'HOME:B1']);
    await expect(svc.startRedo('s1', { testId: 'A1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('2 хичээл өнгөрсний дараа А, Б хоёул нээгдэж, тусдаа 2-р оролдлого болно; анхных хөндөгдөхгүй', async () => {
    // Гэртээ Б-г анх бодсон (round 1)
    const first = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    await svc.submit('s1', first.attemptId, { p1: 'B', p2: 'A' });
    jest.setSystemTime(LATER);
    const list = await svc.redoList('s1');
    expect(list.days[0]).toMatchObject({ opened: true, lessonsLeft: 0 });
    const home = list.days[0].items.find((i) => i.kind === 'HOME')!;
    expect(home.rounds).toEqual([expect.objectContaining({ round: 1, status: 'SUBMITTED' })]);

    const a = await svc.startRedo('s1', { testId: 'A1', date: '2026-10-27' });
    expect(a.round).toBe(2);
    expect(a.deadlineAt).toBeNull();
    expect(JSON.stringify(a)).not.toMatch(/correctAnswer|isCorrect/);
    expect((await svc.startRedo('s1', { testId: 'A1', date: '2026-10-27' })).attemptId).toBe(a.attemptId);
    const b = await svc.startRedo('s1', { testId: 'B1', date: '2026-10-27' });
    expect(b.attemptId).not.toBe(first.attemptId);
    expect(env.attempts.filter((x) => x.testId === 'B1').map((x) => x.round).sort()).toEqual([1, 2]);
    expect(env.attempts.find((x) => x.id === first.attemptId)).toMatchObject({ round: 1, status: 'SUBMITTED' });
  });

  it('дахин бодсон оролдлого «Шалгах», «Илгээх» ажиллана; илгээсний дараа дахин эхлүүлж болохгүй (нэг удаа)', async () => {
    jest.setSystemTime(LATER);
    const b = await svc.startRedo('s1', { testId: 'B1', date: '2026-10-27' });
    const chk = await svc.check('s1', b.attemptId, { p1: 'B', p2: 'A' });
    expect(chk.correct).toBe(1);
    const done = await svc.submit('s1', b.attemptId, { p1: 'B', p2: 'C' });
    expect(done.score).toEqual({ correct: 2, total: 2 });
    // Дахин эхлүүлбэл нэг л илгээсэн оролдлого — шинэ round үүсэхгүй
    const again = await svc.startRedo('s1', { testId: 'B1', date: '2026-10-27' });
    expect(again.attemptId).toBe(b.attemptId);
    expect(again.status).toBe('SUBMITTED');
    expect(env.attempts.filter((x) => x.round === 2)).toHaveLength(1);
  });

  it('ангид ирээдүйд дахин бодогдохоор төлөвлөсөн А түр хаалттай (Б нээгдсэн хэвээр), дараа нь дахин нээгдэнэ', async () => {
    jest.setSystemTime(LATER);
    env.topics.push({ classroomId: 'c1', date: d('2026-11-20'), title: 'Дахин', chapterId: null, testIds: ['A1'] });
    await expect(svc.startRedo('s1', { testId: 'A1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
    const list = await svc.redoList('s1');
    expect(list.days[0].items.map((i) => [i.testId, i.locked])).toEqual([['A1', true], ['B1', false]]);
    await expect(svc.startRedo('s1', { testId: 'B1', date: '2026-10-27' })).resolves.toMatchObject({ round: 2 });
  });

  it('бусад анги тестийг өнөөдөр/ирээдүйд бодох бол А, Б хоёул түр хаалттай; өөрийн хичээл хаахгүй', async () => {
    jest.setSystemTime(LATER);
    // Өөрийн анги, өөрийн хичээл (10-27) төлөвлөгөө — хаахгүй
    env.topics.push({ classroomId: 'c1', date: d('2026-10-27'), title: 'Өөрийн', chapterId: null, testIds: ['A1'] });
    await expect(svc.startRedo('s1', { testId: 'A1', date: '2026-10-27' })).resolves.toMatchObject({ round: 2 });
    // Өөр анги ӨНӨӨДӨР бодож байна (date >= өнөөдөр) — хаана
    env.sessions.push({ classroomId: 'c9', date: d('2026-11-05'), testId: 'B1' });
    await expect(svc.startRedo('s1', { testId: 'B1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
    // Дуусаагүй A-ийн «Шалгах» ч хаагдана (хариу задрахгүй)
    env.sessions.push({ classroomId: 'c9', date: d('2026-11-08'), testId: 'A1' });
    const a = env.attempts.find((x) => x.testId === 'A1' && x.round === 2)!;
    await expect(svc.check('s1', a.id, { p1: 'A' })).rejects.toBeInstanceOf(ForbiddenException);
    const list = await svc.redoList('s1');
    expect(list.days[0].items.every((i) => i.locked)).toBe(true);
  });

  it('бусдын тест/багш батлаагүй өдөр/ирээдүйн өдөр — 403; өөр сурагч нээж чадахгүй', async () => {
    jest.setSystemTime(LATER);
    await expect(svc.startRedo('s1', { testId: 'T1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.startRedo('s1', { testId: 'A1', date: '2026-10-29' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.startRedo('s1', { testId: 'A1', date: '2026-11-06' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.startRedo('s2', { testId: 'A1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
    env.sessions.splice(0, 1); // A1 бүртгэл (багшийн баталгаа) алга
    await expect(svc.startRedo('s1', { testId: 'B1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
