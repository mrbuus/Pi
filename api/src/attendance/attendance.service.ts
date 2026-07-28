import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addDateDays, dateKey, parseDateOnly } from '../common/date';
import { AttendanceStatus, Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleService } from '../schedule/schedule.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

// /schedule/days-аас "бодит хичээлтэй өдөр" хайхад хэтэрхий нарийн цонхоор
// эхлээд олдохгүй бол улам өргөтгөж дахин хайна (жишээ нь ангийн хуваарь
// саяхан эхэлсэн, эсвэл урт амралтын дараа) — гэхдээ хэт хол очихгүй.
const CLASS_DAY_LOOKBACK_START = 21;
const CLASS_DAY_LOOKBACK_MAX = 189;

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private schedule: ScheduleService,
  ) {}

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

  // TEACHER зөвхөн өөрийн ангид, TEACHER_PLUS/ADMIN бүх ангид (SPEC §13)
  private async assertClassAccess(
    classroomId: string,
    userId: string,
    role: Role,
  ) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom || classroom.archived) {
      throw new NotFoundException('Анги олдсонгүй');
    }
    if (role === Role.ADMIN || role === Role.TEACHER_PLUS) return classroom;
    if (role === Role.TEACHER && classroom.teacherId === userId) {
      return classroom;
    }
    throw new ForbiddenException('Энэ ангид хандах эрхгүй');
  }

  async mark(
    classroomId: string,
    dto: MarkAttendanceDto,
    userId: string,
    role: Role,
  ) {
    await this.assertClassAccess(classroomId, userId, role);
    const date = new Date(dto.date);

    const activeStudentIds = new Set(
      (
        await this.prisma.enrollment.findMany({
          where: { classroomId, leftAt: null },
          select: { studentId: true },
        })
      ).map((e) => e.studentId),
    );
    const invalid = dto.entries.filter(
      (e) => !activeStudentIds.has(e.studentId),
    );
    if (invalid.length > 0) {
      throw new ForbiddenException(
        `Энэ ангид байхгүй сурагч байна: ${invalid.map((e) => e.studentId).join(', ')}`,
      );
    }

    await this.prisma.$transaction(
      dto.entries.map((entry) =>
        this.prisma.attendance.upsert({
          where: {
            classroomId_studentId_date: {
              classroomId,
              studentId: entry.studentId,
              date,
            },
          },
          create: {
            classroomId,
            studentId: entry.studentId,
            date,
            status: entry.status,
            markedById: userId,
            note: entry.note ?? null,
          },
          update: {
            status: entry.status,
            markedById: userId,
            note: entry.note ?? null,
          },
        }),
      ),
    );
    return { marked: dto.entries.length, date: dto.date };
  }

  // Ангийн сүүлийн 2 БОДИТ хичээлтэй өдрийг тогтооно (beforeDate-ээс өмнөх).
  // Боломжтой бол /schedule/days (ClassSchedule + AcademicCalendarDay)-аас
  // тооцно; тухайн ангид хуваарь огт бүртгэгдээгүй бол өнгөрсөн ирцийн
  // бодит огноонуудаас (сүүлийн 2 ялгаатай огноо) буцаана.
  private async getLastClassDays(
    classroomId: string,
    beforeDate: Date,
  ): Promise<{ dates: string[]; source: 'schedule' | 'attendance-fallback' }> {
    const hasSchedule =
      (await this.prisma.classSchedule.count({ where: { classroomId } })) > 0;

    if (hasSchedule) {
      const to = addDateDays(beforeDate, -1);
      let found: string[] = [];
      for (
        let windowDays = CLASS_DAY_LOOKBACK_START;
        windowDays <= CLASS_DAY_LOOKBACK_MAX && found.length < 2;
        windowDays *= 3
      ) {
        const from = addDateDays(to, -(windowDays - 1));
        const days = await this.schedule.expandDays(
          dateKey(from),
          dateKey(to),
          classroomId,
        );
        found = days.filter((d) => d.classes.length > 0).map((d) => d.date);
      }
      if (found.length > 0) {
        return { dates: found.slice(-2), source: 'schedule' };
      }
      // Хуваарь бүртгэгдсэн ч тухайн хугацаанд нэг ч бодит хичээлтэй өдөр
      // олдоогүй бол (ж: бүх хуваарь шинэ) доорх fallback руу шилжинэ.
    }

    const rows = await this.prisma.attendance.findMany({
      where: { classroomId, date: { lt: beforeDate } },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
      take: 2,
    });
    return {
      dates: rows.map((r) => dateKey(r.date)).reverse(),
      source: 'attendance-fallback',
    };
  }

  async byClassAndDate(
    classroomId: string,
    date: string,
    userId: string,
    role: Role,
  ) {
    await this.assertClassAccess(classroomId, userId, role);
    const parsedDate = this.parseDate(date);

    // Тухайн өдөр идэвхтэй байсан бүх сурагчийг ирцтэй нь хамт буцаана —
    // ирц тэмдэглээгүй сурагч null статустай харагдана
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null },
      select: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { student: { firstName: 'asc' } },
    });
    const records = await this.prisma.attendance.findMany({
      where: { classroomId, date: parsedDate },
    });
    const byStudent = new Map(records.map((r) => [r.studentId, r]));

    // markedById → багшийн нэр (эзэн: "хэн гэдэг багш энэ ангийн ирцийг
    // тэмдэглэсэн" харагдах ёстой)
    const markerIds = [...new Set(records.map((r) => r.markedById))];
    const markers = markerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: markerIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const markerById = new Map(markers.map((m) => [m.id, m]));

    // Сүүлийн 2 бодит хичээлтэй өдөр аль алинд нь ирц тэмдэглэгдээгүй
    // сурагчийг UI дээр саарал өнгөөр ялгахад ашиглана.
    const { dates: lastTwoClassDays } = await this.getLastClassDays(
      classroomId,
      parsedDate,
    );
    let unmarkedCountByStudent = new Map<string, number>();
    if (lastTwoClassDays.length > 0) {
      const priorRecords = await this.prisma.attendance.findMany({
        where: {
          classroomId,
          date: { in: lastTwoClassDays.map((d) => this.parseDate(d)) },
        },
        select: { studentId: true },
      });
      unmarkedCountByStudent = new Map();
      for (const r of priorRecords) {
        unmarkedCountByStudent.set(
          r.studentId,
          (unmarkedCountByStudent.get(r.studentId) ?? 0) + 1,
        );
      }
    }

    return enrollments.map((e) => {
      const record = byStudent.get(e.student.id);
      const markedCount = unmarkedCountByStudent.get(e.student.id) ?? 0;
      return {
        student: e.student,
        status: record?.status ?? null,
        note: record?.note ?? null,
        markedBy: record ? (markerById.get(record.markedById) ?? null) : null,
        // Хэрэв харьцуулах хичээлтэй өдөр олдоогүй бол (шинэ анги) саарал
        // болгохгүй — зөвхөн сүүлийн 2 хичээлтэй өдөр ХОЁУЛАА тэмдэглэгдээгүй
        // байвал true.
        unmarkedLastTwoClassDays:
          lastTwoClassDays.length > 0 && markedCount === 0,
      };
    });
  }

  // 🎯 Сурагч тус бүрийн ХОЦРОЛТ/ТАСАЛСАН тоо тухайн хугацаанд — давтан
  // тасалдаг сурагчийг өнгөөр ялгахад ашиглана. SQL (groupBy) талд аггрегат
  // хийнэ — JS дотор бичлэг бүрийг тоолохгүй.
  async history(
    classroomId: string,
    from: string,
    to: string,
    userId: string,
    role: Role,
  ) {
    await this.assertClassAccess(classroomId, userId, role);
    if (!from || !to) {
      throw new BadRequestException(
        '"from" болон "to" огноо заавал шаардлагатай',
      );
    }
    const fromDate = this.parseDate(from);
    const toDate = this.parseDate(to);
    if (fromDate > toDate) {
      throw new BadRequestException(
        '"from" огноо "to" огнооноос өмнө байх ёстой',
      );
    }

    const [enrollments, counts] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { classroomId, leftAt: null },
        select: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { student: { firstName: 'asc' } },
      }),
      this.prisma.attendance.groupBy({
        by: ['studentId', 'status'],
        where: {
          classroomId,
          date: { gte: fromDate, lte: toDate },
          status: { in: [AttendanceStatus.LATE, AttendanceStatus.ABSENT] },
        },
        _count: { _all: true },
      }),
    ]);

    const countsByStudent = new Map<string, { late: number; absent: number }>();
    for (const c of counts) {
      const entry = countsByStudent.get(c.studentId) ?? {
        late: 0,
        absent: 0,
      };
      if (c.status === AttendanceStatus.LATE) entry.late = c._count._all;
      else if (c.status === AttendanceStatus.ABSENT)
        entry.absent = c._count._all;
      countsByStudent.set(c.studentId, entry);
    }

    return enrollments.map((e) => {
      const counted = countsByStudent.get(e.student.id) ?? {
        late: 0,
        absent: 0,
      };
      return {
        student: e.student,
        late: counted.late,
        absent: counted.absent,
      };
    });
  }

  myAttendance(studentId: string, from?: string, to?: string) {
    return this.prisma.attendance.findMany({
      where: {
        studentId,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      select: {
        date: true,
        status: true,
        classroom: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }
}
