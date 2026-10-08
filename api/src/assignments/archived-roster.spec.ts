import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { HomeworkMarksService } from './homework-marks.service';
import { AssignmentsService } from './assignments.service';
import { ReviewAction } from './dto/review.dto';
import { Role } from '../generated/prisma/enums';

function setup() {
  const active = { id: 'active', firstName: 'Сурагч', lastName: 'Тест' };
  const assignment = {
    id: 'assignment',
    title: 'Жишээ',
    classroomId: 'class',
    createdAt: new Date('2026-09-10'),
    deletedAt: null,
  };
  const db = {
    classroom: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ teacherId: 'teacher', archived: false }),
    },
    assignment: {
      findUnique: jest.fn().mockResolvedValue(assignment),
      create: jest.fn().mockResolvedValue(assignment),
    },
    enrollment: {
      findMany: jest.fn(({ where }) =>
        Promise.resolve(
          (where.student?.archivedAt === null
            ? [active]
            : [active, { ...active, id: 'archived' }]
          ).map((student) => ({
            student,
            studentId: student.id,
            joinedAt: new Date('2026-09-01'),
          })),
        ),
      ),
      findFirst: jest.fn(({ where }) =>
        Promise.resolve(
          where.student?.archivedAt === null && where.studentId === 'archived'
            ? null
            : { studentId: where.studentId },
        ),
      ),
    },
    dailyHomeworkMark: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
    submission: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const notify = jest.fn();
  return {
    db,
    notify,
    marks: new HomeworkMarksService(db as never, {} as never),
    assignments: new AssignmentsService(
      db as never,
      {} as never,
      { notify } as never,
    ),
  };
}

describe('archived learners are absent from current assignment work', () => {
  it('only displays active daily-mark roster', async () => {
    const { marks } = setup();
    expect(
      (
        await marks.listForClass('class', '2026-09-10', 'teacher', Role.TEACHER)
      ).map((row) => row.student.id),
    ).toEqual(['active']);
  });
  it('rejects a stale daily-mark action without writing', async () => {
    const { db, marks } = setup();
    await expect(
      marks.setMark(
        'class',
        'archived',
        { date: '2026-09-10', comment: 'x' },
        'teacher',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.dailyHomeworkMark.upsert).not.toHaveBeenCalled();
  });
  it('only includes active learners in assignment roster and statistics', async () => {
    const { db, assignments } = setup();
    expect(
      (
        await assignments.submissionsRoster(
          'assignment',
          'teacher',
          Role.TEACHER,
        )
      ).map((row) => row.student.id),
    ).toEqual(['active']);
    expect(
      (
        await assignments.stats(
          'class',
          '2026-09-01',
          '2026-09-30',
          'teacher',
          Role.TEACHER,
        )
      ).map((row) => row.student.id),
    ).toEqual(['active']);
    expect(db.$queryRaw.mock.calls[0][0].sql).toContain(
      'student."archivedAt" IS NULL',
    );
  });
  it('new-assignment notifications exclude archived learners', async () => {
    const { notify, assignments } = setup();
    await assignments.create(
      'class',
      { title: 'Жишээ' } as never,
      'teacher',
      Role.TEACHER,
    );
    expect(notify.mock.calls[0][0]).toEqual(['active']);
  });
  it('rejects archived classroom review and student submission writes', async () => {
    const { db, assignments } = setup();
    await expect(
      assignments.review(
        'assignment',
        { studentId: 'archived', action: ReviewAction.MARK_IN_CLASS },
        'teacher',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      assignments.submit('assignment', 'archived', {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.submission.upsert).not.toHaveBeenCalled();
  });
  it('retains teacher ownership checks before loading the roster', async () => {
    const { db, assignments } = setup();
    await expect(
      assignments.submissionsRoster('assignment', 'stranger', Role.TEACHER),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.enrollment.findMany).not.toHaveBeenCalled();
  });
});
