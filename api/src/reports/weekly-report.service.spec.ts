import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { mondayRange, WeeklyReportService } from './weekly-report.service';

describe('WeeklyReportService access and week validation', () => {
  it('rejects an unverified parent-child link', async () => {
    const prisma = { parentLink: { findFirst: jest.fn().mockResolvedValue(null) } } as unknown as PrismaService;
    const service = new WeeklyReportService(prisma);
    await expect(service.get('child', '2026-09-21', { userId: 'parent', role: Role.PARENT })).rejects.toThrow(ForbiddenException);
  });

  it('requires a Monday week key', async () => {
    const prisma = { parentLink: { findFirst: jest.fn().mockResolvedValue({ id: 'link' }) } } as unknown as PrismaService;
    const service = new WeeklyReportService(prisma);
    await expect(service.get('child', '2026-09-20', { userId: 'parent', role: Role.PARENT })).rejects.toThrow(BadRequestException);
  });

  it('uses Ulaanbaatar Monday midnight for timestamp events while keeping date-only fields on calendar dates', () => {
    const range = mondayRange('2026-09-21');
    expect(range.start.toISOString()).toBe('2026-09-21T00:00:00.000Z');
    expect(range.instantStart.toISOString()).toBe('2026-09-20T16:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-09-28T00:00:00.000Z');
    expect(range.instantEnd.toISOString()).toBe('2026-09-27T16:00:00.000Z');
  });
});

describe('WeeklyReportService aggregation', () => {
  function emptyPrisma(overrides: Record<string, unknown> = {}) {
    return {
      parentLink: { findFirst: jest.fn() },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'child', firstName: 'Бат', lastName: 'Сурагч' }) },
      enrollment: { findMany: jest.fn().mockResolvedValue([]) },
      attendance: { findMany: jest.fn().mockResolvedValue([]) },
      testResult: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      assignment: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      dailyHomeworkMark: { findMany: jest.fn().mockResolvedValue([]) },
      classTestSession: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      attempt: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      classSchedule: { findMany: jest.fn().mockResolvedValue([]) },
      test: { findMany: jest.fn().mockResolvedValue([]) },
      ...overrides,
    } as any;
  }
  const admin = { userId: 'admin', role: Role.ADMIN };

  it('queries timestamp events from Monday 00:00 UB but date-only attendance from Monday calendar date', async () => {
    const prisma = emptyPrisma();
    const service = new WeeklyReportService(prisma as PrismaService);
    await service.get('child', '2026-09-21', admin);
    expect(prisma.attendance.findMany.mock.calls[0][0].where.date).toEqual({ gte: new Date('2026-09-21T00:00:00.000Z'), lt: new Date('2026-09-28T00:00:00.000Z') });
    expect(prisma.testResult.findMany.mock.calls[0][0].where.createdAt).toEqual({ gte: new Date('2026-09-20T16:00:00.000Z'), lt: new Date('2026-09-27T16:00:00.000Z') });
    expect(prisma.attempt.count.mock.calls[0][0].where.createdAt).toEqual({ gte: new Date('2026-09-20T16:00:00.000Z'), lt: new Date('2026-09-27T16:00:00.000Z') });
  });

  it('keeps assignment and classroom-mark homework totals separate instead of double-counting', async () => {
    const prisma = emptyPrisma({
      enrollment: { findMany: jest.fn().mockResolvedValue([{ classroomId: 'class', joinedAt: new Date('2026-09-01T00:00:00Z'), leftAt: null, classroom: { name: 'Анги' } }]) },
      assignment: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([{ id: 'a1', title: 'Нэг ажил', dueDate: new Date('2026-09-23T00:00:00Z'), createdAt: new Date('2026-09-22T00:00:00Z'), classroomId: 'class', submissions: [{ state: 'DONE_ONLINE' }] }]) },
      dailyHomeworkMark: { findMany: jest.fn().mockResolvedValue([{ classroomId: 'class', date: new Date('2026-09-23T00:00:00Z'), status: 'DONE' }]) },
    });
    const service = new WeeklyReportService(prisma as PrismaService);
    const report = await service.get('child', '2026-09-21', admin);
    expect(report.homework).toEqual({ assignments: { done: 1, notDone: 0, items: [{ title: 'Нэг ажил', dueDate: new Date('2026-09-23T00:00:00Z'), done: true }] }, dailyMarks: { done: 1, partial: 0, notDone: 0, unmarked: 0 } });
    expect(report).toHaveProperty('testResultsComplete', true);
    expect(report.snapshotAt).toEqual(expect.any(String));
  });

  it('omits assignments and class tests issued after the student left the classroom', async () => {
    const leftAt = new Date('2026-09-23T00:00:00Z');
    const prisma = emptyPrisma({
      enrollment: { findMany: jest.fn().mockResolvedValueOnce([{ classroomId: 'old-class', joinedAt: new Date('2026-09-01T00:00:00Z'), leftAt, classroom: { name: 'Хуучин анги' } }]).mockResolvedValueOnce([]) },
      assignment: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([{ id: 'late-assignment', title: 'Сүүлд өгсөн', dueDate: new Date('2026-09-25T00:00:00Z'), createdAt: new Date('2026-09-24T00:00:00Z'), classroomId: 'old-class', submissions: [] }]) },
      classTestSession: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([{ classroomId: 'old-class', testId: null, manualTitle: 'Сүүлд авсан', date: new Date('2026-09-24T00:00:00Z') }]) },
    });
    const report = await new WeeklyReportService(prisma as PrismaService).get('child', '2026-09-21', admin);
    expect(report.homework.assignments).toMatchObject({ done: 0, notDone: 0, items: [] });
    expect(report.tests).toEqual([]);
  });

  it('includes next-week classes only inside schedule and enrollment dates, including a move-in', async () => {
    const movedIn = { date: new Date('2026-09-21T00:00:00Z'), kind: 'MOVED', newDate: new Date('2026-09-30T00:00:00Z'), newStartMinute: 600, newEndMinute: 660, newRoom: '3' };
    const prisma = emptyPrisma({
      enrollment: { findMany: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ classroomId: 'next-class', joinedAt: new Date('2026-09-27T00:00:00Z'), leftAt: null, classroom: { name: 'Дараагийн анги' } }]) },
      classSchedule: { findMany: jest.fn().mockResolvedValue([
        { id: 'active', classroomId: 'next-class', weekday: 1, startMinute: 540, endMinute: 600, effectiveFrom: new Date('2026-09-28T00:00:00Z'), effectiveTo: new Date('2026-09-29T00:00:00Z'), room: '1', exceptions: [{ ...movedIn, date: new Date('2026-09-28T00:00:00Z') }] },
        { id: 'future', classroomId: 'next-class', weekday: 3, startMinute: 720, endMinute: 780, effectiveFrom: new Date('2026-10-05T00:00:00Z'), effectiveTo: null, room: '2', exceptions: [] },
      ]) },
    });
    const service = new WeeklyReportService(prisma as PrismaService);
    const report = await service.get('child', '2026-09-21', admin);
    expect(report.nextWeekSchedule).toEqual([
      { date: '2026-09-30', startMinute: 600, endMinute: 660, room: '3', classroom: 'Дараагийн анги' },
    ]);
  });
});
