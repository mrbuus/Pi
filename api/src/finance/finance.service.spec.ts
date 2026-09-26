import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FinanceService } from './finance.service';

describe('FinanceService expense changes', () => {
  const expense = {
    id: 'expense-1',
    amount: 1200,
    category: 'RENT',
    description: 'Synthetic rent',
    occurredOn: new Date('2026-09-01T00:00:00.000Z'),
    createdById: 'admin-1',
  };
  let prisma: any;
  let audit: any;
  let service: FinanceService;

  beforeEach(() => {
    prisma = {
      expenseRecord: {
        findUnique: jest.fn().mockResolvedValue(expense),
        update: jest.fn().mockResolvedValue({ ...expense, amount: 1500 }),
        delete: jest.fn().mockResolvedValue(expense),
      },
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new FinanceService(prisma, audit);
  });

  it('rejects non-admin edits before reading or changing a record', async () => {
    await expect(
      service.updateExpense({ id: 'teacher-1', role: 'TEACHER' }, 'expense-1', {
        amount: 1500,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.expenseRecord.findUnique).not.toHaveBeenCalled();
    expect(prisma.expenseRecord.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('updates an existing expense and records before/after audit data', async () => {
    const updated = await service.updateExpense(
      { id: 'admin-2', role: 'ADMIN' },
      'expense-1',
      { amount: 1500, category: 'rent' },
    );

    expect(prisma.expenseRecord.update).toHaveBeenCalledWith({
      where: { id: 'expense-1' },
      data: expect.objectContaining({ amount: 1500, category: 'RENT' }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-2',
        action: 'UPDATE',
        entity: 'ExpenseRecord',
        entityId: 'expense-1',
        before: expense,
        after: updated,
      }),
    );
  });

  it('rejects missing records and invalid amount or category without writing', async () => {
    prisma.expenseRecord.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.updateExpense({ id: 'admin-1', role: 'ADMIN' }, 'missing', {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.updateExpense({ id: 'admin-1', role: 'ADMIN' }, 'expense-1', {
        amount: -1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateExpense({ id: 'admin-1', role: 'ADMIN' }, 'expense-1', {
        category: 'UNKNOWN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.expenseRecord.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects non-admin deletion before reading the record', async () => {
    await expect(
      service.deleteExpense({ id: 'student-1', role: 'STUDENT' }, 'expense-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.expenseRecord.findUnique).not.toHaveBeenCalled();
    expect(prisma.expenseRecord.delete).not.toHaveBeenCalled();
  });

  it('deletes existing expense and audits the prior record', async () => {
    await expect(
      service.deleteExpense({ id: 'admin-2', role: 'ADMIN' }, 'expense-1'),
    ).resolves.toEqual({ success: true });
    expect(prisma.expenseRecord.delete).toHaveBeenCalledWith({
      where: { id: 'expense-1' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-2',
        action: 'DELETE',
        entityId: 'expense-1',
        before: expense,
      }),
    );
  });

  it('does not delete or audit a missing record', async () => {
    prisma.expenseRecord.findUnique.mockResolvedValue(null);
    await expect(
      service.deleteExpense({ id: 'admin-1', role: 'ADMIN' }, 'missing'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.expenseRecord.delete).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
