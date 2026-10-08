import { AssignmentsService } from './assignments.service';
import { ReviewAction } from './dto/review.dto';
import { Role, SubmissionState } from '../generated/prisma/enums';
import { HomeworkMarksService } from './homework-marks.service';
function setup() {
  let saved: any = {
    id: 'submission',
    assignmentId: 'assignment',
    studentId: 'student',
    state: SubmissionState.SUBMITTED,
    note: 'original',
    studentNote: 'original',
    reviewNote: null,
    imageKeys: ['original.jpg'],
    submittedAt: new Date('2026-10-01'),
    checkedAt: null,
    updatedAt: new Date('2026-10-01'),
    revisions: [],
  };
  const revisions: any[] = [];
  const db: any = {
    assignment: {
      create: jest.fn(async ({ data }: any) => ({
        id: 'new-assignment',
        createdAt: new Date(),
        ...data,
      })),
      update: jest.fn(async ({ data }: any) => data),
      findUnique: jest.fn().mockResolvedValue({
        id: 'assignment',
        classroomId: 'class',
        deletedAt: null,
        createdAt: new Date('2026-09-01'),
      }),
    },
    classroom: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ teacherId: 'teacher', archived: false }),
    },
    enrollment: {
      findFirst: jest.fn().mockResolvedValue({ studentId: 'student' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    storedFile: {
      findMany: jest.fn(async ({ where }: any) =>
        where.key.in.map((key: string) => ({
          key,
          ownerId: 'student',
          mime: 'image/png',
          size: 1024,
        })),
      ),
    },
    submission: {
      findUnique: jest.fn(async () => ({ ...saved, revisions })),
      upsert: jest.fn(async ({ update }: any) => {
        saved = { ...saved, ...update };
        return saved;
      }),
      findUniqueOrThrow: jest.fn(async () => ({
        ...saved,
        revisions: [...revisions],
      })),
    },
    submissionRevision: {
      create: jest.fn(async ({ data }: any) => {
        revisions.push({
          ...data,
          id: `revision-${revisions.length}`,
          at: data.at ?? new Date(),
        });
        return data;
      }),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(async (fn: any) => fn(db)),
    dailyHomeworkMark: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return {
    db,
    revisions,
    setSaved: (patch: any) => {
      saved = { ...saved, ...patch };
    },
    service: new AssignmentsService(
      db,
      { record: jest.fn() } as never,
      { notify: jest.fn().mockResolvedValue(undefined) } as never,
    ),
  };
}
describe('submission answer and review history', () => {
  it('teacher assignment creation only grants newly uploaded own attachments', async () => {
    const { service, db } = setup();
    db.storedFile.findMany.mockResolvedValue([
      { key: 'foreign.png', ownerId: 'student', mime: 'image/png', size: 100 },
    ]);
    await expect(
      service.create(
        'class',
        { title: 'Homework', imageKeys: ['foreign.png'] },
        'teacher',
        Role.TEACHER_PLUS,
      ),
    ).rejects.toThrow('өөрийн');
    expect(db.assignment.create).not.toHaveBeenCalled();
    db.storedFile.findMany.mockResolvedValue([
      { key: 'own.png', ownerId: 'teacher', mime: 'image/png', size: 100 },
    ]);
    expect(
      await service.create(
        'class',
        { title: 'Homework', imageKeys: ['own.png'] },
        'teacher',
        Role.TEACHER_PLUS,
      ),
    ).toMatchObject({ imageKeys: ['own.png'] });
  });
  it('teacher assignment update retains legacy evidence and refuses new foreign keys', async () => {
    const { service, db } = setup();
    db.assignment.findUnique.mockResolvedValue({
      id: 'assignment',
      classroomId: 'class',
      imageKeys: ['legacy.png'],
      deletedAt: null,
    });
    expect(
      await service.update(
        'assignment',
        { title: 'Updated', imageKeys: ['legacy.png'] },
        'teacher',
        Role.TEACHER_PLUS,
      ),
    ).toMatchObject({ title: 'Updated' });
    expect(db.storedFile.findMany).not.toHaveBeenCalled();
    db.storedFile.findMany.mockResolvedValue([
      { key: 'foreign.png', ownerId: 'student', mime: 'image/png', size: 100 },
    ]);
    await expect(
      service.update(
        'assignment',
        { imageKeys: ['legacy.png', 'foreign.png'] },
        'teacher',
        Role.TEACHER_PLUS,
      ),
    ).rejects.toThrow('өөрийн');
  });
  it('limits attachment count and validates stored type and size', async () => {
    const { service, db } = setup();
    await expect(
      service.submit('assignment', 'student', {
        imageKeys: Array(11).fill('a.png'),
      }),
    ).rejects.toThrow('10 файл');
    db.storedFile.findMany.mockResolvedValue([
      { key: 'bad.html', ownerId: 'student', mime: 'text/html', size: 100 },
    ]);
    await expect(
      service.submit('assignment', 'student', { imageKeys: ['bad.html'] }),
    ).rejects.toThrow('PDF');
    db.storedFile.findMany.mockResolvedValue([
      {
        key: 'big.png',
        ownerId: 'student',
        mime: 'image/png',
        size: 26 * 1024 * 1024,
      },
    ]);
    await expect(
      service.submit('assignment', 'student', { imageKeys: ['big.png'] }),
    ).rejects.toThrow('PDF');
  });
  it('rejects another user upload before changing submission or history', async () => {
    const { service, db, revisions } = setup();
    db.storedFile.findMany.mockResolvedValue([
      { key: 'foreign.png', ownerId: 'other-user' },
    ]);
    await expect(
      service.submit('assignment', 'student', { imageKeys: ['foreign.png'] }),
    ).rejects.toThrow('өөрийн');
    expect(db.submission.upsert).not.toHaveBeenCalled();
    expect(revisions).toEqual([]);
  });
  it('rejects unknown and ownerless new attachments', async () => {
    const { service, db } = setup();
    db.storedFile.findMany.mockResolvedValue([
      { key: 'ownerless.png', ownerId: null },
    ]);
    await expect(
      service.submit('assignment', 'student', { imageKeys: ['ownerless.png'] }),
    ).rejects.toThrow('өөрийн');
    await expect(
      service.submit('assignment', 'student', { imageKeys: ['unknown.png'] }),
    ).rejects.toThrow('өөрийн');
  });
  it('allows retained legacy evidence already belonging to this same submission', async () => {
    const { service, db } = setup();
    db.storedFile.findMany.mockResolvedValue([
      { key: 'original.jpg', ownerId: null },
    ]);
    expect(
      (
        await service.submit('assignment', 'student', {
          imageKeys: ['original.jpg'],
        })
      ).imageKeys,
    ).toEqual(['original.jpg']);
  });
  it('teacher assessment does not overwrite the pupil answer and records both', async () => {
    const { service, db, revisions } = setup();
    const result = await service.review(
      'assignment',
      {
        studentId: 'student',
        action: ReviewAction.RETURN,
        note: 'Explain step two',
      },
      'teacher',
      Role.TEACHER,
    );
    expect(result.studentNote).toBe('original');
    expect(result.note).toBe('original');
    expect(result.reviewNote).toBe('Explain step two');
    expect(revisions.map((r) => r.action)).toEqual(['LEGACY', 'RETURN']);
    expect(revisions[1]).toMatchObject({
      studentNote: 'original',
      reviewNote: 'Explain step two',
      imageKeys: ['original.jpg'],
    });
    expect(db.submission.upsert.mock.calls[0][0].update).not.toHaveProperty(
      'note',
    );
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
  it('resubmission clears stale review status but retains the prior answer, files and assessment', async () => {
    const { service, revisions } = setup();
    await service.review(
      'assignment',
      { studentId: 'student', action: ReviewAction.RETURN, note: 'Try again' },
      'teacher',
      Role.TEACHER,
    );
    const result = await service.submit('assignment', 'student', {
      note: 'revised answer',
      imageKeys: ['revised.pdf'],
    });
    expect(result).toMatchObject({
      state: SubmissionState.SUBMITTED,
      studentNote: 'revised answer',
      reviewNote: null,
      checkedAt: null,
      checkedById: null,
      imageKeys: ['revised.pdf'],
    });
    expect(revisions.map((r) => r.action)).toEqual([
      'LEGACY',
      'RETURN',
      'SUBMIT',
    ]);
    expect(revisions[1].imageKeys).toEqual(['original.jpg']);
    expect(revisions[1].reviewNote).toBe('Try again');
    expect(revisions[2].imageKeys).toEqual(['revised.pdf']);
  });
  it('preserves uncertain legacy note without claiming student authorship', async () => {
    const { service, revisions, setSaved } = setup();
    setSaved({ studentNote: null, note: 'legacy mixed note' });
    const result = await service.review(
      'assignment',
      {
        studentId: 'student',
        action: ReviewAction.RETURN,
        note: 'new assessment',
      },
      'teacher',
      Role.TEACHER,
    );
    expect(result.studentNote).toBeNull();
    expect(result.note).toBe('legacy mixed note');
    expect(revisions[0]).toMatchObject({
      legacyNote: 'legacy mixed note',
      studentNote: null,
    });
  });
  it('retains transferred classroom work without allowing new submission there', async () => {
    const { service, db } = setup();
    db.enrollment.findMany = jest.fn().mockResolvedValue([
      {
        classroomId: 'old',
        joinedAt: new Date('2025-01-01'),
        leftAt: new Date('2025-12-01'),
        classroom: { id: 'old', name: 'previous' },
      },
    ]);
    db.assignment.findMany = jest.fn().mockResolvedValue([
      {
        id: 'old-assignment',
        classroomId: 'old',
        createdAt: new Date('2025-06-01'),
        submissions: [{ state: SubmissionState.DONE_ONLINE }],
      },
    ]);
    expect(await service.myAssignments('student')).toEqual([
      expect.objectContaining({
        id: 'old-assignment',
        canSubmit: false,
        classroom: { id: 'old', name: 'previous' },
      }),
    ]);
    expect(db.assignment.findMany.mock.calls[0][0].where.OR).toEqual([
      {
        classroomId: 'old',
        createdAt: { gte: new Date('2025-01-01'), lte: new Date('2025-12-01') },
      },
    ]);
  });
  it('shows archived submitted work read-only and excludes deleted unsubmitted tasks', async () => {
    const { service, db } = setup();
    db.enrollment.findMany = jest.fn().mockResolvedValue([
      {
        classroomId: 'class',
        joinedAt: new Date('2026-01-01'),
        leftAt: null,
        classroom: { id: 'class', name: 'current' },
      },
    ]);
    db.assignment.findMany = jest.fn().mockResolvedValue([
      {
        id: 'archived',
        classroomId: 'class',
        createdAt: new Date('2026-06-01'),
        deletedAt: new Date('2026-10-01'),
        submissions: [{ state: SubmissionState.SUBMITTED }],
      },
    ]);
    expect(await service.myAssignments('student')).toEqual([
      expect.objectContaining({ id: 'archived', canSubmit: false }),
    ]);
    expect(db.assignment.findMany.mock.calls[0][0].where.AND).toEqual([
      {
        OR: [
          { deletedAt: null },
          { submissions: { some: { studentId: 'student' } } },
        ],
      },
    ]);
  });
  it('clears an omitted comment instead of silently retaining an older answer', async () => {
    const { service } = setup();
    const result = await service.submit('assignment', 'student', {
      imageKeys: [],
    });
    expect(result.studentNote).toBeNull();
    expect(result.note).toBeNull();
  });
});
describe('student annual homework mark history', () => {
  it('scopes history to the authenticated student and exact year boundaries', async () => {
    const { db } = setup();
    const service = new HomeworkMarksService(db, {} as never);
    await service.mineYear('student', '2025');
    expect(db.dailyHomeworkMark.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: 'student',
          date: {
            gte: new Date('2025-01-01T00:00:00Z'),
            lt: new Date('2026-01-01T00:00:00Z'),
          },
        }),
      }),
    );
  });
  it('rejects invalid years without accessing data', async () => {
    const { db } = setup();
    const service = new HomeworkMarksService(db, {} as never);
    await expect(service.mineYear('student', 'not-a-year')).rejects.toThrow(
      'Он буруу байна',
    );
    await expect(service.mineYear('student', '9999')).rejects.toThrow(
      'Он буруу байна',
    );
    expect(db.dailyHomeworkMark.findMany).not.toHaveBeenCalled();
  });
});
