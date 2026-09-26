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

const validWritePayload = {
  slug: 'sample-formula', title: 'Sample formula', section: 'trigonometry', order: 1,
  level: 'CORE', grade: 10, topicSlugs: ['TRIG'], latex: '\\sin x', general: '\\sin x',
  variants: [], conditions: [], explanation: 'Explanation', derivation: ['Step 1', 'Step 2'],
  mnemonic: 'Mnemonic', examples: [
    { problem: 'Find $\\sin x$', steps: ['Use the identity'], answer: '$1$' },
    { problem: 'Find cosine', steps: ['Use identity'], answer: '$0$' },
  ], commonMistakes: [], eeshTip: 'Tip', related: ['related-formula'], keywords: ['sine'], widget: null,
  quiz: [
    { type: 'blank', prompt: '\\sin x = \\square', answer: '1', distractors: ['0', '2'] },
    { type: 'truefalse', prompt: '\\sin 0 = 0', answer: 'true', why: 'By definition' },
  ],
};

function writeSetup() {
  const prisma: any = {
    formula: {
      findMany: jest.fn().mockResolvedValue([{ slug: 'related-formula' }]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'new-id' }),
      update: jest.fn().mockResolvedValue({ id: 'existing-id' }),
    },
    formulaSection: { findUnique: jest.fn().mockResolvedValue({ slug: 'trigonometry' }) },
  };
  return { prisma, service: new FormulasService(prisma) };
}

describe('FormulasService formula writes', () => {
  it('validates KaTeX and quiz payloads before create', async () => {
    const { service, prisma } = writeSetup();
    await expect(service.create({ ...validWritePayload, latex: '\\notARealCommand{' } as any)).rejects.toMatchObject({ status: 400 });
    await expect(service.create({ ...validWritePayload, quiz: [{ type: 'truefalse', prompt: 'q', answer: 'abc', why: 'why' }, validWritePayload.quiz[0]] } as any)).rejects.toMatchObject({ status: 400 });
    expect(prisma.formula.create).not.toHaveBeenCalled();
  });

  it('returns clean reference and unique-conflict errors', async () => {
    const { service, prisma } = writeSetup();
    await expect(service.create({ ...validWritePayload, related: ['missing-formula'] } as any)).rejects.toMatchObject({ status: 400 });
    prisma.formula.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.create(validWritePayload as any)).rejects.toMatchObject({ status: 409 });
  });

  it('returns 404 for a missing section and rejects null patch fields', async () => {
    const { service, prisma } = writeSetup();
    prisma.formulaSection.findUnique.mockResolvedValue(null);
    await expect(service.create(validWritePayload as any)).rejects.toMatchObject({ status: 404 });
    await expect(service.update('sample-formula', { title: null } as any)).rejects.toMatchObject({ status: 400 });
    prisma.formula.findUnique.mockResolvedValue(null);
    await expect(service.update('missing-formula', { title: 'New name' } as any)).rejects.toMatchObject({ status: 404 });
    expect(prisma.formula.update).not.toHaveBeenCalled();
  });

  it('validates the merged full formula on patch and preserves the old row when invalid', async () => {
    const { service, prisma } = writeSetup();
    prisma.formula.findUnique.mockResolvedValue({ ...validWritePayload, name: validWritePayload.title, sectionSlug: 'trigonometry', relatedSlugs: validWritePayload.related });
    await expect(service.update('sample-formula', { latex: '\\invalidCommand{' } as any)).rejects.toMatchObject({ status: 400 });
    expect(prisma.formula.update).not.toHaveBeenCalled();
  });
});
