import { StoreService } from './store.service';
function setup(
  payment: object = {
    userId: 'buyer',
    amount: 100,
    status: 'CONFIRMED',
    forMonth: null,
  },
  used: unknown = null,
) {
  const db = {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    productItem: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'item',
        kind: 'BOOK',
        price: 100,
        active: true,
      }),
    },
    book: { findFirst: jest.fn().mockResolvedValue({ id: 'book' }) },
    payment: { findUnique: jest.fn().mockResolvedValue(payment) },
    userPass: { findFirst: jest.fn().mockResolvedValue(null) },
    purchase: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'old-quote' }),
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(used),
      create: jest.fn().mockResolvedValue({ id: 'purchase' }),
    },
  };
  db.$transaction.mockImplementation((callback) => callback(db));
  return { db, service: new StoreService(db as never) };
}
describe('store settlement integrity', () => {
  it.each([
    [{ userId: 'buyer', amount: 1, status: 'CONFIRMED' }, 'үнээс бага'],
    [{ userId: 'other', amount: 100, status: 'CONFIRMED' }, 'хамаарахгүй'],
    [
      {
        userId: 'buyer',
        amount: 100,
        status: 'CONFIRMED',
        forMonth: '2026-10',
      },
      'Сарын',
    ],
    [{ userId: 'buyer', amount: 100, status: 'REVERSED' }, 'Цуцлагдсан'],
  ])(
    'rejects invalid settlement before creating entitlement',
    async (payment, message) => {
      const { db, service } = setup(payment);
      await expect(
        service.purchase('buyer', 'item', 'payment'),
      ).rejects.toThrow(message);
      expect(db.purchase.create).not.toHaveBeenCalled();
    },
  );
  it('rejects an already-consumed payment', async () => {
    const { db, service } = setup(undefined, { id: 'other-purchase' });
    await expect(service.purchase('buyer', 'item', 'payment')).rejects.toThrow(
      'аль хэдийн',
    );
    expect(db.purchase.create).not.toHaveBeenCalled();
  });
  it('does not grant access from a pending settlement', async () => {
    const { db, service } = setup({
      userId: 'buyer',
      amount: 100,
      status: 'PENDING',
    });
    await service.purchase('buyer', 'item', 'payment');
    expect(db.purchase.create.mock.calls[0][0].data.grantedAt).toBeNull();
  });
  it('binds a receipt to its own original quote rather than another product', async () => {
    const { db, service } = setup({
      userId: 'buyer',
      amount: 100,
      status: 'CONFIRMED',
      storePurchaseId: 'old-quote',
    });
    db.purchase.findUnique.mockResolvedValue({
      id: 'old-quote',
      userId: 'buyer',
      productItemId: 'other-item',
      price: 70,
      grantedAt: null,
      expiresAt: null,
    });
    await expect(
      service.purchase('buyer', 'item', 'payment'),
    ).rejects.toThrow();
    expect(db.purchase.update).not.toHaveBeenCalled();
  });
  it('fulfills the recorded quote and preserves its price snapshot', async () => {
    const { db, service } = setup({
      userId: 'buyer',
      amount: 100,
      status: 'CONFIRMED',
      storePurchaseId: 'old-quote',
    });
    db.purchase.findUnique.mockResolvedValue({
      id: 'old-quote',
      userId: 'buyer',
      productItemId: 'item',
      price: 70,
      grantedAt: null,
      expiresAt: null,
    });
    await service.purchase('buyer', 'item', 'payment');
    expect(db.purchase.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'old-quote' } }),
    );
    expect(db.purchase.create).not.toHaveBeenCalled();
    expect(db.purchase.update.mock.calls[0][0].data).not.toHaveProperty(
      'price',
    );
  });
});
