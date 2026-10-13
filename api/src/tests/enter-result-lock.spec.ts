import { ForbiddenException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { TestsService } from './tests.service';

// Хуучин «нийт оноо» оруулах зам (POST /tests/:id/results) ч онлайн дүнгийн
// түгжээ, эх сурвалжийн дүрмийг дагана — гар дүнгээр онлайн дүнг дарахгүй.
function makeDb(opts: {
  role: Role;
  existing?: Record<string, unknown> | null;
  type?: string;
}) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    test: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          id: 't',
          type: opts.type ?? 'EESH_MOCK',
          deletedAt: null,
        }),
    },
    testResult: {
      findUnique: jest.fn().mockResolvedValue(opts.existing ?? null),
      upsert: jest
        .fn()
        .mockImplementation(({ create }) =>
          Promise.resolve({ id: 'r', ...create }),
        ),
    },
    testAttemptSession: {
      findUnique: jest
        .fn()
        .mockResolvedValue(opts.existing ? { status: 'SUBMITTED' } : null),
    },
    testItemMark: { deleteMany: jest.fn() },
    testAbsence: { deleteMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const db = {
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          role: opts.role,
          archivedAt: null,
          externalTeacherProfile: null,
        }),
    },
    testAccess: { findFirst: jest.fn().mockResolvedValue({ testId: 't' }) },
    $transaction: jest
      .fn()
      .mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { db, tx };
}

const dto = (reason?: string) => ({
  studentId: 's',
  totalScore: 40,
  maxScore: 100,
  ...(reason ? { reason } : {}),
});

describe('POST /tests/:id/results — онлайн дүнгийн түгжээ', () => {
  const online = {
    id: 'r',
    source: 'ONLINE_TEST',
    totalScore: 70,
    maxScore: 100,
    version: 1,
  };

  it('Багш онлайн дүнг дарахгүй', async () => {
    const { db, tx } = makeDb({ role: Role.TEACHER, existing: online });
    await expect(
      new TestsService(db as never, {} as never).enterResult(
        't',
        dto('шалтгаан'),
        'teacher',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.testResult.upsert).not.toHaveBeenCalled();
  });

  it('Багш+ шалтгаантай — засна, аудитад шалтгаан бичигдэнэ', async () => {
    const { db, tx } = makeDb({ role: Role.TEACHER_PLUS, existing: online });
    await new TestsService(db as never, {} as never).enterResult(
      't',
      dto('Цаасан хуудсаар шалгав'),
      'tplus',
      Role.TEACHER_PLUS,
    );
    expect(tx.testResult.upsert.mock.calls[0][0].update).toMatchObject({
      source: 'ONLINE_TEST',
      version: { increment: 1 },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'OVERRIDE_ONLINE_RESULT',
        reason: 'Цаасан хуудсаар шалгав',
      }),
    });
  });

  it('шинэ гар дүн: ЭЕШ сорилд MANUAL_ENTRY (CHAPTER_EXAM биш)', async () => {
    const { db, tx } = makeDb({ role: Role.TEACHER, existing: null });
    await new TestsService(db as never, {} as never).enterResult(
      't',
      dto(),
      'teacher',
      Role.TEACHER,
    );
    expect(tx.testResult.upsert.mock.calls[0][0].create.source).toBe(
      'MANUAL_ENTRY',
    );
  });

  it('сэдвийн шалгалтад CHAPTER_EXAM хэвээр', async () => {
    const { db, tx } = makeDb({
      role: Role.TEACHER,
      existing: null,
      type: 'CHAPTER_EXAM',
    });
    await new TestsService(db as never, {} as never).enterResult(
      't',
      dto(),
      'teacher',
      Role.TEACHER,
    );
    expect(tx.testResult.upsert.mock.calls[0][0].create.source).toBe(
      'CHAPTER_EXAM',
    );
  });
});
