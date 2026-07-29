import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { QpayService } from '../gateways/qpay.service';
import { Prisma } from '../generated/prisma/client';
import {
  PaymentMethod,
  PaymentStatus,
  StudentType,
} from '../generated/prisma/enums';
import { PassesService } from '../passes/passes.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConfirmPaymentDto,
  CreatePaymentDto,
  ReversePaymentDto,
  UpdatePaymentDto,
} from './dto/payment.dto';

// Хэн (id + роль) дуудаж буйг заавал дамжуулна — аудит лог-д хэрэгтэй
export interface PaymentActor {
  id: string;
  role: string;
}

export interface OutstandingRow {
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  classroomId: string;
  classroomName: string;
  tuitionAmount: number | null;
  tuitionPlan: string | null;
  totalPaid: number;
  shortfall: number;
}

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private passes: PassesService,
    private audit: AuditService,
    private qpay: QpayService,
  ) {}

  async create(dto: CreatePaymentDto, userId: string, actorRole: string) {
    const payment = await this.prisma.payment.create({
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
    await this.audit.record({
      actorId: userId,
      actorRole,
      action: 'CREATE',
      entity: 'Payment',
      entityId: payment.id,
      after: { ...payment },
    });

    // QPay сонгосон бол тэр дор нь нэхэмжлэх үүсгэж, буцаах QR/deeplink-ийг
    // клиент рүү дамжуулна. providerInvoiceId-г Payment.qpayInvoiceId-д
    // хадгалснаар callback ирэхэд аль төлбөр болохыг олох боломжтой болно —
    // өмнө нь энэ багана хэзээ ч бичигддэггүй байсан тул callback зам үхмэл байв.
    if (dto.method === PaymentMethod.QPAY) {
      if (!this.qpay.isConfigured()) {
        throw new BadRequestException(
          'QPay тохиргоо хийгдээгүй байна. Дансаар шилжүүлэх аргыг сонгоно уу.',
        );
      }
      const invoice = await this.qpay.createInvoice({
        paymentId: payment.id,
        amount: payment.amount,
        description: payment.description ?? 'Сургалтын төлбөр',
      });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { qpayInvoiceId: invoice.providerInvoiceId },
      });
      return {
        ...payment,
        qpayInvoiceId: invoice.providerInvoiceId,
        qpay: {
          invoiceId: invoice.providerInvoiceId,
          qrText: invoice.qrText,
          qrImage: invoice.qrImage,
          deeplinks: invoice.deeplinks,
        },
      };
    }

    return payment;
  }

  /**
   * QPay-гээс баталгаажсан төлбөрийг бүртгэнэ.
   *
   * 🔒 Энэ метод callback-ийн БИЕИЙГ ИТГЭДЭГГҮЙ. GatewaysController нь эхлээд
   * QPay-ийн /v2/payment/check рүү өөрөө хандаж баталгаажуулаад, зөвхөн
   * баталгаажсан үр дүнг энд дамжуулна. Тиймээс хуурамч callback илгээх
   * халдлага үр дүнгүй болно.
   *
   * Мөн дүнг дахин шалгана — дутуу төлөлт эрх нээхгүй.
   */
  async confirmQpayPayment(params: {
    qpayInvoiceId: string;
    paidAmount: number;
    providerPaymentId?: string;
  }) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        qpayInvoiceId: params.qpayInvoiceId,
        status: PaymentStatus.PENDING,
      },
    });
    if (!payment) return { handled: false, reason: 'NOT_FOUND_OR_NOT_PENDING' };

    // Дүн дутуу бол баталгаажуулахгүй — гараар шийдэхээр PENDING-д үлдээнэ.
    if (params.paidAmount < payment.amount) {
      await this.audit.record({
        actorId: 'SYSTEM_QPAY',
        actorRole: 'SYSTEM',
        action: 'QPAY_UNDERPAID',
        entity: 'Payment',
        entityId: payment.id,
        before: { expected: payment.amount },
        after: { paid: params.paidAmount },
        reason: 'QPay-гээс ирсэн дүн хүлээгдэж буй дүнгээс бага',
      });
      return { handled: false, reason: 'UNDERPAID' };
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.CONFIRMED, paidAt: new Date() },
    });
    await this.audit.record({
      actorId: 'SYSTEM_QPAY',
      actorRole: 'SYSTEM',
      action: 'CONFIRM',
      entity: 'Payment',
      entityId: payment.id,
      before: { status: payment.status },
      after: {
        status: updated.status,
        providerPaymentId: params.providerPaymentId,
      },
      reason: 'QPay /v2/payment/check-ээр баталгаажсан',
    });
    return { handled: true, paymentId: payment.id };
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
  async confirm(
    paymentId: string,
    dto: ConfirmPaymentDto,
    actor: PaymentActor,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Төлбөр олдсонгүй');
    if (payment.status === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('Аль хэдийн баталгаажсан');
    }
    if (
      payment.status === PaymentStatus.REJECTED ||
      payment.status === PaymentStatus.REVERSED
    ) {
      throw new BadRequestException(
        'Татгалзсан/буцаасан төлбөрийг дахин баталгаажуулах боломжгүй',
      );
    }

    // Эрх олгох гэж буй бол: төлбөрийн дүн тухайн эрхийн үнээс дутахгүй эсэхийг
    // урьдчилан шалгана — үгүй бол ₮1000 төлөөд өндөр үнэтэй эрх авах боломж
    // нээгддэг байсан. price null/0 бол чөлөөт/бэлэглэлийн эрх тул шалгалтгүй
    // (SPEC §12.1 чөлөөт дүнгийн зарчимтай зөрчилдөхгүй).
    if (dto.passId) {
      const pass = await this.prisma.pass.findUnique({
        where: { id: dto.passId },
        select: { id: true, price: true },
      });
      if (!pass) throw new NotFoundException('Эрх олдсонгүй');
      if (
        pass.price != null &&
        pass.price > 0 &&
        payment.amount < pass.price &&
        !dto.overrideUnderpay
      ) {
        throw new BadRequestException(
          `Төлбөрийн дүн (${payment.amount}₮) сонгосон эрхийн үнээс ` +
            `(${pass.price}₮) бага байна. Зөвшөөрөгдсөн тохиолдолд ` +
            '"overrideUnderpay: true" зааж илгээнэ үү.',
        );
      }
    }

    const confirmed = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedById: actor.id,
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
        actor,
      );
    }

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CONFIRM',
      entity: 'Payment',
      entityId: paymentId,
      before: { status: payment.status },
      after: { status: confirmed.status, grantedPassId: dto.passId ?? null },
      reason: dto.note,
    });

    return { payment: confirmed, grantedPass };
  }

  // Аль хэдийн шийдэгдсэн (баталгаажсан/татгалзсан/буцаасан) төлбөрийг дахин
  // татгалзаж болохгүй — confirm()-той адил хамгаалалт (алдааны засвар)
  async reject(paymentId: string, actor: PaymentActor, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Төлбөр олдсонгүй');
    if (
      payment.status === PaymentStatus.CONFIRMED ||
      payment.status === PaymentStatus.REJECTED ||
      payment.status === PaymentStatus.REVERSED
    ) {
      throw new BadRequestException('Аль хэдийн шийдэгдсэн төлбөр');
    }

    const rejected = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REJECTED, confirmedById: actor.id },
    });

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'REJECT',
      entity: 'Payment',
      entityId: paymentId,
      before: { status: payment.status },
      after: { status: rejected.status },
      reason,
    });

    return rejected;
  }

  // Багш+ дүн/арга/огноо/сар/тайлбар засна — бүртгэл, төлбөр, өдөртэй холбоотой
  // ЮМЫГ ч шийдэж чадах ёстой гэсэн эзэмшигчийн шаардлагын гол хэсэг.
  // Засвар бүр before/after-тай, шалтгаан заавал аудит лог-д бичигдэнэ.
  async update(paymentId: string, dto: UpdatePaymentDto, actor: PaymentActor) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Төлбөр олдсонгүй');

    // Зөвхөн ШИЙДВЭРЛЭГДЭЭГҮЙ (PENDING) төлбөрийг чөлөөтэй засна. Баталгаажсан/
    // татгалзсан/буцаасан төлбөрийг энд засварлавал totalPaid аггрегат аль хэдийн
    // олгогдсон UserPass-тай зөрж, нягтлан бодох бүртгэлийн түүхийг чимээгүй
    // дахин бичих эрсдэлтэй. Зөв зам: эхлээд reverse(), дараа нь зөв дүнгээр
    // шинэ төлбөр create() хийх.
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        'Зөвхөн хүлээгдэж буй (PENDING) төлбөрийг засварлаж болно. ' +
          'Баталгаажсан, татгалзсан эсвэл буцаасан төлбөрийг засах шаардлагатай ' +
          'бол эхлээд "Буцаах" (reverse) хийж, дараа нь зөв дүнгээр шинэ ' +
          'төлбөр бүртгэнэ үү.',
      );
    }

    // Мөнгөний зөв байдал: бүхэл MNT, 0-ээс их байх ёстой (float ашиглахгүй)
    if (dto.amount !== undefined && !Number.isInteger(dto.amount)) {
      throw new BadRequestException('Дүн бүхэл тоо байх ёстой');
    }
    if (dto.amount !== undefined && dto.amount <= 0) {
      throw new BadRequestException('Дүн 0-ээс их байх ёстой');
    }

    const data: Prisma.PaymentUpdateInput = {};
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.method !== undefined) data.method = dto.method;
    if (dto.paidAt !== undefined) data.paidAt = new Date(dto.paidAt);
    if (dto.forMonth !== undefined) data.forMonth = dto.forMonth;
    if (dto.description !== undefined) data.description = dto.description;

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data,
    });

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE',
      entity: 'Payment',
      entityId: paymentId,
      before: {
        amount: payment.amount,
        method: payment.method,
        paidAt: payment.paidAt,
        forMonth: payment.forMonth,
        description: payment.description,
      },
      after: {
        amount: updated.amount,
        method: updated.method,
        paidAt: updated.paidAt,
        forMonth: updated.forMonth,
        description: updated.description,
      },
      reason: dto.reason,
    });

    return updated;
  }

  // Баталгаажсан төлбөрийг буцаах: статусыг REVERSED болгож, тухайн төлбөрөөр
  // олгогдсон эрхийг (UserPass) автоматаар цуцална — мөнгө/эрх зөрүүтэй үлдэхгүй
  async reverse(
    paymentId: string,
    dto: ReversePaymentDto,
    actor: PaymentActor,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Төлбөр олдсонгүй');
    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new BadRequestException(
        'Зөвхөн баталгаажсан төлбөрийг буцааж болно',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const revokedPasses = await tx.userPass.findMany({
        where: { paymentId },
      });
      const reversed = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.REVERSED },
      });
      if (revokedPasses.length > 0) {
        await tx.userPass.deleteMany({ where: { paymentId } });
      }
      return {
        payment: reversed,
        revokedUserPassIds: revokedPasses.map((p) => p.id),
      };
    });

    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'REVERSE',
      entity: 'Payment',
      entityId: paymentId,
      before: { status: payment.status },
      after: {
        status: result.payment.status,
        revokedUserPassIds: result.revokedUserPassIds,
      },
      reason: dto.reason,
    });
    for (const userPassId of result.revokedUserPassIds) {
      await this.audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'REVOKE',
        entity: 'UserPass',
        entityId: userPassId,
        reason: `Төлбөр ${paymentId} буцаасны улмаас: ${dto.reason}`,
      });
    }

    return result;
  }

  // Нэг сурагчийн бүх төлбөрийн түүх + хураангуй (хүлээгдэж буй/төлсөн/үлдэгдэл)
  // — "энэ хүүхэд төлсөн үү?" гэдэгт шууд хариулна (SPEC §12, эзэмшигчийн шаардлага)
  async studentHistory(studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        studentProfile: {
          select: { tuitionPlan: true, tuitionAmount: true, tuitionNote: true },
        },
      },
    });
    if (!student || !student.studentProfile) {
      throw new NotFoundException('Сурагчийн профайл олдсонгүй');
    }

    const [payments, paidAgg] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId: studentId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.aggregate({
        where: { userId: studentId, status: PaymentStatus.CONFIRMED },
        _sum: { amount: true },
      }),
    ]);

    const totalPaid = paidAgg._sum.amount ?? 0;
    const expected = student.studentProfile.tuitionAmount ?? 0;

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
      },
      tuitionPlan: student.studentProfile.tuitionPlan,
      tuitionNote: student.studentProfile.tuitionNote,
      summary: {
        expected,
        totalPaid,
        outstanding: expected - totalPaid,
      },
      payments,
    };
  }

  // Тухайн сард дутуу төлсөн, танхимд идэвхтэй бүх сурагч — SQL дотор нэг
  // aggregate-ээр тооцно (JS давталтгүй), Багш+ идэвхтэй хөөцөлдөж чадна
  async outstanding(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Сар YYYY-MM хэлбэртэй байна');
    }
    return this.prisma.$queryRaw<OutstandingRow[]>(Prisma.sql`
      SELECT
        u.id AS "studentId",
        u."firstName" AS "firstName",
        u."lastName" AS "lastName",
        u.phone AS "phone",
        c.id AS "classroomId",
        c.name AS "classroomName",
        sp."tuitionAmount" AS "tuitionAmount",
        sp."tuitionPlan"::text AS "tuitionPlan",
        COALESCE(paid."totalPaid", 0)::int AS "totalPaid",
        (COALESCE(sp."tuitionAmount", 0) - COALESCE(paid."totalPaid", 0))::int
          AS "shortfall"
      FROM "Enrollment" e
      JOIN "User" u ON u.id = e."studentId"
      JOIN "StudentProfile" sp ON sp."userId" = u.id
      JOIN "Classroom" c ON c.id = e."classroomId"
      LEFT JOIN (
        SELECT "userId", SUM(amount) AS "totalPaid"
        FROM "Payment"
        WHERE "forMonth" = ${month} AND status = 'CONFIRMED'
        GROUP BY "userId"
      ) paid ON paid."userId" = u.id
      WHERE e."leftAt" IS NULL
        AND sp.type = 'CLASSROOM'
        AND (COALESCE(sp."tuitionAmount", 0) - COALESCE(paid."totalPaid", 0)) > 0
      ORDER BY "shortfall" DESC
    `);
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
