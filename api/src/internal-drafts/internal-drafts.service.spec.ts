import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { withRevisionFakes } from '../../test/fakes/revision-db';
import { InternalDraftsService } from './internal-drafts.service';

const staff = (role: Role = Role.TEACHER_PLUS) => ({
  id: 'u1',
  role,
  archivedAt: null,
  firstName: 'Баасанжав',
  lastName: 'О.',
  externalTeacherProfile: null,
});

const block = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  setId: 's1',
  order: 1,
  kind: 'CHOICE',
  statement: '$2+3$ хэд вэ?',
  choices: ['$4$', '$5$', '$6$', '$7$', '$8$'],
  answer: 'B',
  solution: '$2+3=5$',
  imageKey: null,
  tag: 'Нэмэх',
  points: 1,
  version: 2,
  publishedProblemId: null,
  updatedById: 'u2',
  updatedByName: 'Б. Эмүжин',
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...over,
});

function setup(role: Role = Role.TEACHER_PLUS) {
  const created: Record<string, unknown>[] = [];
  const tx = withRevisionFakes({
    $queryRaw: jest.fn().mockResolvedValue([{ id: 's1', publishCount: 0 }]),
    user: { findUnique: jest.fn().mockResolvedValue(staff(role)) },
    chapter: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'ch1',
        title: 'Тоон илэрхийлэл',
        deletedAt: null,
        book: { code: '100', archived: false, deletedAt: null },
      }),
    },
    problem: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { ...data, id: `p${created.length + 1}` };
        created.push(row);
        return Promise.resolve(row);
      }),
      // revision snapshot уншихад nested create → мөрийн хэлбэр
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        const row = created.find((p) => p.id === where.id);
        if (!row) return Promise.resolve(null);
        const options = row.choiceOptions as { create?: unknown[] } | undefined;
        return Promise.resolve({
          ...row,
          choiceOptions: options?.create ?? [],
          tags: [],
          formulas: [],
        });
      }),
    },
    problemAnalysis: { create: jest.fn().mockResolvedValue({}) },
    test: {
      create: jest.fn().mockResolvedValue({
        id: 't1',
        title: 'Тест',
        isDraft: true,
      }),
      findUnique: jest.fn().mockResolvedValue({ id: 't1', title: 'Тест' }),
    },
    draftBlock: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'b1', version: 2 },
        { id: 'b2', version: 0 },
      ]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(1),
      findUniqueOrThrow: jest.fn().mockResolvedValue(block({ version: 3 })),
    },
    draftSet: { update: jest.fn().mockResolvedValue({}) },
    draftEvent: {
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  });
  const prisma = {
    user: tx.user,
    chapter: tx.chapter,
    storedFile: { findUnique: jest.fn() },
    draftSet: {
      findFirst: jest.fn().mockResolvedValue({
        id: 's1',
        title: 'Ноорог',
        topic: null,
        publishCount: 0,
        publishedTestId: null,
        blocks: [
          block(),
          block({
            id: 'b2',
            order: 2,
            kind: 'NUMERIC',
            statement: '$\\sqrt{16}$',
            choices: [],
            answer: '4',
            solution: null,
            tag: null,
            points: 2,
            version: 0,
          }),
        ],
      }),
    },
    draftBlock: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ ...block(), set: { deletedAt: null } }),
    },
    $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
  };
  return {
    service: new InternalDraftsService(prisma as unknown as PrismaService),
    prisma,
    tx,
    created,
  };
}

describe('InternalDraftsService', () => {
  it('энгийн Багш ноорогт хандахгүй (ӨС-ийн эрхээр)', async () => {
    const { service } = setup(Role.TEACHER);
    await expect(service.getSet('s1', 'u1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('хуучин хувилбараас хадгалбал 409 — хэн өөрчилснийг хэлнэ', async () => {
    const { service, prisma } = setup();
    const error = await service
      .updateBlock('b1', { expectedVersion: 1, answer: 'C' }, 'u1')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    const body = (error as ConflictException).getResponse() as {
      code: string;
      message: string;
    };
    expect(body.code).toBe('DRAFT_VERSION_CONFLICT');
    expect(body.message).toContain('Б. Эмүжин');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('өөрчлөлтгүй хадгалалт хувилбар нэмэхгүй', async () => {
    const { service, prisma } = setup();
    const view = await service.updateBlock(
      'b1',
      { expectedVersion: 2, answer: 'B' },
      'u1',
    );
    expect(view.version).toBe(2);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('засвар хувилбар +1, түүхэнд товч бичвэр', async () => {
    const { service, tx } = setup();
    await service.updateBlock('b1', { expectedVersion: 2, answer: 'C' }, 'u1');
    expect(tx.draftBlock.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1', version: 2 },
        data: expect.objectContaining({
          answer: 'C',
          version: { increment: 1 },
          updatedByName: 'О. Баасанжав',
        }),
      }),
    );
    expect(tx.draftEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ summary: '1-р бодлогын хариу зассан' }),
    });
  });

  it('дутуу блоктой бол нийтлэхгүй — дугаар, шалтгаантай', async () => {
    const { service, prisma } = setup();
    prisma.draftSet.findFirst.mockResolvedValueOnce({
      id: 's1',
      publishCount: 0,
      blocks: [block({ answer: null })],
    });
    const error = await service
      .publish('s1', { chapterId: 'ch1' }, 'u1')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    const body = (error as BadRequestException).getResponse() as {
      code: string;
      blocks: { n: number; messages: string[] }[];
    };
    expect(body.code).toBe('DRAFT_INCOMPLETE');
    expect(body.blocks[0]).toMatchObject({ n: 1 });
    expect(body.blocks[0].messages).toContain('Зөв хариуг сонгоно');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('нийтлэх: Problem ×2 (түүхтэй), бодолт, ноорог тест, аудит — нэг transaction', async () => {
    const { service, tx, created } = setup();
    const result = await service.publish(
      's1',
      {
        chapterId: 'ch1',
        test: { title: 'Тест', type: 'CUSTOM', isDraft: true },
      },
      'u1',
    );
    expect(result).toMatchObject({
      problemIds: ['p1', 'p2'],
      testId: 't1',
      count: 2,
      publishNo: 1,
    });
    expect(created.map((p) => p.token)).toEqual(['ND-S1-1-01', 'ND-S1-1-02']);
    expect(created[0]).toMatchObject({ format: 'CHOICE', chapterId: 'ch1' });
    expect(created[1]).toMatchObject({
      format: 'FILL_NUMBER',
      correctAnswer: '4',
    });
    expect(tx.problemAnalysis.create).toHaveBeenCalledTimes(2);
    expect(tx.problemAnalysis.create.mock.calls[0][0].data).toMatchObject({
      problemId: 'p1',
      solutionOutline: '$2+3=5$',
      topic: 'Нэмэх',
      status: 'VERIFIED',
    });
    expect(tx.test.create.mock.calls[0][0].data).toMatchObject({
      isDraft: true,
      chapterId: 'ch1',
      problems: {
        create: [
          { problemId: 'p1', order: 1, points: 1 },
          { problemId: 'p2', order: 2, points: 2 },
        ],
      },
    });
    expect(tx.draftBlock.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { publishedProblemId: 'p1' },
    });
    const actions = tx.auditLog.create.mock.calls.map(
      (c: [{ data: { action: string; entity: string } }]) =>
        `${c[0].data.action}:${c[0].data.entity}`,
    );
    expect(actions).toEqual(['CREATE:Test', 'PUBLISH:DraftSet']);
    expect(tx.__revisionState.revisions.length).toBeGreaterThanOrEqual(3);
  });

  it('нийтлэх зуур өөр хүн зассан бол 409, юу ч бичихгүй', async () => {
    const { service, tx } = setup();
    tx.draftBlock.findMany.mockResolvedValueOnce([
      { id: 'b1', version: 3 },
      { id: 'b2', version: 0 },
    ]);
    await expect(
      service.publish('s1', { chapterId: 'ch1' }, 'u1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.problem.create).not.toHaveBeenCalled();
  });

  it('бодох горим: зөв, буруу, хоосныг тоолно', async () => {
    const { service } = setup();
    const result = await service.check(
      's1',
      { answers: { b1: 'B', b2: '5' } },
      'u1',
    );
    expect(result).toMatchObject({ correct: 1, wrong: 1, blank: 0, total: 2 });
    expect(result.results[1]).toMatchObject({ n: 2, correct: false, key: '4' });
  });
});
