import { createHash } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarIcsService } from './calendar-ics.service';

type AsyncMock = jest.Mock<Promise<unknown>, unknown[]>;
interface PrismaMock {
  user: { findUnique: AsyncMock; updateMany: AsyncMock };
  enrollment: { findFirst: AsyncMock };
  classSchedule: { findMany: AsyncMock };
  scheduleException: { findMany: AsyncMock };
  academicCalendarDay: { findMany: AsyncMock };
  lessonTopic: { findMany: AsyncMock };
}

function asyncMock(): AsyncMock {
  return jest.fn<Promise<unknown>, unknown[]>() as AsyncMock;
}

describe('CalendarIcsService', () => {
  let service: CalendarIcsService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: asyncMock(),
        updateMany: asyncMock().mockResolvedValue({ count: 1 }),
      },
      enrollment: { findFirst: asyncMock() },
      classSchedule: { findMany: asyncMock() },
      scheduleException: { findMany: asyncMock() },
      academicCalendarDay: { findMany: asyncMock() },
      lessonTopic: { findMany: asyncMock() },
    };
    service = new CalendarIcsService(prisma as unknown as PrismaService);
  });

  it('issues only a random one-time token and stores its hash while rotating version', async () => {
    prisma.user.findUnique.mockResolvedValue({ calendarTokenVersion: 4 });

    const { token } = await service.issueToken('user-1');

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const stored = prisma.user.updateMany.mock.calls[0][0] as {
      where: { id: string; calendarTokenVersion: number | null };
      data: { calendarTokenHash: string; calendarTokenVersion: number };
    };
    expect(stored.where).toEqual({ id: 'user-1', calendarTokenVersion: 4 });
    expect(stored.data).toEqual({
      calendarTokenHash: createHash('sha256').update(token).digest('hex'),
      calendarTokenVersion: 5,
    });
    expect(stored.data.calendarTokenHash).not.toBe(token);
  });

  it('does not return a token when a concurrent reset has won the version update', async () => {
    prisma.user.findUnique.mockResolvedValue({ calendarTokenVersion: 7 });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.issueToken('user-1')).rejects.toMatchObject({
      status: 409,
    });
  });

  it('does not query the database for malformed public tokens', async () => {
    await expect(service.feedByToken('too-short')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['archive field absent before G25 is integrated', {}],
    ['archive field explicitly null', { archivedAt: null }],
  ])('accepts a non-archived user when %s', async (_label, archiveField) => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.STUDENT,
      ...archiveField,
    });
    prisma.enrollment.findFirst.mockResolvedValue(null);

    await expect(
      service.feedByToken(Buffer.alloc(32, 5).toString('base64url')),
    ).resolves.toMatchObject({ filename: 'pi.mn-huvaari.ics' });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        calendarTokenHash: createHash('sha256')
          .update(Buffer.alloc(32, 5).toString('base64url'))
          .digest('hex'),
      },
    });
  });

  it('revokes a calendar link when the token owner is archived', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.STUDENT,
      archivedAt: new Date('2026-09-26T00:00:00.000Z'),
    });

    await expect(
      service.feedByToken(Buffer.alloc(32, 5).toString('base64url')),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.enrollment.findFirst).not.toHaveBeenCalled();
  });

  it('limits export to the token owner enrolled class and caps the date range', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.STUDENT,
    });
    prisma.enrollment.findFirst.mockResolvedValue({
      classroomId: 'class-owned',
      classroom: { archived: false },
    });
    prisma.classSchedule.findMany.mockResolvedValue([]);

    const token = Buffer.alloc(32, 5).toString('base64url');
    const result = await service.feedByToken(token, '2026-09-28', '2026-09-28');

    expect(result.filename).toBe('pi.mn-huvaari.ics');
    expect(result.ics).toContain('BEGIN:VCALENDAR');
    const scheduleQuery = prisma.classSchedule.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    const enrollmentQuery = prisma.enrollment.findFirst.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(scheduleQuery.where).toMatchObject({
      classroomId: 'class-owned',
      classroom: { archived: false },
    });
    expect(enrollmentQuery.where).toEqual({
      studentId: 'user-1',
      leftAt: null,
    });
    await expect(
      service.exportForUser('user-1', Role.STUDENT, '2026-09-01', '2026-12-01'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.classSchedule.findMany).toHaveBeenCalledTimes(1);
  });

  it('uses teacher-owned schedules and reflects cancellations and moved occurrences', async () => {
    prisma.classSchedule.findMany.mockResolvedValue([
      {
        id: 'moved-class',
        classroomId: 'class-1',
        weekday: 1,
        startMinute: 540,
        endMinute: 600,
        teacherId: 'teacher-1',
        teacher: { id: 'teacher-1' },
        room: 'Өрөө 2',
        subject: 'MATH',
        effectiveFrom: new Date('2026-09-01T00:00:00.000Z'),
        effectiveTo: null,
        classroom: { id: 'class-1', name: '10А' },
      },
      {
        id: 'cancelled-class',
        classroomId: 'class-1',
        weekday: 2,
        startMinute: 660,
        endMinute: 720,
        teacherId: null,
        teacher: null,
        room: null,
        subject: 'SOCIAL_STUDIES',
        effectiveFrom: new Date('2026-09-01T00:00:00.000Z'),
        effectiveTo: null,
        classroom: { id: 'class-1', name: '10А' },
      },
    ]);
    prisma.scheduleException.findMany.mockResolvedValue([
      {
        scheduleId: 'moved-class',
        date: new Date('2026-09-28T00:00:00.000Z'),
        kind: 'MOVED',
        newDate: new Date('2026-09-30T00:00:00.000Z'),
        newStartMinute: 600,
        newEndMinute: 660,
        newRoom: 'Өрөө 3',
        note: null,
      },
      {
        scheduleId: 'cancelled-class',
        date: new Date('2026-09-29T00:00:00.000Z'),
        kind: 'CANCELLED',
        newDate: null,
        newStartMinute: null,
        newEndMinute: null,
        newRoom: null,
        note: null,
      },
    ]);
    prisma.academicCalendarDay.findMany.mockResolvedValue([]);
    prisma.lessonTopic.findMany.mockResolvedValue([]);

    const result = await service.exportForUser(
      'teacher-1',
      Role.TEACHER,
      '2026-09-28',
      '2026-10-04',
    );
    const scheduleQuery = prisma.classSchedule.findMany.mock.calls[0][0] as {
      where: { OR: unknown[]; AND: unknown[] };
    };
    const query = scheduleQuery.where;

    expect(query.OR).toEqual([
      { teacherId: 'teacher-1' },
      {
        teacherId: null,
        classroom: { teacherId: 'teacher-1', archived: false },
      },
    ]);
    expect(query.AND).toContainEqual({
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date('2026-09-28T00:00:00.000Z') } },
      ],
    });
    expect(result.ics).toContain('UID:moved-class-20260930@pi.mn\r\n');
    expect(result.ics).toContain(
      'DTSTART;TZID=Asia/Ulaanbaatar:20260930T100000\r\n',
    );
    expect(result.ics).toContain('LOCATION:Өрөө 3\r\n');
    expect(result.ics).not.toContain('cancelled-class');
    expect(result.ics).not.toContain('Өрөө 2');
    expect(result.ics).not.toContain('teacher-1');
  });
});
