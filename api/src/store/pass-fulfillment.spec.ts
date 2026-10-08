import { StoreService } from './store.service';

describe('transactional store PASS fulfillment', () => {
  function setup(status = 'CONFIRMED') {
    const db: any = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      productItem: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'item',
          kind: 'PASS',
          refId: 'pass',
          active: true,
          price: 1000,
        }),
      },
      pass: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'pass',
            active: true,
            durationDays: 7,
            scope: {},
          }),
      },
      payment: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ userId: 'buyer', amount: 1000, status }),
      },
      purchase: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'purchase', ...data }),
          ),
      },
      userPass: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    db.$transaction = jest.fn().mockImplementation((fn) => fn(db));
    return { db, service: new StoreService(db) };
  }
  it('creates a single-duration entitlement within the settlement transaction', async () => {
    const { db, service } = setup();
    const result = await service.purchase('buyer', 'item', 'payment');
    const data = db.userPass.create.mock.calls[0][0].data;
    expect(data.paymentId).toBe('payment');
    expect(+data.expiresAt - +data.startsAt).toBe(7 * 86400000);
    expect(result.purchase.expiresAt).toEqual(data.expiresAt);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
  it('pending settlement grants neither a pass nor a purchase expiry', async () => {
    const { db, service } = setup('PENDING');
    const result = await service.purchase('buyer', 'item', 'payment');
    expect(db.userPass.create).not.toHaveBeenCalled();
    expect(result.purchase.grantedAt).toBeNull();
    expect(result.purchase.expiresAt).toBeNull();
  });
  it('rejects inactive or invalid duration definitions', async () => {
    for (const pass of [
      { active: false, durationDays: 7, scope: {} },
      { active: true, durationDays: 0 },
    ]) {
      const { db, service } = setup();
      db.pass.findUnique.mockResolvedValue(pass);
      await expect(
        service.purchase('buyer', 'item', 'payment'),
      ).rejects.toThrow();
      expect(db.purchase.create).not.toHaveBeenCalled();
    }
  });
});
