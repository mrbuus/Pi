import { ForbiddenException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { FormulasService } from './formulas.service';

const date1 = new Date('2026-01-01T00:00:00Z');
const date2 = new Date('2026-01-02T00:00:00Z');
function setup() {
  const prisma: any = {
    attempt: { groupBy: jest.fn().mockResolvedValue([
      { problemId: 'p1', autoCorrect: true, _count: { _all: 2 }, _min: { occurredOn: date2 }, _max: { occurredOn: date2 } },
      { problemId: 'p1', autoCorrect: false, _count: { _all: 1 }, _min: { occurredOn: date1 }, _max: { occurredOn: date1 } },
      { problemId: 'p1', autoCorrect: null, _count: { _all: 1 }, _min: { occurredOn: date1 }, _max: { occurredOn: date2 } },
    ]) },
    testAttemptSession: { findMany: jest.fn().mockResolvedValue([{ submittedAt: date1, problemOrder: ['p1'], test: { title: 'Earlier test' } }, { submittedAt: date2, problemOrder: ['p1'], test: { title: 'Latest test' } }]) },
    parentLink: { findFirst: jest.fn() }, enrollment: { findFirst: jest.fn() },
    formula: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([{ slug: 'f1', name: 'Formula', section: { slug: 'trig', title: 'Тригонометр' }, latex: '\\sin x', general: '\\sin x', problems: [{ problemId: 'p1' }] }]) },
  };
  return { service: new FormulasService(prisma), prisma };
}

describe('FormulasService.my', () => {
  it('aggregates seen and correct attempts and submitted test session context', async () => {
    const { service, prisma } = setup();
    const result = await service.my({ userId: 's1', role: Role.STUDENT }, 'other-student');
    expect(prisma.attempt.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 's1' }, _min: { occurredOn: true }, _max: { occurredOn: true } }));
    expect(result).toEqual({ totalFormulas: 1, seenFormulas: 1, items: [expect.objectContaining({ seenCount: 4, correctCount: 2, firstSeenAt: date1, lastSeenAt: date2, lastTestTitle: 'Latest test' })] });
  });
  it('allows a parent only for a verified linked child', async () => {
    const { service, prisma } = setup();
    prisma.parentLink.findFirst.mockResolvedValue(null);
    await expect(service.my({ userId: 'parent', role: Role.PARENT }, 'child')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.parentLink.findFirst.mockResolvedValue({ id: 'verified' });
    await expect(service.my({ userId: 'parent', role: Role.PARENT }, 'child')).resolves.toHaveProperty('seenFormulas', 1);
    expect(prisma.parentLink.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ verifiedAt: { not: null } }) }));
  });
  it('lets a BUYER see only their own practice history', async () => {
    const { service, prisma } = setup();
    await service.my({ userId: 'buyer', role: Role.BUYER }, 'someone-else');
    expect(prisma.attempt.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 'buyer' } }));
  });
  it('denies parents without a student and teachers outside their own class', async () => {
    const { service, prisma } = setup();
    await expect(service.my({ userId: 'parent', role: Role.PARENT })).rejects.toBeInstanceOf(ForbiddenException);
    prisma.enrollment.findFirst.mockResolvedValue(null);
    await expect(service.my({ userId: 'teacher', role: Role.TEACHER }, 'other')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.enrollment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 'other', leftAt: null, classroom: { teacherId: 'teacher' } } }));
  });
});
