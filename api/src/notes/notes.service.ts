import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';
import { AuditService } from '../audit/audit.service';
import {
  PaymentStatus,
  Role,
  StudentNoteType,
  TuitionPlan,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private capabilities: StaffCapabilityService,
  ) {}

  // TEACHER зөвхөн ӨӨРИЙН ангийн (идэвхтэй бүртгэлтэй) сурагчид; TEACHER_PLUS/ADMIN
  // бүх сурагчид (SPEC: assertClassAccess-ийн сурагч-төвтэй хувилбар — ирц/
  // даалгаврын модультай ижил зарчим).
  private async assertStudentAccess(
    studentId: string,
    userId: string,
    _role: Role,
    financial = false,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student || student.role !== Role.STUDENT)
      throw new NotFoundException('Сурагч олдсонгүй');
    if (financial) {
      await this.capabilities.assert(userId, 'finance.manage');
      return { external: false };
    }
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        archivedAt: true,
        externalTeacherProfile: { select: { verifiedAt: true } },
      },
    });
    if (!actor || actor.archivedAt)
      throw new ForbiddenException('Идэвхтэй ажилтан шаардлагатай');
    if (actor.role === Role.ADMIN) return { external: false };
    if (
      ![Role.TEACHER, Role.TEACHER_PLUS].includes(
        actor.role as typeof Role.TEACHER,
      )
    )
      throw new ForbiddenException('Энэ сурагчид хандах эрхгүй');
    if (actor.externalTeacherProfile) {
      if (!actor.externalTeacherProfile.verifiedAt)
        throw new ForbiddenException('Баталгаажсан багш шаардлагатай');
      const member = await this.prisma.teacherGroupMember.findFirst({
        where: {
          studentId,
          leftAt: null,
          group: { ownerId: userId, archived: false },
        },
        select: { id: true },
      });
      if (member) return { external: true };
    } else {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId,
          leftAt: null,
          classroom: { teacherId: userId, archived: false },
        },
        select: { id: true },
      });
      if (enrollment) return { external: false };
    }
    throw new ForbiddenException('Энэ сурагчид хандах эрхгүй');
  }

  // 🎯 БИЗНЕСИЙН ДҮРЭМ (эзэмшигчийн шаардсан): жилийн төлбөрөө бүтэн төлсөн
  // сурагчид (tuitionPlan=FULL_YEAR, баталгаажсан/CONFIRMED төлбөртэй) төлбөрийн
  // (PAYMENT) төрлийн тэмдэглэл шаардлагагүй тул үүсгэх/PAYMENT тэмдэглэлд
  // засвар оруулахыг хориглоно. ЕРӨНХИЙ (GENERAL) тэмдэглэл үргэлж зөвшөөрөгдөнө.
  private async assertPaymentNoteAllowed(studentId: string): Promise<void> {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
    });
    if (profile?.tuitionPlan !== TuitionPlan.FULL_YEAR) return;

    const confirmedPayment = await this.prisma.payment.findFirst({
      where: { userId: studentId, status: PaymentStatus.CONFIRMED },
    });
    if (confirmedPayment) {
      throw new BadRequestException(
        'Жилийн төлбөрөө бүтэн төлсөн сурагчид төлбөрийн тэмдэглэл үүсгэх шаардлагагүй.',
      );
    }
  }

  async create(
    studentId: string,
    dto: CreateNoteDto,
    userId: string,
    role: Role,
  ) {
    await this.assertStudentAccess(
      studentId,
      userId,
      role,
      dto.type === StudentNoteType.PAYMENT,
    );
    if (dto.type === StudentNoteType.PAYMENT) {
      await this.assertPaymentNoteAllowed(studentId);
    }

    const note = await this.prisma.studentNote.create({
      data: {
        studentId,
        type: dto.type,
        body: dto.body,
        createdById: userId,
      },
    });

    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: 'CREATE',
      entity: 'StudentNote',
      entityId: note.id,
      after: note,
    });

    return note;
  }

  async list(
    studentId: string,
    type: StudentNoteType | undefined,
    userId: string,
    role: Role,
  ) {
    const scope = await this.assertStudentAccess(
      studentId,
      userId,
      role,
      type === StudentNoteType.PAYMENT,
    );
    const financial = await this.capabilities.has(userId, 'finance.manage');
    return this.prisma.studentNote.findMany({
      where: {
        studentId,
        ...(type
          ? { type }
          : financial
            ? {}
            : { type: StudentNoteType.GENERAL }),
        ...(scope.external ? { createdById: userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateNoteDto, userId: string, role: Role) {
    const before = await this.prisma.studentNote.findUnique({
      where: { id },
    });
    if (!before) throw new NotFoundException('Тэмдэглэл олдсонгүй');
    const scope = await this.assertStudentAccess(
      before.studentId,
      userId,
      role,
      before.type === StudentNoteType.PAYMENT,
    );
    if (scope.external && before.createdById !== userId)
      throw new ForbiddenException('Хувийн ажилтны тэмдэглэлд хандахгүй');
    if (before.type === StudentNoteType.PAYMENT) {
      await this.assertPaymentNoteAllowed(before.studentId);
    }

    const resolving = dto.resolvedAt !== undefined;
    const updated = await this.prisma.studentNote.update({
      where: { id },
      data: {
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(resolving
          ? {
              resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : null,
              resolvedById: dto.resolvedAt ? userId : null,
            }
          : {}),
      },
    });

    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: 'UPDATE',
      entity: 'StudentNote',
      entityId: id,
      before,
      after: updated,
    });

    return updated;
  }

  async remove(id: string, userId: string, role: Role) {
    const note = await this.prisma.studentNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Тэмдэглэл олдсонгүй');
    const scope = await this.assertStudentAccess(
      note.studentId,
      userId,
      role,
      note.type === StudentNoteType.PAYMENT,
    );
    if (scope.external && note.createdById !== userId)
      throw new ForbiddenException('Хувийн ажилтны тэмдэглэлд хандахгүй');

    await this.prisma.studentNote.delete({ where: { id } });

    await this.audit.record({
      actorId: userId,
      actorRole: role,
      action: 'DELETE',
      entity: 'StudentNote',
      entityId: id,
      before: note,
    });

    return { deleted: true };
  }
}
