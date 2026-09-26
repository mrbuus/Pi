import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';

function setup(src: Record<string, unknown> | null) {
  const created: Record<string, unknown>[] = [];
  const createdProblems: unknown[] = [];
  const tx = {
    test: { create: jest.fn(async ({ data }) => { const row = { id: 'copy-1', ...data }; created.push(row); return row; }) },
    testProblem: { createMany: jest.fn(async ({ data }) => { createdProblems.push(...data); return { count: data.length }; }) },
  };
  const prisma = {
    test: { findUnique: jest.fn(async () => src) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { svc: new TestsService(prisma as any), created, createdProblems, tx };
}

const source = {
  id: 't1',
  title: 'Логарифм 1',
  type: 'DAILY',
  gradingMode: 'AUTO',
  chapterId: 'ch1',
  timeLimitMin: 40,
  pdfKey: null,
  price: 5000,
  groupKey: 'G',
  variantLabel: 'A',
  createdById: 'teacher-1',
  deletedAt: null,
  problems: [
    { problemId: 'p1', order: 1, points: 1 },
    { problemId: 'p2', order: 2, points: 2 },
  ],
  access: [{ classroomId: 'c1' }],
};

describe('POST /tests/:id/duplicate (G36)', () => {
  it('эзэмшигч багш хуулна: бодлого, дараалал, оноо хуулагдана; анги, үнэ, groupKey хуулагдахгүй', async () => {
    const { svc, created, createdProblems } = setup(source);
    const res = await svc.duplicate('t1', 'teacher-1', Role.TEACHER);
    expect(res).toEqual({ id: 'copy-1', title: 'Логарифм 1 (хуулбар)', problems: 2 });
    expect(created[0]).toMatchObject({ createdById: 'teacher-1', price: null, chapterId: 'ch1', timeLimitMin: 40 });
    expect(created[0]).not.toHaveProperty('groupKey');
    expect(createdProblems).toEqual([
      { testId: 'copy-1', problemId: 'p1', order: 1, points: 1 },
      { testId: 'copy-1', problemId: 'p2', order: 2, points: 2 },
    ]);
  });

  it('ADMIN үнийг хуулна', async () => {
    const { svc, created } = setup(source);
    await svc.duplicate('t1', 'admin', Role.ADMIN);
    expect(created[0]).toMatchObject({ price: 5000, createdById: 'admin' });
  });

  it('өөр багшийн тест → 403, устгасан → 404', async () => {
    await expect(setup(source).svc.duplicate('t1', 'teacher-2', Role.TEACHER)).rejects.toThrow(ForbiddenException);
    await expect(setup({ ...source, deletedAt: new Date() }).svc.duplicate('t1', 'teacher-1', Role.TEACHER)).rejects.toThrow(NotFoundException);
  });

  it('сурагч хуулж чадахгүй (@Roles)', () => {
    expect(Reflect.getMetadata(ROLES_KEY, TestsController.prototype.duplicate)).toEqual(['ADMIN', 'TEACHER_PLUS', 'TEACHER']);
  });
});
