import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { TuitionService } from '../tuition/tuition.service';
import { WeeklyReportService } from '../reports/weekly-report.service';
import { JobsService, weeklyReportMonday } from './jobs.service';
import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants';
import { Prisma } from '../generated/prisma/client';

describe('JobsService', () => {
  it('uses the previous complete week except for Sunday 20:00, which snapshots the current week', () => {
    expect(weeklyReportMonday(new Date('2026-09-27T11:59:00.000Z'))).toBe('2026-09-14');
    expect(weeklyReportMonday(new Date('2026-09-27T12:00:00.000Z'))).toBe('2026-09-21');
    expect(weeklyReportMonday(new Date('2026-09-28T00:30:00.000Z'))).toBe('2026-09-21');
  });

  it('schedules weekly delivery at Sunday 20:00 Ulaanbaatar time', () => {
    expect(Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, JobsService.prototype.sundayWeekly)).toMatchObject({ cronTime: '0 20 * * 0', timeZone: 'Asia/Ulaanbaatar' });
  });

  it('writes an in-app delivery once even when the same job is retried', async () => {
    const stored: any[] = [];
    const notification = { create: jest.fn().mockResolvedValue({}) };
    const prisma: any = {
      notificationDelivery: {
        findUnique: jest.fn(async ({ where }: any) => stored.find((item) => item.sentKey === where.sentKey) ?? null),
        create: jest.fn(async ({ data }: any) => { const row = { id: 'delivery-1', ...data }; stored.push(row); return row; }),
        update: jest.fn(async ({ where, data }: any) => { Object.assign(stored.find((item) => item.id === where.id), data); return stored[0]; }),
      },
      notificationPreference: { findUnique: jest.fn().mockResolvedValue({ emailReminders: true, emailWeekly: true }) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'u', role: 'STUDENT', email: null }) },
      parentLink: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (fn: any) => fn({ notificationDelivery: { create: prisma.notificationDelivery.create, update: prisma.notificationDelivery.update }, notification })),
      notification,
    };
    const email = { isConfigured: () => false, sendEmail: jest.fn() } as unknown as EmailService;
    const service = new JobsService(prisma as PrismaService, email, {} as TuitionService, {} as WeeklyReportService);
    const deliver = (service as any).deliver.bind(service);
    const message = { key: 'homework-due:a:u', studentId: 'u', recipientId: 'u', kind: 'HOMEWORK', title: 'Due', body: 'Tomorrow', preference: 'reminder', email: null };
    await deliver(message);
    await deliver(message);
    expect(notification.create).toHaveBeenCalledTimes(1);
    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(stored).toHaveLength(1);
  });

  it('does not run a job while another owner holds its 10-minute lock', async () => {
    const prisma: any = {
      jobRun: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique lock', { code: 'P2002', clientVersion: 'test' })),
      },
    };
    const service = new JobsService(prisma as PrismaService, {} as EmailService, {} as TuitionService, {} as WeeklyReportService);
    const execute = jest.spyOn(service as any, 'execute');
    await expect(service.run('parent-weekly')).resolves.toMatchObject({ skipped: true, reason: 'already-running' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('atomically claims the email attempt so concurrent retries cannot send twice', async () => {
    const delivery = { id: 'delivery-1', userId: 'parent-1', emailAttemptedAt: null };
    const prisma: any = {
      notificationDelivery: {
        findUnique: jest.fn().mockImplementation(async () => ({ ...delivery })),
        updateMany: jest.fn().mockImplementation(async ({ data }: any) => {
          if (delivery.emailAttemptedAt) return { count: 0 };
          delivery.emailAttemptedAt = data.emailAttemptedAt;
          return { count: 1 };
        }),
        update: jest.fn().mockResolvedValue(delivery),
      },
      notificationPreference: { findUnique: jest.fn().mockResolvedValue({ emailWeekly: true, emailReminders: true }) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'parent-1', role: 'PARENT', email: 'parent@example.test' }) },
      parentLink: { findFirst: jest.fn().mockResolvedValue({ id: 'link-1' }) },
    };
    const email = { isConfigured: () => true, sendEmail: jest.fn().mockResolvedValue(undefined) } as unknown as EmailService;
    const service = new JobsService(prisma as PrismaService, email, {} as TuitionService, {} as WeeklyReportService);
    const deliver = (service as any).deliver.bind(service);
    const input = { key: 'weekly:parent:child:week', studentId: 'child', recipientId: 'parent-1', kind: 'SYSTEM', title: 'Report', body: 'Body', preference: 'weekly', email: 'parent@example.test' };
    await Promise.all([deliver(input), deliver(input)]);
    expect(prisma.notificationDelivery.updateMany).toHaveBeenCalledTimes(2);
    expect(email.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('does not create a delivery for an unverified parent recipient', async () => {
    const notification = { create: jest.fn() };
    const prisma: any = {
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'parent-1', role: 'PARENT', email: 'parent@example.test' }) },
      parentLink: { findFirst: jest.fn().mockResolvedValue(null) },
      notificationDelivery: { findUnique: jest.fn().mockResolvedValue(null) },
      notification,
    };
    const service = new JobsService(prisma as PrismaService, {} as EmailService, {} as TuitionService, {} as WeeklyReportService);
    await (service as any).deliver({ key: 'weekly:p:c', studentId: 'child', recipientId: 'parent-1', kind: 'SYSTEM', title: 'Report', body: 'Body', preference: 'weekly' });
    expect(notification.create).not.toHaveBeenCalled();
  });

  it('excludes students who joined after homework was issued', async () => {
    const assignment = { id: 'assignment-1', title: 'Туршилт', dueDate: new Date('2026-09-29T00:00:00Z'), createdAt: new Date('2026-09-20T00:00:00Z'), classroomId: 'class-1', submissions: [], classroom: { enrollments: [{ studentId: 'child', joinedAt: new Date('2026-09-21T00:00:00Z') }] } };
    const prisma: any = { assignment: { findMany: jest.fn().mockResolvedValueOnce([assignment]).mockResolvedValueOnce([]) } };
    const service = new JobsService(prisma as PrismaService, {} as EmailService, {} as TuitionService, {} as WeeklyReportService);
    const recipients = jest.spyOn(service as any, 'recipients');
    await (service as any).homeworkDue();
    expect(recipients).not.toHaveBeenCalled();
  });
});
