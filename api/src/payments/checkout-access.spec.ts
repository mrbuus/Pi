import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentMethod, Role } from '../generated/prisma/enums';

describe('checkout ownership and explicit manual target', () => {
  const own = {
    id: 'payment',
    userId: 'buyer',
    amount: 1000,
    status: 'PENDING',
    paidAt: null,
  };
  let controller: PaymentsController;
  let payments: any;
  let caps: any;
  beforeEach(() => {
    payments = {
      readForCheckout: jest.fn().mockResolvedValue(own),
      create: jest.fn(),
      createManual: jest.fn(),
    };
    caps = { assert: jest.fn().mockResolvedValue(undefined) };
    controller = new PaymentsController(payments, caps);
  });
  it('returns only checkout fields to owner and denies other buyer/parent', async () => {
    expect(
      await controller.checkout('payment', {
        user: { userId: 'buyer', role: Role.BUYER },
      }),
    ).toEqual({ id: 'payment', amount: 1000, status: 'PENDING', paidAt: null });
    for (const role of [Role.BUYER, Role.PARENT])
      await expect(
        controller.checkout('payment', { user: { userId: 'other', role } }),
      ).rejects.toThrow();
    expect(caps.assert).not.toHaveBeenCalled();
  });
  it('checks live finance capability before exposing another pupil payment', async () => {
    caps.assert.mockRejectedValue(new Error('revoked'));
    await expect(
      controller.checkout('payment', {
        user: { userId: 'plus', role: Role.TEACHER_PLUS },
      }),
    ).rejects.toThrow('revoked');
    expect(caps.assert).toHaveBeenCalledWith('plus', 'finance.manage');
  });
  it('buyer creation remains actor-owned and pending service controls settlement', async () => {
    const dto = { amount: 1000, method: PaymentMethod.CASH };
    await controller.create(dto, {
      user: { userId: 'buyer', role: Role.BUYER },
    });
    expect(payments.create).toHaveBeenCalledWith(dto, 'buyer', Role.BUYER);
    expect(caps.assert).not.toHaveBeenCalled();
  });
  it('manual targets require active pupil role and never invoke provider', async () => {
    const prisma: any = {
      user: { findFirst: jest.fn().mockResolvedValue(null) },
      payment: { create: jest.fn() },
    };
    const qpay: any = { createInvoice: jest.fn() };
    const service = new PaymentsService(prisma, {} as any, {} as any, qpay);
    await expect(
      service.createManual(
        { amount: 1000, method: PaymentMethod.CASH },
        'archived',
        { id: 'admin', role: Role.ADMIN },
      ),
    ).rejects.toThrow();
    expect(prisma.user.findFirst.mock.calls[0][0].where).toEqual({
      id: 'archived',
      archivedAt: null,
      role: { in: [Role.STUDENT, Role.BUYER] },
    });
    await expect(
      service.createManual(
        { amount: 1000, method: PaymentMethod.QPAY },
        'buyer',
        { id: 'admin', role: Role.ADMIN },
      ),
    ).rejects.toThrow();
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(qpay.createInvoice).not.toHaveBeenCalled();
  });
});
