import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { parseDateOnly } from '../common/date';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SetHomeworkMarkDto } from './dto/set-homework-mark.dto';

// Эзний #1 хүсэлт: багш ангийнхаа гэрийн даалгаврыг өдөр бүр НЭГ ХУРДАН
// тороор (grid) тэмдэглэдэг байх ёстой. Assignment/Submission-ы "багш
// даалгавар үүсгээд сурагч илгээх" урсгалаас ялгаатай — DailyHomeworkMark
// бол зөвхөн "анги + сурагч + өдөр" мөр бүрд НЭГ өнгө + чөлөөт тайлбар.
@Injectable()
export class HomeworkMarksService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
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

  // GET — сонгосон ангийн идэвхтэй сурагчид бүгд, нэрээр эрэмбэлсэн. Тэмдэглэгээгүй
  // сурагч status: null-тэй ирнэ (UI-д цагаан/хоосон харагдана).
  async listForClass(classroomId: string, date: string, userId: string, role: Role) {
    await this.assertClassAccess(classroomId, userId, role);
    const parsedDate = this.parseDate(date);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null },
      select: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { student: { firstName: 'asc' } },
    });

    const marks = await this.prisma.dailyHomeworkMark.findMany({
      where: { classroomId, date: parsedDate },
    });
    const byStudent = new Map(marks.map((m) => [m.studentId, m]));

    // markedById → багшийн нэр (ирцийн жишиг загвартай адил хэв маяг)
    const markerIds = [...new Set(marks.map((m) => m.markedById))];
    const markers = markerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: markerIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const markerById = new Map(markers.map((m) => [m.id, m]));

    return enrollments.map((e) => {
      const m = byStudent.get(e.student.id);
      return {
        student: e.student,
        status: m?.status ?? null,
        comment: m?.comment ?? null,
        markedBy: m ? (markerById.get(m.markedById) ?? null) : null,
        updatedAt: m?.updatedAt ?? null,
      };
    });
  }

  // PATCH — нэг сурагчийн нэг өдрийн тэмдэглэгээг upsert хийнэ. status болон
  // comment тус тусдаа ирж болно (dto-д ирээгүй талбарыг хөндөхгүй).
  async setMark(
    classroomId: string,
    studentId: string,
    dto: SetHomeworkMarkDto,
    userId: string,
    role: Role,
  ) {
    await this.assertClassAccess(classroomId, userId, role);
    const parsedDate = this.parseDate(dto.date);

    const enrolled = await this.prisma.enrollment.findFirst({
      where: { classroomId, studentId, leftAt: null },
    });
    if (!enrolled) {
      throw new NotFoundException('Сурагч энэ ангид алга байна');
    }

    const before = await this.prisma.dailyHomeworkMark.findUnique({
      where: {
        classroomId_studentId_date: { classroomId, studentId, date: parsedDate },
      },
    });

    const updated = await this.prisma.dailyHomeworkMark.upsert({
      where: {
        classroomId_studentId_date: { classroomId, studentId, date: parsedDate },
      },
      create: {
        classroomId,
        studentId,
        date: parsedDate,
        status: dto.status ?? null,
        comment: dto.comment ?? null,
        markedById: userId,
      },
      update: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.comment !== undefined ? { comment: dto.comment } : {}),
        markedById: userId,
      },
    });

    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: before ? 'UPDATE' : 'CREATE',
      entity: 'DailyHomeworkMark',
      entityId: updated.id,
      before: before ?? null,
      after: updated,
    });

    return {
      student: { id: studentId },
      status: updated.status,
      comment: updated.comment,
      updatedAt: updated.updatedAt,
    };
  }
}
