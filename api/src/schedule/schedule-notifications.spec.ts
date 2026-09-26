import { NotificationCenterService } from '../notification-center/notification-center.service';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleService } from './schedule.service';

describe('ScheduleService schedule-change notices', () => {
  const notification = { notify: jest.fn() };
  const prisma = {
    enrollment: { findMany: jest.fn() },
    classroom: { findMany: jest.fn() },
    classSchedule: { findUnique: jest.fn() },
    scheduleException: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  let service: ScheduleService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.enrollment.findMany.mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
      { studentId: 'student-1' },
    ]);
    prisma.classroom.findMany.mockResolvedValue([{ teacherId: 'teacher-1' }]);
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    notification.notify.mockResolvedValue(undefined);
    service = new ScheduleService(
      prisma as unknown as PrismaService,
      notification as unknown as NotificationCenterService,
    );
  });

  it('notifies only unique active roster recipients after a cancellation is saved', async () => {
    const schedule = {
      id: 'schedule-1',
      classroomId: 'class-1',
      weekday: 1,
      teacherId: 'teacher-1',
    };
    prisma.classSchedule.findUnique.mockResolvedValue(schedule);
    prisma.scheduleException.findUnique.mockResolvedValue(null);
    prisma.scheduleException.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'exception-1', ...data }),
    );

    await service.upsertException(
      'schedule-1',
      { date: '2026-09-28', kind: 'CANCELLED' },
      'admin-1',
      Role.ADMIN,
    );

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith({
      where: { classroomId: { in: ['class-1'] }, leftAt: null },
      select: { studentId: true },
    });
    expect(notification.notify).toHaveBeenCalledWith(
      ['student-1', 'student-2', 'teacher-1'],
      expect.objectContaining({ kind: 'SCHEDULE_CHANGE' }),
    );
  });

  it('does not notify for an unchanged exception or a failed mutation', async () => {
    const schedule = {
      id: 'schedule-1',
      classroomId: 'class-1',
      weekday: 1,
      teacherId: 'teacher-1',
    };
    const existing = {
      id: 'exception-1',
      scheduleId: 'schedule-1',
      date: new Date('2026-09-28T00:00:00.000Z'),
      kind: 'CANCELLED',
      newDate: null,
      newStartMinute: null,
      newEndMinute: null,
      newRoom: null,
      note: null,
    };
    prisma.classSchedule.findUnique.mockResolvedValue(schedule);
    prisma.scheduleException.findUnique.mockResolvedValue(existing);
    prisma.scheduleException.update.mockResolvedValue(existing);

    await service.upsertException(
      'schedule-1',
      { date: '2026-09-28', kind: 'CANCELLED' },
      'admin-1',
      Role.ADMIN,
    );
    expect(notification.notify).not.toHaveBeenCalled();

    prisma.scheduleException.update.mockRejectedValueOnce(
      new Error('write failed'),
    );
    await expect(
      service.upsertException(
        'schedule-1',
        { date: '2026-09-28', kind: 'MOVED', newDate: '2026-09-29' },
        'admin-1',
        Role.ADMIN,
      ),
    ).rejects.toThrow('write failed');
    expect(notification.notify).not.toHaveBeenCalled();
  });
});
