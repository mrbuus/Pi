import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { todayCodeUB } from '../auth/auth.service';
import { classTeacherWhere, isClassTeacher } from '../common/class-teachers';
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
    // Энгийн багш: үндсэн эсвэл туслах ангийн багш болсон анги (2026-10-13)
    const where =
      role === Role.TEACHER
        ? { ...classTeacherWhere(userId), archived: false }
        : { archived: false };
    return this.prisma.classroom.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        assistantTeacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: {
            enrollments: {
              where: { leftAt: null, student: { archivedAt: null } },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(id: string, userId: string, role: Role) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        assistantTeacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        enrollments: {
          where: { leftAt: null, student: { archivedAt: null } },
          orderBy: { joinedAt: 'asc' },
          select: {
            joinedAt: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentCode: true,
              },
            },
          },
        },
      },
    });

    if (!classroom || classroom.archived) {
      throw new NotFoundException('Анги олдсонгүй');
    }
    if (role === Role.TEACHER && !isClassTeacher(classroom, userId)) {
      throw new ForbiddenException('Энэ ангид хандах эрхгүй');
    }
    const canManageStudents =
      role === Role.ADMIN ||
      (role === Role.TEACHER_PLUS &&
        (
          await this.prisma.teacherProfile.findUnique({
            where: { userId },
            select: { canManageStudents: true },
          })
        )?.canManageStudents === true);

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        type: classroom.type,
        grade: classroom.grade,
        teacherId: classroom.teacherId,
        teacher: classroom.teacher,
        assistantTeacherId: classroom.assistantTeacherId,
        assistantTeacher: classroom.assistantTeacher,
      },
      students: classroom.enrollments.map((enrollment) => ({
        ...enrollment.student,
        joinedAt: enrollment.joinedAt,
      })),
      permissions: { canManageStudents },
    };
  }

  // Идэвхжсэн ч ангид ороогүй танхимын сурагчид (SPEC §6.3)
  // Эрэмбэлэлт: хамгийн удаан ангигүй байгаа нь эхэндээ.
  // Өөрөөр хэлбэл, сүүлийн enrollment-ийн leftAt огноо (байхгүй бол User.createdAt)
  async unassignedStudents() {
    const users = await this.prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        archivedAt: null,
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
    // Анги солих/оноох — Админ, Багш+ (эзний шийдвэр 2026-10-11: тусгай эрхгүйгээр).
    // Ангиас гаргах (removeStudent) нь canManageStudents эрхтэй хэвээр.
    if (byRole !== Role.ADMIN && byRole !== Role.TEACHER_PLUS)
      throw new ForbiddenException('Анги солихыг Багш+ эсвэл админ хийнэ');

    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom || classroom.archived) {
      throw new NotFoundException('Анги олдсонгүй');
    }
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student || student.role !== Role.STUDENT || student.archivedAt) {
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
  async update(
    id: string,
    dto: UpdateClassroomDto,
    actorId: string,
    actorRole: Role,
  ) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
    });
    if (!classroom) throw new NotFoundException('Анги олдсонгүй');

    for (const teacherId of [dto.teacherId, dto.assistantTeacherId]) {
      if (!teacherId) continue;
      const teacher = await this.prisma.user.findUnique({
        where: { id: teacherId },
      });
      if (
        !teacher ||
        (teacher.role !== Role.TEACHER && teacher.role !== Role.TEACHER_PLUS)
      ) {
        throw new BadRequestException('Заасан хэрэглэгч багшийн эрхгүй байна');
      }
    }
    const next = ClassroomsService.nextTeachers(classroom, dto);

    const updated = await this.prisma.classroom.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.grade !== undefined ? { grade: dto.grade } : {}),
        ...(dto.teacherId !== undefined ? { teacherId: next.teacherId } : {}),
        ...(dto.assistantTeacherId !== undefined
          ? { assistantTeacherId: next.assistantTeacherId }
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

  /**
   * Хоёр багшийн дүрэм (эзэн 2026-10-13): хүсэлтийн дараах эцсийн төлөв —
   * илгээгээгүй талбар хэвээр, хоосон бол чөлөөлнө. Нэг хүн хоёр үүрэгт
   * давхар байж болохгүй (дээд тал нь ХОЁР өөр багш).
   */
  static nextTeachers(
    current: { teacherId: string | null; assistantTeacherId: string | null },
    dto: { teacherId?: string | null; assistantTeacherId?: string | null },
  ): { teacherId: string | null; assistantTeacherId: string | null } {
    const teacherId =
      dto.teacherId === undefined ? current.teacherId : dto.teacherId || null;
    const assistantTeacherId =
      dto.assistantTeacherId === undefined
        ? current.assistantTeacherId
        : dto.assistantTeacherId || null;
    if (teacherId && teacherId === assistantTeacherId)
      throw new BadRequestException(
        'Ангийн багш ба туслах багш өөр хүн байх ёстой',
      );
    return { teacherId, assistantTeacherId };
  }

  /**
   * Ангийн самбараас ангийн багш / туслах багшийг солих — Багш+/Админ.
   * Сонголт нь хуваарьт оногддог багш (TeacherProfile.teachesLessons). Аудитад
   * бичигдэнэ.
   */
  async setTeachers(
    id: string,
    dto: { teacherId?: string | null; assistantTeacherId?: string | null },
    actorId: string,
    actorRole: Role,
  ) {
    if (actorRole !== Role.ADMIN && actorRole !== Role.TEACHER_PLUS)
      throw new ForbiddenException('Ангийн багшийг Багш+ эсвэл админ солино');
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
      select: {
        id: true,
        archived: true,
        teacherId: true,
        assistantTeacherId: true,
      },
    });
    if (!classroom || classroom.archived)
      throw new NotFoundException('Анги олдсонгүй');
    const next = ClassroomsService.nextTeachers(classroom, dto);
    const ids = [next.teacherId, next.assistantTeacherId].filter(
      (v): v is string => !!v,
    );
    const changedIds = ids.filter(
      (v) => v !== classroom.teacherId && v !== classroom.assistantTeacherId,
    );
    if (changedIds.length) {
      const ok = await this.prisma.user.findMany({
        where: {
          id: { in: changedIds },
          archivedAt: null,
          role: { in: [Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN] },
          teacherProfile: { teachesLessons: true },
        },
        select: { id: true },
      });
      if (ok.length !== new Set(changedIds).size)
        throw new BadRequestException(
          'Сонгосон хүн хичээл заадаг багшийн жагсаалтад алга',
        );
    }
    const person = { select: { id: true, firstName: true, lastName: true } };
    const updated = await this.prisma.classroom.update({
      where: { id },
      data: next,
      select: {
        id: true,
        teacherId: true,
        assistantTeacherId: true,
        teacher: person,
        assistantTeacher: person,
      },
    });
    await this.audit.record({
      actorId,
      actorRole,
      action: 'UPDATE',
      entity: 'Classroom',
      entityId: id,
      before: {
        teacherId: classroom.teacherId,
        assistantTeacherId: classroom.assistantTeacherId,
      },
      after: next,
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
  async disband(classroomId: string, actorId: string, actorRole: Role) {
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
