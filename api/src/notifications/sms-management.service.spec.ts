import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';
import { SmsManagementService } from './sms-management.service';

describe('SmsManagementService', () => {
  let service: SmsManagementService;
  let prisma: PrismaService;
  let sms: SmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsManagementService,
        {
          provide: SmsService,
          useValue: {
            send: jest.fn(),
            isConfigured: jest.fn().mockReturnValue(true),
            sendAndLog: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            smsMessage: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              aggregate: jest.fn(),
            },
            smsBatch: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
            smsTemplate: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SmsManagementService>(SmsManagementService);
    prisma = module.get<PrismaService>(PrismaService);
    sms = module.get<SmsService>(SmsService);
  });

  describe('estimateBulkSms', () => {
    it('дугаарыг нормчлох + давхардал арилгах', async () => {
      const result = await service.estimateBulkSms({
        phones: ['99112233', '9911 2233', '+97699112233', '99112233'], // давхардсан
        text: 'Test',
      });

      // Үлдэх дугаар: 1 (давхардал арилсан)
      expect(result.deduplicatedCount).toBe(1);
      expect(result.recipientCount).toBe(4);
    });

    it('SMS хэсгийн тооцоо: англи 1 хэсэг', async () => {
      const result = await service.estimateBulkSms({
        phones: ['99112233'],
        text: 'Hello World', // 11 тэмдэгт, англи, 160/хэсэг → 1 хэсэг
      });

      expect(result.estimatedSegments).toBe(1); // 1 * 1
    });

    it('SMS хэсгийн тооцоо: монгол кирилл 70 т/х', async () => {
      const result = await service.estimateBulkSms({
        phones: ['99112233'],
        text: 'А'.repeat(75), // 75 тэмдэгт кирилл → 70 т/х
      });

      // 75 / 70 = 1.07... → 2 хэсэг
      expect(result.estimatedSegments).toBe(2);
    });

    it('өртөг тооцоо', async () => {
      const result = await service.estimateBulkSms({
        phones: ['99112233', '99223344'],
        text: 'Test', // 1 хэсэг * 2 дугаар * 100 ₮/h
      });

      // 2 * 1 * 100 = 200 ₮
      expect(result.estimatedCost).toBe(200);
    });

    it('буруу дугаарыг үл тоомсорлоно', async () => {
      const result = await service.estimateBulkSms({
        phones: ['99112233', 'invalid', '99223344'],
        text: 'Test',
      });

      // Зөвхөн 2 дугаар
      expect(result.deduplicatedCount).toBe(2);
    });
  });

  describe('sendSms', () => {
    it('нэг дугаар руу SMS илгээнэ', async () => {
      jest
        .spyOn(sms, 'sendAndLog')
        .mockResolvedValue({
          messageId: 'msg-123',
          phone: '+97699112233',
          segments: 1,
          status: 'SENT',
        });

      const result = await service.sendSms(
        { phone: '99112233', text: 'Test', kind: 'MANUAL' },
        'user-123',
      );

      expect(result.messageId).toBe('msg-123');
      expect(result.segments).toBe(1);
      expect(sms.sendAndLog).toHaveBeenCalledWith(
        expect.any(String),
        'Test',
        'user-123',
        'MANUAL',
      );
    });

    it('буруу дугаарыг үл хүлээнэ', async () => {
      await expect(
        service.sendSms({ phone: 'invalid', text: 'Test' }, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('нэг дугаарт rate limit: сүүлийн 1 цагт 5 SMS-ээс ихэж болохгүй', async () => {
      // sendSms() эхлээд count() шалгахаа эргүүлэнэ, дараа нь sendAndLog()
      // count() 5 буцаадаг бол rate limit throw хийнэ
      jest.spyOn(prisma.smsMessage, 'count').mockResolvedValue(5);

      await expect(
        service.sendSms({ phone: '99112233', text: 'Test' }, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createBulkSmsDraft', () => {
    it('batch-ыг DRAFT үүсгэнэ (асинхрон эхлүүлээгүй)', async () => {
      jest.spyOn(prisma.smsBatch, 'create').mockResolvedValue({
        id: 'batch-123',
        title: 'My Batch',
        kind: 'MANUAL' as any,
        status: 'DRAFT' as any,
        total: 2,
        sent: 0,
        failed: 0,
        createdById: 'user-123',
        createdAt: new Date(),
        finishedAt: null,
      });

      jest.spyOn(prisma.smsMessage, 'create').mockResolvedValue({
        id: 'msg-123',
        toPhone: '+97699112233',
        body: 'Test',
        status: 'QUEUED' as any,
        kind: 'MANUAL' as any,
        segments: 1,
        userId: null,
        batchId: 'batch-123',
        templateId: null,
        provider: null,
        providerRef: null,
        error: null,
        createdById: 'user-123',
        createdAt: new Date(),
        sentAt: null,
      } as any);

      const result = await service.createBulkSmsDraft(
        { phones: ['99112233', '99223344'], text: 'Test', title: 'My Batch' },
        'user-123',
      );

      expect(result.batchId).toBe('batch-123');
      expect(result.messageIds).toHaveLength(2);
      expect(prisma.smsBatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'DRAFT',
          total: 2,
        }),
      });
    });

    it('500 дугаараас ихэж болохгүй', async () => {
      const phones = Array.from({ length: 501 }, (_, i) => `${99000000 + i}`);

      await expect(
        service.createBulkSmsDraft({ phones, text: 'Test' }, 'user-123'),
      ).rejects.toThrow(/500/);
    });
  });

  describe('getStatus', () => {
    it('SMS үйлчилгээний статус буцаана', async () => {
      jest.spyOn(prisma.smsMessage, 'count').mockResolvedValue(42);
      jest.spyOn(prisma.smsMessage, 'aggregate').mockResolvedValue({
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
        _sum: { segments: 100 },
      } as any);

      const result = await service.getStatus('user-123');

      expect(result.configured).toBe(true);
      expect(result.thisMonthCount).toBe(42);
      expect(result.thisMonthSegments).toBe(100);
    });
  });

  describe('retryMessage', () => {
    it('FAILED мессежийг дахин оролдоно', async () => {
      jest.spyOn(prisma.smsMessage, 'findUnique').mockResolvedValue({
        id: 'msg-123',
        status: 'FAILED' as any,
        toPhone: '+97699112233',
        body: 'Test',
        kind: 'MANUAL' as any,
        segments: 1,
        userId: null,
        batchId: null,
        templateId: null,
        provider: null,
        providerRef: null,
        error: 'test error',
        createdById: 'user-123',
        createdAt: new Date(),
        sentAt: null,
      } as any);

      jest.spyOn(sms, 'sendAndLog').mockResolvedValue({
        messageId: 'msg-123',
        phone: '+97699112233',
        segments: 1,
        status: 'SENT' as any,
      });
      jest.spyOn(prisma.smsMessage, 'update').mockResolvedValue({} as any);

      const result = await service.retryMessage('msg-123', 'user-123');

      expect(result.status).toBe('SENT');
      expect(sms.sendAndLog).toHaveBeenCalled();
    });

    it('SENT мессежийг дахин оролддог болохгүй', async () => {
      jest.spyOn(prisma.smsMessage, 'findUnique').mockResolvedValue({
        id: 'msg-123',
        status: 'SENT' as any,
      } as any);

      await expect(
        service.retryMessage('msg-123', 'user-123'),
      ).rejects.toThrow(/FAILED/);
    });
  });
});
