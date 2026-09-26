import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, TestType } from '../generated/prisma/enums';
import { TestsService } from './tests.service';

describe('TestsService duplicate and server-side draft behavior', () => {
  let prisma: any;
  let service: TestsService;
  const source = {
    id: 'test-source',
    title: 'Synthetic mock',
    type: TestType.CHAPTER_EXAM,
    gradingMode: 'AUTO',
    timeLimitMin: 60,
    chapterId: 'chapter-1',
    createdById: 'teacher-1',
    deletedAt: null,
    problems: [
      { problemId: 'problem-1', order: 1, points: 2 },
      { problemId: 'problem-2', order: 2, points: 3 },
    ],
    access: [{ classroomId: 'old-class' }],
  };

  beforeEach(() => {
    prisma = {
      test: {
        findUnique: jest.fn().mockResolvedValue(source),
        create: jest
          .fn()
          .mockResolvedValue({
            id: 'test-copy',
            title: 'Synthetic mock (хуулбар)',
          }),
      },
      testDraft: {
        create: jest.fn().mockResolvedValue({
          id: 'draft-1',
          ownerId: 'teacher-1',
          revision: 1,
          state: { title: 'Synthetic draft' },
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'draft-1',
          ownerId: 'teacher-1',
          revision: 1,
          state: { title: 'Synthetic draft' },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction = jest.fn((callback) => callback(prisma));
    service = new TestsService(prisma);
  });

  it('duplicates only configuration into an unpublished, unassigned test and audits it', async () => {
    await service.duplicateTest('test-source', 'teacher-1', Role.TEACHER);
    const args = prisma.test.create.mock.calls[0][0];
    expect(args.data).toMatchObject({
      title: 'Synthetic mock (хуулбар)',
      chapterId: 'chapter-1',
      createdById: 'teacher-1',
      isDraft: true,
      problems: { create: source.problems },
    });
    expect(args.data.access).toBeUndefined();
    expect(args.data).not.toHaveProperty('results');
    expect(args.data).not.toHaveProperty('attemptSessions');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREATE',
          entity: 'Test',
          entityId: 'test-copy',
        }),
      }),
    );
  });

  it('does not allow a teacher to duplicate another teacher’s test', async () => {
    await expect(
      service.duplicateTest('test-source', 'other-teacher', Role.TEACHER),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.test.create).not.toHaveBeenCalled();
  });

  it('returns 404 for missing or soft-deleted source tests', async () => {
    prisma.test.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.duplicateTest('missing', 'admin-1', Role.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
    prisma.test.findUnique.mockResolvedValueOnce({
      ...source,
      deletedAt: new Date(),
    });
    await expect(
      service.duplicateTest('deleted', 'admin-1', Role.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.test.create).not.toHaveBeenCalled();
  });

  it('blocks a student from a duplicated draft before checking paid access', async () => {
    prisma.test.findUnique.mockResolvedValueOnce({ ...source, isDraft: true });
    await expect(service.getOne('test-source', 'student', Role.STUDENT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a private server draft for its authenticated owner', async () => {
    await service.createTestDraft(
      { title: 'Synthetic draft' },
      'teacher-1',
      Role.TEACHER,
    );
    expect(prisma.testDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ownerId: 'teacher-1', state: { title: 'Synthetic draft' } },
      }),
    );
  });

  it('enforces draft ownership for read and write without leaking another owner’s record', async () => {
    await expect(
      service.getTestDraft('draft-1', 'other-teacher', Role.TEACHER),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.updateTestDraft(
        'draft-1',
        { expectedRevision: 1, title: 'Changed' },
        'other-teacher',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.testDraft.updateMany).not.toHaveBeenCalled();
  });

  it('autosaves with an owner-scoped expected revision and increments the version', async () => {
    await service.updateTestDraft(
      'draft-1',
      { expectedRevision: 1, title: 'Updated' },
      'teacher-1',
      Role.TEACHER,
    );
    expect(prisma.testDraft.updateMany).toHaveBeenCalledWith({
      where: { id: 'draft-1', ownerId: 'teacher-1', revision: 1 },
      data: {
        state: { expectedRevision: 1, title: 'Updated' },
        revision: { increment: 1 },
      },
    });
  });

  it.each([Role.STUDENT, Role.PARENT, Role.BUYER])('rejects draft access for %s', async (role) => {
    await expect(service.createTestDraft({}, 'forbidden', role)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.testDraft.create).not.toHaveBeenCalled();
  });

  it('returns 409 and the latest snapshot when another write wins the revision race', async () => {
    prisma.testDraft.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.updateTestDraft(
        'draft-1',
        { expectedRevision: 1, title: 'Stale' },
        'teacher-1',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.testDraft.updateMany).toHaveBeenCalledTimes(1);
  });

  it('allows an administrator to inspect any draft and limits teacher deletion to owner', async () => {
    await expect(
      service.getTestDraft('draft-1', 'admin-1', Role.ADMIN),
    ).resolves.toMatchObject({ id: 'draft-1' });
    await service.deleteTestDraft('draft-1', 'teacher-1', Role.TEACHER);
    expect(prisma.testDraft.deleteMany).toHaveBeenCalledWith({
      where: { id: 'draft-1', ownerId: 'teacher-1' },
    });
  });
});
