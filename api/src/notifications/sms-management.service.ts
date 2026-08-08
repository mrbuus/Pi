import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toE164Mn, toNationalMn } from './phone';
import { calculateSmsSegments } from './sms-segments';
import { SmsService } from './sms.service';

/**
 * SMS удирдлагын үйлчилгээ — endpoint-уудыг дэмжих.
 * - Түүх хайх (шүүлт, хуудаслалт)
 * - Бөөн илгээлт (draft, sending, done)
 * - Template CRUD
 * - Retry logic
 */

export interface SendSmsRequest {
  phone: string;
  text: string;
  kind?: string;
}

export interface BulkSmsRequest {
  phones: string[];
  text: string;
  kind?: string;
  title?: string; // batch-ын нэр
}

export interface BulkSmsEstimate {
  recipientCount: number;
  deduplicatedCount: number;
  estimatedSegments: number;
  estimatedCost: number; // ₮
}

@Injectable()
export class SmsManagementService {
  private readonly logger = new Logger(SmsManagementService.name);

  // SMS нийлүүлэгчийн үнэ (₮/хэсэг) — орчны хувьсагч эсвэл default
  private get pricePerSegment(): number {
    return parseInt(process.env.SMS_PRICE_PER_SEGMENT ?? '100', 10);
  }

  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
  ) {}

  /**
   * Нэг дугаар руу SMS илгээнэ (асинхрон БИШТЭЙ, шууд дараалалд сагс).
   */
  async sendSms(
    request: SendSmsRequest,
    createdByUserId: string,
  ): Promise<{ messageId: string; segments: number }> {
    const phone = toE164Mn(request.phone);
    if (!phone) {
      throw new BadRequestException(`Утасны дугаар танигдсангүй: ${request.phone}`);
    }

    // Дугаарын ҮНЭ хязгаалалт (нэг жижиг SMS-ээр бөөнөөр цэглэхээс сэргийлнэ)
    const recentCount = await this.prisma.smsMessage.count({
      where: {
        toPhone: phone,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // сүүлийн 1 цаг
        },
      },
    });
    if (recentCount >= 5) {
      throw new BadRequestException(
        'Энэ дугаарт сүүлийн 1 цагт аль хэдийн 5 SMS илгээсэн байна. Түр хүлээгээд дахин оролдоно уу.',
      );
    }

    const result = await this.sms.sendAndLog(
      phone,
      request.text,
      createdByUserId,
      (request.kind || 'MANUAL') as any,
    );

    return {
      messageId: result.messageId,
      segments: result.segments,
    };
  }

  /**
   * SMS илгээхийн үнэг таамаглал (дүнгэ орохгүй, зөвхөн тооцоо).
   *
   * Хэрэглэх: бөөн илгээлт эхлэхийн өмнө "хэдий үнэтэй байх вэ"
   * гэдгийг админ/багш+ -д асруулж байна.
   */
  async estimateBulkSms(request: BulkSmsRequest): Promise<BulkSmsEstimate> {
    // 1. Дугаарыг нормчлох, танимагүй сонголтуудыг хаяна
    const validPhones = request.phones
      .map((p) => toNationalMn(p))
      .filter((p): p is string => p !== null);

    // 2. Давхардсан дугаарыг арилгана
    const deduped = new Set(validPhones);

    // 3. SMS хэсгийн тоо (бүгд ИЖИЛ текст)
    const segments = calculateSmsSegments(request.text);

    // 4. Өртөг тооцоо
    const totalSegments = segments * deduped.size;
    const estimatedCost = totalSegments * this.pricePerSegment;

    return {
      recipientCount: request.phones.length,
      deduplicatedCount: deduped.size,
      estimatedSegments: totalSegments,
      estimatedCost,
    };
  }

  /**
   * Бөөн SMS илгээлтийг draft үүсгэж, дараа нь "эхлүүлнэ" гэж дуудна.
   * Энэ нь дүнгэ орохгүй, уршин утасруу илгээхгүй — зөвхөн SmsBatch мөр үүсгэнэ.
   *
   * Дүнгэ оруулахын төлөө орны илгээлтүүд DRAFT мөн удовиршув — хэзээ нь
   * админ/багш+ "SENDING"-т оруулаад дараалалд хөдөлнө.
   */
  async createBulkSmsDraft(
    request: BulkSmsRequest,
    createdByUserId: string,
  ): Promise<{
    batchId: string;
    estimate: BulkSmsEstimate;
    messageIds: string[];
  }> {
    // Үнэг сэргүүлэх + дүнгэ оруулахын үнэ хязгаар (500 SMS хүртэл)
    const estimate = await this.estimateBulkSms(request);
    if (estimate.deduplicatedCount > 500) {
      throw new BadRequestException(
        'Орлого 500 дугаараас ихэж болохгүй байна. Илүүдлийг хэлтэрэгээ авахаа эргүүлэгтэй.',
      );
    }

    // 1. SmsBatch үүсгэнэ
    const batch = await this.prisma.smsBatch.create({
      data: {
        title: request.title || `Бөөн SMS - ${new Date().toLocaleString('mn-MN')}`,
        kind: (request.kind || 'MANUAL') as any,
        total: estimate.deduplicatedCount,
        status: 'DRAFT',
        createdById: createdByUserId,
      },
    });

    // 2. Нэг нэгээр SmsMessage-г QUEUED-д үүсгэнэ (асинхрон эхлүүлэхээс өмнө)
    const deduped = new Set(
      request.phones
        .map((p) => toNationalMn(p))
        .filter((p): p is string => p !== null),
    );

    const messageIds: string[] = [];
    for (const phone of deduped) {
      const message = await this.prisma.smsMessage.create({
        data: {
          toPhone: `+976${phone}`,
          body: request.text,
          status: 'QUEUED' as any,
          kind: (request.kind || 'MANUAL') as any,
          segments: estimate.estimatedSegments / estimate.deduplicatedCount,
          batchId: batch.id,
          createdById: createdByUserId,
        },
      });
      messageIds.push(message.id);
    }

    return {
      batchId: batch.id,
      estimate,
      messageIds,
    };
  }

  /**
   * Бөөн SMS-ийн statys өөрчилж, дараалалд орууллана (async job).
   * SENDING-т оруулахад, бүх SmsMessage-г асинхрон илгээнэ.
   */
  async startBulkSmsSending(
    batchId: string,
  ): Promise<{
    batchId: string;
    status: string;
    queued: number;
  }> {
    const batch = await this.prisma.smsBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new BadRequestException('Batch олдсонгүй');
    }

    if (batch.status !== 'DRAFT') {
      throw new BadRequestException(
        `Batch нь DRAFT байх ёстой, одоо ${batch.status} байна`,
      );
    }

    // Batch-ыг SENDING-д оруулна
    await this.prisma.smsBatch.update({
      where: { id: batchId },
      data: { status: 'SENDING' },
    });

    // TODO: Дараалалд оруулах (Bull/RabbitMQ зэрэг) — одоогоор dummy
    this.logger.log(`SMS batch ${batchId} эхлүүлэлээ: SENDING статусан`);

    const queued = await this.prisma.smsMessage.count({
      where: { batchId, status: 'QUEUED' },
    });

    return {
      batchId,
      status: 'SENDING',
      queued,
    };
  }

  /**
   * SMS мессежийн түүх (цацаж шүүлтүүр + хуудаслалт).
   */
  async getMessages(params: {
    status?: string;
    kind?: string;
    phone?: string;
    fromDate?: Date;
    toDate?: Date;
    skip?: number;
    take?: number;
  }): Promise<{
    messages: any[];
    total: number;
  }> {
    const { status, kind, phone, fromDate, toDate, skip = 0, take = 50 } = params;

    const where: Record<string, any> = {};
    if (status) where.status = status;
    if (kind) where.kind = kind;
    if (phone) where.toPhone = toE164Mn(phone) || phone;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [messages, total] = await Promise.all([
      this.prisma.smsMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(take, 200), // дээд хязгаар
      }),
      this.prisma.smsMessage.count({ where }),
    ]);

    return { messages, total };
  }

  /**
   * Бөөн SMS-ийн түүх (SmsBatch-үүд).
   */
  async getBatches(params: {
    skip?: number;
    take?: number;
  }): Promise<{
    batches: any[];
    total: number;
  }> {
    const { skip = 0, take = 50 } = params;

    const [batches, total] = await Promise.all([
      this.prisma.smsBatch.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(take, 200),
        include: {
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      this.prisma.smsBatch.count(),
    ]);

    return { batches, total };
  }

  /**
   * Амжилтгүй SMS-г дахин оролдоно.
   */
  async retryMessage(messageId: string, createdByUserId: string): Promise<{ status: string }> {
    const message = await this.prisma.smsMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new BadRequestException('SMS олдсонгүй');
    }

    if (message.status !== 'FAILED') {
      throw new BadRequestException('Зөвхөн FAILED статусын мессежийг дахин оролддог');
    }

    // Шинээр оролдоно (sendAndLog ашиглаж бүртгэлнэ)
    try {
      await this.sms.sendAndLog(
        message.toPhone,
        message.body,
        createdByUserId,
        message.kind as any,
        message.templateId ?? undefined,
        message.userId ?? undefined,
      );
      return { status: 'SENT' };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.prisma.smsMessage.update({
        where: { id: messageId },
        data: {
          error: errorMsg.slice(0, 500),
        },
      });
      throw err;
    }
  }

  /**
   * SMS загварын CRUD.
   */
  async createTemplate(
    name: string,
    body: string,
    kind: string,
    createdByUserId: string,
  ): Promise<any> {
    return this.prisma.smsTemplate.create({
      data: {
        name,
        body,
        kind: kind as any,
        createdById: createdByUserId,
      },
    });
  }

  async updateTemplate(
    templateId: string,
    { name, body }: { name?: string; body?: string },
  ): Promise<any> {
    return this.prisma.smsTemplate.update({
      where: { id: templateId },
      data: {
        ...(name && { name }),
        ...(body && { body }),
      },
    });
  }

  async deleteTemplate(templateId: string): Promise<any> {
    return this.prisma.smsTemplate.delete({
      where: { id: templateId },
    });
  }

  async getTemplates(): Promise<any[]> {
    return this.prisma.smsTemplate.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * SMS үйлчилгээний статус — нийлүүлэгч тохируулагдсан эсэх, энэ сарын тоо.
   */
  async getStatus(userId: string): Promise<{
    configured: boolean;
    provider: string | null;
    thisMonthCount: number;
    thisMonthSegments: number;
  }> {
    const configured = this.sms.isConfigured();

    // Энэ сарын SMS тоо
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [count, segmentsResult] = await Promise.all([
      this.prisma.smsMessage.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { in: ['SENT', 'FAILED'] },
        },
      }),
      this.prisma.smsMessage.aggregate({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: 'SENT',
        },
        _sum: { segments: true },
      }),
    ]);

    return {
      configured,
      provider: process.env.SMS_PROVIDER?.toLowerCase() ?? null,
      thisMonthCount: count,
      thisMonthSegments: segmentsResult._sum.segments ?? 0,
    };
  }
}
