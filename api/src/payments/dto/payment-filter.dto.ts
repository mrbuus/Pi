import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { PaymentStatus } from '../../generated/prisma/enums';

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** `GET /payments` ба `GET /payments/export/csv`-ийн нэг шүүлтүүр */
export class PaymentFilterQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ type: String, example: '2026-10' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Сар YYYY-MM хэлбэртэй байна' })
  month?: string;

  @ApiPropertyOptional({ type: String, example: '2026-10-01' })
  @IsOptional()
  @Matches(DAY, { message: 'Огноо YYYY-MM-DD хэлбэртэй байна' })
  from?: string;

  @ApiPropertyOptional({ type: String, example: '2026-10-31' })
  @IsOptional()
  @Matches(DAY, { message: 'Огноо YYYY-MM-DD хэлбэртэй байна' })
  to?: string;
}
