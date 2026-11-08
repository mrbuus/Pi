import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addDateDays, dateKey, parseDateOnly, todayUB } from '../common/date';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { withPlus } from '../revisions/revision-snapshot';
import { teacherDisplayNames } from '../schedule/schedule.service';
import { resolveWeek } from '../schedule/week-resolver';
import { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';
import { isPayRateOwner } from './pay-rate-owner';
import {
  canEditAccount,
  comparePeriods,
  effectiveRate,
  formatHundredths,
  maskAccountNumber,
  normalizeAccountNumber,
  orderSheetPeople,
  parseHoursInput,
  parsePeriod,
  payAmount,
  periodOfDate,
  shiftPeriod,
  staffedDays,
  sumHundredths,
  validRate,
  weekStartsCovering,
  type HalfMonthPeriod,
  type StaffedDay,
} from './work-sheet.logic';

const STAFF_ROLES = [Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN];
const EDIT_CAPABILITY = 'teacher-hours.edit' as const;
/** Зөөсөн хичээл өөр долоо хоногоос орж ирж болох тул хуваарь/оноолтыг өргөн цонхоор ачаална */
const MOVE_MARGIN_DAYS = 60;

export interface SheetRow {
  teacherId: string;
  /** Хүснэгтийн нэр — «Дуламсүрэн», ижил нэртэй бол «Б. Марал-Эрдэнэ», Багш+ бол «+» */
  name: string;
  role: string;
  /** Ажлын өдрийн хүснэгтэд (TeacherWorkDay) байгаа эсэх */
  inRoster: boolean;
  archived: boolean;
  hasAccount: boolean;
  /** огноо → цаг×100 */
  cells: Record<string, number>;
  totalHundredths: number;
  /** огноо → тэр өдөр өдрийн хуваарьт (ахлах/туслах) орсон хичээл */
  staffed: Record<string, StaffedDay>;
}

interface Actor {
  userId: string;
  role: string;
}

@Injectable()
export class WorkSheetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capabilities: StaffCapabilityService,
  ) {}

  private period(id: string | undefined): HalfMonthPeriod {
    try {
      return parsePeriod(id || periodOfDate(dateKey(todayUB())));
    } catch {
      throw new BadRequestException('Үе «YYYY-MM-1» эсвэл «YYYY-MM-2» хэлбэртэй байна');
    }
  }

  private canEditHours(userId: string): Promise<boolean> {
    return this.capabilities.has(userId, EDIT_CAPABILITY);
  }

  /** Ажилтан (Багш, Багш+, Админ) эсэхийг шалгаад буцаана. */
  private async staffUser(teacherId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, firstName: true, lastName: true, role: true, archivedAt: true },
    });
    if (!user || !STAFF_ROLES.includes(user.role as (typeof STAFF_ROLES)[number]))
      throw new NotFoundException('Багш олдсонгүй');
    return user;
  }

  /* ============================================================ Хүснэгт */

  async sheet(actor: Actor, periodId?: string) {
    const p = this.period(periodId);
    const today = dateKey(todayUB());
    const current = periodOfDate(today);
    const start = parseDateOnly(p.start);
    const end = parseDateOnly(p.end);

    const [canEdit, roster, hours, accounts, staffedMap] = await Promise.all([
      this.canEditHours(actor.userId),
      this.prisma.teacherWorkDay.findMany({ select: { teacherId: true, sortOrder: true } }),
      this.prisma.teacherWorkHours.findMany({
        where: { date: { gte: start, lte: end }, hundredths: { not: null } },
        select: { teacherId: true, date: true, hundredths: true },
      }),
      this.prisma.teacherBankAccount.findMany({ select: { teacherId: true } }),
      this.staffedInPeriod(p),
    ]);

    const rosterOrder = new Map<string, number>();
    for (const r of roster)
      rosterOrder.set(r.teacherId, Math.min(rosterOrder.get(r.teacherId) ?? r.sortOrder, r.sortOrder));

    const cellsByTeacher = new Map<string, Record<string, number>>();
    for (const h of hours) {
      const cells = cellsByTeacher.get(h.teacherId) ?? {};
      cells[dateKey(h.date)] = h.hundredths!;
      cellsByTeacher.set(h.teacherId, cells);
    }

    const ids = new Set<string>([...rosterOrder.keys(), ...cellsByTeacher.keys(), ...staffedMap.keys()]);
    const [users, pool] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: [...ids] }, role: { in: STAFF_ROLES } },
        select: { id: true, firstName: true, lastName: true, role: true, archivedAt: true },
      }),
      this.prisma.user.findMany({
        where: { role: { in: STAFF_ROLES }, archivedAt: null },
        select: { firstName: true },
      }),
    ]);
    const names = teacherDisplayNames(users, pool);
    const hasAccount = new Set(accounts.map((a) => a.teacherId));

    const rows = orderSheetPeople(
      users
        // Архивлагдсан хүн зөвхөн энэ үед цагтай/хуваарьт орсон бол харагдана (түүх)
        .filter((u) => !u.archivedAt || cellsByTeacher.has(u.id) || staffedMap.has(u.id))
        .map((u) => {
          const cells = cellsByTeacher.get(u.id) ?? {};
          return {
            id: u.id,
            rosterOrder: rosterOrder.get(u.id) ?? null,
            name: withPlus(names.get(u.id) ?? u.firstName, u.role),
            row: {
              teacherId: u.id,
              name: withPlus(names.get(u.id) ?? u.firstName, u.role),
              role: u.role,
              inRoster: rosterOrder.has(u.id),
              archived: !!u.archivedAt,
              hasAccount: hasAccount.has(u.id),
              cells,
              totalHundredths: sumHundredths(Object.values(cells)),
              staffed: Object.fromEntries(staffedMap.get(u.id) ?? []),
            } satisfies SheetRow,
          };
        }),
    ).map((x) => x.row);

    const atOrAfterCurrent = comparePeriods(p.id, current) >= 0;
    return {
      period: {
        id: p.id,
        start: p.start,
        end: p.end,
        days: p.days,
        prev: shiftPeriod(p.id, -1),
        next: atOrAfterCurrent ? null : shiftPeriod(p.id, 1),
        current,
      },
      today,
      viewer: {
        userId: actor.userId,
        canEdit,
        // Хөлсний УТГА энд хэзээ ч орохгүй — зөвхөн «хөлсний багана харуулах уу» гэсэн туг
        seesPay: isPayRateOwner(actor.userId),
      },
      rows,
      totalHundredths: sumHundredths(rows.map((r) => r.totalHundredths)),
    };
  }

  /** Үеийн өдөр бүр хэн өдрийн хуваарьт (ахлах/туслах) орсон, хэдэн минут. */
  private async staffedInPeriod(p: HalfMonthPeriod): Promise<Map<string, Map<string, StaffedDay>>> {
    const start = parseDateOnly(p.start);
    const end = parseDateOnly(p.end);
    const wideStart = addDateDays(start, -MOVE_MARGIN_DAYS);
    const wideEnd = addDateDays(end, MOVE_MARGIN_DAYS);
    const schedules = await this.prisma.classSchedule.findMany({
      where: {
        deletedAt: null,
        effectiveFrom: { lte: end },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: wideStart } }],
      },
      include: { classroom: { select: { name: true } } },
    });
    if (!schedules.length) return new Map();
    const ids = schedules.map((s) => s.id);
    const [exceptions, holidays, staffing] = await Promise.all([
      this.prisma.scheduleException.findMany({ where: { scheduleId: { in: ids } } }),
      this.prisma.academicCalendarDay.findMany({
        where: { date: { gte: start, lte: end }, deletedAt: null },
        include: { classrooms: { select: { classroomId: true } } },
      }),
      this.prisma.lessonStaffing.findMany({
        where: { scheduleId: { in: ids }, date: { gte: wideStart, lte: wideEnd } },
        select: { scheduleId: true, date: true, leadTeacherId: true, assistantTeacherId: true },
      }),
    ]);
    if (!staffing.length) return new Map();
    const person = (id: string | null) => (id ? { id, name: id } : null);
    const input = {
      schedules: schedules.map((s) => ({
        id: s.id,
        classroomId: s.classroomId,
        classroomName: s.classroom.name,
        weekday: s.weekday,
        startMinute: s.startMinute,
        endMinute: s.endMinute,
        teacherId: s.teacherId,
        teacherName: null,
        room: s.room,
        subject: s.subject,
        effectiveFrom: dateKey(s.effectiveFrom),
        effectiveTo: s.effectiveTo ? dateKey(s.effectiveTo) : null,
      })),
      exceptions: exceptions.map((e) => ({
        scheduleId: e.scheduleId,
        date: dateKey(e.date),
        kind: e.kind,
        newDate: e.newDate ? dateKey(e.newDate) : null,
        newStartMinute: e.newStartMinute,
        newEndMinute: e.newEndMinute,
        newRoom: e.newRoom,
        note: e.note,
      })),
      topics: [],
      holidays: holidays.map((h) => ({
        date: dateKey(h.date),
        type: h.type,
        title: h.title,
        classroomIds: h.classrooms.map((c) => c.classroomId),
      })),
      staffing: staffing.map((r) => ({
        scheduleId: r.scheduleId,
        date: dateKey(r.date),
        lead: person(r.leadTeacherId),
        assistant: person(r.assistantTeacherId),
      })),
    };
    const days = weekStartsCovering(p).flatMap((weekStart) => resolveWeek({ ...input, weekStart }));
    return staffedDays(days, new Set(p.days));
  }

  /** Нэг нүдийг хадгална. value: «7,5» / «7.5» / «» (арилгах). */
  async setCell(actor: Actor, input: { teacherId: string; date: string; value: string | null }) {
    if (!(await this.canEditHours(actor.userId)))
      throw new ForbiddenException('Цаг бөглөх эрх танд олгогдоогүй байна');
    let date: Date;
    let key: string;
    try {
      key = input.date.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error();
      date = parseDateOnly(key);
      if (dateKey(date) !== key) throw new Error();
    } catch {
      throw new BadRequestException('Огноо буруу байна');
    }
    // Ирээдүйн үед бөглөхгүй (хүснэгт ч одоогийн үеэс цааш шилждэггүй)
    const current = parsePeriod(periodOfDate(dateKey(todayUB())));
    if (key > current.end) throw new BadRequestException('Ирээдүйн өдрийн цагийг бөглөхгүй');
    const parsed = parseHoursInput(input.value);
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    await this.staffUser(input.teacherId);
    const next = parsed.hundredths;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`teacher-hours:${input.teacherId}:${key}`}))`;
      const where = { teacherId_date: { teacherId: input.teacherId, date } };
      const existing = await tx.teacherWorkHours.findUnique({ where });
      const prev = existing?.hundredths ?? null;
      if (prev === next) return { teacherId: input.teacherId, date: key, hundredths: next, changed: false };
      const row = await tx.teacherWorkHours.upsert({
        where,
        create: { teacherId: input.teacherId, date, hundredths: next, updatedById: actor.userId },
        update: { hundredths: next, updatedById: actor.userId },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          actorRole: actor.role,
          action: 'UPDATE',
          entity: 'TeacherWorkHours',
          entityId: row.id,
          before: { teacherId: input.teacherId, date: key, hours: prev === null ? null : formatHundredths(prev) },
          after: { teacherId: input.teacherId, date: key, hours: next === null ? null : formatHundredths(next) },
        },
      });
      return { teacherId: input.teacherId, date: key, hundredths: next, changed: true };
    });
  }

  /* ============================================================== Данс */

  async getAccount(actor: Actor, teacherId: string) {
    const teacher = await this.staffUser(teacherId);
    const [account, canEditHours] = await Promise.all([
      this.prisma.teacherBankAccount.findUnique({ where: { teacherId } }),
      this.canEditHours(actor.userId),
    ]);
    const updatedBy = account
      ? await this.prisma.user.findUnique({
          where: { id: account.updatedById },
          select: { firstName: true, lastName: true, role: true },
        })
      : null;
    return {
      teacherId,
      fullName: withPlus(`${teacher.lastName} ${teacher.firstName}`.trim(), teacher.role),
      canEdit: canEditAccount({ viewerId: actor.userId, targetId: teacherId, canEditHours }),
      isSelf: actor.userId === teacherId,
      account: account
        ? {
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            holderName: account.holderName,
            updatedAt: account.updatedAt.toISOString(),
            updatedBy: updatedBy
              ? withPlus(`${updatedBy.lastName.charAt(0) ? `${updatedBy.lastName.charAt(0)}. ` : ''}${updatedBy.firstName}`, updatedBy.role)
              : null,
          }
        : null,
    };
  }

  async setAccount(
    actor: Actor,
    teacherId: string,
    input: { bankName: string; accountNumber: string; holderName: string },
  ) {
    const teacher = await this.staffUser(teacherId);
    const canEditHours = await this.canEditHours(actor.userId);
    if (!canEditAccount({ viewerId: actor.userId, targetId: teacherId, canEditHours }))
      throw new ForbiddenException('Та зөвхөн өөрийнхөө дансыг засна');
    if (teacher.archivedAt && actor.userId !== teacherId && !canEditHours)
      throw new ForbiddenException('Архивлагдсан багшийн дансыг засах эрхгүй');
    const bankName = (input.bankName ?? '').trim().replace(/\s+/g, ' ');
    const holderName = (input.holderName ?? '').trim().replace(/\s+/g, ' ');
    if (bankName.length < 2 || bankName.length > 60) throw new BadRequestException('Банкаа сонгоно уу');
    if (holderName.length < 2 || holderName.length > 80)
      throw new BadRequestException('Данс эзэмшигчийн нэрийг бичнэ үү');
    const number = normalizeAccountNumber(input.accountNumber);
    if (!number.ok) throw new BadRequestException(number.error);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`teacher-account:${teacherId}`}))`;
      const before = await tx.teacherBankAccount.findUnique({ where: { teacherId } });
      if (
        before &&
        before.bankName === bankName &&
        before.accountNumber === number.value &&
        before.holderName === holderName
      )
        return { changed: false };
      await tx.teacherBankAccount.upsert({
        where: { teacherId },
        create: { teacherId, bankName, accountNumber: number.value, holderName, updatedById: actor.userId },
        update: { bankName, accountNumber: number.value, holderName, updatedById: actor.userId },
      });
      // Дансны дугаар аудитад ЗӨВХӨН нууцлагдсан хэлбэрээр
      await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          actorRole: actor.role,
          action: before ? 'UPDATE' : 'CREATE',
          entity: 'TeacherBankAccount',
          entityId: teacherId,
          before: before
            ? {
                bankName: before.bankName,
                accountNumber: maskAccountNumber(before.accountNumber),
                holderName: before.holderName,
              }
            : undefined,
          after: { bankName, accountNumber: maskAccountNumber(number.value), holderName },
        },
      });
      return { changed: true };
    });
  }

  /* ======================================== Цагийн хөлс — зөвхөн Баасанжав */

  private async assertPayOwner(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { archivedAt: true } });
    if (!isPayRateOwner(userId) || !user || user.archivedAt)
      throw new ForbiddenException('Энэ мэдээлэл танд нээлттэй биш');
  }

  async pay(actor: Actor, periodId?: string) {
    await this.assertPayOwner(actor.userId);
    const p = this.period(periodId);
    const [hours, rates] = await Promise.all([
      this.prisma.teacherWorkHours.groupBy({
        by: ['teacherId'],
        where: { date: { gte: parseDateOnly(p.start), lte: parseDateOnly(p.end) }, hundredths: { not: null } },
        _sum: { hundredths: true },
      }),
      this.prisma.teacherPayRate.findMany({
        where: { deletedAt: null, effectiveFrom: { lte: parseDateOnly(p.start) } },
        select: { teacherId: true, effectiveFrom: true, ratePerHour: true },
      }),
    ]);
    const ratesByTeacher = new Map<string, { effectiveFrom: string; ratePerHour: number }[]>();
    for (const r of rates) {
      const list = ratesByTeacher.get(r.teacherId) ?? [];
      list.push({ effectiveFrom: dateKey(r.effectiveFrom), ratePerHour: r.ratePerHour });
      ratesByTeacher.set(r.teacherId, list);
    }
    const totals = new Map(hours.map((h) => [h.teacherId, h._sum.hundredths ?? 0]));
    const ids = new Set([...totals.keys(), ...ratesByTeacher.keys()]);
    const rows = [...ids].map((teacherId) => {
      const rate = effectiveRate(ratesByTeacher.get(teacherId) ?? [], p.start);
      const totalHundredths = totals.get(teacherId) ?? 0;
      return {
        teacherId,
        ratePerHour: rate?.ratePerHour ?? null,
        rateFrom: rate?.effectiveFrom ?? null,
        /** Хөлс энэ үед тавигдсан уу (эсвэл өмнөх үеэс өвлөгдсөн) */
        setThisPeriod: rate?.effectiveFrom === p.start,
        totalHundredths,
        amount: rate ? payAmount(totalHundredths, rate.ratePerHour) : null,
      };
    });
    return {
      period: p.id,
      rows,
      totalAmount: rows.reduce((s, r) => s + (r.amount ?? 0), 0),
    };
  }

  /**
   * Хөлсийг тухайн үеэс эхлэн тавина (дараагийн үеүүдэд өвлөгдөнө). null = энэ
   * үед тавьсныг цуцалж өмнөх үеийнхийг өвлүүлэх. Хуучин мөр устахгүй (deletedAt).
   */
  async setRate(actor: Actor, input: { teacherId: string; period: string; ratePerHour: number | null }) {
    await this.assertPayOwner(actor.userId);
    const p = this.period(input.period);
    if (input.ratePerHour !== null && !validRate(input.ratePerHour))
      throw new BadRequestException('Цагийн хөлс 0–1 000 000 ₮ бүхэл тоо байна');
    await this.staffUser(input.teacherId);
    const effectiveFrom = parseDateOnly(p.start);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`teacher-rate:${input.teacherId}:${p.start}`}))`;
      const live = await tx.teacherPayRate.findFirst({
        where: { teacherId: input.teacherId, effectiveFrom, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      if ((live?.ratePerHour ?? null) === input.ratePerHour) return { changed: false };
      if (live)
        await tx.teacherPayRate.updateMany({
          where: { teacherId: input.teacherId, effectiveFrom, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      const created =
        input.ratePerHour === null
          ? null
          : await tx.teacherPayRate.create({
              data: {
                teacherId: input.teacherId,
                effectiveFrom,
                ratePerHour: input.ratePerHour,
                createdById: actor.userId,
              },
            });
      // Хөлсний УТГА аудитад ОРОХГҮЙ (Админ ч харахгүй) — зөвхөн өөрчлөгдсөн гэсэн тэмдэг
      await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          actorRole: actor.role,
          action: created ? 'UPDATE' : 'DELETE',
          entity: 'TeacherPayRate',
          entityId: created?.id ?? live!.id,
          before: live ? { teacherId: input.teacherId, effectiveFrom: p.start, rate: '[нууц]' } : undefined,
          after: created ? { teacherId: input.teacherId, effectiveFrom: p.start, rate: '[нууц]' } : undefined,
        },
      });
      return { changed: true };
    });
  }
}
