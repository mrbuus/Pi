import { ForbiddenException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { ReadinessService } from './readiness.service';

describe('ReadinessService access scope', () => {
  const prisma: any = {
    user: { findFirst: jest.fn().mockResolvedValue({ id: 'student-1' }) },
    attempt: { findMany: jest.fn().mockResolvedValue([]) },
    parentLink: { findFirst: jest.fn() },
    enrollment: { findFirst: jest.fn() },
  };
  const service = new ReadinessService(prisma);
  beforeEach(() => jest.clearAllMocks());

  it('allows a student to read only self through the self endpoint', async () => {
    await service.getForStudent('student-1', Role.STUDENT, 'student-1');
    await expect(service.getForStudent('student-1', Role.STUDENT, 'student-2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires a verified parent link', async () => {
    prisma.parentLink.findFirst.mockResolvedValue(null);
    await expect(service.getForStudent('parent-1', Role.PARENT, 'student-1')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.parentLink.findFirst.mockResolvedValue({ verifiedAt: new Date() });
    await expect(service.getForStudent('parent-1', Role.PARENT, 'student-1')).resolves.toMatchObject({ dataPoints: 0 });
  });

  it('limits teachers to a currently enrolled student in their own active class', async () => {
    prisma.enrollment.findFirst.mockResolvedValue(null);
    await expect(service.getForStudent('teacher-1', Role.TEACHER, 'student-1')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.enrollment.findFirst.mockResolvedValue({ id: 'enrollment-1' });
    await expect(service.getForStudent('teacher-1', Role.TEACHER, 'student-1')).resolves.toMatchObject({ dataPoints: 0 });
    expect(prisma.enrollment.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ classroom: { archived: false, teacherId: 'teacher-1' } }) }));
  });

  it('uses occurredOn and fetches the oldest week snapshot window from one frozen as-of time', async () => {
    const instant = new Date('2026-09-27T17:00:00.000Z');
    const asOf = new Date('2026-09-28T00:00:00.000Z');
    const oldAttemptDate = new Date(asOf.getTime() - 108 * 86_400_000);
    jest.useFakeTimers().setSystemTime(instant);
    prisma.attempt.findMany.mockResolvedValueOnce([{
      id: 'attempt-old', problemId: 'problem-old', occurredOn: oldAttemptDate,
      createdAt: asOf, autoCorrect: false, selfState: null,
      problem: { analysis: { topic: 'TRIG' }, formulas: [], chapter: { topic: { name: 'Тригонометр' } } },
    }]);
    try {
      const result = await service.getForStudent('student-1', Role.STUDENT, 'student-1');
      const where = prisma.attempt.findMany.mock.calls.at(-1)[0].where;
      expect(where.occurredOn.gte.getTime()).toBe(asOf.getTime() - 110 * 86_400_000);
      expect(where.occurredOn.lte).toEqual(asOf);
      expect(where.createdAt).toBeUndefined();
      expect(result.weeklyHistory[0].index).toBeGreaterThan(0);
      expect(result.weeklyHistory[7].index).toBe(0);
      expect(result.topics.find((topic) => topic.topic === 'TRIG')).toMatchObject({ attempts: 0, measured: false });
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses corrected self-state before the original automatic correctness value', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-27T17:00:00Z'));
    try {
      prisma.attempt.findMany.mockResolvedValueOnce([
        { id: 'fixed', problemId: 'p1', occurredOn: new Date('2026-09-28T00:00:00Z'), autoCorrect: false, selfState: 'FIXED_AFTER_ERROR', problem: { analysis: { topic: 'TOO' }, formulas: [], chapter: { topic: null } } },
        { id: 'guessed', problemId: 'p2', occurredOn: new Date('2026-09-28T00:00:00Z'), autoCorrect: true, selfState: 'GUESSED', problem: { analysis: { topic: 'TOO' }, formulas: [], chapter: { topic: null } } },
      ]);
      const result = await service.getForStudent('student-1', Role.STUDENT, 'student-1');
      expect(result.topics.find((topic) => topic.topic === 'TOO')).toMatchObject({ attempts: 2, mastery: 50 });
    } finally {
      jest.useRealTimers();
    }
  });
});
