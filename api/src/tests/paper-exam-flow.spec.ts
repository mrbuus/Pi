import { ForbiddenException } from '@nestjs/common';
import { AttemptSessionStatus, TestGradingMode } from '../generated/prisma/enums';
import { SessionAlreadyFinalizedError, TestsService } from './tests.service';
import { orderVariants, pickAssignedVariant } from './variant-assign';

/*
 * Нэгдсэн шалгалт (цаасан горим) — серверийн дүрэм:
 *   нээх/хаах цаг, deadlineAt = min(эхэлсэн + хугацаа, хаах цаг), холихгүй A–E,
 *   хувилбарыг сервер оноох, autosave-ийн уралдаан, серверийн гаралтын хязгаар, үечилсэн хаалт.
 */

type Internals = {
  loadTestWithProblems: jest.Mock;
  studentAccessError: jest.Mock;
  finalize: jest.Mock;
};

const choiceProblem = (id: string) => ({
  problemId: id,
  order: 1,
  points: 1,
  problem: {
    id,
    format: 'CHOICE',
    statementText: 'x',
    imageKey: null,
    choices: null,
    correctAnswer: null,
    scoringGroups: null,
    attemptCount: 0,
    correctRate: null,
    choiceOptions: ['$1$', '$2$', '$3$', '$4$', '$5$'].map((text, order) => ({
      order,
      text,
      isCorrect: order === 3,
      imageKey: null,
    })),
    analysis: null,
    chapter: { id: 'c', title: 'Нэгдсэн шалгалт 1' },
  },
});

function lockedTest(over: Record<string, unknown> = {}) {
  return {
    id: 't1',
    title: 'Нэгдсэн шалгалт 1 — A',
    type: 'EESH_MOCK',
    gradingMode: TestGradingMode.AUTO,
    timeLimitMin: 100,
    leaveLimit: 3,
    variantLabel: 'A',
    groupKey: null,
    paperMode: true,
    opensAt: null,
    closesAt: null,
    chapterId: null,
    isDraft: false,
    access: [],
    problems: [choiceProblem('p1')],
    ...over,
  };
}

function startSetup(test: ReturnType<typeof lockedTest>) {
  const created: Record<string, unknown>[] = [];
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    testAttemptSession: {
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve(
          created.length
            ? {
                id: 's1',
                status: AttemptSessionStatus.IN_PROGRESS,
                seed: 1,
                startedAt: new Date(),
                leaveCount: 0,
                events: [],
                draftAnswers: {},
                draftStates: {},
                problemTimes: {},
                submittedAt: null,
                ...created[0],
              }
            : null,
        ),
      ),
      createMany: jest.fn().mockImplementation(({ data }) => {
        created.push(data[0]);
        return Promise.resolve({ count: 1 });
      }),
    },
    testResult: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const prisma = {
    ...tx,
    testAttemptSession: {
      ...tx.testAttemptSession,
      findUnique: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
  };
  const service = new TestsService(prisma as never, {} as never);
  const internals = service as unknown as Internals;
  internals.loadTestWithProblems = jest.fn().mockResolvedValue(test);
  internals.studentAccessError = jest.fn().mockResolvedValue(null);
  return { service, created };
}

describe('start — нийтлэг цонх', () => {
  afterEach(() => jest.useRealTimers());

  it('нээгдэхээс өмнө 403, хэдэн цагт нээгдэхийг хэлнэ', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-25T00:30:00Z') });
    const { service, created } = startSetup(
      lockedTest({ opensAt: new Date('2026-11-25T01:00:00Z') }),
    );
    await expect(service.start('t1', 'stu')).rejects.toThrow(
      'Шалгалт 2026-11-25 09:00 цагт нээгдэнэ (Улаанбаатарын цагаар)',
    );
    expect(created).toHaveLength(0);
  });

  it('хаагдсаны дараа шинээр эхлүүлэхгүй', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-25T03:00:00Z') });
    const { service, created } = startSetup(
      lockedTest({ closesAt: new Date('2026-11-25T02:40:00Z') }),
    );
    await expect(service.start('t1', 'stu')).rejects.toBeInstanceOf(ForbiddenException);
    expect(created).toHaveLength(0);
  });

  it('хоцорч эхэлсэн сурагч хаах цаг хүртэл л (бүтэн 100 минут биш)', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-25T01:30:00Z') });
    const closesAt = new Date('2026-11-25T02:40:00Z');
    const { service, created } = startSetup(
      lockedTest({ opensAt: new Date('2026-11-25T01:00:00Z'), closesAt }),
    );
    const out = (await service.start('t1', 'stu')) as {
      session: { remainingSec: number };
      test: { closesAt: Date };
    };
    expect(created[0].deadlineAt).toEqual(closesAt);
    expect(out.session.remainingSec).toBe(70 * 60);
    expect(out.test.closesAt).toEqual(closesAt);
  });

  it('цонхгүй тест — өмнөх зан төлөв (эхэлсэн + хугацаа)', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-25T01:00:00Z') });
    const { service, created } = startSetup(lockedTest({ paperMode: false }));
    await service.start('t1', 'stu');
    expect(created[0].deadlineAt).toEqual(new Date('2026-11-25T02:40:00Z'));
  });
});

describe('start — цаасан горимд сонголт A–E, холихгүй', () => {
  it('choiceOrder хоосон, шошго A–E, эх дараалал', async () => {
    const { service, created } = startSetup(lockedTest());
    const out = (await service.start('t1', 'stu')) as {
      problems: { choices: string[]; choiceLabels: string[] | null; choiceMode: string }[];
    };
    expect(created[0].choiceOrder).toEqual({});
    expect(out.problems[0].choiceMode).toBe('TEXT');
    expect(out.problems[0].choices).toEqual(['$1$', '$2$', '$3$', '$4$', '$5$']);
    expect(out.problems[0].choiceLabels).toEqual(['A', 'B', 'C', 'D', 'E']);
    // Хариуны түлхүүр задрахгүй
    expect(JSON.stringify(out)).not.toMatch(/isCorrect|mistakeNote|correctAnswer/);
  });

  it('энгийн тестэд холилт хэвээр, шошгогүй', async () => {
    const { service, created } = startSetup(lockedTest({ paperMode: false }));
    const out = (await service.start('t1', 'stu')) as {
      problems: { choiceLabels: string[] | null }[];
    };
    expect(Object.keys(created[0].choiceOrder as object)).toEqual(['p1']);
    expect(out.problems[0].choiceLabels).toBeNull();
  });
});

describe('хувилбарыг сервер оноох (assertAssignedVariant)', () => {
  const sib = (id: string, createdAt: string, extra: Record<string, unknown> = {}) => ({
    id,
    title: `Нэгдсэн шалгалт 1 — ${id}`,
    groupKey: 'NS1',
    chapterId: null,
    createdAt: new Date(createdAt),
    access: [{ classroomId: 'c1' }],
    results: [] as { id: string }[],
    attemptSessions: [] as { status: string }[],
    ...extra,
  });

  function variantSetup(siblings: ReturnType<typeof sib>[]) {
    const prisma = { test: { findMany: jest.fn().mockResolvedValue(siblings) } };
    const service = new TestsService(prisma as never, {} as never);
    const internals = service as unknown as Internals & {
      assertStudentAccess: (t: unknown, u: string) => Promise<void>;
    };
    internals.studentAccessError = jest.fn().mockResolvedValue(null);
    return internals;
  }

  const A = sib('tA', '2026-11-21T10:00:00Z');
  const B = sib('tB', '2026-11-21T10:00:01Z');
  const paper = (id: string) => ({
    id,
    chapterId: null,
    access: [],
    groupKey: 'NS1',
    variantLabel: id === 'tA' ? 'A' : 'B',
    paperMode: true,
  });

  // Олон сурагчаас хоёр хувилбар хоёулаа гарахыг баталгаажуулна
  const students = Array.from({ length: 12 }, (_, i) => `cmstudent${i}`);
  const expected = (stu: string) =>
    pickAssignedVariant(
      orderVariants([A, B].map((s) => ({ ...s, hasResult: false, sessionStatus: null }))),
      stu,
    ).id;

  it('hash-аар оноогдсон хувилбар нээгдэж, нөгөө нь 403', async () => {
    const seen = new Set<string>();
    for (const stu of students) {
      const own = expected(stu);
      const other = own === 'tA' ? 'tB' : 'tA';
      seen.add(own);
      await expect(variantSetup([A, B]).assertStudentAccess(paper(own), stu)).resolves.toBeUndefined();
      await expect(variantSetup([A, B]).assertStudentAccess(paper(other), stu)).rejects.toThrow(
        'Танд энэ шалгалтын өөр хувилбар оноогдсон байна',
      );
    }
    expect(seen.size).toBe(2);
  });

  it('эхэлсэн/дүнтэй хувилбар давамгайлна', async () => {
    const stu = students.find((s) => expected(s) === 'tA')!;
    const Bstarted = { ...B, attemptSessions: [{ status: 'IN_PROGRESS' }] };
    await expect(variantSetup([A, Bstarted]).assertStudentAccess(paper('tB'), stu)).resolves.toBeUndefined();
    await expect(variantSetup([A, Bstarted]).assertStudentAccess(paper('tA'), stu)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('нэвтрэх эрхгүй хувилбарыг сонголтод тооцохгүй', async () => {
    const stu = students.find((s) => expected(s) === 'tB')!;
    const internals = variantSetup([A, B]);
    // Эхний дуудлага = A-гийн суурь эрх (байна), дараагийнх = B (эрхгүй)
    internals.studentAccessError = jest
      .fn()
      .mockImplementation((t: { id: string }) => Promise.resolve(t.id === 'tB' ? 'эрхгүй' : null));
    await expect(internals.assertStudentAccess(paper('tA'), stu)).resolves.toBeUndefined();
    // B-г шууд нээх оролдлого суурь эрхээр унана
    await expect(internals.assertStudentAccess(paper('tB'), stu)).rejects.toThrow('эрхгүй');
  });

  it('цаасан горимгүй тестэд хувилбарын түгжээ огт ажиллахгүй (нөхөх хичээлд A, B хоёулаа)', async () => {
    const internals = variantSetup([A, B]);
    const prisma = (internals as unknown as { prisma: { test: { findMany: jest.Mock } } }).prisma;
    await expect(
      internals.assertStudentAccess({ ...paper('tB'), paperMode: false }, students[0]),
    ).resolves.toBeUndefined();
    expect(prisma.test.findMany).not.toHaveBeenCalled();
  });
});

describe('saveSession — уралдаан ба серверийн гаралтын хязгаар', () => {
  const session = (over: Record<string, unknown> = {}) => ({
    id: 's1',
    status: AttemptSessionStatus.IN_PROGRESS,
    seed: 1,
    problemOrder: ['p1'],
    choiceOrder: {},
    draftAnswers: {},
    draftStates: {},
    problemTimes: {},
    leaveCount: 0,
    events: [],
    startedAt: new Date(),
    deadlineAt: new Date(Date.now() + 3600_000),
    submittedAt: null,
    ...over,
  });

  function saveSetup(s: ReturnType<typeof session>, leaveLimit = 3) {
    const prisma = {
      testProblem: {
        findMany: jest.fn().mockResolvedValue([
          { problemId: 'p1', problem: { format: 'CHOICE', correctAnswer: null } },
        ]),
      },
      testAttemptSession: {
        findUnique: jest.fn().mockResolvedValue(s),
        update: jest.fn().mockResolvedValue({
          leaveCount: s.leaveCount,
          deadlineAt: s.deadlineAt,
          status: AttemptSessionStatus.IN_PROGRESS,
        }),
      },
      test: { findUnique: jest.fn().mockResolvedValue({ leaveLimit }) },
      testResult: {
        findUnique: jest.fn().mockResolvedValue({ totalScore: 7, maxScore: 100 }),
      },
    };
    const service = new TestsService(prisma as never, {} as never);
    const internals = service as unknown as Internals;
    internals.loadTestWithProblems = jest.fn().mockResolvedValue(lockedTest());
    internals.finalize = jest
      .fn()
      .mockResolvedValue({ result: { totalScore: 3, maxScore: 100 }, graded: [] });
    return { service, prisma, internals };
  }

  it('зөвхөн IN_PROGRESS мөрийг бичнэ; илгээгдсэн бол хариуг дарж бичихгүй', async () => {
    const { service, prisma } = saveSetup(session());
    prisma.testAttemptSession.update.mockRejectedValueOnce(
      Object.assign(new Error('not found'), { code: 'P2025' }),
    );
    await expect(service.saveSession('t1', 'stu', { answers: { p1: 2 } })).resolves.toEqual({
      status: AttemptSessionStatus.SUBMITTED,
      result: { totalScore: 7, maxScore: 100 },
    });
    expect(prisma.testAttemptSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1', status: AttemptSessionStatus.IN_PROGRESS },
      }),
    );
  });

  it('гаралтгүй ердийн autosave тестийн мөр уншихгүй (HOT PATH)', async () => {
    const { service, prisma, internals } = saveSetup(session());
    await service.saveSession('t1', 'stu', { answers: { p1: 1 } });
    expect(prisma.test.findUnique).not.toHaveBeenCalled();
    expect(internals.finalize).not.toHaveBeenCalled();
  });

  it('Хатуу (2): 2 дахь гаралт autosave-ээр ирвэл сервер өөрөө дүгнэнэ', async () => {
    const { service, internals } = saveSetup(session({ leaveCount: 1 }), 2);
    const out = await service.saveSession('t1', 'stu', { event: 'LEAVE', answers: { p1: 3 } });
    expect(out).toEqual({
      status: AttemptSessionStatus.SUBMITTED,
      result: { totalScore: 3, maxScore: 100 },
      leftByLeaves: true,
    });
    const merged = internals.finalize.mock.calls[0][3];
    expect(merged.leaveCount).toBe(2);
    expect(merged.answers).toEqual({ p1: 3 }); // тэр хүсэлтийн хариу ч тооцогдоно
  });

  it('Зөөлөн (3): 2 дахь гаралтад дүгнэхгүй', async () => {
    const { service, internals } = saveSetup(session({ leaveCount: 1 }), 3);
    await service.saveSession('t1', 'stu', { event: 'LEAVE' });
    expect(internals.finalize).not.toHaveBeenCalled();
  });

  it('зэрэг ирсэн submit түрүүлсэн бол давхар дүн үүсгэхгүй, хадгалсан дүнг буцаана', async () => {
    const { service, internals } = saveSetup(session({ leaveCount: 2 }), 3);
    internals.finalize.mockRejectedValueOnce(new SessionAlreadyFinalizedError());
    await expect(service.saveSession('t1', 'stu', { event: 'LEAVE' })).resolves.toMatchObject({
      status: AttemptSessionStatus.SUBMITTED,
      result: { totalScore: 7, maxScore: 100 },
    });
  });
});

describe('sweepExpiredSessions — хугацаа дууссан сесс', () => {
  const row = (id: string, testId = 't1') => ({
    id,
    testId,
    studentId: `stu-${id}`,
    status: AttemptSessionStatus.IN_PROGRESS,
    draftAnswers: { p1: 3 },
    draftStates: {},
    problemTimes: {},
    leaveCount: 0,
    events: [],
    choiceOrder: {},
    deadlineAt: new Date('2026-11-25T02:40:00Z'),
  });

  function sweepSetup(pages: ReturnType<typeof row>[][]) {
    const prisma = {
      testAttemptSession: { findMany: jest.fn() },
    };
    for (const p of pages) prisma.testAttemptSession.findMany.mockResolvedValueOnce(p);
    prisma.testAttemptSession.findMany.mockResolvedValue([]);
    const service = new TestsService(prisma as never, {} as never);
    const internals = service as unknown as Internals;
    internals.loadTestWithProblems = jest.fn().mockResolvedValue(lockedTest());
    internals.finalize = jest.fn().mockResolvedValue({ result: {}, graded: [] });
    return { service, prisma, internals };
  }

  it('хадгалсан хариугаар finalize; тест нэг удаа ачаална; шүүлт зөв', async () => {
    const now = new Date('2026-11-25T03:00:00Z');
    const { service, prisma, internals } = sweepSetup([[row('a'), row('b')]]);
    await expect(service.sweepExpiredSessions({ now })).resolves.toEqual({
      closed: 2,
      skipped: 0,
      failed: 0,
    });
    expect(internals.loadTestWithProblems).toHaveBeenCalledTimes(1);
    // merged дамжуулахгүй — сессийн хадгалсан draft бүрэн тооцогдоно
    expect(internals.finalize.mock.calls[0]).toHaveLength(3);
    const where = prisma.testAttemptSession.findMany.mock.calls[0][0].where;
    expect(where.status).toBe(AttemptSessionStatus.IN_PROGRESS);
    expect(where.deadlineAt.lt).toEqual(new Date(now.getTime() - 30_000 - 90_000));
    expect(where.deadlineAt.gte).toEqual(new Date(now.getTime() - 2 * 24 * 3600_000));
    expect(where.test).toEqual({ deletedAt: null, gradingMode: TestGradingMode.AUTO });
  });

  it('зэрэг submit түрүүлсэн → алгасна; нэг сессийн алдаа бусдыг зогсоохгүй', async () => {
    const { service, internals } = sweepSetup([[row('a'), row('b'), row('c')]]);
    internals.finalize
      .mockRejectedValueOnce(new SessionAlreadyFinalizedError())
      .mockRejectedValueOnce(new Error('db'))
      .mockResolvedValueOnce({ result: {}, graded: [] });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(service.sweepExpiredSessions()).resolves.toEqual({
      closed: 1,
      skipped: 1,
      failed: 1,
    });
    spy.mockRestore();
  });

  it('багцын хязгаар: pageSize × maxPages-аас илүүг нэг дуудлагад хийхгүй, курсороор цааш', async () => {
    const { service, prisma } = sweepSetup([
      [row('a'), row('b')],
      [row('c'), row('d')],
      [row('e'), row('f')],
    ]);
    const out = await service.sweepExpiredSessions({ pageSize: 2, maxPages: 2 });
    expect(out.closed).toBe(4);
    expect(prisma.testAttemptSession.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.testAttemptSession.findMany.mock.calls[1][0]).toMatchObject({
      cursor: { id: 'b' },
      skip: 1,
    });
  });
});
