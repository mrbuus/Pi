import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  StudentType,
} from '../generated/prisma/enums';
import { PassesService } from '../passes/passes.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmPaymentDto, CreatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private passes: PassesService,
  ) {}

  create(dto: CreatePaymentDto, userId: string) {
    return this.prisma.payment.create({
      data: {
        userId,
        amount: dto.amount,
        method: dto.method,
        description: dto.description,
        forMonth: dto.forMonth,
        // QPay автоматаар, данс/бэлэн гараар баталгаажина (SPEC §12.2)
        status: PaymentStatus.PENDING,
        paidAt: dto.method === PaymentMethod.QPAY ? undefined : new Date(),
      },
    });
  }

  my(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  list(status?: PaymentStatus) {
    return this.prisma.payment.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  // Багш+/Админ гараар баталгаажуулна — зам, тайлбар, цаг бүртгэгдэнэ (SPEC §12.3)
  async confirm(paymentId: string, dto: ConfirmPaymentDto, byUserId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Төлбөр олдсонгүй');
    if (payment.status === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('Аль хэдийн баталгаажсан');
    }

    const confirmed = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedById: byUserId,
        paidAt: payment.paidAt ?? new Date(),
        ...(dto.note
          ? {
              description: [payment.description, dto.note]
                .filter(Boolean)
                .join(' | '),
            }
          : {}),
      },
    });

    // Эрх олгох бол: төлбөр → UserPass холбогдоно
    let grantedPass: Awaited<ReturnType<PassesService['grant']>> | null = null;
    if (dto.passId) {
      grantedPass = await this.passes.grant(
        dto.passId,
        payment.userId,
        paymentId,
      );
    }
    return { payment: confirmed, grantedPass };
  }

  async reject(paymentId: string, byUserId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Төлбөр олдсонгүй');
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REJECTED, confirmedById: byUserId },
    });
  }

  // QPay webhook — merchant гэрээ хийгдмэгц invoice үүсгэлттэй хамт бүрэн залгана.
  // Одоогоор бүтэц нь бэлэн: invoiceId-гаар олж автоматаар баталгаажуулна
  async qpayWebhook(invoiceId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { qpayInvoiceId: invoiceId, status: PaymentStatus.PENDING },
    });
    if (!payment) return { handled: false };
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.CONFIRMED, paidAt: new Date() },
    });
    return { handled: true };
  }

  // Тухайн сард төлөөгүй танхимын сурагчдын жагсаалт — Багш+ хяналт (SPEC §12.3)
  async monthStatus(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Сар YYYY-MM хэлбэртэй байна');
    }
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        leftAt: null,
        student: {
          studentProfile: { type: StudentType.CLASSROOM },
        },
      },
      select: {
        classroom: { select: { id: true, name: true } },
        student: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });
    const paid = new Set(
      (
        await this.prisma.payment.findMany({
          where: { forMonth: month, status: PaymentStatus.CONFIRMED },
          select: { userId: true },
        })
      ).map((p) => p.userId),
    );
    return enrollments.map((e) => ({
      student: e.student,
      classroom: e.classroom,
      paid: paid.has(e.student.id),
    }));
  }
}
