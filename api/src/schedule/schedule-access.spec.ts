import { ScheduleAccessService } from './schedule-access.service';
import { ScheduleController } from './schedule.controller';
import { TeacherHoursController } from './teacher-hours.controller';
import { ScheduleService } from './schedule.service';
import { TeacherHoursService } from './teacher-hours.service';
import { PrismaService } from '../prisma/prisma.service';
import { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';
import { Role } from '../generated/prisma/enums';

describe('schedule capability and classroom boundaries', () => {
  const actor = { userId: 'staff', role: Role.TEACHER_PLUS };
  let prisma: {
    classSchedule: { findUnique: jest.Mock };
    enrollment: { findMany: jest.Mock };
    classroom: { findMany: jest.Mock };
  };
  let capabilities: { assert: jest.Mock; has: jest.Mock };
  let access: ScheduleAccessService;
  beforeEach(() => {
    prisma = {
      classSchedule: { findUnique: jest.fn() },
      enrollment: { findMany: jest.fn() },
      classroom: { findMany: jest.fn() },
    };
    capabilities = {
      assert: jest.fn(),
      has: jest.fn().mockResolvedValue(false),
    };
    access = new ScheduleAccessService(
      prisma as unknown as PrismaService,
      capabilities as unknown as StaffCapabilityService,
    );
  });
  it('requires both original and destination grants and stops before moving', async () => {
    prisma.classSchedule.findUnique.mockResolvedValue({ classroomId: 'own' });
    capabilities.assert.mockImplementation((_id, _cap, scope) =>
      scope === 'other'
        ? Promise.reject(new Error('denied'))
        : Promise.resolve(),
    );
    const update = jest.fn();
    const controller = new ScheduleController(
      { update } as unknown as ScheduleService,
      access,
    );
    await expect(
      controller.update('lesson', { classroomId: 'other' }, { user: actor }),
    ).rejects.toThrow('denied');
    expect(capabilities.assert.mock.calls).toEqual([
      ['staff', 'schedule.manage', 'own'],
      ['staff', 'schedule.manage', 'other'],
    ]);
    expect(update).not.toHaveBeenCalled();
  });
  it('preserves own assigned lesson topic but rejects random plus teacher', async () => {
    prisma.classSchedule.findUnique.mockResolvedValue({
      classroomId: 'own',
      teacherId: 'staff',
      classroom: { teacherId: 'other' },
    });
    await access.topic(actor, 'lesson');
    expect(capabilities.assert).not.toHaveBeenCalled();
    capabilities.assert.mockRejectedValue(new Error('no grant'));
    await expect(
      access.topic({ ...actor, userId: 'random' }, 'lesson'),
    ).rejects.toThrow('no grant');
  });
  it('queries parent only through verified linked pupils and denies buyer', async () => {
    prisma.enrollment.findMany.mockResolvedValue([{ classroomId: 'own' }]);
    expect(
      await access.readableClassrooms({ userId: 'parent', role: Role.PARENT }),
    ).toEqual(['own']);
    expect(
      (
        (prisma.enrollment.findMany.mock.calls as unknown[][])[0][0] as {
          where: { student: { childLinks: { some: unknown } } };
        }
      ).where.student.childLinks.some,
    ).toEqual({ parentId: 'parent', verifiedAt: { not: null } });
    expect(
      await access.readableClassrooms({ userId: 'buyer', role: Role.BUYER }),
    ).toEqual([]);
    await expect(
      access.readClassroom({ userId: 'pupil', role: Role.STUDENT }, 'other'),
    ).rejects.toThrow();
  });
  it('teacher reads own/assigned and specifically granted classes, no general plus bypass', async () => {
    prisma.classroom.findMany.mockResolvedValue([
      { id: 'own', teacherId: 'staff', classSchedules: [] },
      { id: 'assigned', teacherId: 'x', classSchedules: [{ id: 's' }] },
      { id: 'granted', teacherId: 'x', classSchedules: [] },
      { id: 'other', teacherId: 'x', classSchedules: [] },
    ]);
    capabilities.has.mockImplementation((_id, _cap, scope) =>
      Promise.resolve(scope === 'granted'),
    );
    expect(await access.readableClassrooms(actor)).toEqual([
      'own',
      'assigned',
      'granted',
    ]);
  });
  it('all hours requires time.review while own hours stays separate', async () => {
    const forMonth = jest.fn().mockResolvedValue({ teachers: [] });
    const controller = new TeacherHoursController(
      { forMonth } as unknown as TeacherHoursService,
      capabilities as unknown as StaffCapabilityService,
    );
    capabilities.assert.mockRejectedValue(new Error('denied'));
    await expect(
      controller.all({ month: '2026-10' }, { user: actor }),
    ).rejects.toThrow('denied');
    expect(forMonth).not.toHaveBeenCalled();
    await controller.mine({ month: '2026-10' }, { user: actor });
    expect(forMonth).toHaveBeenCalledWith('2026-10', 'staff');
  });
});

describe('scoped schedule queries omit global staff work patterns', () => {
  it('week filters schedules and exceptions before resolution and skips global roster queries', async () => {
    const prisma = {
      classSchedule: { findMany: jest.fn().mockResolvedValue([]) },
      scheduleException: { findMany: jest.fn().mockResolvedValue([]) },
      academicCalendarDay: { findMany: jest.fn().mockResolvedValue([]) },
      lessonTopic: { findMany: jest.fn().mockResolvedValue([]) },
      teacherWorkDay: { findMany: jest.fn() },
      teacherWorkException: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
    };
    const service = new ScheduleService(
      prisma as unknown as PrismaService,
      {} as never,
    );
    const result = await service.getWeek('2026-10-05', ['own']);
    expect(
      (
        (prisma.classSchedule.findMany.mock.calls as unknown[][])[0][0] as {
          where: { classroomId: unknown };
        }
      ).where.classroomId,
    ).toEqual({ in: ['own'] });
    expect(
      (
        (prisma.scheduleException.findMany.mock.calls as unknown[][])[0][0] as {
          where: unknown;
        }
      ).where,
    ).toEqual({ schedule: { classroomId: { in: ['own'] } } });
    expect(prisma.teacherWorkDay.findMany).not.toHaveBeenCalled();
    expect(prisma.teacherWorkException.findMany).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(result.teacherRoster.every((day) => day.teachers.length === 0)).toBe(
      true,
    );
  });
});
