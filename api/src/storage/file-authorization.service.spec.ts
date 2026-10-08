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
    ])
      db[model] = {
        findUnique: jest.fn(async () => null),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      };
    service = new FileAuthorizationService(db as PrismaService);
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
