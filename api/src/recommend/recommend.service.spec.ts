import { RecommendService } from './recommend.service';
import { PrismaService } from '../prisma/prisma.service';
import { MistakeCollector } from '../mistakes/mistake-collector.service';
import { Role } from '../generated/prisma/enums';
function fixture() {
  return {
    attempt: { findMany: jest.fn().mockResolvedValue([]) },
    enrollment: { findFirst: jest.fn().mockResolvedValue(null) },
    learningEvent: { findMany: jest.fn().mockResolvedValue([]) },
    studentProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    userPass: { findMany: jest.fn().mockResolvedValue([]) },
    purchase: { findMany: jest.fn().mockResolvedValue([]) },
    chapter: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          {
            id: 'free',
            bookId: null,
            freePreview: true,
            order: 0,
            grade: null,
          },
        ]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    problem: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'fresh', chapterId: 'free', attemptCount: 10, correctRate: 0 },
        ]),
    },
  };
}
describe('recommendation evidence and entitlement contract', () => {
  it('cold-start entitled/free BUYER needs no enrollment, returns deterministic cautious explanation without keys', async () => {
    const db = fixture(),
      service = new RecommendService(
        db as unknown as PrismaService,
        {} as MistakeCollector,
      );
    const first = await service.getNextProblems('buyer', 2, Role.BUYER);
    expect(first[0]).toMatchObject({
      problemId: 'fresh',
      reason: 'NEW_TOPIC',
      uncertainty: 'small-sample',
      evidence: { independentAttempts: 0 },
      contract: 'observed-independent-v1',
    });
    expect(first[0]).not.toHaveProperty('correctAnswer');
    expect(
      (await service.getNextProblems('buyer', 2, Role.BUYER)).map(
        (r) => r.problemId,
      ),
    ).toEqual(first.map((r) => r.problemId));
    expect(db.chapter.findMany.mock.calls[0][0].where.AND[0]).toEqual({
      OR: [{ freePreview: true }, { id: { in: [] } }, { bookId: { in: [] } }],
    });
  });
  it('unknown/corrected reports remain separate and cannot make an independent success estimate', async () => {
    const db = fixture();
    db.attempt.findMany.mockResolvedValue([
      {
        problemId: 'unknown',
        problem: { chapterId: 'free' },
        autoCorrect: null,
        selfState: null,
        source: 'ONLINE_TEST',
        createdAt: new Date('2026-10-01'),
      },
      {
        problemId: 'fixed',
        problem: { chapterId: 'free' },
        autoCorrect: true,
        selfState: 'FIXED_AFTER_ERROR',
        source: 'ONLINE_TEST',
        createdAt: new Date('2026-10-02'),
      },
    ]);
    const r = await new RecommendService(
      db as unknown as PrismaService,
      {} as MistakeCollector,
    ).getNextProblems('pupil');
    expect(r[0].evidence).toMatchObject({
      independentAttempts: 0,
      independentCorrect: 0,
      unknown: 1,
      corrected: 1,
    });
    expect(r[0].reason).toBe('NEW_TOPIC');
  });
  it('rejects unbounded/malformed counts and nonlearner role', async () => {
    const service = new RecommendService(
      fixture() as unknown as PrismaService,
      {} as MistakeCollector,
    );
    await expect(service.getNextProblems('p', NaN)).rejects.toMatchObject({
      status: 400,
    });
    await expect(service.getNextProblems('p', -1)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      service.getNextProblems('staff', 1, Role.TEACHER),
    ).rejects.toMatchObject({ status: 403 });
  });
});
