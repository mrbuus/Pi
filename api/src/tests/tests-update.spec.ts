import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTestDto } from './dto/update-test.dto';
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
  const events: string[] = [];
  let storedSession: Record<string, unknown> | null = null;
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
    problems: [{
      problemId: 'problem-1',
      order: 1,
      points: 1,
      problem: {
        id: 'problem-1',
        format: 'OPEN',
        statementText: 'Нэг бодлого',
        imageKey: null,
        choices: null,
        correctAnswer: '5',
        attemptCount: 0,
        correctRate: null,
        choiceOptions: [],
        analysis: null,
        chapter: { id: 'chapter-1', title: 'Бүлэг' },
      },
    }],
    access: [{ classroomId: 'class-1' }],
  };
  const updated = { ...test };
  const tx = {
    $queryRaw: jest.fn((query: { sql?: string }) => {
      events.push(`lock:${query.sql ?? ''}`);
      return [];
    }),
    test: {
      findUnique: jest.fn(() => {
        events.push('test-read');
        return test;
      }),
      update: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Object.assign(updated, data),
      ),
    },
    enrollment: {
      findFirst: jest.fn(() => ({ classroomId: 'class-1' })),
    },
    testResult: {
      count: jest.fn(() => {
        events.push('result-count');
        return options.resultCount ?? 0;
      }),
      findUnique: jest.fn(() => null),
    },
    testAttemptSession: {
      count: jest.fn((args?: { where?: { status?: string } }) =>
        args?.where?.status
          ? (options.activeSessionCount ?? 0)
          : (options.sessionCount ?? 0),
      ),
      findUnique: jest.fn(() => {
        events.push('session-read-tx');
        return storedSession;
      }),
      createMany: jest.fn(({ data }: { data: Array<Record<string, unknown>> }) => {
        events.push('session-create');
        const row = data[0];
        storedSession = {
          ...row,
          id: 'session-1',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          submittedAt: null,
          draftAnswers: {},
          draftStates: {},
          problemTimes: {},
          leaveCount: 0,
          events: [],
        };
        return { count: data.length };
      }),
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
    testProblem: {
      deleteMany: jest.fn(() => ({ count: 1 })),
      createMany: jest.fn(() => ({ count: 1 })),
    },
    testAccess: {
      deleteMany: jest.fn(() => ({ count: 1 })),
      createMany: jest.fn(() => ({ count: 1 })),
    },
    auditLog: {
      create: jest.fn((args: { data: Record<string, unknown> }) => {
        events.push('audit');
        return args.data;
      }),
    },
  };
  const prisma = {
    test: { findUnique: jest.fn(() => { events.push('test-read-root'); return test; }) },
    enrollment: { findFirst: jest.fn(() => ({ classroomId: 'class-1' })) },
    testResult: { count: jest.fn(() => options.resultCount ?? 0) },
    testAttemptSession: {
      findUnique: jest.fn(() => { events.push('session-read-root'); return null; }),
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
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => {
      events.push('transaction-start');
      return Promise.resolve(callback(tx)).finally(() => events.push('transaction-end'));
    }),
  };
  return {
    service: new TestsService(prisma as unknown as PrismaService),
    prisma,
    tx,
    test,
    events,
  };
}

describe('TestsService.updateTest', () => {
  it('өгөөгүй тестийн мэдээлэл, бодлого, ангийг нэг гүйлгээнд бүрэн шинэчилнэ', async () => {
    const { service, prisma, tx, events } = setup();
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
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    const audit = tx.auditLog.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({
      action: 'UPDATE',
      entity: 'Test',
      entityId: 'test-1',
    });
    expect(audit.before).toMatchObject({
      access: [{ classroomId: 'class-1' }],
      problems: [{ problemId: 'problem-1', order: 1, points: 1 }],
    });
    expect(tx.problem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['problem-2'] } } }),
    );
    expect(prisma.problem.findMany).not.toHaveBeenCalled();
    const updateLock = events.find((event) => event.startsWith('lock:'));
    expect(updateLock).toContain('FOR UPDATE');
    expect(events.indexOf(updateLock!)).toBeLessThan(events.indexOf('test-read'));
    expect(events.indexOf('test-read')).toBeLessThan(events.indexOf('result-count'));
    expect(events.indexOf('audit')).toBeGreaterThan(events.indexOf('result-count'));
    expect(events.indexOf('audit')).toBeLessThan(events.indexOf('transaction-end'));
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

  it('сурагч анх эхлүүлэхэд тестийн мөрийг түгжээд дараа нь бодлого, сессийг хадгална', async () => {
    const { service, events } = setup();
    await service.start('test-1', 'student-1');

    const lockIndex = events.findIndex((event) => event.startsWith('lock:'));
    const lockedTestIndex = events.indexOf('test-read');
    const sessionCreateIndex = events.indexOf('session-create');
    expect(lockIndex).toBeGreaterThan(-1);
    expect(lockIndex).toBeLessThan(lockedTestIndex);
    expect(lockedTestIndex).toBeLessThan(sessionCreateIndex);
    expect(events.at(-1)).toBe('transaction-end');
    expect(events[lockIndex]).toContain('FOR SHARE');
  });

  it.each([
    {
      problems: [
        { problemId: 'p1', order: 1 },
        { problemId: 'p1', order: 2 },
      ],
      label: 'бодлогын дугаар',
    },
    {
      problems: [
        { problemId: 'p1', order: 1 },
        { problemId: 'p2', order: 1 },
      ],
      label: 'дарааллын дугаар',
    },
  ])('асуултын $label давхардвал DTO-г хүчингүй болгоно', async ({ problems }) => {
    const dto = plainToInstance(UpdateTestDto, { problems });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'problems')).toBe(true);
  });
});
