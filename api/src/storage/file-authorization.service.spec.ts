import { FileAuthorizationService } from './file-authorization.service';
import { PrismaService } from '../prisma/prisma.service';

describe('file authorization boundaries', () => {
  let db: any;
  let service: FileAuthorizationService;
  beforeEach(() => {
    db = {};
    for (const model of [
      'lessonPacket',
      'studyReviewItem',
      'lessonReceipt',
      'storedFile',
      'submission',
      'submissionRevision',
      'feedback',
      'parentLink',
      'theoryBlock',
      'problem',
      'video',
      'assignment',
      'user',
      'book',
      'test',
      'enrollment',
      'testResult',
      'testAccess',
      'purchase',
      'userPass',
      'studentProfile',
      'placementAttempt',
      'lessonMakeup',
      'lessonPhoto',
      'classroom',
      'classSchedule',
      'lessonStaffing',
    ])
      db[model] = {
        findUnique: jest.fn(async () => null),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
      };
    service = new FileAuthorizationService(db as PrismaService);
  });
  const day = new Date('2026-10-10T00:00:00Z');
  /** Мөрүүд: [uploaderId, kind] — mock нь where.studentId-аар шүүнэ (жинхэнэ query шиг) */
  function refs(makeup: string[], photo: string[]) {
    db.lessonMakeup.findMany.mockImplementation(async (a: any) =>
      makeup.filter((u) => u === a.where.studentId).map(() => ({ classroomId: 'c1', date: day })),
    );
    db.lessonPhoto.findMany.mockImplementation(async (a: any) =>
      photo.filter((u) => u === a.where.studentId).map(() => ({ classroomId: 'c1', date: day })),
    );
  }
  it('make-up note photos: owner student and that class/day staff only — private precedence', async () => {
    db.storedFile.findUnique.mockResolvedValue({ ownerId: 'owner' });
    refs(['owner'], ['owner']); // also copied into a theory photo — still private
    db.enrollment.findFirst.mockResolvedValue({ id: 'e' });
    db.classroom.findUnique.mockResolvedValue({ id: 'c1', teacherId: 'ct', assistantTeacherId: 'at' });
    const ok = (id: string, role: string) => service.allowed({ id, role } as never, 'm.jpg');
    await expect(ok('owner', 'STUDENT')).resolves.toBe(true);
    await expect(ok('mate', 'STUDENT')).resolves.toBe(false);
    await expect(ok('parent', 'PARENT')).resolves.toBe(false);
    await expect(ok('ct', 'TEACHER')).resolves.toBe(true);
    await expect(ok('at', 'TEACHER')).resolves.toBe(true);
    await expect(ok('other', 'TEACHER')).resolves.toBe(false);
    await expect(ok('plus', 'TEACHER_PLUS')).resolves.toBe(true);
    await expect(ok('admin', 'ADMIN')).resolves.toBe(true);
  });
  it('theory photos: staff of that class/day and that class students, not outsiders', async () => {
    db.storedFile.findUnique.mockResolvedValue({ ownerId: 'up' });
    refs([], ['up']);
    db.classroom.findUnique.mockResolvedValue({ id: 'c1', teacherId: 'ct', assistantTeacherId: null });
    db.enrollment.findFirst.mockImplementation(async (args: any) =>
      args.where.studentId === 'mate' ? { id: 'e' } : null,
    );
    db.lessonStaffing.findMany.mockImplementation(async (args: any) =>
      args.where.OR[0].leadTeacherId === 'sub' ? [{ date: day }] : [],
    );
    const ok = (id: string, role: string) => service.allowed({ id, role } as never, 't.jpg');
    await expect(ok('mate', 'STUDENT')).resolves.toBe(true);
    await expect(ok('outsider', 'STUDENT')).resolves.toBe(false);
    await expect(ok('ct', 'TEACHER')).resolves.toBe(true);
    await expect(ok('sub', 'TEACHER')).resolves.toBe(true);
    await expect(ok('other', 'TEACHER')).resolves.toBe(false);
    await expect(ok('buyer', 'BUYER')).resolves.toBe(false);
  });
  it('a foreign key attached to someone else\'s make-up/theory photo grants nothing', async () => {
    // victim's file; attacker listed it in their own LessonMakeup and LessonPhoto rows
    db.storedFile.findUnique.mockResolvedValue({ ownerId: 'victim' });
    refs(['attacker'], ['attacker']);
    db.enrollment.findFirst.mockResolvedValue({ id: 'e' });
    db.classroom.findUnique.mockResolvedValue({ id: 'c1', teacherId: 'ct', assistantTeacherId: null });
    await expect(service.allowed({ id: 'attacker', role: 'STUDENT' } as never, 'v.jpg')).resolves.toBe(false);
    await expect(service.allowed({ id: 'mate', role: 'STUDENT' } as never, 'v.jpg')).resolves.toBe(false);
    expect(db.lessonMakeup.findMany.mock.calls[0][0].where.studentId).toBe('victim');
    // legacy ownerless files are never granted through these references
    db.storedFile.findUnique.mockResolvedValue({ ownerId: null });
    refs(['attacker'], ['attacker']);
    await expect(service.allowed({ id: 'attacker', role: 'STUDENT' } as never, 'v.jpg')).resolves.toBe(false);
  });
  it('a private homework photo stays private even if its owner lists it as a theory photo', async () => {
    db.storedFile.findUnique.mockResolvedValue({ ownerId: 'up' });
    refs([], ['up']);
    db.enrollment.findFirst.mockResolvedValue({ id: 'e' });
    db.submission.findFirst.mockImplementation(async (a: any) => (a.where.AND ? null : { id: 'sub' }));
    await expect(service.allowed({ id: 'mate', role: 'STUDENT' } as never, 'hw.jpg')).resolves.toBe(false);
  });
  it('lets centre teachers see placement-test work photos, not students', async () => {
    db.placementAttempt.count.mockResolvedValue(1);
    await expect(service.allowed({ id: 't', role: 'TEACHER' } as never, 'w.jpg')).resolves.toBe(true);
    await expect(service.allowed({ id: 's', role: 'STUDENT' } as never, 'w.jpg')).resolves.toBe(false);
  });
  it('uses only owned server-frozen bank references and retains private attachment precedence', async () => {
    db.studyReviewItem.findMany.mockImplementation(async (args: any) =>
      args.where.run.userId === 'buyer'
        ? [
            {
              problem: {
                chapter: { id: 'chapter', bookId: 'book', freePreview: true },
              },
            },
          ]
        : [],
    );
    expect(
      await service.allowed({ id: 'buyer', role: 'BUYER' }, 'old-bank-image'),
    ).toBe(true);
    expect(db.studyReviewItem.findMany.mock.calls[0][0].where).toMatchObject({
      run: { userId: 'buyer' },
      sourceSnapshot: { path: ['imageKey'], equals: 'old-bank-image' },
      problem: { deletedAt: null, chapter: { book: { deletedAt: null } } },
    });
    expect(
      await service.allowed({ id: 'foreign', role: 'BUYER' }, 'old-bank-image'),
    ).toBe(false);
    db.studyReviewItem.findMany.mockResolvedValue([
      {
        problem: {
          chapter: { id: 'paid', bookId: 'book', freePreview: false },
        },
      },
    ]);
    expect(
      await service.allowed(
        { id: 'buyer', role: 'BUYER' },
        'expired-paid-image',
      ),
    ).toBe(false);
    db.feedback.findFirst.mockImplementation(async (args: any) =>
      args.where.authorId ? null : { id: 'private-feedback' },
    );
    expect(
      await service.allowed({ id: 'buyer', role: 'BUYER' }, 'old-bank-image'),
    ).toBe(false);
    db.feedback.findFirst.mockResolvedValue(null);
    db.submissionRevision.findFirst.mockImplementation(async (args: any) =>
      args.where.submission ? null : { id: 'private-revision' },
    );
    expect(
      await service.allowed({ id: 'buyer', role: 'BUYER' }, 'old-bank-image'),
    ).toBe(false);
  });
  it('allows own unattached draft and administrator, denies another pupil and legacy unattached key', async () => {
    db.storedFile.findUnique.mockResolvedValue({ ownerId: 'author' });
    expect(
      await service.allowed({ id: 'author', role: 'STUDENT' }, 'draft'),
    ).toBe(true);
    expect(
      await service.allowed({ id: 'other', role: 'STUDENT' }, 'draft'),
    ).toBe(false);
    expect(await service.allowed({ id: 'admin', role: 'ADMIN' }, 'draft')).toBe(
      true,
    );
    db.storedFile.findUnique.mockResolvedValue({ ownerId: null });
    expect(
      await service.allowed({ id: 'author', role: 'STUDENT' }, 'legacy'),
    ).toBe(false);
  });
  it('private attachment takes precedence over a copied catalogue cover', async () => {
    db.submission.findFirst.mockImplementation(async (args: any) =>
      args.where.AND ? null : { id: 'private' },
    );
    db.book.findMany.mockResolvedValue([
      { id: 'book', archived: false, deletedAt: null, chapters: [] },
    ]);
    expect(
      await service.allowed(
        { id: 'random-plus', role: 'TEACHER_PLUS' },
        'photo',
      ),
    ).toBe(false);
    expect(db.book.findMany).not.toHaveBeenCalled();
  });
  it('verified parent scope and assigned teacher scope are required for historical revision keys', async () => {
    db.submissionRevision.findFirst.mockImplementation(async (args: any) =>
      args.where.submission ? null : { id: 'old-revision' },
    );
    await service.allowed({ id: 'parent', role: 'PARENT' }, 'old');
    expect(
      db.submissionRevision.findFirst.mock.calls[1][0].where.submission.OR,
    ).toContainEqual({
      student: {
        childLinks: { some: { parentId: 'parent', verifiedAt: { not: null } } },
      },
    });
    db.submissionRevision.findFirst.mockClear();
    await service.allowed({ id: 'plus', role: 'TEACHER_PLUS' }, 'old');
    expect(
      db.submissionRevision.findFirst.mock.calls[1][0].where.submission.OR,
    ).toContainEqual({ assignment: { classroom: { teacherId: 'plus' } } });
  });
  it('reference-authorizes legacy free preview content without granting arbitrary ownerless keys', async () => {
    db.theoryBlock.findMany.mockResolvedValue([
      { chapter: { id: 'chapter', bookId: 'book', freePreview: true } },
    ]);
    expect(
      await service.allowed({ id: 'pupil', role: 'STUDENT' }, 'theory'),
    ).toBe(true);
  });
  it('does not give teacher-plus random pupil avatar access', async () => {
    db.user.findMany.mockResolvedValue([
      { id: 'random-child', role: 'STUDENT' },
    ]);
    expect(
      await service.allowed({ id: 'plus', role: 'TEACHER_PLUS' }, 'avatar'),
    ).toBe(false);
  });
});
