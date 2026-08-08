import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { todayCodeUB } from '../auth/auth.service';
import { Role, StudentType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

@Injectable()
export class ClassroomsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // Сурагч нэмэх/зөөх эрх: Админ үргэлж; Багш+ зөвхөн canManageStudents асаалттай үед (SPEC §13)
  private async assertCanManageStudents(userId: string, role: Role) {
    if (role === Role.ADMIN) return;
    if (role === Role.TEACHER_PLUS) {
      const profile = await this.prisma.teacherProfile.findUnique({
        where: { userId },
      });
      if (profile?.canManageStudents) return;
      throw new ForbiddenException(
        'Сурагч удирдах эрхийг тань админ нээгээгүй байна',
      );
    }
    throw new ForbiddenException('Энэ үйлдэл хийх эрхгүй');
  }

  create(dto: CreateClassroomDto) {
    return this.prisma.classroom.create({ data: dto });
  }

  async list(userId: string, role: Role) {
    const where =
      role === Role.TEACHER
        ? { teacherId: userId, archived: false }
        : { archived: false };
    return this.prisma.classroom.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { enrollments: { where: { leftAt: null } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Идэвхжсэн ч ангид ороогүй танхимын сурагчид (SPEC §6.3)
  // Эрэмбэлэлт: хамгийн удаан ангигүй байгаа нь эхэндээ.
  // Өөрөөр хэлбэл, сүүлийн enrollment-ийн leftAt огноо (байхгүй бол User.createdAt)
  async unassignedStudents() {
    const users = await this.prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        studentProfile: {
          type: StudentType.CLASSROOM,
          activatedAt: { not: null },
        },
        enrollments: { none: { leftAt: null } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
        studentProfile: { select: { grade: true, school: true } },
        enrollments: {
          select: { leftAt: true },
          orderBy: { leftAt: 'desc' as const },
          take: 1,
        },
      },
    });

    // Эрэмбэлээ: хүлээлтийн огноо (сүүлийн enrollment.leftAt, байхгүй бол createdAt)
    const sorted = users.sort((a, b) => {
      const aWaitSince = a.enrollments[0]?.leftAt ?? a.createdAt;
      const bWaitSince = b.enrollments[0]?.leftAt ?? b.createdAt;
      return aWaitSince.getTime() - bWaitSince.getTime();
    });

    return sorted.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      studentProfile: u.studentProfile,
      waitingSince: u.enrollments[0]?.leftAt ?? u.createdAt,
    }));
  }

  async enroll(
    classroomId: string,
    studentId: string,
    byUserId: string,
    byRole: Role,
  ) {
    await this.assertCanManageStudents(byUserId, byRole);

    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom || classroom.archived) {
      throw new NotFoundException('Анги олдсонгүй');
    }
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Сурагч олдсонгүй');
    }

    // Өмнөх ангийн бичилт хаагдаж шинэ бичилт үүснэ — түүх хадгалагдана,
    // сурагчид зөвхөн орсон өдрөөс хойшхи мэдээлэл харагдана (SPEC §6.3)
    return this.prisma.$transaction(async (tx) => {
      await tx.enrollment.updateMany({
        where: { studentId, leftAt: null },
        data: { leftAt: new Date(), movedById: byUserId },
      });
      return tx.enrollment.create({
        data: { studentId, classroomId, movedById: byUserId },
        include: {
          classroom: { select: { id: true, name: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });
  }

  async removeStudent(
    classroomId: string,
    studentId: string,
    byUserId: string,
    byRole: Role,
  ) {
    await this.assertCanManageStudents(byUserId, byRole);
    const result = await this.prisma.enrollment.updateMany({
      where: { studentId, classroomId, leftAt: null },
      data: { leftAt: new Date(), movedById: byUserId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Идэвхтэй бүртгэл олдсонгүй');
    }
    return { removed: true };
  }

  // Ангийн мэдээлэл засах — Админ (SPEC: ROLES = ADMIN only)
  async update(id: string, dto: UpdateClassroomDto, actorId: string, actorRole: Role) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
    });
    if (!classroom) throw new NotFoundException('Анги олдсонгүй');

    if (dto.teacherId) {
      const teacher = await this.prisma.user.findUnique({
        where: { id: dto.teacherId },
      });
      if (
        !teacher ||
        (teacher.role !== Role.TEACHER && teacher.role !== Role.TEACHER_PLUS)
      ) {
        throw new BadRequestException(
          'Заасан хэрэглэгч багшийн эрхгүй байна',
        );
      }
    }

    const updated = await this.prisma.classroom.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.grade !== undefined ? { grade: dto.grade } : {}),
        ...(dto.teacherId !== undefined
          ? { teacherId: dto.teacherId || null }
          : {}),
      },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'UPDATE',
      entity: 'Classroom',
      entityId: id,
      before: classroom,
      after: updated,
    });

    return updated;
  }

  // Анги шууд устгагдахгүй — өнөөдрийн кодоор баталгаажуулж архивлана (SPEC §15)
  async archive(
    classroomId: string,
    confirmCode: string,
    actorId: string,
    actorRole: Role,
  ) {
    if (confirmCode !== todayCodeUB()) {
      throw new BadRequestException('Баталгаажуулах код буруу байна');
    }
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom) throw new NotFoundException('Анги олдсонгүй');
    const archived = await this.prisma.classroom.update({
      where: { id: classroomId },
      data: { archived: true },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'ARCHIVE',
      entity: 'Classroom',
      entityId: classroomId,
      before: classroom,
      after: archived,
    });

    return archived;
  }

  // Анги тараах — идэвхтэй бүх сурагчийг ангиас гаргана
  // Шаардлага: ангийн удирдлагын дэлгэцээс "анги тараах" үйлдэлээр дуудагдана
  async disband(
    classroomId: string,
    actorId: string,
    actorRole: Role,
  ) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom) throw new NotFoundException('Анги олдсонгүй');

    const today = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      // Идэвхтэй бүх enrollment-ийн leftAt=өнөөдөр болгоно
      const updatedCount = await tx.enrollment.updateMany({
        where: { classroomId, leftAt: null },
        data: { leftAt: today, movedById: actorId },
      });

      return {
        disbanded: true,
        affectedStudentCount: updatedCount.count,
      };
    });

    // Аудитыг бүртгэнэ
    await this.audit.record({
      actorId,
      actorRole,
      action: 'DISBAND',
      entity: 'Classroom',
      entityId: classroomId,
      before: classroom,
      after: { ...classroom, disbanded: true },
    });

    return result;
  }
}
