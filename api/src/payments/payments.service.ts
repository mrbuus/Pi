import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { paymentCreateHash, paymentCreateKey } from './create-idempotency';
import { AuditService } from '../audit/audit.service';
import { generateStudentCode } from '../common/codes';
import { QpayService } from '../gateways/qpay.service';
import { Prisma } from '../generated/prisma/client';
import {
  PaymentMethod,
  PaymentStatus,
  StudentType,
  Role,
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

  async readForCheckout(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        amount: true,
        paidAt: true,
      },
    });
    if (!payment) throw new NotFoundException('Төлбөр олдсонгүй');
    return payment;
  }

  async createManual(
    dto: CreatePaymentDto,
    userId: string,
    actor: PaymentActor,
  ) {
    if (dto.method === PaymentMethod.QPAY)
      throw new BadRequestException('Гараар бүртгэх төлбөр QPay байж болохгүй');
    const target = await this.prisma.user.findFirst({
      where: {
        id: userId,
        archivedAt: null,
        role: { in: [Role.STUDENT, Role.BUYER] },
      },
      select: { id: true },
    });
    if (!target)
      throw new BadRequestException(
        'Идэвхтэй сурагч эсвэл худалдан авагч шаардлагатай',
      );
    return this.create(dto, target.id, actor.role, actor.id);
  }

  async create(
    dto: CreatePaymentDto,
    userId: string,
    actorRole: string,
    actorId = userId,
  ) {
    const clientRequestId = paymentCreateKey(dto.clientRequestId);
    const normalizedRequestHash = paymentCreateHash(dto);
    const createNew = async (db: Prisma.TransactionClient | PrismaService) => {
      if (!dto.purchaseId && dto.amount < 1000)
        throw new BadRequestException('Дүн 1000₮-өөс багагүй байна');
      if (dto.purchaseId) {
        if (dto.forMonth)
          throw new BadRequestException(
            'Дэлгүүрийн төлбөрийг сургалтын сартай хольж болохгүй',
          );
        const quote = await db.purchase.findFirst({
          where: { id: dto.purchaseId, userId, grantedAt: null },
          select: {
            price: true,
            expiresAt: true,
            productItem: { select: { active: true, kind: true, refId: true } },
          },
        });
        if (
          !quote ||
          !quote.productItem.active ||
          (quote.expiresAt && quote.expiresAt <= new Date())
        )
          throw new BadRequestException(
            'Өөрийн хүлээгдэж буй идэвхтэй худалдан авалт шаардлагатай',
          );
        const ref = quote.productItem;
        if (
          ref.kind === 'TEST' &&
          !(await db.test.findFirst({
            where: { id: ref.refId, isDraft: false, deletedAt: null },
            select: { id: true },
          }))
        )
          throw new BadRequestException('Шалгалт нийтлэгдээгүй байна');
        if (
          ref.kind === 'BOOK' &&
          !(await db.book.findFirst({
            where: { id: ref.refId, deletedAt: null },
            select: { id: true },
          }))
        )
          throw new BadRequestException('Ном идэвхгүй байна');
        if (
          ref.kind === 'PASS' &&
          !(await db.pass.findFirst({
            where: { id: ref.refId, active: true },
            select: { id: true },
          }))
        )
          throw new BadRequestException('Эрх идэвхгүй байна');
        if (quote.price === 0)
          throw new BadRequestException(
            'Үнэгүй бүтээгдэхүүнийг дэлгүүрээс төлбөргүй нээнэ',
          );
        if (dto.amount !== quote.price)
          throw new BadRequestException(
            'Төлбөрийн дүн худалдан авалтын серверийн үнэтэй таарна',
          );
      } else if (actorRole === 'STUDENT') {
        const student = await db.user.findUnique({
          where: { id: userId },
          select: { studentProfile: { select: { tuitionAmount: true } } },
        });
        const maxAllowed = student?.studentProfile?.tuitionAmount ?? 0;
        if (maxAllowed <= 0 || dto.amount > maxAllowed)
          throw new BadRequestException(
            'Төлбөрийн дүн сургалтын тогтоосон хэмжээнд байна',
          );
      }
      if (dto.method === PaymentMethod.QPAY && !this.qpay.isConfigured())
        throw new BadRequestException(
          'QPay тохиргоо хийгдээгүй байна. Дансаар шилжүүлэх аргыг сонгоно уу.',
        );
      return db.payment.create({
        data: {
          userId,
          storePurchaseId: dto.purchaseId,
          amount: dto.amount,
          method: dto.method,
          description: dto.description,
          forMonth: dto.forMonth,
          clientRequestId,
          normalizedRequestHash: clientRequestId
            ? normalizedRequestHash
            : undefined,
          status: PaymentStatus.PENDING,
          paidAt: dto.method === PaymentMethod.QPAY ? undefined : new Date(),
          invoiceAttemptedAt:
            dto.method === PaymentMethod.QPAY ? new Date() : undefined,
        },
      });
    };
    const result = clientRequestId
      ? await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'payment-create:' + userId + ':' + clientRequestId}))`;
          const replay = await tx.payment.findUnique({
            where: { userId_clientRequestId: { userId, clientRequestId } },
          });
          if (replay) {
            if (replay.normalizedRequestHash !== normalizedRequestHash)
              throw new ConflictException(
                'Ижил хүсэлтийн дугаарт өөр төлбөр өгсөн байна',
              );
            return { payment: replay, created: false };
          }
          return { payment: await createNew(tx), created: true };
        })
      : { payment: await createNew(this.prisma), created: true };
    const payment = result.payment;
    const view = (row: typeof payment, qpay?: unknown) => ({
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      method: row.method,
      status: row.status,
      paidAt: row.paidAt,
      description: row.description,
      forMonth: row.forMonth,
      createdAt: row.createdAt,
      ...(qpay ? { qpay } : {}),
    });
    if (!result.created) {
      if (
        payment.method !== PaymentMethod.QPAY ||
        payment.status !== PaymentStatus.PENDING
      )
        return view(payment);
      if (payment.qpayCheckoutSnapshot)
        return view(payment, payment.qpayCheckoutSnapshot);
      // The first attempt reserves the provider call before network I/O. Unknown acknowledgements require reconciliation, never another invoice call.
      throw new ServiceUnavailableException(
        'Нэхэмжлэлийн төлөв тодорхойгүй байна. Дахин нэхэмжлэл үүсгэхгүй; төлбөрийн төлөвийг шалгуулна уу.',
      );
    }
    await this.audit.record({
      actorId,
      actorRole,
      action: 'CREATE',
      entity: 'Payment',
      entityId: payment.id,
      after: { ...payment },
    });
    if (dto.method !== PaymentMethod.QPAY) return view(payment);
    try {
      const invoice = await this.qpay.createInvoice({
        paymentId: payment.id,
        amount: payment.amount,
        description: payment.description ?? 'Сургалтын төлбөр',
      });
      const qpay = {
        invoiceId: invoice.providerInvoiceId,
        qrText: invoice.qrText,
        qrImage: invoice.qrImage,
        deeplinks: invoice.deeplinks,
      };
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          qpayInvoiceId: invoice.providerInvoiceId,
          qpayCheckoutSnapshot: JSON.parse(
            JSON.stringify(qpay),
          ) as Prisma.InputJsonValue,
        },
      });
      return view(payment, qpay);
    } catch {
      throw new ServiceUnavailableException(
        'Нэхэмжлэлийн төлөв тодорхойгүй байна. Дахин нэхэмжлэл үүсгэхгүй; төлбөрийн төлөвийг шалгуулна уу.',
      );
    }
  }

  /**
   * QPay-гээс баталгаажсан төлбөрийг бүртгэнэ.
   *
   * 🔒 Энэ метод callback-ийн БИЕИЙГ ИТГЭДЭГГҮЙ. GatewaysController нь эхлээд
   * QPay-ийн /v2/payment/check рүү өөрөө хандаж баталгаажуулаад, зөвхөн
   * баталгаажсан үр дүнг энд дамжуулна. Тиймээс хуурамч callback илгээх
   * халдлага үр дүнгүй болно.
   *
   * 🎯 ИДЕМПОТЕНТ: providerPaymentId @unique индекс ӨС дээр баттай (race
   * condition авирах). Callback/polling хоёулаа нэг гүйлгээг барихад давхар
   * боловсруулалтгүй, "аль хэдийн баталгаажсан" гэж хариулна.
   *
   * Мөн дүнг дахин шалгана — дутуу төлөлт эрх нээхгүй.
   */
  async confirmQpayPayment(params: {
    qpayInvoiceId: string;
    paidAmount: number;
    providerPaymentId?: string;
  }) {
    // ИДЕМПОТЕНТ: providerPaymentId аль хэдийн уусон уу?
    // Энэ бол хоёр дахь дуудлага (callback давтан + polling, эсвэл callback хоёр удаа).
    if (params.providerPaymentId) {
      const existing = await this.prisma.payment.findFirst({
        where: { providerPaymentId: params.providerPaymentId },
      });
      if (existing) {
        // Аль хэдийн боловсруулагдсан, чимээгүй амжилттай буцаа
        return { handled: true, paymentId: existing.id };
      }
    }

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

    try {
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CONFIRMED,
          paidAt: new Date(),
          // providerPaymentId @unique, race condition ӨС түвшинд хамгаалагдана
          providerPaymentId: params.providerPaymentId || undefined,
        },
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
    } catch (err: unknown) {
      // P2002 = Unique constraint violation (race condition)
      if ((err as any)?.code === 'P2002') {
        // Өөр процесс түүнийг аль хэдийн баталгаажуулсан
        const alreadyConfirmed = await this.prisma.payment.findFirst({
          where: { providerPaymentId: params.providerPaymentId },
        });
        if (alreadyConfirmed) {
          // Чимээгүй хариулна
          return { handled: true, paymentId: alreadyConfirmed.id };
        }
      }
      throw err;
    }
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

    // Сөүлийн профайлын мэдээлэл авна (код үүсгэлтийн хүлээлтийг шалгах)
    const user = await this.prisma.user.findUnique({
      where: { id: payment.userId },
      select: {
        id: true,
        studentCode: true,
        studentProfile: {
          select: { approvalPending: true, grade: true },
        },
      },
    });

    let grantedPass: Awaited<ReturnType<PassesService['grant']>> | null = null;
    const confirmed = await this.prisma.$transaction(async (tx) => {
      if (dto.passId)
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'pass:' + payment.userId + ':' + dto.passId}))`;
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} FOR UPDATE`;
      const confirmed = await tx.payment.update({
        where: {
          id: paymentId,
          status: PaymentStatus.PENDING,
          amount: payment.amount,
        },
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

      if (dto.passId)
        grantedPass = await this.passes.grant(
          dto.passId,
          payment.userId,
          paymentId,
          actor,
          false,
          undefined,
          tx,
        );
      return confirmed;
    });

    // 🎯 Онлайнаар CLASSROOM-р бүртгүүлсэн сурагчийн кодыг үүсгэ:
    // - STUDENT төрлийн, studentCode==null, approvalPending=false
    // 🎯 approvalPending=false үед админ баталгаа өгсөн гэсэн үг, эс бөгөөс кодын
    //   үүсгэлт дараа ирнэ.
    if (
      user &&
      user.studentCode === null &&
      user.studentProfile &&
      !user.studentProfile.approvalPending
    ) {
      const newCode = await generateStudentCode(this.prisma, {
        branch: null, // салаа эзэмшилийн дараа тогтоно
        grade: user.studentProfile.grade ?? 12,
        registeredAt: new Date(),
      });
      await this.prisma.user.update({
        where: { id: payment.userId },
        data: { studentCode: newCode },
      });
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
      where: { id: paymentId, status: PaymentStatus.PENDING },
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
      where: { id: paymentId, status: PaymentStatus.PENDING },
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
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} FOR UPDATE`;
      const current = await tx.payment.findUnique({ where: { id: paymentId } });
      if (current?.status !== PaymentStatus.CONFIRMED)
        throw new BadRequestException('Төлбөрийн төлөв өөрчлөгдсөн байна');
      const revokedPasses = await tx.userPass.findMany({
        where: { paymentId },
      });
      const reversed = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.REVERSED },
      });
      await tx.purchase.updateMany({
        where: { paymentId },
        data: { grantedAt: null, expiresAt: new Date() },
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
