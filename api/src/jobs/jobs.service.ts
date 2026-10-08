import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, NotificationKind, Role } from '../generated/prisma/client';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { TuitionService } from '../tuition/tuition.service';
import { WeeklyReportService } from '../reports/weekly-report.service';
import { JOB_NAMES, JobName } from './dto/run-job.dto';

const UB = 'Asia/Ulaanbaatar';
const PAGE = 100;
const MAX_REMINDER_TARGETS = 5000;
function ubDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: UB, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function ubDateStart(date: Date): Date {
  const key = ubDateKey(date);
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - 8 * 3600000);
}
export function weeklyReportMonday(date: Date): string {
  const calendarDate = new Date(`${ubDateKey(date)}T00:00:00.000Z`);
  const weekday = calendarDate.getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const mondayThisWeek = new Date(calendarDate.getTime() - daysSinceMonday * 86400000);
  const localHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: UB, hour: '2-digit', hourCycle: 'h23' }).format(date));
  const justCompleted = weekday === 0 && localHour >= 20;
  const monday = justCompleted ? mondayThisWeek : new Date(mondayThisWeek.getTime() - 7 * 86400000);
  return monday.toISOString().slice(0, 10);
}
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  constructor(private readonly prisma: PrismaService, private readonly email: EmailService, private readonly tuition: TuitionService, private readonly reports: WeeklyReportService) {}

  @Cron('0 20 * * 0', { timeZone: UB })
  async sundayWeekly(): Promise<void> { await this.run('parent-weekly'); }

  @Cron('0 9 * * *', { timeZone: UB })
  async dailyReminders(): Promise<void> {
    for (const name of ['payment-due', 'homework-due', 'mistakes-review'] as const) await this.run(name);
  }

  async run(name: JobName): Promise<Record<string, unknown>> {
    if (!JOB_NAMES.includes(name)) throw new NotFoundException('Тодорхойгүй ажлын нэр');
    const staleBefore = new Date(Date.now() - 10 * 60_000);
    await this.prisma.jobRun.updateMany({ where: { name, lockKey: name, startedAt: { lte: staleBefore } }, data: { lockKey: null, finishedAt: new Date(), ok: false, summary: { reason: 'stale-lock-expired' } } });
    let run: { id: string };
    try {
      run = await this.prisma.jobRun.create({ data: { name, lockKey: name } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { name, skipped: true, reason: 'already-running' };
      throw error;
    }
    try {
      const summary = await this.execute(name);
      await this.prisma.jobRun.update({ where: { id: run.id }, data: { lockKey: null, finishedAt: new Date(), ok: true, summary: summary as Prisma.InputJsonValue } });
      return { name, ...summary };
    } catch (error) {
      const errorCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Error ? error.name : 'unknown';
      await this.prisma.jobRun.update({ where: { id: run.id }, data: { lockKey: null, finishedAt: new Date(), ok: false, summary: { errorCode: errorCode.slice(0, 40) } } });
      throw error;
    }
  }

  private async execute(name: JobName): Promise<Record<string, unknown>> {
    switch (name) {
      case 'payment-due': return this.paymentDue();
      case 'homework-due': return this.homeworkDue();
      case 'mistakes-review': return this.mistakesReview();
      case 'parent-weekly': return this.parentWeekly();
    }
  }

  private async recipients(studentId: string): Promise<Array<{ id: string; email: string | null; role: Role; preference: { emailWeekly: boolean; emailReminders: boolean } | null }>> {
    const links = await this.prisma.parentLink.findMany({ where: { studentId, verifiedAt: { not: null }, student: { role: Role.STUDENT, archivedAt: null }, parent: { role: Role.PARENT, archivedAt: null } }, select: { parent: { select: { id: true, email: true, role: true, notificationPreference: true } } } });
    const student = await this.prisma.user.findFirst({ where: { id: studentId, role: Role.STUDENT, archivedAt: null }, select: { id: true, email: true, role: true, notificationPreference: true } });
    const users = [student, ...links.map((link) => link.parent)].filter((item): item is NonNullable<typeof item> => item !== null);
    return users.map((user) => ({ id: user.id, email: user.email, role: user.role, preference: user.notificationPreference }));
  }

  private async isEligibleRecipient(studentId: string, recipientId: string): Promise<{ email: string | null } | null> {
    const user = await this.prisma.user.findFirst({ where: { id: recipientId, archivedAt: null }, select: { id: true, role: true, email: true } });
    if (!user) return null;
    if (recipientId === studentId) return user.role === Role.STUDENT ? { email: user.email } : null;
    if (user.role !== Role.PARENT) return null;
    const link = await this.prisma.parentLink.findFirst({ where: { parentId: recipientId, studentId, verifiedAt: { not: null }, parent: { role: Role.PARENT, archivedAt: null }, student: { role: Role.STUDENT, archivedAt: null } }, select: { id: true } });
    return link ? { email: user.email } : null;
  }

  private async deliver(input: { key: string; studentId: string; recipientId: string; kind: NotificationKind; title: string; body: string; link?: string; emailSubject?: string; html?: string; preference: 'weekly' | 'reminder'; email?: string | null }): Promise<{ duplicate: boolean; emailed: boolean }> {
    let delivery = await this.prisma.notificationDelivery.findUnique({ where: { sentKey: input.key } });
    let duplicate = Boolean(delivery);
    if (!delivery) {
      if (!await this.isEligibleRecipient(input.studentId, input.recipientId)) return { duplicate: false, emailed: false };
      try {
        delivery = await this.prisma.$transaction(async (tx) => {
          const created = await tx.notificationDelivery.create({ data: { sentKey: input.key, userId: input.recipientId, kind: input.kind, title: input.title, body: input.body, link: input.link } });
          await tx.notification.create({ data: { userId: input.recipientId, kind: input.kind, title: input.title, body: input.body, link: input.link } });
          return tx.notificationDelivery.update({ where: { id: created.id }, data: { inAppSentAt: new Date() } });
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
        duplicate = true;
        delivery = await this.prisma.notificationDelivery.findUnique({ where: { sentKey: input.key } });
      }
    }
    if (!delivery) return { duplicate, emailed: false };
    const currentRecipient = await this.isEligibleRecipient(input.studentId, input.recipientId);
    const allowed = await this.pref(delivery.userId, input.preference);
    if (!currentRecipient || !allowed || !currentRecipient.email || !this.email.isConfigured() || delivery.emailAttemptedAt) return { duplicate, emailed: false };
    // Mark before SMTP: this gives a strict at-most-once attempt even if SMTP times out after acceptance.
    const claim = await this.prisma.notificationDelivery.updateMany({ where: { id: delivery.id, emailAttemptedAt: null }, data: { emailAttemptedAt: new Date(), emailError: null } });
    if (claim.count !== 1) return { duplicate: true, emailed: false };
    try {
      await this.email.sendEmail({ to: currentRecipient.email, subject: input.emailSubject ?? input.title, text: input.body, ...(input.html ? { html: input.html } : {}) });
      await this.prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { emailSentAt: new Date() } });
      return { duplicate, emailed: true };
    } catch (error) {
      await this.prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { emailError: 'SMTP delivery failed' } });
      this.logger.warn('SMTP notification delivery failed');
      return { duplicate, emailed: false };
    }
  }

  private async pref(userId: string, kind: 'weekly' | 'reminder'): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    return kind === 'weekly' ? pref?.emailWeekly ?? true : pref?.emailReminders ?? true;
  }

  private async paymentDue(): Promise<Record<string, unknown>> {
    let students: Array<{ id: string }> = [];
    let studentCursor = '';
    while (students.length < MAX_REMINDER_TARGETS) {
      const page = await this.prisma.user.findMany({ where: { role: Role.STUDENT, archivedAt: null, studentProfile: { isNot: null }, id: { gt: studentCursor } }, select: { id: true }, orderBy: { id: 'asc' }, take: Math.min(PAGE, MAX_REMINDER_TARGETS - students.length) });
      if (!page.length) break;
      students.push(...page); studentCursor = page[page.length - 1].id;
      if (page.length < PAGE) break;
    }
    let sent = 0; let duplicate = 0; let examined = 0;
    const today = ubDateStart(new Date());
    const through = new Date(today.getTime() + 4 * 86400000);
    for (let offset = 0; offset < students.length; offset += PAGE) {
      for (const student of students.slice(offset, offset + PAGE)) {
        examined++;
        try {
          const paidUntil = await this.tuition.getPaidUntil(student.id);
          if (!paidUntil || paidUntil < today || paidUntil >= through) continue;
          const keyDate = paidUntil.toISOString().slice(0, 10);
          for (const recipient of await this.recipients(student.id)) {
            const link = recipient.role === Role.STUDENT ? '/app/student/payments' : `/app/parent/weekly?studentId=${encodeURIComponent(student.id)}`;
            const result = await this.deliver({ key: `payment-due:${student.id}:${recipient.id}:${keyDate}`, studentId: student.id, recipientId: recipient.id, kind: NotificationKind.PAYMENT_DUE, title: 'Төлбөрийн хугацаа дуусах гэж байна', body: `Таны сургалтын төлбөр ${keyDate}-нд дуусна. Төлбөрийн мэдээллээ шалгана уу.`, link, preference: 'reminder', email: recipient.email });
            sent += result.duplicate ? 0 : 1; duplicate += result.duplicate ? 1 : 0;
          }
        } catch { this.logger.warn('Payment reminder target skipped'); }
      }
    }
    return { examined, sent, duplicate, truncated: students.length === MAX_REMINDER_TARGETS };
  }

  private async homeworkDue(): Promise<Record<string, unknown>> {
    const tomorrowStart = new Date(ubDateStart(new Date()).getTime() + 86400000);
    const end = new Date(tomorrowStart.getTime() + 86400000);
    let assignments: Array<{ id: string; title: string; dueDate: Date | null; createdAt: Date; classroomId: string; classroom: { enrollments: Array<{ studentId: string; joinedAt: Date }> }; submissions: Array<{ studentId: string; state: string }> }> = [];
    let assignmentCursor = '';
    while (assignments.length < MAX_REMINDER_TARGETS) {
      const page = await this.prisma.assignment.findMany({ where: { dueDate: { gte: tomorrowStart, lt: end }, deletedAt: null, classroom: { archived: false }, id: { gt: assignmentCursor } }, select: { id: true, title: true, dueDate: true, createdAt: true, classroomId: true, submissions: { select: { studentId: true, state: true } }, classroom: { select: { enrollments: { where: { joinedAt: { lt: end }, leftAt: null, student: { role: Role.STUDENT, archivedAt: null } }, select: { studentId: true, joinedAt: true }, take: MAX_REMINDER_TARGETS } } } }, orderBy: { id: 'asc' }, take: Math.min(PAGE, MAX_REMINDER_TARGETS - assignments.length) });
      if (!page.length) break;
      assignments.push(...page); assignmentCursor = page[page.length - 1].id;
      if (page.length < PAGE) break;
    }
    let sent = 0; let duplicate = 0;
    for (const assignment of assignments) {
      for (const enrollment of assignment.classroom.enrollments.filter((item) => item.joinedAt <= assignment.createdAt)) {
        if (['DONE_ONLINE', 'DONE_IN_CLASS'].includes(assignment.submissions.find((submission) => submission.studentId === enrollment.studentId)?.state ?? '')) continue;
        for (const recipient of await this.recipients(enrollment.studentId)) {
          const link = recipient.role === Role.STUDENT ? '/app/student' : `/app/parent/weekly?studentId=${encodeURIComponent(enrollment.studentId)}`;
          const result = await this.deliver({ key: `homework-due:${assignment.id}:${enrollment.studentId}:${recipient.id}`, studentId: enrollment.studentId, recipientId: recipient.id, kind: NotificationKind.HOMEWORK, title: 'Маргааш даалгаврын хугацаа дуусна', body: `“${assignment.title}” даалгаврыг маргааш илгээх хугацаа дуусна.`, link, preference: 'reminder', email: recipient.email });
          sent += result.duplicate ? 0 : 1; duplicate += result.duplicate ? 1 : 0;
        }
      }
    }
    return { assignments: assignments.length, sent, duplicate, truncated: assignments.length === MAX_REMINDER_TARGETS };
  }

  private async mistakesReview(): Promise<Record<string, unknown>> {
    const table = await this.prisma.$queryRaw<Array<{ exists: string | null }>>`SELECT to_regclass('public."MistakeEntry"')::text AS exists`;
    if (!table[0]?.exists) return { skipped: true, reason: 'MistakeEntry table is not installed' };
    const cutoff = new Date(Date.now() - 3 * 86400000);
    let targets: Array<{ userId: string }>;
    try {
      targets = await this.prisma.$queryRaw<Array<{ userId: string }>>`SELECT DISTINCT m."userId" FROM "MistakeEntry" m JOIN "User" u ON u."id" = m."userId" WHERE u."role" = 'STUDENT' AND u."archivedAt" IS NULL AND m."status" <> 'MASTERED' AND COALESCE(m."lastRetryAt", m."createdAt") <= ${cutoff} ORDER BY m."userId" LIMIT ${MAX_REMINDER_TARGETS}`;
    } catch (error) { return { skipped: true, reason: `MistakeEntry schema unavailable (${error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'query-error'})` }; }
    let sent = 0; let duplicate = 0;
    for (const { userId } of targets) {
      const day = ubDateKey(new Date());
      const recipient = (await this.recipients(userId)).find((item) => item.id === userId);
      if (!recipient) continue;
      const result = await this.deliver({ key: `mistakes-review:${userId}:${day}`, studentId: userId, recipientId: userId, kind: NotificationKind.SYSTEM, title: 'Алдсан бодлогоо давтаарай', body: 'Өмнө алдсан бодлогоо дахин бодох цаг болжээ. Бага багаар давтах нь ойлголтоо бататгана.', link: '/app/student', preference: 'reminder', email: recipient.email });
      sent += result.duplicate ? 0 : 1; duplicate += result.duplicate ? 1 : 0;
    }
    return { targets: targets.length, sent, duplicate, truncated: targets.length === MAX_REMINDER_TARGETS };
  }

  private async parentWeekly(): Promise<Record<string, unknown>> {
    // At the scheduled Sunday 20:00 run, report the current week as a snapshot through that instant; otherwise use the most recently completed week.
    const generatedAt = new Date();
    const week = weeklyReportMonday(generatedAt);
    let links: Array<{ id: string; parentId: string; studentId: string; parent: { id: string; email: string | null }; student: { firstName: string; lastName: string } }> = [];
    let linkCursor = '';
    while (links.length < MAX_REMINDER_TARGETS) {
      const page = await this.prisma.parentLink.findMany({ where: { id: { gt: linkCursor }, verifiedAt: { not: null }, parent: { role: Role.PARENT, archivedAt: null }, student: { role: Role.STUDENT, archivedAt: null } }, select: { id: true, parentId: true, studentId: true, parent: { select: { id: true, email: true } }, student: { select: { firstName: true, lastName: true } } }, orderBy: { id: 'asc' }, take: Math.min(PAGE, MAX_REMINDER_TARGETS - links.length) });
      if (!page.length) break;
      links.push(...page); linkCursor = page[page.length - 1].id;
      if (page.length < PAGE) break;
    }
    let sent = 0; let duplicate = 0; let failures = 0;
    for (const link of links) {
      try {
        const report = await this.reports.get(link.studentId, week, { userId: link.parentId, role: Role.PARENT });
        const asOf = new Intl.DateTimeFormat('mn-MN', { dateStyle: 'medium', timeStyle: 'short', timeZone: UB }).format(new Date(report.snapshotAt));
        const scheduleTime = new Intl.DateTimeFormat('en-US', { timeZone: UB, weekday: 'short', hour: '2-digit', hourCycle: 'h23' }).format(generatedAt);
        const snapshotNote = scheduleTime === 'Sun, 20' ? ' Ням гарагийн 20:00 цагийн snapshot тул тухайн өдрийн сүүлийн дөрвөн цагийн мэдээлэл дараагийн тайланд орно.' : '';
        const summary = `${report.attendance.present} ирсэн, ${report.attendance.absent} тасалсан; ${report.tests.length} тест; ${report.practiceCount} дасгал; даалгавар ${report.homework.assignments.done} хийсэн/${report.homework.assignments.notDone} хийгээгүй; ангийн тэмдэглэгээ ${report.homework.dailyMarks.done} хийсэн/${report.homework.dailyMarks.partial} дутуу/${report.homework.dailyMarks.notDone} хийгээгүй. Мэдээллийг ${asOf} цагийн байдлаар нэгтгэв.${snapshotNote}`;
        const title = `${report.student.firstName}-ийн долоо хоногийн тайлан`;
        // Email-only inline styles use the application's existing palette colors; email clients discard external CSS.
        const html = `<div style="font-family:Arial,sans-serif;color:#172033;line-height:1.5"><h2 style="color:#2457a7">${escapeHtml(title)}</h2><p>${escapeHtml(week)} долоо хоног</p><p>${escapeHtml(summary)}</p><p>Шилдэг сэдэв: ${escapeHtml(report.topics.best?.topic ?? 'мэдээлэл алга')}</p><p>Давтах сэдэв: ${escapeHtml(report.topics.weakest?.topic ?? 'мэдээлэл алга')}</p><a href="${process.env.WEB_ORIGIN ?? ''}/app/parent/weekly?studentId=${encodeURIComponent(link.studentId)}&week=${week}" style="color:#2457a7">Дэлгэрэнгүй тайлан</a></div>`;
        const result = await this.deliver({ key: `parent-weekly:${link.parentId}:${link.studentId}:${week}`, studentId: link.studentId, recipientId: link.parentId, kind: NotificationKind.SYSTEM, title, body: summary, link: `/app/parent/weekly?studentId=${encodeURIComponent(link.studentId)}&week=${week}`, preference: 'weekly', email: link.parent.email, emailSubject: title, html });
        sent += result.duplicate ? 0 : 1; duplicate += result.duplicate ? 1 : 0;
      } catch { failures++; this.logger.warn('Weekly report target skipped'); }
    }
    return { week, parentsAndStudents: links.length, sent, duplicate, failures, truncated: links.length === MAX_REMINDER_TARGETS };
  }
}
