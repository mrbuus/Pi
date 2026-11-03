import { AttemptSessionStatus } from '../generated/prisma/enums';
import { SessionAlreadyFinalizedError, TestsService } from './tests.service';

/*
 * Давхар submit (давхар товшилт / апп timeout-ын дараа дахин илгээх / хугацаа
 * дуусах үеийн autosave зэрэг) — НЭГ л дүгнэлт бичигдэнэ. docs/BACKEND-PERF.md
 */
function setup(txImpl: (ops: unknown[]) => Promise<unknown>) {
  const prisma = {
    enrollment: { findFirst: jest.fn().mockResolvedValue(null) },
    testResult: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockReturnValue('upsert-op'),
    },
    testAttemptSession: { update: jest.fn().mockReturnValue('session-op') },
    attempt: { createManyAndReturn: jest.fn().mockReturnValue('attempts-op') },
    testItemMark: { createMany: jest.fn().mockReturnValue('marks-op') },
    $transaction: jest.fn(txImpl),
    $executeRaw: jest.fn(),
  };
  const mistakes = { collectAttemptsInBackground: jest.fn() };
  const service = new TestsService(prisma as never, mistakes as never);
  const internals = service as unknown as {
    finalize: (...a: unknown[]) => Promise<{ result: { totalScore: number } }>;
    finalizeExpired: (...a: unknown[]) => Promise<{ result: { totalScore: number; maxScore: number } }>;
  };
  const test = { id: 't1', problems: [] };
  const session = {
    id: 's1',
    draftAnswers: {},
    draftStates: {},
    problemTimes: {},
    leaveCount: 0,
    events: [],
    choiceOrder: {},
  };
  return { prisma, mistakes, internals, test, session };
}

describe('TestsService finalize — зэрэг илгээлт', () => {
  it('session-ийг ЭХЭНД, зөвхөн IN_PROGRESS үед SUBMITTED болгоно', async () => {
    const { prisma, internals, test, session, mistakes } = setup(async () => [
      { id: 's1' },
      { id: 'r1', totalScore: 0, maxScore: 0 },
      [
        { id: 'a1', mistakeCollectedAt: null },
        { id: 'a2', mistakeCollectedAt: new Date() },
      ],
    ]);
    const out = await internals.finalize(test, session, 'stu');
    expect(prisma.testAttemptSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1', status: AttemptSessionStatus.IN_PROGRESS },
      }),
    );
    const ops = prisma.$transaction.mock.calls[0][0] as unknown[];
    expect(ops[0]).toBe('session-op');
    expect(out.result).toEqual({ id: 'r1', totalScore: 0, maxScore: 0 });
    // Алдааны дэвтэр хүсэлтийн дараа, зөвхөн цуглуулаагүй мөрөөр
    expect(mistakes.collectAttemptsInBackground).toHaveBeenCalledWith(['a1']);
  });

  it('өөр хүсэлт түрүүлсэн (P2025) → SessionAlreadyFinalizedError, Attempt бичигдэхгүй', async () => {
    const { internals, test, session, mistakes } = setup(async () => {
      throw Object.assign(new Error('Record to update not found'), { code: 'P2025' });
    });
    await expect(internals.finalize(test, session, 'stu')).rejects.toBeInstanceOf(
      SessionAlreadyFinalizedError,
    );
    expect(mistakes.collectAttemptsInBackground).not.toHaveBeenCalled();
  });

  it('хугацаа дууссан замд түрүүлсэн дүнг буцаана (500/409 гоожихгүй)', async () => {
    const { prisma, internals, test, session } = setup(async () => {
      throw Object.assign(new Error('Record to update not found'), { code: 'P2025' });
    });
    prisma.testResult.findUnique
      .mockResolvedValueOnce(null) // finalize доторх priorResult
      .mockResolvedValueOnce({ totalScore: 5, maxScore: 10 });
    await expect(internals.finalizeExpired(test, session, 'stu')).resolves.toEqual({
      result: { totalScore: 5, maxScore: 10 },
    });
  });

  it('бусад алдааг хэвээр шиднэ', async () => {
    const { internals, test, session } = setup(async () => {
      throw Object.assign(new Error('boom'), { code: 'P9999' });
    });
    await expect(internals.finalize(test, session, 'stu')).rejects.toThrow('boom');
  });
});

describe('TestsService.start — шинэ эхлэлт', () => {
  it('сессгүй үед бүтэн тестийг transaction-ээс ГАДУУР дахин татахгүй', async () => {
    const prisma = {
      testAttemptSession: { findUnique: jest.fn().mockResolvedValue(null) },
      test: { findUnique: jest.fn() },
      $transaction: jest.fn().mockResolvedValue({
        test: { id: 't1' },
        session: null,
        result: { totalScore: 3, maxScore: 4 },
      }),
    };
    const service = new TestsService(prisma as never, {} as never);
    await expect(service.start('t1', 'stu')).resolves.toEqual({
      session: { status: AttemptSessionStatus.SUBMITTED },
      result: { totalScore: 3, maxScore: 4 },
    });
    expect(prisma.test.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
