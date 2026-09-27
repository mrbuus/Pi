import { ForbiddenException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceStatus, Role } from '../generated/prisma/enums';

const pupil = { id: 'active', firstName: 'Сурагч', lastName: 'Тест' };
function setup() {
  const db = {
    classroom: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          id: 'class',
          teacherId: 'teacher',
          archived: false,
        }),
    },
    enrollment: {
      findMany: jest.fn(({ where }) =>
        Promise.resolve(
          where.student?.archivedAt === null
            ? [{ studentId: pupil.id, student: pupil }]
            : [
                { studentId: pupil.id, student: pupil },
                {
                  studentId: 'archived',
                  student: { ...pupil, id: 'archived' },
                },
              ],
        ),
      ),
    },
    attendance: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    classSchedule: { count: jest.fn().mockResolvedValue(0) },
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          ...pupil,
          role: Role.STUDENT,
          archivedAt: new Date(),
        }),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
  };
  return {
    db,
    service: new AttendanceService(
      db as never,
      {} as never,
      { record: jest.fn() } as never,
    ),
  };
}

describe('active attendance roster and preserved history', () => {
  it('daily and date-range rosters omit archived pupils but retain the active pupil', async () => {
    const { service } = setup();
    expect((await service.byClassAndDate('class', '2026-09-10', 'teacher', Role.TEACHER)).map(row => row.student.id)).toEqual(['active']);
    expect((await service.history('class', '2026-09-01', '2026-09-10', 'teacher', Role.TEACHER)).map(row => row.student.id)).toEqual(['active']);
  });
  it('rejects archived targets before any attendance write', async () => {
    const { db, service } = setup();
    await expect(
      service.mark(
        'class',
        {
          date: '2026-09-01',
          entries: [
            { studentId: 'archived', status: AttendanceStatus.PRESENT },
          ],
        },
        'teacher',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.attendance.upsert).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('still prevents unrelated teachers reading the roster', async () => {
    const { db, service } = setup();
    await expect(
      service.byClassAndDate('class', '2026-09-01', 'stranger', Role.TEACHER),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.enrollment.findMany).not.toHaveBeenCalled();
  });
  it('keeps archived learners historical attendance available to admins', async () => {
    const { db, service } = setup();
    db.attendance.findMany.mockResolvedValue([
      { date: new Date(), status: 'PRESENT' },
    ] as never);
    expect(
      await service.byStudent(
        'archived',
        '2026-09-01',
        '2026-09-10',
        'admin',
        Role.ADMIN,
      ),
    ).toHaveLength(1);
  });
});
