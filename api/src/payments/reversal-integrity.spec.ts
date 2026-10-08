import { PaymentsService } from './payments.service';
import { PaymentMethod } from '../generated/prisma/enums';
describe('payment failure and reversal integrity', () => {
  it('rejects unavailable QPay before persisting a payable row', async () => {
    const db = { payment: { create: jest.fn() } };
    const service = new PaymentsService(
      db as never,
      {} as never,
      {} as never,
      { isConfigured: () => false } as never,
    );
    await expect(
      service.create(
        { amount: 1000, method: PaymentMethod.QPAY },
        'admin',
        'ADMIN',
      ),
    ).rejects.toThrow('QPay');
    expect(db.payment.create).not.toHaveBeenCalled();
  });
  it('revokes store purchases and passes together with the confirmed payment', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      payment: {
        findUnique: jest.fn().mockResolvedValue({ status: 'CONFIRMED' }),
        update: jest.fn().mockResolvedValue({ status: 'REVERSED' }),
      },
      purchase: { updateMany: jest.fn() },
      userPass: {
        findMany: jest.fn().mockResolvedValue([{ id: 'pass' }]),
        deleteMany: jest.fn(),
      },
    };
    const db = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({ status: 'CONFIRMED' }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    await new PaymentsService(
      db as never,
      {} as never,
      { record: jest.fn() } as never,
      {} as never,
    ).reverse(
      'payment',
      { reason: 'synthetic reversal' },
      { id: 'admin', role: 'ADMIN' },
    );
    expect(tx.purchase.updateMany.mock.calls[0][0]).toEqual({
      where: { paymentId: 'payment' },
      data: { grantedAt: null, expiresAt: expect.any(Date) },
    });
    expect(tx.userPass.deleteMany).toHaveBeenCalledWith({
      where: { paymentId: 'payment' },
    });
  });
});
