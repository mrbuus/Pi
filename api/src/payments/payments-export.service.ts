import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildPaymentWhere,
  exportFilename,
  paymentsToCsv,
  type PaymentFilters,
} from './payments-export';

/** Нэг экспортын дээд хязгаар — санах ой, Excel-д хүндрэхгүй */
export const PAYMENT_EXPORT_MAX_ROWS = 20000;

@Injectable()
export class PaymentsExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Шүүлтүүрт таарах БҮХ төлбөр (дэлгэцийн 200-ын хязгааргүй) → CSV */
  async csv(
    filters: PaymentFilters,
    actor: { id: string; role: string },
  ): Promise<{ filename: string; body: string }> {
    if (filters.from && filters.to && filters.from > filters.to)
      throw new BadRequestException('Эхлэх огноо дуусах огнооноос хойно байна');
    const rows = await this.prisma.payment.findMany({
      where: buildPaymentWhere(filters),
      select: {
        createdAt: true,
        paidAt: true,
        amount: true,
        method: true,
        status: true,
        description: true,
        forMonth: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            studentCode: true,
            enrollments: {
              where: { leftAt: null },
              orderBy: { joinedAt: 'desc' },
              take: 1,
              select: { classroom: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: PAYMENT_EXPORT_MAX_ROWS + 1,
    });
    if (rows.length > PAYMENT_EXPORT_MAX_ROWS)
      throw new BadRequestException(
        `Нэг экспортод ${PAYMENT_EXPORT_MAX_ROWS} мөрөөс илүүгүй. Огнооны хүрээгээ нарийсгана уу.`,
      );
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'EXPORT',
      entity: 'Payment',
      entityId: 'csv',
      after: { rows: rows.length, filters: { ...filters } },
    });
    return { filename: exportFilename('pimath-tolbor'), body: paymentsToCsv(rows) };
  }
}
