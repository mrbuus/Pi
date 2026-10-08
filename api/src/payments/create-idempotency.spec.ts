import { paymentCreateHash, paymentCreateKey } from './create-idempotency';
import { PaymentMethod } from '../generated/prisma/enums';
describe('payment request identity', () => {
  it('normalizes UUID casing and rejects unbounded/arbitrary keys', () => {
    expect(paymentCreateKey('12345678-1234-4234-8234-123456789ABC')).toBe(
      '12345678-1234-4234-8234-123456789abc',
    );
    for (const value of ['', 'other-user', {}, 'x'.repeat(1000)])
      expect(() => paymentCreateKey(value)).toThrow();
    expect(paymentCreateKey(undefined)).toBeUndefined();
  });
  it('uses fixed body fields and detects meaningful payload changes', () => {
    const body = { amount: 1000, method: PaymentMethod.BANK_TRANSFER };
    expect(paymentCreateHash(body)).toBe(
      paymentCreateHash({
        method: PaymentMethod.BANK_TRANSFER,
        amount: 1000,
        description: undefined,
      }),
    );
    expect(paymentCreateHash(body)).not.toBe(
      paymentCreateHash({ ...body, amount: 2000 }),
    );
    expect(paymentCreateHash(body)).not.toBe(
      paymentCreateHash({ ...body, forMonth: '2026-10' }),
    );
    expect(paymentCreateHash(body)).not.toBe(
      paymentCreateHash({ ...body, method: PaymentMethod.CASH }),
    );
  });
});
