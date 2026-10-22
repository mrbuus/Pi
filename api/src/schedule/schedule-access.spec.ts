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
  it('Teacher+ sets the daily topic on any class without schedule.manage (owner 2026-10-08)', async () => {
    prisma.classSchedule.findUnique.mockResolvedValue({
      classroomId: 'other',
      teacherId: 'x',
      classroom: { teacherId: 'y' },
    });
    capabilities.assert.mockRejectedValue(new Error('denied'));
    await expect(access.topic(actor, 'sched')).resolves.toBeUndefined();
    await expect(
      access.topic({ userId: 'staff', role: Role.TEACHER }, 'sched'),
    ).rejects.toThrow('Багш+');
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
      {} as never,
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
  it('plain teacher only READS the plan — even own lesson cannot be written (owner 2026-10-18)', async () => {
    const teacher = { userId: 'staff', role: Role.TEACHER };
    prisma.classSchedule.findUnique.mockResolvedValue({
      classroomId: 'own',
      teacherId: 'staff',
      classroom: { teacherId: 'staff' },
    });
    await expect(access.topic(teacher, 'lesson')).rejects.toThrow('Багш+');
    expect(capabilities.assert).not.toHaveBeenCalled();
    // Админ — schedule.manage (админд үргэлж үнэн)
    await access.topic({ userId: 'adm', role: Role.ADMIN }, 'lesson');
    expect(capabilities.assert).toHaveBeenCalledWith('adm', 'schedule.manage', 'own');
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
  it('staff read every class timetable (owner decision 2026-10-08); editing stays capability-gated', async () => {
    capabilities.has.mockResolvedValue(false);
    expect(await access.readableClassrooms(actor)).toBeUndefined();
    expect(prisma.classroom.findMany).not.toHaveBeenCalled();
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
      lessonStaffing: { findMany: jest.fn().mockResolvedValue([]) },
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

describe('teacher work roster access (owner 2026-10-11)', () => {
  const make = () => {
    const capabilities = {
      assert: jest.fn().mockRejectedValue(new Error('denied')),
      has: jest.fn().mockResolvedValue(false),
    };
    const access = new ScheduleAccessService(
      {} as unknown as PrismaService,
      capabilities as unknown as StaffCapabilityService,
    );
    return { access, capabilities };
  };
  it('Teacher+ and Admin read/edit the roster without schedule.manage', async () => {
    const { access, capabilities } = make();
    await expect(
      access.roster({ userId: 'tp', role: Role.TEACHER_PLUS }),
    ).resolves.toBeUndefined();
    await expect(
      access.roster({ userId: 'ad', role: Role.ADMIN }),
    ).resolves.toBeUndefined();
    expect(capabilities.assert).not.toHaveBeenCalled();
  });
  it('plain Teacher READS the roster without schedule.manage (owner 2026-10-22), but cannot edit it', async () => {
    const { access, capabilities } = make();
    await expect(
      access.rosterRead({ userId: 't', role: Role.TEACHER }),
    ).resolves.toBeUndefined();
    expect(capabilities.assert).not.toHaveBeenCalled();
    // бусад эрх (жишээ нь сурагч) уншихдаа ч schedule.manage шаардана
    await expect(
      access.rosterRead({ userId: 's', role: Role.STUDENT }),
    ).rejects.toThrow('denied');
  });
  it('plain Teacher still needs schedule.manage', async () => {
    const { access, capabilities } = make();
    await expect(
      access.roster({ userId: 't', role: Role.TEACHER }),
    ).rejects.toThrow('denied');
    expect(capabilities.assert).toHaveBeenCalledWith(
      't',
      'schedule.manage',
      undefined,
    );
  });
});
