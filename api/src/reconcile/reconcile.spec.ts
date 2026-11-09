import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReconcileService } from './reconcile.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';

// Гараар хуваарилах үеийн хамгаалалт — ӨС-д хүрэхээс өмнө татгалзах ёстой.
describe('ReconcileService.allocate шалгалт', () => {
  const row = { id: 't1', amount: 380_000, direction: 'CREDIT', description: 'Тэмүүлэн', counterparty: null, accountNo: 'A', suggestion: null };
  const prisma = {
    bankTransaction: { findUnique: jest.fn() },
    user: { count: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new ReconcileService(prisma as unknown as PrismaService, { record: jest.fn() } as unknown as AuditService, { writeTuition: jest.fn(async () => []) } as never);
  const actor = { id: 'u', role: 'TEACHER_PLUS' };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.bankTransaction.findUnique.mockResolvedValue(row);
    prisma.user.count.mockResolvedValue(1);
  });

  it('гүйлгээ олдохгүй', async () => {
    prisma.bankTransaction.findUnique.mockResolvedValue(null);
    await expect(service.allocate('x', { parts: [{ kind: 'OTHER', amount: 1 }] }, actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('хэсгүүдийн нийлбэр дүнтэй тэнцэхгүй бол татгалзана', async () => {
    await expect(service.allocate('t1', { parts: [{ kind: 'TUITION', amount: 350_000, studentId: 'k' }] }, actor)).rejects.toThrow(/нийлбэр/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('сургалтын төлбөрт хүүхэд заавал', async () => {
    await expect(
      service.allocate('t1', { parts: [{ kind: 'TUITION', amount: 350_000 }, { kind: 'BOOK', amount: 30_000 }] }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('зарлагыг сургалтын төлбөр болгохгүй', async () => {
    prisma.bankTransaction.findUnique.mockResolvedValue({ ...row, direction: 'DEBIT' });
    await expect(service.allocate('t1', { parts: [{ kind: 'TUITION', amount: 380_000, studentId: 'k' }] }, actor)).rejects.toThrow(/Зарлагыг/);
  });

  it('байхгүй хүүхэд', async () => {
    prisma.user.count.mockResolvedValue(0);
    await expect(service.allocate('t1', { parts: [{ kind: 'TUITION', amount: 380_000, studentId: 'zz' }] }, actor)).rejects.toThrow(/олдсонгүй/);
  });
});
