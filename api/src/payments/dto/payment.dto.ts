import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/enums';

// Чөлөөт дүнгийн зарчим: систем үнэ тулгахгүй, хэрэглэгч дүнгээ өөрөө бичнэ (SPEC §12.1)
export class CreatePaymentDto {
  @IsInt()
  @Min(1000, { message: 'Дүн 1000₮-өөс багагүй байх ёстой' })
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  description?: string;

  // "2026-09" — аль сарын төлбөр
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Сар YYYY-MM хэлбэртэй байна' })
  forMonth?: string;
}

export class ConfirmPaymentDto {
  // Баталгаажуулахдаа эрх олгох бол — passId зааж өгнө
  @IsOptional()
  @IsString()
  passId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
