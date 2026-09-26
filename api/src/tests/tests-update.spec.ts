import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { TestsService } from './tests.service';

function setup(
  options: {
    deletedAt?: Date | null;
    owner?: string;
    resultCount?: number;
    sessionCount?: number;
    activeSessionCount?: number;
    timeLimitMin?: number | null;
  } = {},
) {
  const test = {
    id: 'test-1',
    title: 'Эхний тест',
    type: 'DAILY',
    gradingMode: 'AUTO',
    chapterId: null,
    timeLimitMin: options.timeLimitMin ?? 60,
    pdfKey: null,
    groupKey: null,
    variantLabel: null,
    price: null,
    createdById: options.owner ?? 'teacher-1',
    deletedAt: options.deletedAt ?? null,
    problems: [{ problemId: 'problem-1' }],
    access: [{ classroomId: 'class-1' }],
  };
  const updated = { ...test };
  const tx = {
    test: {
      update: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Object.assign(updated, data),
      ),
    },
    testProblem: {
      deleteMany: jest.fn(() => ({ count: 1 })),
      createMany: jest.fn(() => ({ count: 1 })),
    },
    testAccess: {
      deleteMany: jest.fn(() => ({ count: 1 })),
      createMany: jest.fn(() => ({ count: 1 })),
    },
  };
  const prisma = {
    test: { findUnique: jest.fn(() => test) },
    testResult: { count: jest.fn(() => options.resultCount ?? 0) },
    testAttemptSession: {
      count: jest.fn((args?: { where?: { status?: string } }) =>
        args?.where?.status
          ? (options.activeSessionCount ?? 0)
          : (options.sessionCount ?? 0),
      ),
    },
    problem: {
      findMany: jest.fn((args: { where: { id: { in: string[] } } }) =>
        args.where.id.in.map((id) => ({
          id,
          format: 'CHOICE',
          choices: ['A', 'B'],
          correctAnswer: 'A',
          choiceOptions: [],
        })),
      ),
    },
    auditLog: {
      create: jest.fn(
        (args: {
          data: { action: string; entity: string; entityId: string };
        }) => args.data,
      ),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  };
  return {
    service: new TestsService(prisma as unknown as PrismaService),
    prisma,
    tx,
    test,
  };
}

describe('TestsService.updateTest', () => {
  it('өгөөгүй тестийн мэдээлэл, бодлого, ангийг нэг гүйлгээнд бүрэн шинэчилнэ', async () => {
    const { service, prisma, tx } = setup();
    const result = await service.updateTest(
      'test-1',
      {
        title: 'Шинэ нэр',
        problems: [{ problemId: 'problem-2', order: 1, points: 3 }],
        classroomIds: ['class-2'],
      },
      'teacher-1',
      Role.TEACHER,
    );

    expect(result.title).toBe('Шинэ нэр');
    expect(tx.testProblem.deleteMany).toHaveBeenCalledWith({
      where: { testId: 'test-1' },
    });
    expect(tx.testProblem.createMany).toHaveBeenCalledWith({
      data: [{ testId: 'test-1', problemId: 'problem-2', order: 1, points: 3 }],
    });
    expect(tx.testAccess.deleteMany).toHaveBeenCalledWith({
      where: { testId: 'test-1' },
    });
    expect(tx.testAccess.createMany).toHaveBeenCalledWith({
      data: [{ testId: 'test-1', classroomId: 'class-2' }],
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const audit = prisma.auditLog.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({
      action: 'UPDATE',
      entity: 'Test',
      entityId: 'test-1',
    });
  });

  it('өгсөн тестийн бодлогыг өөрчлөхөд 409 буцаана', async () => {
    const { service } = setup({ sessionCount: 1 });
    await expect(
      service.updateTest('test-1', { problems: [] }, 'teacher-1', Role.TEACHER),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('өөр багш өөр хүний тестийг засахад 403 буцаана', async () => {
    const { service } = setup({ owner: 'teacher-2' });
    await expect(
      service.updateTest(
        'test-1',
        { title: 'Шинэ нэр' },
        'teacher-1',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('зөөлөн устгасан тестэд 404 буцаана', async () => {
    const { service } = setup({ deletedAt: new Date() });
    await expect(
      service.updateTest(
        'test-1',
        { title: 'Шинэ нэр' },
        'teacher-1',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('идэвхтэй сесс байхад хугацааг богиносгохыг хориглоно', async () => {
    const { service } = setup({ sessionCount: 1, activeSessionCount: 1 });
    await expect(
      service.updateTest(
        'test-1',
        { timeLimitMin: 30 },
        'teacher-1',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('эхлээгүй тест бүх горимд байгааг edit-info-д мэдээлнэ', async () => {
    const { service } = setup();
    const info = await service.editInfo('test-1', 'teacher-1', Role.TEACHER);
    expect(info.mode).toBe('FULL');
    expect(info.reason).toContain('хараахан эхлүүлээгүй');
  });

  it('сурагч сесс эхлүүлсэн бол LIMITED горим буцаана', async () => {
    const { service } = setup({ sessionCount: 1 });
    const info = await service.editInfo('test-1', 'teacher-1', Role.TEACHER);
    expect(info.mode).toBe('LIMITED');
    expect(info.reason).toContain('зөвхөн нэр, хугацаа');
  });
});
