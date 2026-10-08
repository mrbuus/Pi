import { StoreService } from './store.service';
describe('store cash and order summary', () => {
  it('counts confirmed cash once across both links and separates unfunded and paid-pending quotes', async () => {
    const quote = (
      id: string,
      price: number,
      paymentId: string | null,
      grantedAt: Date | null,
    ) => ({ id, price, paymentId, grantedAt, expiresAt: null });
    const db: any = {
      purchase: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            quote('owned', 1000, 'paid', new Date()),
            quote('waiting', 2000, null, null),
            quote('unpaid', 3000, 'pending', null),
            quote('reversed', 4000, 'reversed', new Date()),
            quote('free', 0, null, new Date()),
          ]),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'paid',
            amount: 1500,
            status: 'CONFIRMED',
            paidAt: new Date(),
            storePurchaseId: 'owned',
          },
          {
            id: 'pending',
            amount: 3000,
            status: 'PENDING',
            paidAt: new Date(),
            storePurchaseId: 'unpaid',
          },
          {
            id: 'waiting-paid',
            amount: 2500,
            status: 'CONFIRMED',
            paidAt: new Date(),
            storePurchaseId: 'waiting',
          },
          {
            id: 'reversed',
            amount: 4000,
            status: 'REVERSED',
            paidAt: new Date(),
            storePurchaseId: 'reversed',
          },
        ]),
      },
    };
    const result = await new StoreService(db).adminGetRevenueSummary();
    expect(result).toMatchObject({
      cashReceived: 4000,
      confirmedReceiptCount: 2,
      totalRevenue: 4000,
      confirmedRevenue: 4000,
      totalOrderValue: 10000,
      pendingQuoteValue: 3000,
      awaitingFulfillmentValue: 2000,
      netAfterSeparateRefunds: null,
    });
  });
  it('a pending quote or granted product without confirmed dated receipt creates no income', async () => {
    const db: any = {
      purchase: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'quote',
            price: 500,
            paymentId: null,
            grantedAt: null,
            expiresAt: null,
          },
          {
            id: 'legacy-grant',
            price: 900,
            paymentId: 'undated',
            grantedAt: new Date(),
            expiresAt: null,
          },
        ]),
      },
      payment: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              id: 'undated',
              amount: 900,
              status: 'CONFIRMED',
              paidAt: null,
              storePurchaseId: 'legacy-grant',
            },
          ]),
      },
    };
    expect(await new StoreService(db).adminGetRevenueSummary()).toMatchObject({
      cashReceived: 0,
      pendingQuoteValue: 500,
      totalOrderValue: 1400,
    });
  });
});
