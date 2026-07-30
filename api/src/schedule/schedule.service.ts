import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { addDateDays, dateKey, parseDateOnly, todayUB } from '../common/date';
import { Role, ScheduleExceptionKind } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';
import { ClearTopicDto } from './dto/clear-topic.dto';
import { CreateCalendarDayDto } from './dto/create-calendar-day.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { PutTeacherWorkDaysDto } from './dto/put-teacher-workdays.dto';
import { TeacherWorkDayExceptionDto } from './dto/teacher-workday-exception.dto';
import { UpdateCalendarDayDto } from './dto/update-calendar-day.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpsertExceptionDto } from './dto/upsert-exception.dto';
import { UpsertTopicDto } from './dto/upsert-topic.dto';
import {
  resolveTeacherRoster,
  resolveWeek,
  ResolverException,
  ResolverSchedule,
  ResolverTopic,
} from './week-resolver';

// "Хугацаагүй" (effectiveTo: null) хуваарийг харьцуулахад ашиглах хол ирээдүйн
// огноо — null-той харьцуулах тусгай нөхцөл бичихээс зайлсхийнэ.
const FAR_FUTURE = new Date('9999-12-31');
// /schedule/days нэг дуудлагаар хэт өргөн хугацаа (жишээ нь бүхэл мэдээллийн
// сангийн түүх) шаардаж сервер ачаалахаас сэргийлнэ.
const MAX_DAYS_RANGE = 370;

const CLASSROOM_SELECT = { select: { id: true, name: true } } as const;
const TEACHER_SELECT = {
  select: { id: true, firstName: true, lastName: true },
} as const;

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  // ============ Хичээлийн хуваарь (ClassSchedule) ============

  private async assertNoOverlap(params: {
    classroomId: string;
    weekday: number;
    startMinute: number;
    endMinute: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    excludeId?: string;
  }) {
    const siblings = await this.prisma.classSchedule.findMany({
      where: {
        classroomId: params.classroomId,
        weekday: params.weekday,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
    });
    const newEnd = params.effectiveTo ?? FAR_FUTURE;
    const conflict = siblings.find((s) => {
      const timeOverlaps =
        params.startMinute < s.endMinute && s.startMinute < params.endMinute;
      if (!timeOverlaps) return false;
      const existingEnd = s.effectiveTo ?? FAR_FUTURE;
      const rangeOverlaps =
        params.effectiveFrom <= existingEnd && s.effectiveFrom <= newEnd;
      return rangeOverlaps;
    });
    if (conflict) {
      const toTime = (m: number) =>
        `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      throw new BadRequestException(
        `Энэ ангийн энэ өдөрт (${conflict.weekday}) ${toTime(conflict.startMinute)}–${toTime(conflict.endMinute)} хугацаанд өөр хуваарь давхцаж байна`,
      );
    }
  }

  // parseDateOnly plain Error шидвэл HTTP 500 болчихно — энд эргүүлж 400
  // болгож, хэрэглэгчид ойлгомжтой монгол мессеж өгнө.
  private parseDate(value: string): Date {
    try {
      return parseDateOnly(value);
    } catch {
      throw new BadRequestException(
        'Огнооны формат буруу байна (YYYY-MM-DD)',
      );
    }
  }

  private async assertClassroomExists(classroomId: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom || classroom.archived) {
      throw new NotFoundException('Анги олдсонгүй');
    }
    return classroom;
  }

  async create(dto: CreateScheduleDto) {
    if (dto.startMinute >= dto.endMinute) {
      throw new BadRequestException(
        'Дуусах цаг эхлэх цагаас хойш байх ёстой',
      );
    }
    await this.assertClassroomExists(dto.classroomId);
    if (dto.teacherId) {
      const teacher = await this.prisma.user.findUnique({
        where: { id: dto.teacherId },
      });
      if (!teacher) throw new NotFoundException('Багш олдсонгүй');
    }
    const effectiveFrom = this.parseDate(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? this.parseDate(dto.effectiveTo) : null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException(
        'Дуусах огноо эхлэх огнооноос хойш байх ёстой',
      );
    }
    await this.assertNoOverlap({
      classroomId: dto.classroomId,
      weekday: dto.weekday,
      startMinute: dto.startMinute,
      endMinute: dto.endMinute,
      effectiveFrom,
      effectiveTo,
    });
    return this.prisma.classSchedule.create({
      data: {
        classroomId: dto.classroomId,
        weekday: dto.weekday,
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        teacherId: dto.teacherId,
        room: dto.room,
        subject: dto.subject,
        effectiveFrom,
        effectiveTo,
      },
      include: { classroom: CLASSROOM_SELECT, teacher: TEACHER_SELECT },
    });
  }

  findAll(classroomId?: string) {
    return this.prisma.classSchedule.findMany({
      where: classroomId ? { classroomId } : undefined,
      include: { classroom: CLASSROOM_SELECT, teacher: TEACHER_SELECT },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.classSchedule.findUnique({
      where: { id },
      include: { classroom: CLASSROOM_SELECT, teacher: TEACHER_SELECT },
    });
    if (!entry) throw new NotFoundException('Хуваарь олдсонгүй');
    return entry;
  }

  async update(id: string, dto: UpdateScheduleDto) {
    const existing = await this.prisma.classSchedule.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Хуваарь олдсонгүй');

    const classroomId = dto.classroomId ?? existing.classroomId;
    const weekday = dto.weekday ?? existing.weekday;
    const startMinute = dto.startMinute ?? existing.startMinute;
    const endMinute = dto.endMinute ?? existing.endMinute;
    if (startMinute >= endMinute) {
      throw new BadRequestException(
        'Дуусах цаг эхлэх цагаас хойш байх ёстой',
      );
    }
    if (dto.classroomId) await this.assertClassroomExists(dto.classroomId);
    if (dto.teacherId) {
      const teacher = await this.prisma.user.findUnique({
        where: { id: dto.teacherId },
      });
      if (!teacher) throw new NotFoundException('Багш олдсонгүй');
    }

    const effectiveFrom = dto.effectiveFrom
      ? this.parseDate(dto.effectiveFrom)
      : existing.effectiveFrom;
    const effectiveTo =
      dto.effectiveTo === undefined
        ? existing.effectiveTo
        : dto.effectiveTo === null
          ? null
          : this.parseDate(dto.effectiveTo);
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException(
        'Дуусах огноо эхлэх огнооноос хойш байх ёстой',
      );
    }

    await this.assertNoOverlap({
      classroomId,
      weekday,
      startMinute,
      endMinute,
      effectiveFrom,
      effectiveTo,
      excludeId: id,
    });

    return this.prisma.classSchedule.update({
      where: { id },
      data: {
        classroomId: dto.classroomId,
        weekday: dto.weekday,
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        teacherId: dto.teacherId === undefined ? undefined : dto.teacherId,
        room: dto.room === undefined ? undefined : dto.room,
        subject: dto.subject === undefined ? undefined : dto.subject,
        effectiveFrom,
        effectiveTo,
      },
      include: { classroom: CLASSROOM_SELECT, teacher: TEACHER_SELECT },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.classSchedule.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Хуваарь олдсонгүй');
    await this.prisma.classSchedule.delete({ where: { id } });
    return { removed: true };
  }

  // Ангийн 7 хоногийн хуваарь — зөвхөн ӨНӨӨДӨР хүчинтэй мөрүүд (SPEC:
  // хуучирсан/ирээдүйн effectiveFrom-той мөрийг долоо хоногийн тор дээр
  // харуулбал сурагч, багш хоёулаа андуурна).
  async forClassroom(classroomId: string) {
    await this.assertClassroomExists(classroomId);
    const today = todayUB();
    return this.prisma.classSchedule.findMany({
      where: {
        classroomId,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
      include: { classroom: CLASSROOM_SELECT, teacher: TEACHER_SELECT },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    });
  }

  // STUDENT: одоо элссэн ангийнхаа хуваарь. TEACHER/TEACHER_PLUS: заадаг бүх
  // хичээл — ClassSchedule.teacherId (тухайн цагийг тусгайлж авсан багш) эсвэл
  // түүнгүй бол ангийн үндсэн багшаар (Classroom.teacherId) тодорхойлно.
  async forMe(userId: string, role: Role) {
    const today = todayUB();
    if (role === Role.STUDENT) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId: userId, leftAt: null },
        select: { classroomId: true },
      });
      if (!enrollment) {
        return { classroomId: null, entries: [] };
      }
      const entries = await this.forClassroom(enrollment.classroomId);
      return { classroomId: enrollment.classroomId, entries };
    }
    if (role === Role.TEACHER || role === Role.TEACHER_PLUS) {
      const entries = await this.prisma.classSchedule.findMany({
        where: {
          effectiveFrom: { lte: today },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
          AND: [
            {
              OR: [
                { teacherId: userId },
                { teacherId: null, classroom: { teacherId: userId } },
              ],
            },
          ],
        },
        include: { classroom: CLASSROOM_SELECT, teacher: TEACHER_SELECT },
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      });
      return { entries };
    }
    throw new ForbiddenException('Энэ роль өөрийн хуваарьтай холбогдохгүй');
  }

  // ============ Тухайн хугацааны бодит хичээлтэй өдрүүд ============
  // Долоо хоног бүр давтагддаг хэв маягийг [from, to] хооронд задалж,
  // AcademicCalendarDay-д бүртгэгдсэн амралт/завсарлагыг хасаад буцаана.
  async expandDays(
    fromStr: string,
    toStr: string,
    classroomId?: string,
    teacherId?: string,
  ) {
    if (!fromStr || !toStr) {
      throw new BadRequestException('"from" болон "to" огноо заавал шаардлагатай');
    }
    const from = this.parseDate(fromStr);
    const to = this.parseDate(toStr);
    if (from > to) {
      throw new BadRequestException(
        '"from" огноо "to" огнооноос өмнө байх ёстой',
      );
    }
    const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    if (spanDays > MAX_DAYS_RANGE) {
      throw new BadRequestException(
        `Хугацааны мужийг ${MAX_DAYS_RANGE} хоногоос ихгүй сонгоно уу`,
      );
    }

    const [schedules, calendarDays] = await Promise.all([
      this.prisma.classSchedule.findMany({
        where: {
          ...(classroomId ? { classroomId } : {}),
          effectiveFrom: { lte: to },
          AND: [
            { OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] },
            ...(teacherId
              ? [
                  {
                    OR: [
                      { teacherId },
                      { teacherId: null, classroom: { teacherId } },
                    ],
                  },
                ]
              : []),
          ],
        },
        include: { classroom: CLASSROOM_SELECT, teacher: TEACHER_SELECT },
      }),
      this.prisma.academicCalendarDay.findMany({
        where: { date: { gte: from, lte: to } },
      }),
    ]);
    const holidayByKey = new Map(
      calendarDays.map((c) => [c.date.toISOString().slice(0, 10), c]),
    );

    const days: {
      date: string;
      weekday: number;
      holiday: { type: string; title: string; note: string | null } | null;
      classes: {
        id: string;
        classroomId: string;
        classroomName: string;
        startMinute: number;
        endMinute: number;
        teacherId: string | null;
        teacherName: string | null;
        room: string | null;
        subject: string | null;
      }[];
    }[] = [];

    for (let cursor = from; cursor <= to; cursor = addDateDays(cursor, 1)) {
      const key = cursor.toISOString().slice(0, 10);
      const weekday = cursor.getUTCDay();
      const holiday = holidayByKey.get(key) ?? null;
      const classes = holiday
        ? []
        : schedules
            .filter(
              (s) =>
                s.weekday === weekday &&
                s.effectiveFrom <= cursor &&
                (!s.effectiveTo || s.effectiveTo >= cursor),
            )
            .sort((a, b) => a.startMinute - b.startMinute)
            .map((s) => ({
              id: s.id,
              classroomId: s.classroomId,
              classroomName: s.classroom.name,
              startMinute: s.startMinute,
              endMinute: s.endMinute,
              teacherId: s.teacher?.id ?? null,
              teacherName: s.teacher
                ? `${s.teacher.firstName} ${s.teacher.lastName}`
                : null,
              room: s.room,
              subject: s.subject,
            }));
      days.push({
        date: key,
        weekday,
        holiday: holiday
          ? { type: holiday.type, title: holiday.title, note: holiday.note }
          : null,
        classes,
      });
    }
    return days;
  }

  // ============ Сургалтын хуанли (AcademicCalendarDay) ============

  async createCalendarDay(dto: CreateCalendarDayDto, createdById: string) {
    const date = this.parseDate(dto.date);
    const existing = await this.prisma.academicCalendarDay.findUnique({
      where: { date },
    });
    if (existing) {
      throw new BadRequestException('Энэ огноонд аль хэдийн бичлэг үүссэн байна');
    }
    return this.prisma.academicCalendarDay.create({
      data: {
        date,
        type: dto.type,
        title: dto.title,
        note: dto.note,
        createdById,
      },
    });
  }

  listCalendarDays(fromStr?: string, toStr?: string) {
    const from = fromStr ? this.parseDate(fromStr) : undefined;
    const to = toStr ? this.parseDate(toStr) : undefined;
    return this.prisma.academicCalendarDay.findMany({
      where:
        from || to
          ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : undefined,
      orderBy: { date: 'asc' },
    });
  }

  async findCalendarDay(id: string) {
    const day = await this.prisma.academicCalendarDay.findUnique({
      where: { id },
    });
    if (!day) throw new NotFoundException('Хуанлийн бичлэг олдсонгүй');
    return day;
  }

  async updateCalendarDay(id: string, dto: UpdateCalendarDayDto) {
    const existing = await this.prisma.academicCalendarDay.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Хуанлийн бичлэг олдсонгүй');
    const date = dto.date ? this.parseDate(dto.date) : undefined;
    if (date) {
      const clash = await this.prisma.academicCalendarDay.findUnique({
        where: { date },
      });
      if (clash && clash.id !== id) {
        throw new BadRequestException(
          'Энэ огноонд аль хэдийн өөр бичлэг үүссэн байна',
        );
      }
    }
    return this.prisma.academicCalendarDay.update({
      where: { id },
      data: {
        date,
        type: dto.type,
        title: dto.title,
        note: dto.note === undefined ? undefined : dto.note,
      },
    });
  }

  async removeCalendarDay(id: string) {
    const existing = await this.prisma.academicCalendarDay.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Хуанлийн бичлэг олдсонгүй');
    await this.prisma.academicCalendarDay.delete({ where: { id } });
    return { removed: true };
  }

  // ============ Audit ============
  // TODO(followUp): api/src/audit/audit.service.ts бэлэн болмогц энэ
  // helper-ийг хасаад тэрхүү нэгдсэн AuditService-ийг DI-аар ашиглах.
  private toAuditJson(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (v === null || v === undefined) return Prisma.JsonNull;
    return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
  }

  private async recordAudit(
    actorId: string,
    actorRole: Role,
    action: string,
    entity: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action,
        entity,
        entityId,
        before: this.toAuditJson(before),
        after: this.toAuditJson(after),
      },
    });
  }

  // ============ Bulk pattern create ============
  // 12-р ангийн адил "1,3,5,6" гэх мэт хэд хэдэн долоо хоногийн өдөрт
  // ЗЭРЭГ ижил цагтай хуваарь үүсгэнэ. Нэг ч мөр давхцвал БҮХ багц цуцлагдана.
  async bulkCreate(dto: BulkCreateScheduleDto) {
    if (dto.startMinute >= dto.endMinute) {
      throw new BadRequestException(
        'Дуусах цаг эхлэх цагаас хойш байх ёстой',
      );
    }
    const uniqueWeekdays = [...new Set(dto.weekdays)];
    await this.assertClassroomExists(dto.classroomId);
    if (dto.teacherId) {
      const teacher = await this.prisma.user.findUnique({
        where: { id: dto.teacherId },
      });
      if (!teacher) throw new NotFoundException('Багш олдсонгүй');
    }
    const effectiveFrom = this.parseDate(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? this.parseDate(dto.effectiveTo) : null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException(
        'Дуусах огноо эхлэх огнооноос хойш байх ёстой',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const created: Prisma.ClassScheduleGetPayload<Record<string, never>>[] = [];
      for (const weekday of uniqueWeekdays) {
        // assertNoOverlap нь this.prisma ашигладаг тул txn доторх бусад
        // мөрүүдтэй давхцлыг харахгүй — тул mini-check-ийг мөн tx-ээр давхар
        // хийнэ.
        const siblings = await tx.classSchedule.findMany({
          where: { classroomId: dto.classroomId, weekday },
        });
        const FAR_FUTURE = new Date('9999-12-31');
        const newEnd = effectiveTo ?? FAR_FUTURE;
        const conflict = siblings.find((s) => {
          const timeOverlaps =
            dto.startMinute < s.endMinute && s.startMinute < dto.endMinute;
          if (!timeOverlaps) return false;
          const existingEnd = s.effectiveTo ?? FAR_FUTURE;
          return effectiveFrom <= existingEnd && s.effectiveFrom <= newEnd;
        });
        if (conflict) {
          const toTime = (m: number) =>
            `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
          throw new BadRequestException(
            `${weekday}-р гарагт ${toTime(dto.startMinute)}–${toTime(dto.endMinute)} хугацаанд өөр хуваарь давхцаж байна — бүх багц цуцлагдлаа`,
          );
        }
        const row = await tx.classSchedule.create({
          data: {
            classroomId: dto.classroomId,
            weekday,
            startMinute: dto.startMinute,
            endMinute: dto.endMinute,
            teacherId: dto.teacherId,
            room: dto.room,
            subject: dto.subject,
            effectiveFrom,
            effectiveTo,
          },
        });
        created.push(row);
      }
      return created;
    });
  }

  // ============ Долоо хоногийн бодит харагдац ============

  async getWeek(startStr: string) {
    if (!startStr) {
      throw new BadRequestException('"start" огноо заавал шаардлагатай');
    }
    const start = this.parseDate(startStr);
    const startKey = dateKey(start);
    const end = addDateDays(start, 6);

    const [schedules, exceptions, holidays, workDays, workExceptions, teachers] =
      await Promise.all([
        this.prisma.classSchedule.findMany({
          where: {
            effectiveFrom: { lte: end },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
          },
          include: { classroom: CLASSROOM_SELECT, teacher: TEACHER_SELECT },
        }),
        this.prisma.scheduleException.findMany({
          // MOVED тохиолдол цонхны гадна эх огнооноос энэ 7 хоног руу орж
          // ирж болох тул date талбараар шүүхгүй — холбогдох schedule бүрийн
          // бүх exception-ийг л дараа нь week-resolver-т шүүлгэнэ.
          where: {},
        }),
        this.prisma.academicCalendarDay.findMany({
          where: { date: { gte: start, lte: end } },
        }),
        this.prisma.teacherWorkDay.findMany(),
        this.prisma.teacherWorkException.findMany({
          where: { date: { gte: start, lte: end } },
        }),
        this.prisma.user.findMany({
          where: { role: { in: [Role.TEACHER, Role.TEACHER_PLUS] } },
          select: { id: true, firstName: true, lastName: true },
        }),
      ]);

    const scheduleIds = new Set(schedules.map((s) => s.id));
    const relevantExceptions = exceptions.filter((e) => scheduleIds.has(e.scheduleId));

    const topics = await this.prisma.lessonTopic.findMany({
      where: { scheduleId: { in: [...scheduleIds] } },
    });

    const resolverSchedules: ResolverSchedule[] = schedules.map((s) => ({
      id: s.id,
      classroomId: s.classroomId,
      classroomName: s.classroom.name,
      weekday: s.weekday,
      startMinute: s.startMinute,
      endMinute: s.endMinute,
      teacherId: s.teacher?.id ?? null,
      teacherName: s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}` : null,
      room: s.room,
      subject: s.subject,
      effectiveFrom: dateKey(s.effectiveFrom),
      effectiveTo: s.effectiveTo ? dateKey(s.effectiveTo) : null,
    }));
    const resolverExceptions: ResolverException[] = relevantExceptions.map((e) => ({
      scheduleId: e.scheduleId,
      date: dateKey(e.date),
      kind: e.kind,
      newDate: e.newDate ? dateKey(e.newDate) : null,
      newStartMinute: e.newStartMinute,
      newEndMinute: e.newEndMinute,
      newRoom: e.newRoom,
      note: e.note,
    }));
    const resolverTopics: ResolverTopic[] = topics.map((t) => ({
      scheduleId: t.scheduleId,
      date: dateKey(t.date),
      title: t.title,
    }));

    const days = resolveWeek({
      weekStart: startKey,
      schedules: resolverSchedules,
      exceptions: resolverExceptions,
      topics: resolverTopics,
      holidays: holidays.map((h) => ({
        date: dateKey(h.date),
        type: h.type,
        title: h.title,
      })),
    });

    const rosters = resolveTeacherRoster({
      weekStart: startKey,
      teachers: teachers.map((t) => ({
        id: t.id,
        name: `${t.firstName} ${t.lastName}`,
      })),
      workDays: workDays.map((w) => ({ teacherId: w.teacherId, weekday: w.weekday })),
      exceptions: workExceptions.map((e) => ({
        teacherId: e.teacherId,
        date: dateKey(e.date),
        working: e.working,
      })),
    });

    return {
      start: startKey,
      days,
      teacherRoster: rosters,
    };
  }

  // ============ Тохиолдлын онцгой тохиргоо (ScheduleException) ============

  private async assertScheduleExists(scheduleId: string) {
    const schedule = await this.prisma.classSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) throw new NotFoundException('Хуваарь олдсонгүй');
    return schedule;
  }

  async upsertException(
    scheduleId: string,
    dto: UpsertExceptionDto,
    actorId: string,
    actorRole: Role,
  ) {
    const schedule = await this.assertScheduleExists(scheduleId);
    const date = this.parseDate(dto.date);
    if (schedule.weekday !== date.getUTCDay()) {
      throw new BadRequestException(
        'Заасан огноо энэ хуваарийн долоо хоногийн өдөртэй таарахгүй байна',
      );
    }
    if (dto.kind === ScheduleExceptionKind.MOVED) {
      if (!dto.newDate && dto.newStartMinute === undefined && dto.newEndMinute === undefined) {
        throw new BadRequestException(
          'MOVED төрлийн өөрчлөлтөд шинэ огноо эсвэл шинэ цаг заавал хэрэгтэй',
        );
      }
      if (
        dto.newStartMinute !== undefined &&
        dto.newEndMinute !== undefined &&
        dto.newStartMinute >= dto.newEndMinute
      ) {
        throw new BadRequestException(
          'Шинэ дуусах цаг шинэ эхлэх цагаас хойш байх ёстой',
        );
      }
    }

    const newDate = dto.newDate ? this.parseDate(dto.newDate) : null;
    const existing = await this.prisma.scheduleException.findUnique({
      where: { scheduleId_date: { scheduleId, date } },
    });

    const data = {
      scheduleId,
      date,
      kind: dto.kind,
      newDate: dto.kind === ScheduleExceptionKind.MOVED ? newDate : null,
      newStartMinute:
        dto.kind === ScheduleExceptionKind.MOVED ? dto.newStartMinute ?? null : null,
      newEndMinute:
        dto.kind === ScheduleExceptionKind.MOVED ? dto.newEndMinute ?? null : null,
      newRoom: dto.kind === ScheduleExceptionKind.MOVED ? dto.newRoom ?? null : null,
      note: dto.note ?? null,
    };

    const result = existing
      ? await this.prisma.scheduleException.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.scheduleException.create({ data });

    await this.recordAudit(
      actorId,
      actorRole,
      existing ? 'UPDATE' : 'CREATE',
      'ScheduleException',
      result.id,
      existing ?? null,
      result,
    );
    return result;
  }

  async removeException(
    scheduleId: string,
    exceptionId: string,
    actorId: string,
    actorRole: Role,
  ) {
    const existing = await this.prisma.scheduleException.findUnique({
      where: { id: exceptionId },
    });
    if (!existing || existing.scheduleId !== scheduleId) {
      throw new NotFoundException('Өөрчлөлт олдсонгүй');
    }
    await this.prisma.scheduleException.delete({ where: { id: exceptionId } });
    await this.recordAudit(
      actorId,
      actorRole,
      'DELETE',
      'ScheduleException',
      exceptionId,
      existing,
      null,
    );
    return { removed: true };
  }

  // ============ Хичээлийн сэдэв (LessonTopic) ============

  private async assertTeacherOwnsSchedule(
    schedule: { teacherId: string | null; classroomId: string },
    userId: string,
    role: Role,
  ) {
    if (role !== Role.TEACHER) return;
    let ownsDirectly = schedule.teacherId === userId;
    if (!schedule.teacherId) {
      const classroom = await this.prisma.classroom.findUnique({
        where: { id: schedule.classroomId },
      });
      ownsDirectly = classroom?.teacherId === userId;
    }
    if (!ownsDirectly) {
      throw new ForbiddenException(
        'Зөвхөн энэ хуваарийн багш сэдэв тохируулах эрхтэй',
      );
    }
  }

  async upsertTopic(
    scheduleId: string,
    dto: UpsertTopicDto,
    actorId: string,
    actorRole: Role,
  ) {
    const schedule = await this.assertScheduleExists(scheduleId);
    await this.assertTeacherOwnsSchedule(schedule, actorId, actorRole);
    const date = this.parseDate(dto.date);

    const existing = await this.prisma.lessonTopic.findUnique({
      where: { scheduleId_date: { scheduleId, date } },
    });
    const result = existing
      ? await this.prisma.lessonTopic.update({
          where: { id: existing.id },
          data: { title: dto.title, chapterId: dto.chapterId ?? null },
        })
      : await this.prisma.lessonTopic.create({
          data: {
            scheduleId,
            date,
            title: dto.title,
            chapterId: dto.chapterId,
            createdById: actorId,
          },
        });

    await this.recordAudit(
      actorId,
      actorRole,
      existing ? 'UPDATE' : 'CREATE',
      'LessonTopic',
      result.id,
      existing ?? null,
      result,
    );
    return result;
  }

  async clearTopic(
    scheduleId: string,
    dto: ClearTopicDto,
    actorId: string,
    actorRole: Role,
  ) {
    const schedule = await this.assertScheduleExists(scheduleId);
    await this.assertTeacherOwnsSchedule(schedule, actorId, actorRole);
    const date = this.parseDate(dto.date);
    const existing = await this.prisma.lessonTopic.findUnique({
      where: { scheduleId_date: { scheduleId, date } },
    });
    if (!existing) return { removed: false };
    await this.prisma.lessonTopic.delete({ where: { id: existing.id } });
    await this.recordAudit(
      actorId,
      actorRole,
      'DELETE',
      'LessonTopic',
      existing.id,
      existing,
      null,
    );
    return { removed: true };
  }

  // ============ Багшийн ажлын өдрийн бүртгэл (TeacherWorkDay) ============

  // Хуваарийн маягтуудад хэрэглэх багшийн ХАМГИЙН БАГА жагсаалт — зөвхөн
  // id ба нэр. Утас/эрх зэрэг хувийн талбар огт буцаахгүй.
  listTeacherOptions() {
    return this.prisma.user.findMany({
      where: { role: { in: [Role.TEACHER, Role.TEACHER_PLUS] } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async listTeacherWorkDays(fromStr?: string, toStr?: string) {
    const from = fromStr ? this.parseDate(fromStr) : undefined;
    const to = toStr ? this.parseDate(toStr) : undefined;
    const [workDays, exceptions] = await Promise.all([
      this.prisma.teacherWorkDay.findMany({
        include: { teacher: TEACHER_SELECT },
        orderBy: [{ teacherId: 'asc' }, { weekday: 'asc' }],
      }),
      this.prisma.teacherWorkException.findMany({
        where:
          from || to
            ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
            : undefined,
        include: { teacher: TEACHER_SELECT },
        orderBy: { date: 'asc' },
      }),
    ]);
    return { workDays, exceptions };
  }

  async putTeacherWorkDays(
    dto: PutTeacherWorkDaysDto,
    actorId: string,
    actorRole: Role,
  ) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
    });
    if (!teacher) throw new NotFoundException('Багш олдсонгүй');
    const uniqueWeekdays = [...new Set(dto.weekdays)];

    const before = await this.prisma.teacherWorkDay.findMany({
      where: { teacherId: dto.teacherId },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.teacherWorkDay.deleteMany({ where: { teacherId: dto.teacherId } });
      if (uniqueWeekdays.length === 0) return [];
      await tx.teacherWorkDay.createMany({
        data: uniqueWeekdays.map((weekday) => ({ teacherId: dto.teacherId, weekday })),
      });
      return tx.teacherWorkDay.findMany({ where: { teacherId: dto.teacherId } });
    });

    await this.recordAudit(
      actorId,
      actorRole,
      'UPDATE',
      'TeacherWorkDay',
      dto.teacherId,
      before,
      result,
    );
    return result;
  }

  async upsertTeacherWorkException(
    dto: TeacherWorkDayExceptionDto,
    actorId: string,
    actorRole: Role,
  ) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
    });
    if (!teacher) throw new NotFoundException('Багш олдсонгүй');
    const date = this.parseDate(dto.date);

    const existing = await this.prisma.teacherWorkException.findUnique({
      where: { teacherId_date: { teacherId: dto.teacherId, date } },
    });
    const result = existing
      ? await this.prisma.teacherWorkException.update({
          where: { id: existing.id },
          data: { working: dto.working, note: dto.note ?? null },
        })
      : await this.prisma.teacherWorkException.create({
          data: {
            teacherId: dto.teacherId,
            date,
            working: dto.working,
            note: dto.note,
          },
        });

    await this.recordAudit(
      actorId,
      actorRole,
      existing ? 'UPDATE' : 'CREATE',
      'TeacherWorkException',
      result.id,
      existing ?? null,
      result,
    );
    return result;
  }
}
