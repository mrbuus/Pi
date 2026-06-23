import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

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
          },
          update: { status: entry.status, markedById: userId },
        }),
      ),
    );
    return { marked: dto.entries.length, date: dto.date };
  }

  async byClassAndDate(
    classroomId: string,
    date: string,
    userId: string,
    role: Role,
  ) {
    await this.assertClassAccess(classroomId, userId, role);

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
      where: { classroomId, date: new Date(date) },
    });
    const byStudent = new Map(records.map((r) => [r.studentId, r.status]));
    return enrollments.map((e) => ({
      student: e.student,
      status: byStudent.get(e.student.id) ?? null,
    }));
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
