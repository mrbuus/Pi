import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { addDateDays, dateKey, parseDateOnly, todayUB } from '../common/date';
import {
  NotificationKind,
  Role,
  ScheduleExceptionKind,
} from '../generated/prisma/enums';
import { classTeacherWhere } from '../common/class-teachers';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationCenterService } from '../notification-center/notification-center.service';
import { buildPublishBodies, publishTitle } from './publish-day';
import { BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';
import { ClearTopicDto } from './dto/clear-topic.dto';
import { CreateCalendarDayDto } from './dto/create-calendar-day.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { PutTeacherWorkDaysDto } from './dto/put-teacher-workdays.dto';
import { TeacherWorkDayExceptionDto } from './dto/teacher-workday-exception.dto';
import { PutRosterConfigDto } from './dto/put-roster-config.dto';
import { UpdateCalendarDayDto } from './dto/update-calendar-day.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SplitSeriesDto } from './dto/split-series.dto';
import { UpsertExceptionDto } from './dto/upsert-exception.dto';
import { UpsertTopicDto } from './dto/upsert-topic.dto';
import { SplitOutOfRangeError, SplitPlan, planSplit } from './split-series';
import {
  resolveTeacherRoster,
  PARITY_ANCHOR_MONDAY,
  DEFAULT_ROSTER_CONFIG,
  type ResolverRosterConfig,
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

// _count: хуваарийн зурагт хуудсанд «танхимд хэдэн хүүхэд орох» (эзэн 2026-10-08)
const CLASSROOM_SELECT = {
  select: {
    id: true,
    name: true,
    _count: { select: { enrollments: { where: { leftAt: null } } } },
  },
} as const;
const TEACHER_SELECT = {
  select: { id: true, firstName: true, lastName: true },
} as const;

@Injectable()
export class ScheduleService {
  constructor(
    private prisma: PrismaService,
    private readonly notifications: NotificationCenterService,
  ) {}

  /** Keep schedule notices scoped to active class rosters and never let an inbox
   * outage turn a successful timetable edit into a failed request. */
  private async notifyScheduleChange(
    classroomIds: string[],
    teacherIds: Array<string | null | undefined> = [],
  ) {
    const ids = [...new Set(classroomIds.filter(Boolean))];
    if (ids.length === 0) return;
    try {
      const [enrollments, classrooms] = await Promise.all([
        this.prisma.enrollment.findMany({
          where: { classroomId: { in: ids }, leftAt: null },
          select: { studentId: true },
        }),
        this.prisma.classroom.findMany({
          where: { id: { in: ids }, archived: false },
          select: { teacherId: true, assistantTeacherId: true },
        }),
      ]);
      await this.notifications.notify(
        [
          ...new Set(
            [
              ...enrollments.map((enrollment) => enrollment.studentId),
              ...classrooms.flatMap((classroom) => [
                classroom.teacherId,
                classroom.assistantTeacherId,
              ]),
              ...teacherIds,
            ].filter((userId): userId is string => Boolean(userId)),
          ),
        ],
        {
          kind: NotificationKind.SCHEDULE_CHANGE,
          title: 'Хуваарь өөрчлөгдлөө',
          body: 'Таны суралцаж буй эсвэл заадаг ангийн хуваарьт өөрчлөлт орлоо. Шинэчилсэн хуваарийг шалгана уу.',
          link: '/app/schedule',
        },
      );
    } catch {
      // The schedule write has already succeeded. Notification failures are
      // deliberately best-effort and must not be reported as a failed edit.
    }
  }

  private sameDate(a: Date | null | undefined, b: Date | null | undefined) {
    return a?.getTime() === b?.getTime();
  }

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
      throw new BadRequestException('Огнооны формат буруу байна (YYYY-MM-DD)');
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
      throw new BadRequestException('Дуусах цаг эхлэх цагаас хойш байх ёстой');
    }
    await this.assertClassroomExists(dto.classroomId);
    if (dto.teacherId) {
      const teacher = await this.prisma.user.findUnique({
        where: { id: dto.teacherId },
      });
      if (!teacher) throw new NotFoundException('Багш олдсонгүй');
    }
    const effectiveFrom = this.parseDate(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo
      ? this.parseDate(dto.effectiveTo)
      : null;
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

  findAll(classroomId?: string, readableClassroomIds?: string[]) {
    return this.prisma.classSchedule.findMany({
      where: {
        ...(classroomId ? { classroomId } : {}),
        ...(readableClassroomIds
          ? { AND: [{ classroomId: { in: readableClassroomIds } }] }
          : {}),
      },
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
      throw new BadRequestException('Дуусах цаг эхлэх цагаас хойш байх ёстой');
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

    const teacherId =
      dto.teacherId === undefined ? existing.teacherId : dto.teacherId;
    const room = dto.room === undefined ? existing.room : dto.room;
    const subject = dto.subject === undefined ? existing.subject : dto.subject;
    const changed =
      classroomId !== existing.classroomId ||
      weekday !== existing.weekday ||
      startMinute !== existing.startMinute ||
      endMinute !== existing.endMinute ||
      teacherId !== existing.teacherId ||
      room !== existing.room ||
      subject !== existing.subject ||
      !this.sameDate(effectiveFrom, existing.effectiveFrom) ||
      !this.sameDate(effectiveTo, existing.effectiveTo);

    const updated = await this.prisma.classSchedule.update({
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
    if (changed) {
      await this.notifyScheduleChange(
        [existing.classroomId, updated.classroomId],
        [existing.teacherId, updated.teacherId],
      );
    }
    return updated;
  }

  /**
   * "Энэ ба цаашдын бүх хичээл"-ийг өөрчлөх.
   *
   * ЯАГААД PATCH-ААР ХИЙЖ БОЛОХГҮЙ ВЭ: `update()` нь мөрийг бүхэлд нь солих
   * тул өөрчлөлт өнгөрсөн рүү ч үйлчилнэ. Тэгвэл 3 сарын өмнөх ирцийн бүртгэл
   * гэнэт "өөр цагт болсон" мэт харагдана. Энд цувралыг хоёр хувааж, өнгөрсөн
   * түүхийг хэвээр үлдээнэ (Google Calendar-ийн "this and following" конвенц).
   */
  async splitSeries(id: string, dto: SplitSeriesDto) {
    const existing = await this.prisma.classSchedule.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Хуваарь олдсонгүй');

    const weekday = dto.weekday ?? existing.weekday;
    const startMinute = dto.startMinute ?? existing.startMinute;
    const endMinute = dto.endMinute ?? existing.endMinute;
    if (startMinute >= endMinute) {
      throw new BadRequestException('Дуусах цаг эхлэх цагаас хойш байх ёстой');
    }
    if (dto.teacherId) {
      const teacher = await this.prisma.user.findUnique({
        where: { id: dto.teacherId },
      });
      if (!teacher) throw new NotFoundException('Багш олдсонгүй');
    }

    const from = this.parseDate(dto.from);
    let plan: SplitPlan;
    try {
      plan = planSplit(existing, from);
    } catch (err) {
      if (err instanceof SplitOutOfRangeError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // Огноо нь цувралын эхлэл дээр буюу түүнээс өмнө — хуваах утгагүй,
    // энгийн бүтэн шинэчлэлт болно.
    if (plan.kind === 'REPLACE_ALL') {
      const updated = await this.update(id, {
        weekday: dto.weekday,
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        teacherId: dto.teacherId ?? undefined,
        room: dto.room ?? undefined,
        subject: dto.subject ?? undefined,
      });
      return { mode: 'REPLACED_ALL' as const, schedule: updated };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Давхцлын шалгалтыг ГАР АЖИЛЛАГААГААР энд хийнэ: assertNoOverlap нь
      // this.prisma ашигладаг тул энэ транзакц дотор хаагдаж буй хуучин мөрийг
      // хуучин хэвээр нь харах бөгөөд өөртэйгөө "давхцаж байна" гэж худал
      // алдаа өгнө.
      const siblings = await tx.classSchedule.findMany({
        where: {
          classroomId: existing.classroomId,
          weekday,
          id: { not: id },
        },
      });
      const newEnd = plan.newEffectiveTo ?? FAR_FUTURE;
      const conflict = siblings.find((s) => {
        const timeOverlaps =
          startMinute < s.endMinute && s.startMinute < endMinute;
        if (!timeOverlaps) return false;
        const existingEnd = s.effectiveTo ?? FAR_FUTURE;
        return (
          plan.newEffectiveFrom <= existingEnd && s.effectiveFrom <= newEnd
        );
      });
      if (conflict) {
        const toTime = (m: number) =>
          `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        throw new BadRequestException(
          `Энэ ангид ${toTime(conflict.startMinute)}–${toTime(conflict.endMinute)} хугацаанд өөр хуваарь давхцаж байна`,
        );
      }

      // 1. Хуучин мөрийг заасан огнооны өмнөх өдөр дуусгана.
      await tx.classSchedule.update({
        where: { id },
        data: { effectiveTo: plan.oldEffectiveTo },
      });

      // 2. Шинэ утгатай мөрийг заасан огнооноос эхлүүлнэ.
      const created = await tx.classSchedule.create({
        data: {
          classroomId: existing.classroomId,
          weekday,
          startMinute,
          endMinute,
          teacherId:
            dto.teacherId === undefined ? existing.teacherId : dto.teacherId,
          room: dto.room === undefined ? existing.room : dto.room,
          subject: dto.subject === undefined ? existing.subject : dto.subject,
          effectiveFrom: plan.newEffectiveFrom,
          effectiveTo: plan.newEffectiveTo,
        },
        include: { classroom: CLASSROOM_SELECT, teacher: TEACHER_SELECT },
      });

      // 3. Заасан огнооноос ХОЙШХИ сэдэв, онцгой тохиолдлуудыг шинэ мөр рүү
      //    зөөнө. Эс бөгөөс тэдгээр нь хуучин мөрөнд наалдсан хэвээр үлдэж,
      //    тэр мөр тэр огноог хамрахаа больсон тул хаана ч харагдахгүй болно.
      const moved = await tx.lessonTopic.updateMany({
        where: { scheduleId: id, date: { gte: plan.newEffectiveFrom } },
        data: { scheduleId: created.id },
      });
      const movedExceptions = await tx.scheduleException.updateMany({
        where: { scheduleId: id, date: { gte: plan.newEffectiveFrom } },
        data: { scheduleId: created.id },
      });

      return {
        mode: 'SPLIT' as const,
        schedule: created,
        previousEndsOn: dateKey(plan.oldEffectiveTo),
        movedTopics: moved.count,
        movedExceptions: movedExceptions.count,
      };
    });
    await this.notifyScheduleChange(
      [existing.classroomId],
      [existing.teacherId, result.schedule.teacherId],
    );
    return result;
  }

  async remove(id: string) {
    const existing = await this.prisma.classSchedule.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Хуваарь олдсонгүй');
    await this.prisma.classSchedule.delete({ where: { id } });
    await this.notifyScheduleChange(
      [existing.classroomId],
      [existing.teacherId],
    );
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
                { teacherId: null, classroom: classTeacherWhere(userId) },
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
    readableClassroomIds?: string[],
  ) {
    if (!fromStr || !toStr) {
      throw new BadRequestException(
        '"from" болон "to" огноо заавал шаардлагатай',
      );
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
            ...(readableClassroomIds
              ? [{ classroomId: { in: readableClassroomIds } }]
              : []),
            { OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] },
            ...(teacherId
              ? [
                  {
                    OR: [
                      { teacherId },
                      { teacherId: null, classroom: classTeacherWhere(teacherId) },
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
        include: { classrooms: { select: { classroomId: true } } },
      }),
    ]);
    // Бүх ангид хамаарах өдөр ба зөвхөн зарим ангид хамаарах өдрийг тусгаарлана
    const holidayByKey = new Map<string, (typeof calendarDays)[number]>();
    const scopedByKey = new Map<
      string,
      Map<string, (typeof calendarDays)[number]>
    >();
    for (const c of calendarDays) {
      const key = c.date.toISOString().slice(0, 10);
      if (c.classrooms.length === 0) {
        if (!holidayByKey.has(key)) holidayByKey.set(key, c);
        continue;
      }
      const perClass = scopedByKey.get(key) ?? new Map();
      for (const link of c.classrooms)
        if (!perClass.has(link.classroomId)) perClass.set(link.classroomId, c);
      scopedByKey.set(key, perClass);
    }

    const days: {
      date: string;
      weekday: number;
      holiday: { type: string; title: string; note: string | null } | null;
      /** Зөвхөн зарим ангид хамаарсан онцгой өдрөөр хасагдсан ангиуд */
      restingClasses: {
        classroomId: string;
        classroomName: string;
        type: string;
        title: string;
      }[];
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
      let holiday = holidayByKey.get(key) ?? null;
      const scoped = scopedByKey.get(key);
      const restingClasses: {
        classroomId: string;
        classroomName: string;
        type: string;
        title: string;
      }[] = [];
      const classes = holiday
        ? []
        : schedules
            .filter(
              (s) =>
                s.weekday === weekday &&
                s.effectiveFrom <= cursor &&
                (!s.effectiveTo || s.effectiveTo >= cursor),
            )
            .filter((s) => {
              const h = scoped?.get(s.classroomId);
              if (!h) return true;
              if (!restingClasses.some((r) => r.classroomId === s.classroomId))
                restingClasses.push({
                  classroomId: s.classroomId,
                  classroomName: s.classroom.name,
                  type: h.type,
                  title: h.title,
                });
              return false;
            })
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
      // Нэг ангийн сурагч/эцэг эхэд өдрийн бүх хичээл нь онцгой өдрөөр
      // хасагдсан бол «амралт» гэж харуулна (хоосон өдөр биш).
      if (!holiday && classes.length === 0 && restingClasses.length > 0) {
        const h = scoped!.get(restingClasses[0].classroomId)!;
        holiday = h;
      }
      days.push({
        date: key,
        weekday,
        holiday: holiday
          ? { type: holiday.type, title: holiday.title, note: holiday.note }
          : null,
        restingClasses,
        classes,
      });
    }
    return days;
  }

  // ============ Сургалтын хуанли (AcademicCalendarDay) ============

  private static readonly CALENDAR_INCLUDE = {
    classrooms: {
      select: { classroom: { select: { id: true, name: true } } },
    },
  } as const;

  /** Хариуд классын жагсаалтыг нэг хэлбэрт оруулна (classroomIds хоосон = бүх анги). */
  private shapeCalendarDay<
    T extends {
      classrooms: { classroom: { id: string; name: string } }[];
    },
  >(day: T) {
    const { classrooms, ...rest } = day;
    const list = classrooms
      .map((c) => c.classroom)
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      ...rest,
      classroomIds: list.map((c) => c.id),
      classrooms: list,
    };
  }

  private async assertClassroomsExist(ids: string[]) {
    if (ids.length === 0) return;
    const found = await this.prisma.classroom.count({
      where: { id: { in: ids } },
    });
    if (found !== ids.length) {
      throw new BadRequestException('Сонгосон анги олдсонгүй');
    }
  }

  /**
   * Нэг өдөрт хэд хэдэн онцгой өдөр байж болох ч ижил ангид хоёр удаа
   * хамаарах (эсвэл «бүх анги» + өөр бичлэг) давхцал БОЛОХГҮЙ.
   */
  private async assertNoCalendarOverlap(
    date: Date,
    classroomIds: string[],
    excludeId?: string,
  ) {
    const others = await this.prisma.academicCalendarDay.findMany({
      where: { date, ...(excludeId ? { id: { not: excludeId } } : {}) },
      include: { classrooms: { select: { classroomId: true } } },
    });
    for (const o of others) {
      const otherIds = o.classrooms.map((c) => c.classroomId);
      const clash =
        classroomIds.length === 0 ||
        otherIds.length === 0 ||
        otherIds.some((id) => classroomIds.includes(id));
      if (clash) {
        throw new BadRequestException(
          `Энэ огноонд аль хэдийн «${o.title}» бүртгэлтэй байна (нэг ангид давхар бүртгэх боломжгүй)`,
        );
      }
    }
  }

  async createCalendarDay(dto: CreateCalendarDayDto, createdById: string) {
    const date = this.parseDate(dto.date);
    const classroomIds = [...new Set(dto.classroomIds ?? [])];
    await this.assertClassroomsExist(classroomIds);
    await this.assertNoCalendarOverlap(date, classroomIds);
    const created = await this.prisma.academicCalendarDay.create({
      data: {
        date,
        type: dto.type,
        title: dto.title,
        note: dto.note,
        createdById,
        classrooms: {
          create: classroomIds.map((classroomId) => ({ classroomId })),
        },
      },
      include: ScheduleService.CALENDAR_INCLUDE,
    });
    return this.shapeCalendarDay(created);
  }

  async listCalendarDays(fromStr?: string, toStr?: string) {
    const from = fromStr ? this.parseDate(fromStr) : undefined;
    const to = toStr ? this.parseDate(toStr) : undefined;
    const rows = await this.prisma.academicCalendarDay.findMany({
      where:
        from || to
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : undefined,
      orderBy: { date: 'asc' },
      include: ScheduleService.CALENDAR_INCLUDE,
    });
    return rows.map((r) => this.shapeCalendarDay(r));
  }

  async findCalendarDay(id: string) {
    const day = await this.prisma.academicCalendarDay.findUnique({
      where: { id },
      include: ScheduleService.CALENDAR_INCLUDE,
    });
    if (!day) throw new NotFoundException('Хуанлийн бичлэг олдсонгүй');
    return this.shapeCalendarDay(day);
  }

  async updateCalendarDay(id: string, dto: UpdateCalendarDayDto) {
    const existing = await this.findCalendarDay(id);
    const date = dto.date ? this.parseDate(dto.date) : undefined;
    const nextClassroomIds =
      dto.classroomIds === undefined
        ? existing.classroomIds
        : [...new Set(dto.classroomIds)];
    if (dto.classroomIds !== undefined) {
      await this.assertClassroomsExist(nextClassroomIds);
    }
    if (date || dto.classroomIds !== undefined) {
      await this.assertNoCalendarOverlap(
        date ?? existing.date,
        nextClassroomIds,
        id,
      );
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.classroomIds !== undefined) {
        await tx.academicCalendarDayClassroom.deleteMany({
          where: { calendarDayId: id },
        });
        if (nextClassroomIds.length > 0) {
          await tx.academicCalendarDayClassroom.createMany({
            data: nextClassroomIds.map((classroomId) => ({
              calendarDayId: id,
              classroomId,
            })),
          });
        }
      }
      return tx.academicCalendarDay.update({
        where: { id },
        data: {
          date,
          type: dto.type,
          title: dto.title,
          note: dto.note === undefined ? undefined : dto.note,
        },
        include: ScheduleService.CALENDAR_INCLUDE,
      });
    });
    return this.shapeCalendarDay(updated);
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
  private toAuditJson(
    v: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
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
      throw new BadRequestException('Дуусах цаг эхлэх цагаас хойш байх ёстой');
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
    const effectiveTo = dto.effectiveTo
      ? this.parseDate(dto.effectiveTo)
      : null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException(
        'Дуусах огноо эхлэх огнооноос хойш байх ёстой',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const created: Prisma.ClassScheduleGetPayload<Record<string, never>>[] =
        [];
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

  async getWeek(startStr: string, readableClassroomIds?: string[]) {
    if (!startStr) {
      throw new BadRequestException('"start" огноо заавал шаардлагатай');
    }
    const start = this.parseDate(startStr);
    const startKey = dateKey(start);
    const end = addDateDays(start, 6);

    const [
      schedules,
      exceptions,
      holidays,
      workDays,
      workExceptions,
      teachers,
    ] = await Promise.all([
      this.prisma.classSchedule.findMany({
        where: {
          ...(readableClassroomIds
            ? { classroomId: { in: readableClassroomIds } }
            : {}),
          effectiveFrom: { lte: end },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
        },
        include: { classroom: CLASSROOM_SELECT, teacher: TEACHER_SELECT },
      }),
      this.prisma.scheduleException.findMany({
        // MOVED тохиолдол цонхны гадна эх огнооноос энэ 7 хоног руу орж
        // ирж болох тул date талбараар шүүхгүй — холбогдох schedule бүрийн
        // бүх exception-ийг л дараа нь week-resolver-т шүүлгэнэ.
        where: readableClassroomIds
          ? { schedule: { classroomId: { in: readableClassroomIds } } }
          : {},
      }),
      this.prisma.academicCalendarDay.findMany({
        where: { date: { gte: start, lte: end } },
        include: { classrooms: { select: { classroomId: true } } },
      }),
      readableClassroomIds
        ? Promise.resolve<
            {
              teacherId: string;
              weekday: number;
              parity: number;
              sortOrder: number;
            }[]
          >([])
        : this.prisma.teacherWorkDay.findMany(),
      readableClassroomIds
        ? Promise.resolve<
            { teacherId: string; date: Date; working: boolean }[]
          >([])
        : this.prisma.teacherWorkException.findMany({
            where: { date: { gte: start, lte: end } },
          }),
      readableClassroomIds
        ? Promise.resolve<
            { id: string; firstName: string; lastName: string; role: Role }[]
          >([])
        : this.prisma.user.findMany({
            // ADMIN ч хичээл ордог (ж: Өсөхбаяр) — ажлын өдөртэй бол л гарна.
            where: {
              role: { in: [Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN] },
              archivedAt: null,
            },
            select: { id: true, firstName: true, lastName: true, role: true },
          }),
    ]);

    const scheduleIds = new Set(schedules.map((s) => s.id));
    const relevantExceptions = exceptions.filter((e) =>
      scheduleIds.has(e.scheduleId),
    );

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
      teacherName: s.teacher
        ? `${s.teacher.firstName} ${s.teacher.lastName}`
        : null,
      room: s.room,
      subject: s.subject,
      effectiveFrom: dateKey(s.effectiveFrom),
      effectiveTo: s.effectiveTo ? dateKey(s.effectiveTo) : null,
    }));
    const resolverExceptions: ResolverException[] = relevantExceptions.map(
      (e) => ({
        scheduleId: e.scheduleId,
        date: dateKey(e.date),
        kind: e.kind,
        newDate: e.newDate ? dateKey(e.newDate) : null,
        newStartMinute: e.newStartMinute,
        newEndMinute: e.newEndMinute,
        newRoom: e.newRoom,
        note: e.note,
      }),
    );
    const resolverTopics: ResolverTopic[] = topics.map((t) => ({
      scheduleId: t.scheduleId,
      date: dateKey(t.date),
      title: t.title,
    }));

    // Өдрийн ахлах/туслах багш — нэрийг нэг дуудлагаар нийлүүлнэ
    const staffRows = await this.prisma.lessonStaffing.findMany({
      where: { scheduleId: { in: [...scheduleIds] } },
    });
    const staffIds = [
      ...new Set(
        staffRows.flatMap((r) =>
          [r.leadTeacherId, r.assistantTeacherId].filter(
            (v): v is string => !!v,
          ),
        ),
      ),
    ];
    const staffUsers = staffIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const staffName = staffUsers.length
      ? teacherDisplayNames(
          staffUsers,
          await this.prisma.user.findMany({
            where: { role: { in: [Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN] } },
            select: { firstName: true },
          }),
        )
      : new Map<string, string>();
    const person = (id: string | null) =>
      id ? { id, name: staffName.get(id) ?? '—' } : null;

    const days = resolveWeek({
      weekStart: startKey,
      schedules: resolverSchedules,
      exceptions: resolverExceptions,
      topics: resolverTopics,
      staffing: staffRows.map((r) => ({
        scheduleId: r.scheduleId,
        date: dateKey(r.date),
        lead: person(r.leadTeacherId),
        assistant: person(r.assistantTeacherId),
      })),
      holidays: holidays.map((h) => ({
        date: dateKey(h.date),
        type: h.type,
        title: h.title,
        classroomIds: h.classrooms.map((c) => c.classroomId),
      })),
    });

    // Сонгох жагсаалттай (/schedule/teachers) ижил нэр — «Б. Марал-Эрдэнэ»
    const rosterNames = teacherDisplayNames(teachers);
    const rosterConfig = readableClassroomIds
      ? DEFAULT_ROSTER_CONFIG
      : await this.getRosterConfig();
    const rosters = resolveTeacherRoster({
      weekStart: startKey,
      config: rosterConfig,
      teachers: teachers.map((t) => ({
        id: t.id,
        name: rosterNames.get(t.id) ?? t.firstName,
        role: t.role,
      })),
      workDays: workDays.map((w) => ({
        teacherId: w.teacherId,
        weekday: w.weekday,
        parity: w.parity,
        sortOrder: w.sortOrder,
      })),
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
      if (
        !dto.newDate &&
        dto.newStartMinute === undefined &&
        dto.newEndMinute === undefined
      ) {
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
        dto.kind === ScheduleExceptionKind.MOVED
          ? (dto.newStartMinute ?? null)
          : null,
      newEndMinute:
        dto.kind === ScheduleExceptionKind.MOVED
          ? (dto.newEndMinute ?? null)
          : null,
      newRoom:
        dto.kind === ScheduleExceptionKind.MOVED ? (dto.newRoom ?? null) : null,
      note: dto.note ?? null,
    };

    const result = existing
      ? await this.prisma.scheduleException.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.scheduleException.create({ data });

    const occurrenceChanged =
      !existing ||
      existing.kind !== result.kind ||
      !this.sameDate(existing.newDate, result.newDate) ||
      existing.newStartMinute !== result.newStartMinute ||
      existing.newEndMinute !== result.newEndMinute ||
      existing.newRoom !== result.newRoom;
    if (
      occurrenceChanged &&
      (result.kind === ScheduleExceptionKind.CANCELLED ||
        result.kind === ScheduleExceptionKind.MOVED)
    ) {
      await this.notifyScheduleChange(
        [schedule.classroomId],
        [schedule.teacherId],
      );
    }

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
      include: { schedule: { select: { classroomId: true, teacherId: true } } },
    });
    if (!existing || existing.scheduleId !== scheduleId) {
      throw new NotFoundException('Өөрчлөлт олдсонгүй');
    }
    await this.prisma.scheduleException.delete({ where: { id: exceptionId } });
    await this.notifyScheduleChange(
      [existing.schedule.classroomId],
      [existing.schedule.teacherId],
    );
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

  // Өдрийн хуваарийг нийтлэх (эзэн 2026-10-11): тэр өдөр хичээлтэй багш, сурагч
  // бүрт зөвхөн өөрийн хичээлийн мэдэгдэл. Дахин нийтлэвэл «өөрчлөгдлөө».
  async publishDay(dateStr: string, actorId: string, actorRole: Role) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr ?? ''))
      throw new BadRequestException('Огноо буруу байна');
    const date = this.parseDate(dateStr);
    const weekday = date.getUTCDay();
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
    const week = await this.getWeek(dateKey(monday));
    const day = week.days.find((d) => d.date === dateStr);
    if (!day || day.isHoliday || day.entries.length === 0)
      throw new BadRequestException('Энэ өдөр нийтлэх хичээл алга');

    const classroomIds = [...new Set(day.entries.map((e) => e.classroomId))];
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classroomId: { in: classroomIds },
        leftAt: null,
        student: { archivedAt: null },
      },
      select: { classroomId: true, studentId: true },
    });
    const studentsByClass = new Map<string, string[]>();
    for (const r of enrollments)
      studentsByClass.set(r.classroomId, [...(studentsByClass.get(r.classroomId) ?? []), r.studentId]);

    const bodies = buildPublishBodies(day.entries, studentsByClass);
    const previous = await this.prisma.schedulePublication.findUnique({ where: { date } });
    const title = publishTitle(dateStr, !!previous);
    // Ижил агуулгатайг нэг дор илгээнэ (нэг ангийн сурагчид ижил мессеж авна)
    const byBody = new Map<string, string[]>();
    for (const [userId, body] of bodies) byBody.set(body, [...(byBody.get(body) ?? []), userId]);
    for (const [body, userIds] of byBody)
      await this.notifications.notify(userIds, {
        kind: 'SCHEDULE_CHANGE',
        title,
        body,
        link: '/app/schedule',
      });

    const row = await this.prisma.schedulePublication.upsert({
      where: { date },
      update: { publishedAt: new Date(), publishedById: actorId, recipients: bodies.size },
      create: { date, publishedAt: new Date(), publishedById: actorId, recipients: bodies.size },
    });
    await this.recordAudit(actorId, actorRole, previous ? 'UPDATE' : 'CREATE', 'SchedulePublication', dateStr, null, {
      date: dateStr,
      recipients: bodies.size,
    });
    return { date: dateStr, publishedAt: row.publishedAt, recipients: row.recipients, again: !!previous };
  }

  async getPublication(dateStr: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr ?? ''))
      throw new BadRequestException('Огноо буруу байна');
    const row = await this.prisma.schedulePublication.findUnique({
      where: { date: this.parseDate(dateStr) },
    });
    if (!row) return { date: dateStr, publishedAt: null, recipients: 0, publishedBy: null };
    const by = await this.prisma.user.findUnique({
      where: { id: row.publishedById },
      select: { firstName: true },
    });
    return { date: dateStr, publishedAt: row.publishedAt, recipients: row.recipients, publishedBy: by?.firstName ?? null };
  }

  // Тухайн өдрийн ахлах/туслах багшийг оноох (эзэн 2026-10-08). Хоёулаа null
  // бол бичлэгийг устгана. Зөвхөн идэвхтэй ажилтныг (TEACHER/TEACHER_PLUS/ADMIN).
  async setStaffing(
    scheduleId: string,
    dto: { date: string; leadTeacherId?: string | null; assistantTeacherId?: string | null },
    actorId: string,
    actorRole: Role,
  ) {
    await this.assertScheduleExists(scheduleId);
    const date = this.parseDate(dto.date);
    const lead = dto.leadTeacherId || null;
    const assistant = dto.assistantTeacherId || null;
    if (lead && lead === assistant)
      throw new BadRequestException('Ахлах ба туслах багш нэг хүн байж болохгүй');
    const ids = [lead, assistant].filter((v): v is string => !!v);
    if (ids.length) {
      const ok = await this.prisma.user.count({
        where: {
          id: { in: ids },
          archivedAt: null,
          role: { in: [Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN] },
        },
      });
      if (ok !== ids.length)
        throw new BadRequestException('Сонгосон багш олдсонгүй эсвэл идэвхгүй');
    }
    const key = { scheduleId_date: { scheduleId, date } };
    if (!lead && !assistant) {
      await this.prisma.lessonStaffing.deleteMany({ where: { scheduleId, date } });
      await this.recordAudit(actorId, actorRole, 'DELETE', 'LessonStaffing', scheduleId, { date: dto.date }, null);
      return { scheduleId, date: dto.date, leadTeacherId: null, assistantTeacherId: null };
    }
    const row = await this.prisma.lessonStaffing.upsert({
      where: key,
      update: { leadTeacherId: lead, assistantTeacherId: assistant, updatedById: actorId },
      create: { scheduleId, date, leadTeacherId: lead, assistantTeacherId: assistant, updatedById: actorId },
    });
    await this.recordAudit(actorId, actorRole, 'UPDATE', 'LessonStaffing', row.id, null, {
      date: dto.date,
      leadTeacherId: lead,
      assistantTeacherId: assistant,
    });
    return row;
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
  // Хуваарьт оногддог багш (TeacherProfile.teachesLessons) — нэрийг төвийн
  // хүснэгтийн хэлбэрээр: зөвхөн нэр, ижил нэртэй бол «Б. Марал-Эрдэнэ».
  async listTeacherOptions() {
    const rows = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN] },
        archivedAt: null,
        teacherProfile: { teachesLessons: true },
      },
      // role — өдрийн хуваарьт Багш / Багш+ ялгах (утас зэрэг хувийн талбаргүй)
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    const names = teacherDisplayNames(rows);
    return rows.map((r) => ({ ...r, displayName: names.get(r.id)! }));
  }

  async listTeacherWorkDays(fromStr?: string, toStr?: string) {
    const from = fromStr ? this.parseDate(fromStr) : undefined;
    const to = toStr ? this.parseDate(toStr) : undefined;
    const [workDays, exceptions] = await Promise.all([
      this.prisma.teacherWorkDay.findMany({
        include: { teacher: TEACHER_SELECT },
        orderBy: [
          { sortOrder: 'asc' },
          { teacherId: 'asc' },
          { parity: 'asc' },
          { weekday: 'asc' },
        ],
      }),
      this.prisma.teacherWorkException.findMany({
        where:
          from || to
            ? {
                date: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : undefined,
        include: { teacher: TEACHER_SELECT },
        orderBy: { date: 'asc' },
      }),
    ]);
    return {
      workDays,
      exceptions,
      parityAnchor: PARITY_ANCHOR_MONDAY,
      config: await this.getRosterConfig(),
    };
  }

  // Хүснэгтийн горим/хугацаа — мөр байхгүй бол анхдагч (ээлжит, хязгааргүй).
  async getRosterConfig(): Promise<ResolverRosterConfig> {
    const row = await this.prisma.teacherRosterConfig.findUnique({
      where: { id: 'default' },
    });
    if (!row) return DEFAULT_ROSTER_CONFIG;
    return {
      mode: row.mode === 'FIXED' ? 'FIXED' : 'ALTERNATING',
      validFrom: row.validFrom ? dateKey(row.validFrom) : null,
      validTo: row.validTo ? dateKey(row.validTo) : null,
    };
  }

  async putRosterConfig(
    dto: PutRosterConfigDto,
    actorId: string,
    actorRole: Role,
  ) {
    const validFrom = dto.validFrom ? this.parseDate(dto.validFrom) : null;
    const validTo = dto.validTo ? this.parseDate(dto.validTo) : null;
    if (validFrom && validTo && validFrom > validTo)
      throw new BadRequestException('Эхлэх огноо дуусахаас хойш байна');
    const before = await this.getRosterConfig();
    const data = { mode: dto.mode, validFrom, validTo, updatedById: actorId };
    await this.prisma.teacherRosterConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
      update: data,
    });
    const after = await this.getRosterConfig();
    await this.recordAudit(
      actorId,
      actorRole,
      'UPDATE',
      'TeacherRosterConfig',
      'default',
      before,
      after,
    );
    return after;
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
    // Зөвхөн тухайн ээлжийн (7 хоног бүр / сондгой / тэгш) мөрүүдийг солино.
    const parity = dto.parity ?? 0;

    const before = await this.prisma.teacherWorkDay.findMany({
      where: { teacherId: dto.teacherId, parity },
    });
    // Хүснэгтийн мөрийн дараалал: багшийн өмнөх мөрөөс, эсвэл хамгийн сүүлд.
    const existingOrder = await this.prisma.teacherWorkDay.findFirst({
      where: { teacherId: dto.teacherId },
      orderBy: { sortOrder: 'asc' },
      select: { sortOrder: true },
    });
    const sortOrder =
      dto.sortOrder ??
      existingOrder?.sortOrder ??
      ((
        await this.prisma.teacherWorkDay.aggregate({
          _max: { sortOrder: true },
        })
      )._max.sortOrder ?? 0) + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.teacherWorkDay.deleteMany({
        where: { teacherId: dto.teacherId, parity },
      });
      if (uniqueWeekdays.length === 0) return [];
      await tx.teacherWorkDay.createMany({
        data: uniqueWeekdays.map((weekday) => ({
          teacherId: dto.teacherId,
          weekday,
          parity,
          sortOrder,
        })),
      });
      return tx.teacherWorkDay.findMany({
        where: { teacherId: dto.teacherId, parity },
      });
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

/**
 * Багшийн харагдах нэр — төвийн хүснэгтийн хэлбэр: зөвхөн нэр; ижил нэртэй
 * өөр ажилтан байвал овгийн үсгийг урд нь («Б. Марал-Эрдэнэ», «У. Эмүжин»).
 * `pool` — давхардлыг шалгах бүх ажилтан (өгөхгүй бол `users` өөрөө).
 */
export function teacherDisplayNames(
  users: { id: string; firstName: string; lastName: string }[],
  pool: { firstName: string }[] = users,
): Map<string, string> {
  const count = new Map<string, number>();
  for (const p of pool) count.set(p.firstName.trim(), (count.get(p.firstName.trim()) ?? 0) + 1);
  return new Map(
    users.map((u) => {
      const first = u.firstName.trim();
      const initial = u.lastName.trim().charAt(0);
      return [u.id, (count.get(first) ?? 0) > 1 && initial ? `${initial}. ${first}` : first];
    }),
  );
}
