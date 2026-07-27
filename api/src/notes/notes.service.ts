import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  ) {}

  // TEACHER зөвхөн ӨӨРИЙН ангийн (идэвхтэй бүртгэлтэй) сурагчид; TEACHER_PLUS/ADMIN
  // бүх сурагчид (SPEC: assertClassAccess-ийн сурагч-төвтэй хувилбар — ирц/
  // даалгаврын модультай ижил зарчим).
  private async assertStudentAccess(
    studentId: string,
    userId: string,
    role: Role,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Сурагч олдсонгүй');
    }
    if (role === Role.ADMIN || role === Role.TEACHER_PLUS) return student;
    if (role === Role.TEACHER) {
      const ownClassEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId,
          leftAt: null,
          classroom: { teacherId: userId },
        },
      });
      if (ownClassEnrollment) return student;
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
    await this.assertStudentAccess(studentId, userId, role);
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
    await this.assertStudentAccess(studentId, userId, role);
    return this.prisma.studentNote.findMany({
      where: { studentId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateNoteDto, userId: string, role: Role) {
    const before = await this.prisma.studentNote.findUnique({
      where: { id },
    });
    if (!before) throw new NotFoundException('Тэмдэглэл олдсонгүй');
    await this.assertStudentAccess(before.studentId, userId, role);
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
    await this.assertStudentAccess(note.studentId, userId, role);

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
