import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { addDateDays, dateKey, parseDateOnly, todayUB } from '../common/date';
import { Role } from '../generated/prisma/enums';
import { classTeacherWhere, isClassTeacher } from '../common/class-teachers';
import { PrismaService } from '../prisma/prisma.service';
import {
  ResolvedDay,
  ResolverException,
  ResolverHoliday,
  ResolverSchedule,
  ResolverTopic,
  resolveWeek,
} from './week-resolver';
import { buildIcs, CalendarEvent } from './ics-format';

const MAX_RANGE_DAYS = 84;
const DAY_MS = 86_400_000;
const CALENDAR_ROLES: Role[] = [Role.STUDENT, Role.TEACHER, Role.TEACHER_PLUS];
const SUBJECT_LABEL: Record<string, string> = {
  MATH: 'Математик',
  SOCIAL_STUDIES: 'Нийгмийн ухаан',
};

function parseDateKey(value: string, label: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(
      `${label} огноог YYYY-MM-DD хэлбэрээр оруулна уу.`,
    );
  }
  try {
    return parseDateOnly(value);
  } catch {
    throw new BadRequestException(`${label} огноо буруу байна.`);
  }
}

/** G25 adds archivedAt to User. Keep this branch buildable against the current
 * schema while automatically revoking calendar links after that migration. */
function isArchivedUser(user: object): boolean {
  const archivedAt = (user as { archivedAt?: unknown }).archivedAt;
  return archivedAt !== undefined && archivedAt !== null;
}

function feedRange(fromValue?: string, toValue?: string) {
  const from = fromValue ? parseDateKey(fromValue, 'Эхлэх') : todayUB();
  const to = toValue
    ? parseDateKey(toValue, 'Дуусах')
    : addDateDays(from, MAX_RANGE_DAYS - 1);
  const spanDays = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
  if (spanDays < 1)
    throw new BadRequestException('Эхлэх огноо дуусах огнооноос хойш байна.');
  if (spanDays > MAX_RANGE_DAYS) {
    throw new BadRequestException(
      'Хуваарийг 12 долоо хоногоос ихгүй хугацаагаар авна уу.',
    );
  }
  return { from, to, fromKey: dateKey(from), toKey: dateKey(to) };
}

@Injectable()
export class CalendarIcsService {
  constructor(private readonly prisma: PrismaService) {}

  async issueToken(userId: string): Promise<{ token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { calendarTokenVersion: true },
    });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй.');

    const token = randomBytes(32).toString('base64url');
    const calendarTokenHash = createHash('sha256').update(token).digest('hex');
    const updated = await this.prisma.user.updateMany({
      where: { id: userId, calendarTokenVersion: user.calendarTokenVersion },
      data: {
        calendarTokenHash,
        calendarTokenVersion: (user.calendarTokenVersion ?? 0) + 1,
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException(
        'Хуанлийн холбоос зэрэг өөрчлөгдсөн байна. Дахин оролдоно уу.',
      );
    }
    return { token };
  }

  async feedByToken(token: string | undefined, from?: string, to?: string) {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new NotFoundException(
        'Хуанлийн холбоос хүчингүй эсвэл шинэчлэгдсэн байна.',
      );
    }
    const calendarTokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findUnique({
      where: { calendarTokenHash },
    });
    if (!user || isArchivedUser(user) || !CALENDAR_ROLES.includes(user.role)) {
      throw new NotFoundException(
        'Хуанлийн холбоос хүчингүй эсвэл шинэчлэгдсэн байна.',
      );
    }
    return this.exportForUser(user.id, user.role, from, to);
  }

  async exportForUser(userId: string, role: Role, from?: string, to?: string) {
    if (!CALENDAR_ROLES.includes(role)) {
      throw new NotFoundException('Хуваарь олдсонгүй.');
    }
    const range = feedRange(from, to);
    const activeRange = {
      effectiveFrom: { lte: range.to },
      AND: [
        { OR: [{ effectiveTo: null }, { effectiveTo: { gte: range.from } }] },
      ],
    };

    let scheduleWhere: object;
    // Багш: өдрийн хуваарьт ахлах/туслахаар оноогдсон хичээлүүд (эзэн 2026-10-11)
    const myStaffing =
      role === Role.STUDENT
        ? []
        : await this.prisma.lessonStaffing.findMany({
            where: {
              date: { gte: range.from, lte: range.to },
              OR: [{ leadTeacherId: userId }, { assistantTeacherId: userId }],
            },
            select: { scheduleId: true },
          });
    if (role === Role.STUDENT) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId: userId, leftAt: null },
        select: {
          classroomId: true,
          classroom: { select: { archived: true } },
        },
      });
      if (!enrollment || enrollment.classroom.archived) {
        return { filename: 'pi.mn-huvaari.ics', ics: buildIcs([]) };
      }
      scheduleWhere = {
        ...activeRange,
        classroomId: enrollment.classroomId,
        classroom: { archived: false },
      };
    } else {
      scheduleWhere = {
        ...activeRange,
        classroom: { archived: false },
        OR: [
          { teacherId: userId },
          {
            teacherId: null,
            classroom: { ...classTeacherWhere(userId), archived: false },
          },
          { id: { in: [...new Set(myStaffing.map((s) => s.scheduleId))] } },
        ],
      };
    }

    const schedules = await this.prisma.classSchedule.findMany({
      where: scheduleWhere,
      include: {
        classroom: {
          select: { id: true, name: true, teacherId: true, assistantTeacherId: true },
        },
      },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    });
    const scheduleIds = schedules.map((schedule) => schedule.id);
    if (scheduleIds.length === 0) {
      return { filename: 'pi.mn-huvaari.ics', ics: buildIcs([]) };
    }

    const [exceptions, holidays, topics, staffing] = await Promise.all([
      this.prisma.scheduleException.findMany({
        where: {
          scheduleId: { in: scheduleIds },
          OR: [
            { date: { gte: range.from, lte: range.to } },
            { newDate: { gte: range.from, lte: range.to } },
          ],
        },
      }),
      this.prisma.academicCalendarDay.findMany({
        where: { date: { gte: range.from, lte: range.to } },
        include: { classrooms: { select: { classroomId: true } } },
      }),
      this.prisma.lessonTopic.findMany({
        where: { scheduleId: { in: scheduleIds } },
      }),
      this.prisma.lessonStaffing.findMany({
        where: {
          scheduleId: { in: scheduleIds },
          date: { gte: range.from, lte: range.to },
        },
      }),
    ]);
    // Хуваарийн түвшинд энэ багшийнх (өдрийн оноолт байхгүй үед хүчинтэй)
    const ownSchedule = new Set(
      schedules
        .filter((s) =>
          s.teacherId ? s.teacherId === userId : isClassTeacher(s.classroom, userId),
        )
        .map((s) => s.id),
    );

    const resolverSchedules: ResolverSchedule[] = schedules.map((schedule) => ({
      id: schedule.id,
      classroomId: schedule.classroomId,
      classroomName: schedule.classroom.name,
      weekday: schedule.weekday,
      startMinute: schedule.startMinute,
      endMinute: schedule.endMinute,
      teacherId: schedule.teacherId,
      teacherName: null,
      room: schedule.room,
      subject: schedule.subject,
      effectiveFrom: dateKey(schedule.effectiveFrom),
      effectiveTo: schedule.effectiveTo ? dateKey(schedule.effectiveTo) : null,
    }));
    const resolverExceptions: ResolverException[] = exceptions.map(
      (exception) => ({
        scheduleId: exception.scheduleId,
        date: dateKey(exception.date),
        kind: exception.kind,
        newDate: exception.newDate ? dateKey(exception.newDate) : null,
        newStartMinute: exception.newStartMinute,
        newEndMinute: exception.newEndMinute,
        newRoom: exception.newRoom,
        note: exception.note,
      }),
    );
    const resolverTopics: ResolverTopic[] = topics.map((topic) => ({
      scheduleId: topic.scheduleId,
      date: dateKey(topic.date),
      title: topic.title,
    }));
    const resolverHolidays: ResolverHoliday[] = holidays.map((holiday) => ({
      date: dateKey(holiday.date),
      type: holiday.type,
      title: holiday.title,
      classroomIds: holiday.classrooms.map((c) => c.classroomId),
    }));

    const days: ResolvedDay[] = [];
    for (
      let start = range.from;
      start <= range.to;
      start = addDateDays(start, 7)
    ) {
      days.push(
        ...resolveWeek({
          weekStart: dateKey(start),
          schedules: resolverSchedules,
          exceptions: resolverExceptions,
          topics: resolverTopics,
          holidays: resolverHolidays,
          staffing: staffing.map((st) => ({
            scheduleId: st.scheduleId,
            date: dateKey(st.date),
            lead: st.leadTeacherId ? { id: st.leadTeacherId, name: '' } : null,
            assistant: st.assistantTeacherId
              ? { id: st.assistantTeacherId, name: '' }
              : null,
          })),
        }),
      );
    }
    // Багшид зөвхөн ӨӨРИЙН хичээл: өдрийн оноолт байвал түүгээр, үгүй бол хуваарийн багш
    const mine = (entry: ResolvedDay['entries'][number]) => {
      if (role === Role.STUDENT) return true;
      if (entry.leadTeacher || entry.assistantTeacher)
        return (
          entry.leadTeacher?.id === userId ||
          entry.assistantTeacher?.id === userId
        );
      return ownSchedule.has(entry.scheduleId);
    };

    const events: CalendarEvent[] = days
      .filter(
        (day) =>
          day.date >= range.fromKey &&
          day.date <= range.toKey &&
          !day.isHoliday,
      )
      .flatMap((day) =>
        day.entries.filter(mine).map((entry) => ({
          scheduleId: entry.scheduleId,
          date: day.date,
          startMinute: entry.startMinute,
          endMinute: entry.endMinute,
          summary:
            [
              entry.topic,
              entry.subject
                ? (SUBJECT_LABEL[entry.subject] ?? entry.subject)
                : null,
              entry.classroomName,
              entry.assistantTeacher?.id === userId ? 'туслах багш' : null,
            ]
              .filter(Boolean)
              .join(' - ') || 'Хичээл',
          room: entry.room,
        })),
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.startMinute - b.startMinute ||
          a.scheduleId.localeCompare(b.scheduleId),
      );

    return { filename: 'pi.mn-huvaari.ics', ics: buildIcs(events) };
  }
}
