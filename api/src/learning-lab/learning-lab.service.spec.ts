import { LearningLabService } from './learning-lab.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
import { generate } from './generator';
describe('owned immutable learning evidence', () => {
  let rows: Map<string, any>, prisma: any, service: LearningLabService;
  beforeEach(() => {
    rows = new Map();
    prisma = {
      learningEvent: {
        findUnique: jest.fn(async ({ where }) => rows.get(where.id) ?? null),
        upsert: jest.fn(async ({ where, create }) => {
          if (!rows.has(where.id)) rows.set(where.id, create);
          return rows.get(where.id);
        }),
        create: jest.fn(async ({ data }) => data),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
      enrollment: { findFirst: jest.fn(async () => null) },
    };
    prisma.$queryRaw = jest.fn(async () => []);
    prisma.$transaction = jest.fn(async (operation) => operation(prisma));
    service = new LearningLabService(prisma as PrismaService);
  });
  it('hides key and solution', async () => {
    const p = await service.problem('a', 'linear', 4);
    expect(p).not.toHaveProperty('answers');
    expect(p).not.toHaveProperty('solution');
    expect(p).not.toHaveProperty('coefficients');
  });
  it('reload/replay preserve first answer, pupils own separate rows', async () => {
    const p = generate('linear', 5),
      first = await service.respond('alice', {
        problemId: p.id,
        answer: '999',
        flags: ['unsure'],
      });
    expect(
      await service.respond('alice', { problemId: p.id, answer: p.answers[0] }),
    ).toEqual(first);
    expect((await service.problem('alice', 'linear', 5)).first).toEqual(first);
    expect((await service.problem('bob', 'linear', 5)).first).toBeNull();
    await service.respond('bob', { problemId: p.id, answer: p.answers[0] });
    expect(rows.size).toBe(2);
    expect(prisma.learningEvent.upsert.mock.calls[0][0].update).toEqual({});
  });
  it('requires owned first answer for solution/retry', async () => {
    await expect(service.solution('b', 'lab-v1:linear:5')).rejects.toThrow();
    await expect(
      service.correction('b', { problemId: 'lab-v1:linear:5', answer: '1' }),
    ).rejects.toThrow();
  });
  it('separates solution-assisted corrections', async () => {
    const p = generate('fractions', 2);
    await service.respond('a', { problemId: p.id, answer: '999' });
    await service.solution('a', p.id);
    expect(prisma.learningEvent.create.mock.calls[0][0].data.meta.kind).toBe(
      'solution-viewed',
    );
    prisma.learningEvent.findFirst.mockResolvedValue({ id: 'exposed' });
    expect(
      (await service.correction('a', { problemId: p.id, answer: p.answers[0] }))
        .kind,
    ).toBe('solution-assisted-correction');
  });
  it('rejects unbounded flags and timing', async () => {
    for (const body of [
      { answer: '', flags: [] },
      { answer: '1', flags: ['fake'] },
      { answer: '1', timing: { focusedMs: 1800001 } },
      { answer: '1', timing: { buttons: -1 } },
    ])
      await expect(
        service.respond('a', { problemId: 'lab-v1:linear:1', ...body }),
      ).rejects.toThrow();
  });
  it('review requires teacher ownership; pupil cannot inspect another pupil', async () => {
    await expect(
      service.review('teacher', Role.TEACHER, 'pupil'),
    ).rejects.toThrow();
    await expect(
      service.review('pupil', Role.STUDENT, 'other'),
    ).rejects.toThrow();
    prisma.enrollment.findFirst.mockResolvedValue({ id: 'own' });
    await service.review('teacher', Role.TEACHER, 'pupil');
    expect(prisma.learningEvent.findMany.mock.calls[0][0].where.userId).toBe(
      'pupil',
    );
  });
});
