import { ValidationPipe } from '@nestjs/common';
import {
  CancelRefundDto,
  CreateRefundDto,
  MarkAsPaidDto,
} from './tuition.controller';

// Глобал pipe-тэй ижил тохиргоо (main.ts). Декораторгүй талбар хасагдвал
// буцаалтын урсгал бүхэлдээ хоосон биетэй ажиллана — үүнийг хамгаална.
const pipe = new ValidationPipe({ whitelist: true, transform: true });
const body = (metatype: new () => object, value: object) =>
  pipe.transform(value, { type: 'body', metatype });

describe('Tuition refund DTOs', () => {
  it('keeps create fields through the whitelist pipe', async () => {
    const dto = (await body(CreateRefundDto, {
      studentId: 's1',
      classroomId: 'c1',
      leftOn: '2026-09-01',
    })) as CreateRefundDto;
    expect(dto).toMatchObject({ studentId: 's1', classroomId: 'c1', leftOn: '2026-09-01' });
  });

  it('rejects a malformed leftOn date', async () => {
    await expect(
      body(CreateRefundDto, { studentId: 's1', classroomId: 'c1', leftOn: '09/01/2026' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('keeps paymentMethod and cancelReason', async () => {
    expect(await body(MarkAsPaidDto, { paymentMethod: 'CASH' })).toMatchObject({ paymentMethod: 'CASH' });
    expect(await body(CancelRefundDto, { cancelReason: 'Шилжсэн' })).toMatchObject({ cancelReason: 'Шилжсэн' });
  });

  it('rejects an unknown payment method', async () => {
    await expect(body(MarkAsPaidDto, { paymentMethod: 'GOLD' })).rejects.toMatchObject({ status: 400 });
  });
});
