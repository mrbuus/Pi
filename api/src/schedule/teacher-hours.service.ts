import { BadRequestException, Injectable } from '@nestjs/common';
import { addDateDays, dateKey, parseDateOnly } from '../common/date';
import { PrismaService } from '../prisma/prisma.service';
import { computeTeacherHours, monthRange, type TeacherHoursRow } from './teacher-hours';

@Injectable()
export class TeacherHoursService {
  constructor(private prisma: PrismaService) {}

  /**
   * Тухайн сарын багш бүрийн хичээлийн цаг. teacherId өгвөл зөвхөн тэр багш.
   * Сарын сүүлийн 7 хоногийн цонх дараа сар руу гардаг тул +6 өдөр нэмж ачаална
   * (MOVED хичээл сар дамжих боломжтой) — сарын гаднах өдрийг нэгтгэхдээ хасна.
   */
  async forMonth(month: string, teacherId?: string): Promise<{ month: string; teachers: TeacherHoursRow[] }> {
    let range: { first: string; days: number };
    try {
      range = monthRange(month);
    } catch {
      throw new BadRequestException('Сар YYYY-MM хэлбэртэй байх ёстой');
    }
    const start = parseDateOnly(range.first);
    const end = addDateDays(start, range.days + 6);

    const schedules = await this.prisma.classSchedule.findMany({
      where: {
        effectiveFrom: { lte: end },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
        ...(teacherId ? { teacherId } : { teacherId: { not: null } }),
      },
      include: {
        classroom: { select: { name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const ids = schedules.map((s) => s.id);
    const [exceptions, holidays] = await Promise.all([
      this.prisma.scheduleException.findMany({ where: { scheduleId: { in: ids } } }),
      this.prisma.academicCalendarDay.findMany({ where: { date: { gte: start, lte: end } } }),
    ]);

    const teachers = computeTeacherHours(month, {
      schedules: schedules.map((s) => ({
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
      holidays: holidays.map((h) => ({ date: dateKey(h.date), type: h.type, title: h.title })),
    });
    return { month, teachers };
  }
}
