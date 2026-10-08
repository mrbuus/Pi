import { TestsService } from './tests.service';
import { Role } from '../generated/prisma/enums';
describe('staff result pupil privacy', () => {
  it('rejects an unrelated teacher before querying pupil results', async () => {
    const db = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: Role.TEACHER, archivedAt: null, externalTeacherProfile: null }) },
      test: {
        findFirst: jest.fn().mockResolvedValue({ createdById: 'other' }),
      },
      testAccess: { findFirst: jest.fn().mockResolvedValue(null) },
      testResult: { findMany: jest.fn() },
    };
    await expect(
      new TestsService(db as never, {} as never).results(
        'test',
        'teacher',
        Role.TEACHER,
      ),
    ).rejects.toThrow('эрхгүй');
    expect(db.testResult.findMany).not.toHaveBeenCalled();
  });
  it('restricts teacher-plus results to own active classroom and anti-cheat rows to returned pupils', async () => {
    const db = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: Role.TEACHER, archivedAt: null, externalTeacherProfile: null }) },
      test: {
        findFirst: jest.fn().mockResolvedValue({ createdById: 'teacher' }),
      },
      testAccess: { findFirst: jest.fn().mockResolvedValue(null) },
      testResult: {
        findMany: jest.fn().mockResolvedValue([{ studentId: 'own-pupil' }]),
      },
      testAttemptSession: { findMany: jest.fn().mockResolvedValue([]) },
    };
    await new TestsService(db as never, {} as never).results(
      'test',
      'teacher',
      Role.TEACHER_PLUS,
    );
    expect(
      db.testResult.findMany.mock.calls[0][0].where.student.enrollments.some,
    ).toEqual({
      leftAt: null,
      classroom: { teacherId: 'teacher', archived: false },
    });
    expect(
      db.testAttemptSession.findMany.mock.calls[0][0].where.studentId,
    ).toEqual({ in: ['own-pupil'] });
  });
});
