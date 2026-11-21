import { ForbiddenException } from '@nestjs/common';
import {
  AttemptSessionStatus,
  AttemptSource,
  Role,
  TestGradingMode,
} from '../generated/prisma/enums';
import {
  SessionAlreadyFinalizedError,
  SessionChangedError,
  TestsService,
} from './tests.service';
import { rescheduledDeadline } from './exam-window';

/*
 * Сурагчийн ЖИНХЭНЭ шалгалтын бүрэн бүтэн байдал (бие даасан хяналт 2026-11-21, R1–R4 +):
 *   1. closesAt-аас өмнө эрт илгээсэн сурагчид оноо, зөв/буруу, бодолт задрахгүй
 *   2. гаралтын хязгаарт хүрсэн хүсэлтийн хариу дүнд орно (хуучин draft-аар дүгнэхгүй)
 *   3. deadline + GRACE-ээс хойшх шинэ хариу дүгнэлтэд орохгүй — хоцорсон хариу болно
 *   4. хоцорсон хариу хадгалагдаж, Админ/Багш+ хүлээн авбал дахин дүгнэнэ
 *   5. хаах цаг / хугацаа өөрчлөхөд эхэлсэн сессийн дуусах цаг шинэчлэгдэнэ
 *   6. зэрэг autosave: leaveCount дутуу тоологдохгүй, хариу бодлого бүрээр нэгтгэгдэнэ
 */

const prob = {
  problemId: 'p1',
  order: 1,
  points: 1,
  problem: {
    id: 'p1',
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
    analysis: { status: 'VERIFIED', solutionOutline: 'бодолт: D' },
    chapter: { id: 'c', title: 'NS1' },
  },
};
const prob2 = {
  ...prob,
  problemId: 'p2',
  order: 2,
  problem: { ...prob.problem, id: 'p2' },
};

function examTest(over: Record<string, unknown> = {}) {
  return {
    id: 't1',
    title: 'NS1-A',
    type: 'EESH_MOCK',
    gradingMode: TestGradingMode.AUTO,
    timeLimitMin: 100,
    leaveLimit: 2,
    variantLabel: 'A',
    groupKey: 'NS1',
    paperMode: true,
    opensAt: new Date(Date.now() - 600_000),
    closesAt: new Date(Date.now() + 3600_000),
    chapterId: null,
    isDraft: false,
    access: [],
    problems: [prob, prob2],
    ...over,
  };
}

type Row = Record<string, unknown> & {
  id: string;
  status: AttemptSessionStatus;
  leaveCount: number;
  draftAnswers: Record<string, unknown>;
};

function sessionRow(over: Record<string, unknown> = {}): Row {
  return {
    id: 's1',
    status: AttemptSessionStatus.IN_PROGRESS,
    seed: 1,
    problemOrder: ['p1', 'p2'],
    choiceOrder: {},
    draftAnswers: {},
    draftStates: {},
    problemTimes: {},
    leaveCount: 0,
    events: [],
    startedAt: new Date(),
    deadlineAt: new Date(Date.now() + 3600_000),
    submittedAt: null,
    lateAnswers: null,
    lateReceivedAt: null,
    ...over,
  } as Row;
}

/**
 * Санг дуурайсан mock: нэг сессийн мөр, `FOR UPDATE` түгжээ (transaction-ууд дараалан),
 * update нь мөрийг бодитоор өөрчилнө — зэрэг хүсэлтийн lost update илэрнэ.
 */
function fakeDb(initial: Row, leaveLimit = 3) {
  const db = { row: { ...initial } as Row };
  let lock: Promise<void> = Promise.resolve();
  const update = jest.fn(
    ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      if (where.status && where.status !== db.row.status) {
        return Promise.reject(Object.assign(new Error('not found'), { code: 'P2025' }));
      }
      db.row = { ...db.row, ...data } as Row;
      return Promise.resolve({ ...db.row });
    },
  );
  const prisma: Record<string, unknown> = {
    testProblem: {
      findMany: jest.fn().mockResolvedValue([
        { problemId: 'p1', problem: { format: 'CHOICE', correctAnswer: null } },
        { problemId: 'p2', problem: { format: 'CHOICE', correctAnswer: null } },
      ]),
    },
    testAttemptSession: {
      findUnique: jest.fn(() => Promise.resolve({ ...db.row })),
      update,
      updateMany: jest.fn(),
    },
    test: { findUnique: jest.fn().mockResolvedValue({ leaveLimit, closesAt: null }) },
    testResult: {
      findUnique: jest.fn().mockResolvedValue({ totalScore: 1, maxScore: 2 }),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ id: 's1' }]),
  };
  prisma.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    const prev = lock;
    let release!: () => void;
    lock = new Promise<void>((r) => (release = r));
    await prev;
    try {
      // Хоёр хүсэлтийн уншилт бие биенээ гүйцэхийн тулд нэг tick хүлээнэ
      await new Promise((r) => setImmediate(r));
      return await fn(prisma);
    } finally {
      release();
    }
  });
  return { db, prisma, update };
}

type Internals = {
  loadTestWithProblems: jest.Mock;
  assertStudentAccess: jest.Mock;
  finalize: jest.Mock;
};

function service(prisma: unknown, test = examTest()) {
  const s = new TestsService(prisma as never, {} as never);
  const i = s as unknown as Internals;
  i.loadTestWithProblems = jest.fn().mockResolvedValue(test);
  i.assertStudentAccess = jest.fn().mockResolvedValue(undefined);
  return { s, i };
}

describe('1. closesAt-аас өмнө эрт илгээсэн сурагчид юу ч задрахгүй', () => {
  function reviewSetup(test: ReturnType<typeof examTest>) {
    const prisma = {
      testAttemptSession: {
        findUnique: jest.fn().mockResolvedValue(
          sessionRow({ status: AttemptSessionStatus.SUBMITTED, draftAnswers: { p1: 3 } }),
        ),
      },
      testResult: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ totalScore: 1, maxScore: 2, createdAt: new Date() }),
      },
      problemChoice: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return service(prisma, test).s;
  }

  it('review: оноо, зөв/буруу, бодолт, «Түгээмэл алдаа» буцаахгүй, нээгдэх цагтай мессеж', async () => {
    const r = (await reviewSetup(examTest()).review('t1', 'stu')) as Record<string, unknown>;
    expect(r.result).toBeNull();
    expect(r.items).toEqual([]);
    const pending = r.resultsPending as { releaseAt: Date; message: string };
    expect(pending.message).toMatch(/^Хариу хүлээн авлаа\. Дүн, бодолт .+ цагт нээгдэнэ$/);
    expect(JSON.stringify(r)).not.toContain('бодолт: D');
  });

  it('review: хаах цаг өнгөрсний дараа нээгдэнэ (дахин ачаалахад)', async () => {
    const r = await reviewSetup(
      examTest({ closesAt: new Date(Date.now() - 1000) }),
    ).review('t1', 'stu');
    expect(r.result).toEqual(expect.objectContaining({ totalScore: 1 }));
    expect(r.items[0]).toEqual(
      expect.objectContaining({ correct: true, solution: 'бодолт: D' }),
    );
  });

  it('review: closesAt null — өмнөх зан төлөв яг хэвээр', async () => {
    const r = await reviewSetup(examTest({ closesAt: null })).review('t1', 'stu');
    expect(r.items).toHaveLength(2);
    expect(r).not.toHaveProperty('resultsPending');
  });

  it('submit: хариунд graded[] (бодлого тус бүрийн зөв/буруу), оноо очихгүй', async () => {
    const { prisma } = fakeDb(sessionRow());
    const { s, i } = service(prisma);
    i.finalize = jest.fn().mockResolvedValue({
      result: { totalScore: 1, maxScore: 2 },
      graded: [{ problemId: 'p1', correct: true, points: 1 }],
    });
    const r = (await s.submit('t1', { answers: { p1: 3 } }, 'stu')) as Record<string, unknown>;
    expect(r.result).toBeNull();
    expect(r.graded).toEqual([]);
    expect(r.answersReceived).toBe(true);
    expect((r.resultsPending as { message: string }).message).toContain('нээгдэнэ');
  });

  it('start/heartbeat/saveSession: илгээгдсэн сессийн оноо нуугдана', async () => {
    const { prisma } = fakeDb(sessionRow({ status: AttemptSessionStatus.SUBMITTED }));
    (prisma.test as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
      closesAt: new Date(Date.now() + 60_000),
    });
    const { s } = service(prisma);
    const hb = (await s.heartbeat('t1', 'stu')) as Record<string, unknown>;
    expect(hb.result).toBeNull();
    expect(hb.resultsPending).toBeTruthy();
    const save = (await s.saveSession('t1', 'stu', {})) as Record<string, unknown>;
    expect(save.result).toBeNull();
    const start = (await s.start('t1', 'stu')) as Record<string, unknown>;
    expect(start.result).toBeNull();
  });

  it('my-results: хаах цаг ирээгүй шалгалтын дүн жагсаалтад орохгүй', async () => {
    const prisma = {
      testResult: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'r1', test: { id: 't1', title: 'A', type: 'EESH_MOCK', closesAt: new Date(Date.now() + 1e6) } },
          { id: 'r2', test: { id: 't2', title: 'B', type: 'CUSTOM', closesAt: null } },
        ]),
      },
    };
    const out = await new TestsService(prisma as never, {} as never).myResults('stu');
    expect(out.map((r) => r.id)).toEqual(['r2']);
    expect(out[0].test).toEqual({ id: 't2', title: 'B', type: 'CUSTOM' });
  });
});

describe('2. гаралтын хязгаар: тухайн хүсэлтийн хариуг нэгтгэсний ДАРАА дүгнэнэ', () => {
  it('хариутай LEAVE хязгаарт хүрвэл хариу хадгалагдаад тэр хадгалсан хувилбараар дүгнэнэ', async () => {
    const { db, prisma } = fakeDb(sessionRow({ leaveCount: 1, draftAnswers: {} }), 2);
    const { s, i } = service(prisma);
    const seen: unknown[] = [];
    i.finalize = jest.fn((_t, session: Row) => {
      seen.push(session.draftAnswers);
      return Promise.resolve({ result: { totalScore: 1, maxScore: 2 }, graded: [] });
    });
    const r = (await s.saveSession('t1', 'stu', {
      event: 'LEAVE',
      answers: { p1: 3, p2: 1 },
    })) as Record<string, unknown>;
    expect(r.status).toBe(AttemptSessionStatus.SUBMITTED);
    expect(r.leftByLeaves).toBe(true);
    expect(r.answersReceived).toBe(true);
    expect(db.row.draftAnswers).toEqual({ p1: 3, p2: 1 });
    expect(seen[0]).toEqual({ p1: 3, p2: 1 });
    expect(db.row.leaveCount).toBe(2);
  });

  it('leaveCount хязгаараас хэтрэхгүй (clamp)', async () => {
    const { db, prisma } = fakeDb(sessionRow({ leaveCount: 2 }), 2);
    const { s, i } = service(prisma);
    i.finalize = jest.fn().mockResolvedValue({ result: { totalScore: 0, maxScore: 2 }, graded: [] });
    await s.saveSession('t1', 'stu', { event: 'LEAVE' });
    expect(db.row.leaveCount).toBe(2);
  });
});

describe('3. deadline + GRACE-ээс хойшх хариу дүгнэлтэд орохгүй', () => {
  it('submit: серверийн хадгалсан хариугаар дүгнэж, шинэ хариуг хоцорсон хариу болгоно', async () => {
    const { db, prisma } = fakeDb(
      sessionRow({ deadlineAt: new Date(Date.now() - 120_000), draftAnswers: { p1: 0 } }),
    );
    const { s, i } = service(prisma, examTest({ closesAt: null }));
    const graded: unknown[] = [];
    i.finalize = jest.fn((_t, session: Row) => {
      graded.push(session.draftAnswers);
      return Promise.resolve({ result: { totalScore: 0, maxScore: 2 }, graded: [] });
    });
    const r = (await s.submit('t1', { answers: { p1: 3, p2: 3 } }, 'stu')) as Record<string, unknown>;
    expect(graded[0]).toEqual({ p1: 0 });
    expect(db.row.draftAnswers).toEqual({ p1: 0 }); // дүгнэгдсэн хариу дарагдаагүй
    const late = db.row.lateAnswers as { answers: Record<string, unknown>; differing: number };
    expect(late.answers).toEqual({ p1: 3, p2: 3 });
    expect(late.differing).toBe(2);
    expect(db.row.lateReceivedAt).toBeInstanceOf(Date);
    expect(r.lateAnswers).toBe(true);
    expect(r.answersReceived).toBe(true);
  });

  it('GRACE (30с) дотор ирсэн хариу хэвийн тооцогдоно', async () => {
    const { db, prisma } = fakeDb(sessionRow({ deadlineAt: new Date(Date.now() - 10_000) }));
    const { s, i } = service(prisma, examTest({ closesAt: null }));
    i.finalize = jest.fn().mockResolvedValue({ result: { totalScore: 1, maxScore: 2 }, graded: [] });
    await s.submit('t1', { answers: { p1: 3 } }, 'stu');
    expect(db.row.draftAnswers).toEqual({ p1: 3 });
    expect(db.row.lateAnswers).toBeNull();
  });
});

describe('4. хоцорсон хариу (sweep-ийн дараа офлайн утаснаас)', () => {
  it('хаагдсан сессэд ирсэн зөрүүтэй хариу хадгалагдана, дүн өөрчлөгдөхгүй, ижил бол бичихгүй', async () => {
    const { db, prisma, update } = fakeDb(
      sessionRow({ status: AttemptSessionStatus.SUBMITTED, draftAnswers: { p1: 0 } }),
    );
    const { s } = service(prisma, examTest({ closesAt: null }));
    const same = (await s.saveSession('t1', 'stu', { answers: { p1: 0 } })) as Record<string, unknown>;
    expect(update).not.toHaveBeenCalled();
    expect(same.answersReceived).toBe(true);
    expect(same).not.toHaveProperty('lateAnswers');

    const r = (await s.saveSession('t1', 'stu', { answers: { p1: 3 } })) as Record<string, unknown>;
    expect(r).toEqual(
      expect.objectContaining({
        status: AttemptSessionStatus.SUBMITTED,
        result: { totalScore: 1, maxScore: 2 },
        answersReceived: true,
        lateAnswers: true,
      }),
    );
    expect(db.row.draftAnswers).toEqual({ p1: 0 });
    expect((db.row.lateAnswers as { answers: unknown }).answers).toEqual({ p1: 3 });
  });

  it('аль хэдийн илгээгдсэн submit: 409 боловч хариуг хоцорсон хариу болгон хадгална', async () => {
    const { db, prisma } = fakeDb(
      sessionRow({ status: AttemptSessionStatus.SUBMITTED, draftAnswers: {} }),
    );
    const { s } = service(prisma, examTest({ closesAt: null }));
    await expect(s.submit('t1', { answers: { p2: 4 } }, 'stu')).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ answersReceived: true, lateAnswers: true }),
    });
    expect((db.row.lateAnswers as { answers: unknown }).answers).toEqual({ p2: 4 });
  });

  function acceptSetup(role: Role) {
    const { db, prisma } = fakeDb(
      sessionRow({
        status: AttemptSessionStatus.SUBMITTED,
        draftAnswers: { p1: 0 },
        lateAnswers: { answers: { p1: 3, p2: 3 }, differing: 2, receivedCount: 1 },
        lateReceivedAt: new Date(),
      }),
    );
    const existing = {
      id: 'r1',
      totalScore: 0,
      maxScore: 2,
      source: AttemptSource.ONLINE_TEST,
      enteredById: null,
    };
    Object.assign(prisma, {
      user: { findUnique: jest.fn().mockResolvedValue({ role, archivedAt: null }) },
      testResult: {
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn(({ data }) =>
          Promise.resolve({ ...existing, totalScore: data.totalScore, maxScore: data.maxScore }),
        ),
      },
      testItemMark: { upsert: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    });
    const { s } = service(prisma, examTest({ closesAt: null }));
    return { s, db, prisma };
  }

  it('Багш «Хүлээн авах» хийж чадахгүй (эрх шинээр зохиогоогүй — OVERRIDE_ROLES)', async () => {
    const { s } = acceptSetup(Role.TEACHER);
    await expect(
      s.acceptLateAnswers('t1', 'stu', 'teacher', Role.TEACHER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Багш+: хоцорсон хариугаар дахин дүгнэнэ, өмнөх оноо түүх, аудитад үлдэнэ', async () => {
    const { s, db, prisma } = acceptSetup(Role.TEACHER_PLUS);
    const out = await s.acceptLateAnswers('t1', 'stu', 'tplus', Role.TEACHER_PLUS);
    expect(out.result).toEqual({ totalScore: 2, maxScore: 2 });
    expect(out.previous).toEqual({ totalScore: 0, maxScore: 2 });
    const tr = prisma.testResult as { update: jest.Mock };
    expect(tr.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ totalScore: 2, version: { increment: 1 } }),
    );
    // Дүгнэгдсэн анхны хариу хэвээр
    expect(db.row.draftAnswers).toEqual({ p1: 0 });
    const late = db.row.lateAnswers as {
      differing: number;
      accepted: { previousScore: unknown; answers: unknown };
    };
    expect(late.differing).toBe(0);
    expect(late.accepted.previousScore).toEqual({ totalScore: 0, maxScore: 2 });
    expect(late.accepted.answers).toEqual({ p1: 3, p2: 3 });
    expect((prisma.auditLog as { create: jest.Mock }).create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ACCEPT_LATE_ANSWERS' }),
      }),
    );
    // Хоёр дахь удаа — хүлээн авах зүйлгүй
    await expect(
      s.acceptLateAnswers('t1', 'stu', 'tplus', Role.TEACHER_PLUS),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('5. хаах цаг / хугацаа өөрчлөхөд эхэлсэн сесс', () => {
  const now = new Date('2026-11-25T02:00:00Z');
  const started = new Date('2026-11-25T01:30:00Z');

  it('сунгавал шинэ хаах цаг хүртэл, хугацаагаар хязгаарлагдана', () => {
    expect(
      rescheduledDeadline(started, 100, new Date('2026-11-25T04:00:00Z'), now),
    ).toEqual(new Date('2026-11-25T03:10:00Z'));
    expect(
      rescheduledDeadline(started, 100, new Date('2026-11-25T02:30:00Z'), now),
    ).toEqual(new Date('2026-11-25T02:30:00Z'));
  });

  it('богиносгоход өнгөрсөн мөч рүү татахгүй — хамгийн багадаа «одоо»; аль аль нь үгүй бол null', () => {
    expect(
      rescheduledDeadline(started, 100, new Date('2026-11-25T01:45:00Z'), now),
    ).toEqual(now);
    expect(rescheduledDeadline(started, null, null, now)).toBeNull();
  });

  it('rescheduleActiveSessions зөвхөн IN_PROGRESS мөрийг шинэчилнэ', async () => {
    const tx = {
      testAttemptSession: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'a', startedAt: new Date(Date.now() - 600_000), deadlineAt: new Date(Date.now() + 600_000) },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const s = new TestsService({} as never, {} as never) as unknown as {
      rescheduleActiveSessions: (...a: unknown[]) => Promise<number>;
    };
    const closesAt = new Date(Date.now() + 7200_000);
    await expect(s.rescheduleActiveSessions(tx, 't1', null, closesAt)).resolves.toBe(1);
    expect(tx.testAttemptSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'a', status: AttemptSessionStatus.IN_PROGRESS },
      data: { deadlineAt: closesAt },
    });
  });
});

describe('6. зэрэг ирсэн autosave', () => {
  it('2 зэрэг LEAVE → leaveCount 2 (lost update үгүй)', async () => {
    const { db, prisma } = fakeDb(sessionRow({ leaveCount: 0 }), 3);
    const { s } = service(prisma);
    await Promise.all([
      s.saveSession('t1', 'stu', { event: 'LEAVE' }),
      s.saveSession('t1', 'stu', { event: 'LEAVE' }),
    ]);
    expect(db.row.leaveCount).toBe(2);
  });

  it('өөр бодлогын хариутай зэрэг хүсэлт — хоёулаа хадгалагдана', async () => {
    const { db, prisma } = fakeDb(sessionRow());
    const { s } = service(prisma);
    await Promise.all([
      s.saveSession('t1', 'stu', { answers: { p1: 3 } }),
      s.saveSession('t1', 'stu', { answers: { p2: 1 } }),
    ]);
    expect(db.row.draftAnswers).toEqual({ p1: 3, p2: 1 });
  });

  it('finalize: уншсанаас хойш autosave бичсэн бол SessionChangedError (хариу алдахгүй), илгээгдсэн бол AlreadyFinalized', async () => {
    const make = (status: AttemptSessionStatus) => {
      const prisma = {
        enrollment: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
        testResult: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
        testAttemptSession: {
          update: jest.fn(),
          findUnique: jest.fn().mockResolvedValue({ status }),
        },
        attempt: { createManyAndReturn: jest.fn() },
        testItemMark: { createMany: jest.fn() },
        $transaction: jest.fn(() =>
          Promise.reject(Object.assign(new Error('nf'), { code: 'P2025' })),
        ),
      };
      return new TestsService(prisma as never, {} as never) as unknown as {
        finalize: (...a: unknown[]) => Promise<unknown>;
      };
    };
    const row = { ...sessionRow(), updatedAt: new Date() };
    const t = { id: 't1', problems: [] };
    await expect(make(AttemptSessionStatus.IN_PROGRESS).finalize(t, row, 'stu')).rejects.toBeInstanceOf(
      SessionChangedError,
    );
    await expect(make(AttemptSessionStatus.SUBMITTED).finalize(t, row, 'stu')).rejects.toBeInstanceOf(
      SessionAlreadyFinalizedError,
    );
  });
});
