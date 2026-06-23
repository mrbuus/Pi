import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { todayCodeUB } from '../auth/auth.service';
import { Role, StudentType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';

@Injectable()
export class ClassroomsService {
  constructor(private prisma: PrismaService) {}

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
  unassignedStudents() {
    return this.prisma.user.findMany({
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
        studentProfile: { select: { grade: true, school: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
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

  // Анги шууд устгагдахгүй — өнөөдрийн кодоор баталгаажуулж архивлана (SPEC §15)
  async archive(classroomId: string, confirmCode: string) {
    if (confirmCode !== todayCodeUB()) {
      throw new BadRequestException('Баталгаажуулах код буруу байна');
    }
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom) throw new NotFoundException('Анги олдсонгүй');
    return this.prisma.classroom.update({
      where: { id: classroomId },
      data: { archived: true },
    });
  }
}
