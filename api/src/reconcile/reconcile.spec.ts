import { Test, TestingModule } from '@nestjs/testing';
import { ReconcileService } from './reconcile.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaymentsService } from '../payments/payments.service';
import { BankMatchStatus, PaymentStatus } from '../generated/prisma/enums';

describe('ReconcileService', () => {
  let service: ReconcileService;
  let prisma: PrismaService;
  let audit: AuditService;
  let payments: PaymentsService;

  const mockPrisma = {
    bankTransaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
  };

  const mockAudit = {
    record: jest.fn(),
  };

  const mockPayments = {
    isConfigured: jest.fn(() => false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconcileService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditService,
          useValue: mockAudit,
        },
        {
          provide: PaymentsService,
          useValue: mockPayments,
        },
      ],
    }).compile();

    service = module.get<ReconcileService>(ReconcileService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditService>(AuditService);
    payments = module.get<PaymentsService>(PaymentsService);

    jest.clearAllMocks();
  });

  describe('importFromFile', () => {
    // Хаан банкны бодит хуулгын толгой — parseKhanStatement яг үүнийг таньдаг
    const KHAN_HEADER =
      'Гүйлгээний огноо,Салбар,Эхний үлдэгдэл,Кредит гүйлгээ,Дебит гүйлгээ,Эцсийн үлдэгдэл,Гүйлгээний утга,Харьцсан данс\n';

    it('Хаан банкны толгойг автоматаар таньж кредит мөрүүдийг импортлоно', async () => {
      const csvBuffer = Buffer.from(
        'Хэрэглэгч:,X,,,,,,\n' + // толгойн ӨМНӨХ мета мөр — алгасагдах ёстой
          KHAN_HEADER +
          '2026-01-15 10:00:00,5000,0,50000.00,0,50000.00,Утас: 88112233,1234567890\n' +
          '2026-01-16 11:00:00,5000,50000.00,60000.00,0,110000.00,Утас: 99887766,222222222',
      );

      mockPrisma.user.findMany.mockResolvedValueOnce([
        {
          id: 'user1',
          phone: '88112233',
          studentProfile: { tuitionAmount: 50000 },
        },
      ]);

      mockPrisma.bankTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.bankTransaction.create
        .mockResolvedValueOnce({ id: 'tx1', amount: 50000, bookedAt: new Date() })
        .mockResolvedValueOnce({ id: 'tx2', amount: 60000, bookedAt: new Date() });
      mockPrisma.payment.create.mockResolvedValueOnce({ id: 'pay1' });
      mockPrisma.bankTransaction.update.mockResolvedValueOnce({ id: 'tx1' });

      const result = await service.importFromFile(csvBuffer, 'csv', {} as any, 'admin1');

      expect(result.imported).toBe(2);
      expect(result.matched).toBe(1); // зөвхөн утас+дүн хоёул таарсан нь
      expect(result.errors).toEqual([]);
      // Харьцсан данс counterparty болж хадгалагдана
      expect(mockPrisma.bankTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ counterparty: '1234567890' }),
        }),
      );
    });

    it('bankRef нь агуулгаас детерминистик — ижил мөр дахин импортлоход алгасагдана', async () => {
      const csvBuffer = Buffer.from(
        KHAN_HEADER +
          '2026-01-15 10:00:00,5000,0,50000.00,0,50000.00,Утас: 88112233,1234567890',
      );

      mockPrisma.user.findMany.mockResolvedValueOnce([]);
      // ӨС-д ижил bankRef аль хэдийн байгаа гэж дуурайна
      mockPrisma.bankTransaction.findUnique.mockResolvedValueOnce({ id: 'existing' });

      const result = await service.importFromFile(csvBuffer, 'csv', {} as any, 'admin1');

      expect(result.skipped).toBeGreaterThanOrEqual(1);
      expect(mockPrisma.bankTransaction.create).not.toHaveBeenCalled();
    });

    it('Дебит (кредит=0) мөрийг импортлохгүй', async () => {
      const csvBuffer = Buffer.from(
        KHAN_HEADER +
          '2026-01-15 10:00:00,5000,100000.00,0,-50000.00,50000.00,Түрээс төлөв,333',
      );

      mockPrisma.user.findMany.mockResolvedValueOnce([]);

      const result = await service.importFromFile(csvBuffer, 'csv', {} as any, 'admin1');

      expect(result.imported).toBe(0);
      expect(mockPrisma.bankTransaction.create).not.toHaveBeenCalled();
    });

    it('Толгойгүй файлд ойлгомжтой алдаа өгнө', async () => {
      const csvBuffer = Buffer.from('огноо,дүн\n2026-01-15,50000');
      mockPrisma.user.findMany.mockResolvedValueOnce([]);

      await expect(
        service.importFromFile(csvBuffer, 'csv', {} as any, 'admin1'),
      ).rejects.toThrow('Хуулгын толгой олдсонгүй');
    });

    it('УБ цагийн бүсийн огноог зөв хөрвүүлнэ (+08:00)', async () => {
      const csvBuffer = Buffer.from(
        KHAN_HEADER +
          '2026-01-15 10:00:00,5000,0,50000.00,0,50000.00,тест,1',
      );
      mockPrisma.user.findMany.mockResolvedValueOnce([]);
      mockPrisma.bankTransaction.findUnique.mockResolvedValueOnce(null);
      mockPrisma.bankTransaction.create.mockResolvedValueOnce({ id: 'tx1' });

      await service.importFromFile(csvBuffer, 'csv', {} as any, 'admin1');

      const created = mockPrisma.bankTransaction.create.mock.calls[0][0].data;
      // УБ 10:00 = UTC 02:00
      expect(created.bookedAt.toISOString()).toBe('2026-01-15T02:00:00.000Z');
    });
  });

  describe('getTransactions', () => {
    it('Статус сүүлийн хувьд жагсаалт өгнө', async () => {
      const txs = [
        {
          id: 'tx1',
          bankRef: 'JNL001',
          amount: 50000,
          matchStatus: BankMatchStatus.UNMATCHED,
          matchedUser: null,
        },
      ];

      mockPrisma.bankTransaction.findMany.mockResolvedValueOnce(txs);
      mockPrisma.bankTransaction.count.mockResolvedValueOnce(1);

      const result = await service.getTransactions({
        status: BankMatchStatus.UNMATCHED,
      });

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.items[0].bankRef).toBe('JNL001');
    });
  });

  describe('manualMatch', () => {
    it('Гараар баг банкны гүйлгээг сурагчтай холбоно', async () => {
      mockPrisma.bankTransaction.findUnique.mockResolvedValueOnce({
        id: 'tx1',
        bankRef: 'JNL001',
        amount: 50000,
        matchStatus: BankMatchStatus.UNMATCHED,
        bookedAt: new Date('2026-01-15'),
        description: 'Гүйлгээ',
        accountNo: null,
        counterparty: null,
        matchedUser: null,
      });

      const user = {
        id: 'user1',
        firstName: 'Сарай',
        lastName: 'Нарангоо',
        phone: '88112233',
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce(user);

      mockPrisma.payment.create.mockResolvedValueOnce({
        id: 'pay1',
        userId: 'user1',
        amount: 50000,
      });

      mockPrisma.bankTransaction.update.mockResolvedValueOnce({
        id: 'tx1',
        bankRef: 'JNL001',
        amount: 50000,
        matchStatus: BankMatchStatus.MANUAL_MATCHED,
        matchedUserId: 'user1',
        bookedAt: new Date('2026-01-15'),
        description: 'Гүйлгээ',
        accountNo: null,
        counterparty: null,
        matchedUser: user,
      });

      const result = await service.manualMatch(
        'tx1',
        { userId: 'user1' },
        { id: 'admin1', role: 'ADMIN' },
      );

      expect(result.matchStatus).toBe(BankMatchStatus.MANUAL_MATCHED);
      expect(result.matchedUserId).toBe('user1');
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user1',
          amount: 50000,
          status: PaymentStatus.PENDING,
        }),
      });
    });

    it('UNMATCHED биш гүйлгээ холбохгүй', async () => {
      mockPrisma.bankTransaction.findUnique.mockResolvedValueOnce({
        id: 'tx1',
        bankRef: 'JNL001',
        matchStatus: BankMatchStatus.AUTO_MATCHED,
        matchedUser: null,
      });

      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.manualMatch(
          'tx1',
          { userId: 'user1' },
          { id: 'admin1', role: 'ADMIN' },
        ),
      ).rejects.toThrow('AUTO_MATCHED статустай');
    });
  });

  describe('ignoreTransaction', () => {
    it('Гүйлгээг IGNORED статусруу өөрчилнө', async () => {
      mockPrisma.bankTransaction.findUnique.mockResolvedValueOnce({
        id: 'tx1',
        bankRef: 'JNL001',
        matchStatus: BankMatchStatus.UNMATCHED,
        bookedAt: new Date('2026-01-15'),
        description: 'Гүйлгээ',
        amount: 50000,
        accountNo: null,
        counterparty: null,
        matchedUserId: null,
        matchedUser: null,
      });

      mockPrisma.bankTransaction.update.mockResolvedValueOnce({
        id: 'tx1',
        bankRef: 'JNL001',
        matchStatus: BankMatchStatus.IGNORED,
        bookedAt: new Date('2026-01-15'),
        description: 'Гүйлгээ',
        amount: 50000,
        accountNo: null,
        counterparty: null,
        matchedUserId: null,
        matchedUser: null,
      });

      const result = await service.ignoreTransaction('tx1', {
        id: 'admin1',
        role: 'ADMIN',
      });

      expect(result.matchStatus).toBe(BankMatchStatus.IGNORED);
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IGNORE',
          entity: 'BankTransaction',
        }),
      );
    });
  });
});
