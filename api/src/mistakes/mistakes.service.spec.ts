import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MistakesService } from './mistakes.service';
import { ProblemFormat, Prisma } from '../generated/prisma/client';

function mockOpenContentAccess() {
  return {
    studentProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    enrollment: { findFirst: jest.fn().mockResolvedValue(null) },
    userPass: { findMany: jest.fn().mockResolvedValue([{ pass: { scope: { all: true } } }]) },
    purchase: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('MistakesService authorization', () => {
  it('returns not found rather than another learner’s entry on edits and retries', async () => {
    const tx = { mistakeEntry: { findFirst: jest.fn().mockResolvedValue(null) } };
    const prisma = { ...mockOpenContentAccess(), mistakeEntry: { findFirst: jest.fn().mockResolvedValue(null) }, $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)) };
    const service = new MistakesService(prisma as any);
    await expect(service.update('learner-a', 'learner-b-entry', { note: 'private' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.retry('learner-a', 'learner-b-entry', 'A')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires a teacher to own an active classroom or a parent to have verified the link', async () => {
    const prisma = {
      enrollment: { findFirst: jest.fn().mockResolvedValue(null) },
      parentLink: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new MistakesService(prisma as any);
    await expect(service.student('student-1', { userId: 'teacher-1', role: 'TEACHER' as any })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.student('student-1', { userId: 'parent-1', role: 'PARENT' as any })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps answer keys out of the list until a learner retries', async () => {
    const base = { id: 'm1', userId: 'learner-a', problemId: 'p1', source: 'TEST', sourceRefId: 'test-1', sourceOccurredAt: new Date('2026-09-01T00:00:00Z'), testTitle: 'Шалгалт', givenAnswer: 'wrong', status: 'NEW', retryCount: 0, consecutiveCorrect: 0, lastRetryAt: null, lastCorrectAt: null, nextRetryAt: null, reason: null, note: null, createdAt: new Date(), updatedAt: new Date(), problem: { id: 'p1', statementText: 'question', choices: ['A', 'B'], format: ProblemFormat.CHOICE, imageKey: null, correctAnswer: 'B', chapter: { topic: { name: 'Алгебр' } }, choiceOptions: [], formulas: [] } };
    const prisma = { ...mockOpenContentAccess(), $queryRaw: jest.fn().mockResolvedValue([]), mistakeEntry: { groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn().mockResolvedValue([{ ...base }]) } };
    const service = new MistakesService(prisma as any);
    expect((await service.list('learner-a', {})).items[0]).not.toHaveProperty('correctAnswer');
    prisma.mistakeEntry.findMany.mockResolvedValue([{ ...base, retryCount: 1, lastRetryAt: new Date(Date.now() + 1_000) }]);
    expect((await service.list('learner-a', {})).items[0]).toHaveProperty('correctAnswer', 'B');
  });

  it('hides a previously revealed key again after a newer wrong-attempt cycle starts', async () => {
    const entry = {
      id: 'm-cycle', retryCount: 3, lastRetryAt: new Date('2026-09-01T00:00:00Z'),
      sourceOccurredAt: new Date('2026-09-02T00:00:00Z'), status: 'RETRYING',
      givenAnswer: 'wrong', reason: null, note: null, testTitle: null,
      createdAt: new Date(), nextRetryAt: null,
      problem: { id: 'p', statementText: 'Q', choices: ['A', 'B'], format: ProblemFormat.CHOICE,
        imageKey: null, correctAnswer: 'B', chapter: { topic: { name: 'Алгебр' } },
        choiceOptions: [], formulas: [], analysis: { status: 'VERIFIED', solutionOutline: 'hidden prior solution' } },
    };
    const prisma = {
      ...mockOpenContentAccess(),
      $queryRaw: jest.fn().mockResolvedValue([]),
      mistakeEntry: { groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn().mockResolvedValue([entry]) },
    };
    const service = new MistakesService(prisma as any);
    const result = (await service.list('learner-a', {})).items[0];
    expect(result).not.toHaveProperty('correctAnswer');
    expect(result).not.toHaveProperty('solutionOutline');
  });

  it('returns a stable cursor after a bounded page and keeps aggregate counts global', async () => {
    const base = { id: 'entry', retryCount: 0, status: 'NEW', givenAnswer: 'x', reason: null, note: null,
      testTitle: null, createdAt: new Date(), nextRetryAt: null,
      problem: { id: 'p', statementText: 'Q', choices: null, format: ProblemFormat.FILL_NUMBER,
        imageKey: null, correctAnswer: null, chapter: { topic: { name: 'Алгебр' } },
        choiceOptions: [], formulas: [], analysis: null } };
    const findMany = jest.fn().mockResolvedValue(Array.from({ length: 201 }, (_, index) => ({ ...base, id: `entry-${index}` })));
    const prisma = {
      ...mockOpenContentAccess(),
      $queryRaw: jest.fn().mockResolvedValue([]),
      mistakeEntry: { groupBy: jest.fn().mockResolvedValue([{ status: 'MASTERED', _count: 17 }]), findMany },
    };
    const service = new MistakesService(prisma as any);
    const result = await service.list('learner-a', { cursor: 'previous-page-last-id' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      cursor: { id: 'previous-page-last-id' }, skip: 1, take: 201,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
    expect(result.items).toHaveLength(200);
    expect(result.nextCursor).toBe('entry-199');
    expect(result.counts.MASTERED).toBe(17);
  });

  it('hides self-reported content for inactive classroom students without a live pass', async () => {
    const access = {
      studentProfile: { findUnique: jest.fn().mockResolvedValue({ type: 'CLASSROOM', activatedAt: null }) },
      enrollment: { findFirst: jest.fn().mockResolvedValue({ studentId: 'learner-a', leftAt: null }) },
      userPass: { findMany: jest.fn().mockResolvedValue([]) },
      purchase: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      ...access,
      $queryRaw: jest.fn().mockResolvedValue([]),
      mistakeEntry: { groupBy: jest.fn().mockResolvedValue([]), findMany },
    };
    const service = new MistakesService(prisma as any);
    await service.list('learner-a', {});
    const query = findMany.mock.calls[0][0];
    expect(access.userPass.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'learner-a', expiresAt: { gt: expect.any(Date) } },
    }));
    expect(query.where.problem.chapter.is.AND[1].OR).toEqual([{ freePreview: true }]);
    expect(query.where.problem.chapter.is).not.toHaveProperty('id', 'private-chapter');
  });

  it('excludes mastered rows from student weakest-topic aggregates', async () => {
    const queryRaw = jest.fn().mockResolvedValue([]);
    const prisma = {
      ...mockOpenContentAccess(),
      $queryRaw: queryRaw,
      mistakeEntry: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const service = new MistakesService(prisma as any);
    await service.student('student-1', { userId: 'student-1', role: 'STUDENT' as any });
    const sql = queryRaw.mock.calls[0][0] as Prisma.Sql;
    expect(sql.sql).toContain('mistake."status" <> \'MASTERED\'');
  });

  it('exposes only safe structured-answer field names before an attempt', async () => {
    const entry = {
      id: 'm2', retryCount: 0, status: 'NEW', givenAnswer: 'partial', reason: null, note: null,
      testTitle: null, createdAt: new Date(), nextRetryAt: null,
      problem: {
        id: 'p2', statementText: 'Fill the fields', choices: null, format: 'FILL_NUMBER',
        correctAnswer: { numerator: 'secret-1', denominator: 'secret-2' }, imageKey: null,
        chapter: { topic: { name: 'Алгебр' } }, choiceOptions: [], formulas: [], analysis: null,
      },
    };
    const prisma = {
      ...mockOpenContentAccess(),
      $queryRaw: jest.fn().mockResolvedValue([]),
      mistakeEntry: { groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn().mockResolvedValue([entry]) },
    };
    const service = new MistakesService(prisma as any);
    const item = (await service.list('learner-a', {})).items[0];
    expect(item.problem.answerFields).toEqual(['numerator', 'denominator']);
    expect(item).not.toHaveProperty('correctAnswer');
    expect(JSON.stringify(item)).not.toContain('secret-1');
  });

  it('returns only database-selected due items and excludes soft-deleted problems', async () => {
    const prisma = {
      ...mockOpenContentAccess(),
      mistakeEntry: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new MistakesService(prisma as any);
    await expect(service.today('learner-a')).resolves.toEqual([]);
    expect(prisma.mistakeEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'learner-a',
        status: { in: ['NEW', 'RETRYING'] },
        problem: expect.objectContaining({ deletedAt: null, chapter: expect.any(Object) }),
        OR: expect.arrayContaining([{ nextRetryAt: null }, { nextRetryAt: { lte: expect.any(Date) } }]),
      }),
      take: 5,
      include: expect.objectContaining({ problem: expect.any(Object) }),
    }));
  });

  it('uses canonical grading for structured choices and updates with a retry-count CAS', async () => {
    const sourceOccurredAt = new Date('2026-09-01T00:00:00Z');
    const row = { id: 'm1', userId: 'learner-a', problemId: 'p1', sourceRefId: 'test-1', sourceOccurredAt, status: 'NEW', retryCount: 0, consecutiveCorrect: 0, lastCorrectAt: null, problem: { id: 'p1', format: ProblemFormat.CHOICE, choices: null, correctAnswer: null, choiceOptions: [{ order: 0, text: 'Буруу', isCorrect: false }, { order: 1, text: 'Зөв', isCorrect: true }], analysis: { status: 'AUTO_DRAFT', solutionOutline: 'private outline' } } };
    const tx = { mistakeEntry: { findFirst: jest.fn().mockResolvedValue(row), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const prisma = { ...mockOpenContentAccess(), $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)) };
    const service = new MistakesService(prisma as any);
    const result = await service.retry('learner-a', 'm1', 1);
    expect(result.correct).toBe(true);
    expect(result.correctAnswer).toBe('Зөв');
    expect(result.solutionOutline).toBeNull();
    expect(tx.mistakeEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      id: 'm1', userId: 'learner-a', retryCount: 0, status: 'NEW',
      sourceRefId: 'test-1', sourceOccurredAt,
    } }));
  });
});
