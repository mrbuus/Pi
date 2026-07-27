import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Subject } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEnrollmentWindowDto } from './dto/enrollment-window.dto';

@Injectable()
export class EnrollmentWindowsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // GET /enrollment-windows — нийтэд нээлттэй (landing page-д JWT-гүй унших
  // ёстой). Жижиг хариу — зөвхөн UI-д хэрэгтэй талбарууд.
  findAll() {
    return this.prisma.enrollmentWindow.findMany({
      select: {
        subject: true,
        status: true,
        availability: true,
        note: true,
      },
      orderBy: { subject: 'asc' },
    });
  }

  // PATCH /enrollment-windows/:subject — ADMIN + TEACHER_PLUS. Хичээл тус
  // бүрийг бие даан нээх/хаах эзний дүрмийг эндээс хэрэгжүүлнэ.
  async update(
    subjectParam: string,
    dto: UpdateEnrollmentWindowDto,
    actorId: string,
    actorRole: string,
  ) {
    if (!Object.values(Subject).includes(subjectParam as Subject)) {
      throw new BadRequestException('Хичээл буруу байна');
    }
    const subject = subjectParam as Subject;

    const before = await this.prisma.enrollmentWindow.findUnique({
      where: { subject },
    });
    if (!before) {
      throw new NotFoundException('Энэ хичээлийн элсэлтийн цонх олдсонгүй');
    }

    const after = await this.prisma.enrollmentWindow.update({
      where: { subject },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.availability !== undefined
          ? { availability: dto.availability }
          : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        updatedById: actorId,
      },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'UPDATE',
      entity: 'EnrollmentWindow',
      entityId: after.id,
      before,
      after,
    });

    return after;
  }
}
