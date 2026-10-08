import { ForbiddenException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertInternalTeachingStaff,
  internalTeachingRole,
  canAccessChapter,
} from './access';
import { ContentService } from '../content/content.service';
import { TestsService } from '../tests/tests.service';
import { LessonsService } from '../lessons/lessons.service';

const actor = (role: Role, external = false, archived = false) => ({
  role,
  archivedAt: archived ? new Date() : null,
  externalTeacherProfile: external ? { userId: 'actor' } : null,
});
function fixture(user = actor(Role.TEACHER, true)) {
  return {
    user: { findUnique: jest.fn().mockResolvedValue(user) },
    enrollment: { findFirst: jest.fn().mockResolvedValue(null) },
    userPass: { findMany: jest.fn().mockResolvedValue([]) },
    purchase: { findFirst: jest.fn().mockResolvedValue(null) },
    problem: { findUnique: jest.fn() },
    theoryBlock: { findUnique: jest.fn() },
    testAccess: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
  };
}
describe('current internal staff boundary', () => {
  it.each([
    [Role.TEACHER, true, false, null],
    [Role.TEACHER_PLUS, true, false, null],
    [Role.STUDENT, false, false, null],
    [Role.TEACHER, false, true, null],
    [Role.TEACHER, false, false, Role.TEACHER],
    [Role.ADMIN, true, false, Role.ADMIN],
  ])(
    'resolves current identity %s external=%s archived=%s',
    async (role, external, archived, expected) => {
      expect(
        await internalTeachingRole(
          fixture(
            actor(role as Role, external, archived),
          ) as unknown as PrismaService,
          'actor',
        ),
      ).toBe(expected);
    },
  );
  it('external teacher paid content follows ordinary purchase grants, not role shortcut', async () => {
    const db = fixture();
    const chapter = { id: 'chapter', bookId: 'book', freePreview: false };
    expect(
      await canAccessChapter(
        db as unknown as PrismaService,
        'actor',
        Role.TEACHER,
        chapter,
      ),
    ).toBe(false);
    db.purchase.findFirst.mockResolvedValueOnce({ id: 'purchase' });
    expect(
      await canAccessChapter(
        db as unknown as PrismaService,
        'actor',
        Role.TEACHER,
        chapter,
      ),
    ).toBe(true);
  });
  it('denies external global mutation and official results before writing', async () => {
    const db = fixture();
    const prisma = db as unknown as PrismaService;
    await expect(
      new ContentService(prisma).createProblem(
        { chapterId: 'foreign' } as never,
        'actor',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const tests = new TestsService(prisma, {} as never);
    await expect(
      tests.create({ title: 'foreign' } as never, 'actor'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      tests.enterResult(
        'foreign',
        { studentId: 'other', totalScore: 1, maxScore: 1 },
        'actor',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('learner problem projection excludes answer and isCorrect metadata', async () => {
    const db = fixture(actor(Role.STUDENT));
    db.problem.findUnique.mockResolvedValue({
      id: 'p',
      chapter: { freePreview: true, deletedAt: null, book: null },
      deletedAt: null,
      correctAnswer: 'SECRET',
      choiceOptions: [{ label: 'A', text: 'one', isCorrect: true }],
      choices: null,
    });
    const result = await new ContentService(
      db as unknown as PrismaService,
    ).getProblem('p', 'actor', Role.STUDENT);
    expect(result).not.toHaveProperty('correctAnswer');
    expect(result.choices).toEqual([{ label: 'A', text: 'one' }]);
  });
  it('ordinary internal teacher cannot alter another author theory or enter random pupil result', async () => {
    const db = fixture(actor(Role.TEACHER));
    db.theoryBlock.findUnique.mockResolvedValue({ createdById: 'other' });
    await expect(
      new LessonsService(db as unknown as PrismaService).updateTheory(
        't',
        {},
        'actor',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      new TestsService(db as unknown as PrismaService, {} as never).enterResult(
        't',
        { studentId: 'other', totalScore: 1, maxScore: 1 },
        'actor',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('unknown actor cannot acquire privilege from caller role', async () => {
    const db = fixture();
    db.user.findUnique.mockResolvedValue(null);
    await expect(
      assertInternalTeachingStaff(db as unknown as PrismaService, 'actor'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
