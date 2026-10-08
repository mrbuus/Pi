import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CreatePaymentDto } from './dto/payment.dto';
export function paymentCreateKey(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new BadRequestException('Хүсэлтийн дугаар UUID v4 байна');
  return value.toLowerCase();
}
export function paymentCreateHash(dto: CreatePaymentDto) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        amount: dto.amount,
        purchaseId: dto.purchaseId ?? null,
        method: dto.method,
        description: dto.description ?? null,
        forMonth: dto.forMonth ?? null,
      }),
    )
    .digest('hex');
}
