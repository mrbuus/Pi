import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MistakesService } from './mistakes.service';
import { ProblemFormat } from '../generated/prisma/enums';

describe('MistakesService authorization', () => {
  it('returns not found rather than another learner’s entry on edits and retries', async () => {
    const tx = { mistakeEntry: { findFirst: jest.fn().mockResolvedValue(null) } };
    const prisma = { mistakeEntry: { findFirst: jest.fn().mockResolvedValue(null) }, $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)) };
    const service = new MistakesService(prisma as any, {} as any);
    await expect(service.update('learner-a', 'learner-b-entry', { note: 'private' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.retry('learner-a', 'learner-b-entry', 'A')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires a teacher to own an active classroom or a parent to have verified the link', async () => {
    const prisma = {
      enrollment: { findFirst: jest.fn().mockResolvedValue(null) },
      parentLink: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new MistakesService(prisma as any, {} as any);
    await expect(service.student('student-1', { userId: 'teacher-1', role: 'TEACHER' as any })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.student('student-1', { userId: 'parent-1', role: 'PARENT' as any })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps answer keys out of the list until a learner retries', async () => {
    const base = { id: 'm1', userId: 'learner-a', problemId: 'p1', source: 'TEST', sourceRefId: 'test-1', testTitle: 'Шалгалт', givenAnswer: 'wrong', status: 'NEW', retryCount: 0, consecutiveCorrect: 0, lastRetryAt: null, lastCorrectAt: null, nextRetryAt: null, reason: null, note: null, createdAt: new Date(), updatedAt: new Date(), problem: { id: 'p1', statementText: 'question', choices: ['A', 'B'], format: ProblemFormat.CHOICE, imageKey: null, correctAnswer: 'B', chapter: { topic: { name: 'Алгебр' } }, choiceOptions: [], formulas: [] } };
    const prisma = { mistakeEntry: { groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn().mockResolvedValue([{ ...base }]) } };
    const service = new MistakesService(prisma as any, {} as any);
    expect((await service.list('learner-a', {})).items[0]).not.toHaveProperty('correctAnswer');
    prisma.mistakeEntry.findMany.mockResolvedValue([{ ...base, retryCount: 1 }]);
    expect((await service.list('learner-a', {})).items[0]).toHaveProperty('correctAnswer', 'B');
  });

  it('uses canonical grading for structured choices and updates with a retry-count CAS', async () => {
    const row = { id: 'm1', userId: 'learner-a', problemId: 'p1', status: 'NEW', retryCount: 0, consecutiveCorrect: 0, lastCorrectAt: null, problem: { id: 'p1', format: ProblemFormat.CHOICE, choices: null, correctAnswer: null, choiceOptions: [{ order: 0, text: 'Буруу', isCorrect: false }, { order: 1, text: 'Зөв', isCorrect: true }], analysis: { status: 'AUTO_DRAFT', solutionOutline: 'private outline' } } };
    const tx = { mistakeEntry: { findFirst: jest.fn().mockResolvedValue(row), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const prisma = { $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)) };
    const service = new MistakesService(prisma as any, {} as any);
    const result = await service.retry('learner-a', 'm1', 1);
    expect(result.correct).toBe(true);
    expect(result.solutionOutline).toBeNull();
    expect(tx.mistakeEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'm1', userId: 'learner-a', retryCount: 0, status: 'NEW' } }));
  });
});
