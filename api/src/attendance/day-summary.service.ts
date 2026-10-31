import { Injectable } from '@nestjs/common';
import { parseDateOnly } from '../common/date';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from './attendance.service';
import { summarizeDay } from './day-summary.logic';

/**
 * GET /attendance/day-summary?date= — «Ангиуд» хуудасны «Өнөөдөр» тойм (эзэн
 * 2026-10-31): тухайн өдөр хичээлтэй анги бүрийн ирц, даалгаврын тоо НЭГ
 * дуудлагаар. Ангиуд, эрх нь ирцийн самбарын жагсаалттай ЯГ ижил (boardClasses).
 */
@Injectable()
export class AttendanceDaySummaryService {
  constructor(
    private prisma: PrismaService,
    private attendance: AttendanceService,
  ) {}

  async daySummary(dateStr: string, userId: string, role: Role) {
    const { date: key, classes } = await this.attendance.boardClasses(dateStr, userId, role);
    if (!classes.length) return { date: key, classes: [] };
    const ids = classes.map((c) => c.id);
    const date = parseDateOnly(key);
    const [enrolled, attendance, homework, records] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { classroomId: { in: ids }, leftAt: null, student: { archivedAt: null } },
        select: { classroomId: true, studentId: true },
      }),
      this.prisma.attendance.findMany({
        where: { classroomId: { in: ids }, date },
        select: { classroomId: true, studentId: true, status: true },
      }),
      this.prisma.dailyHomeworkMark.findMany({
        where: { classroomId: { in: ids }, date, status: { not: null } },
        select: { classroomId: true, studentId: true, status: true },
      }),
      this.prisma.lessonRecord.findMany({
        where: { classroomId: { in: ids }, date, cancelledAt: null },
        select: { scheduleId: true },
      }),
    ]);
    return {
      date: key,
      classes: summarizeDay(
        classes,
        enrolled,
        attendance,
        homework,
        new Set(records.map((r) => r.scheduleId)),
      ),
    };
  }
}
