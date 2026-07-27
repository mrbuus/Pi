import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
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

export class RejectPaymentDto {
  // Заавал биш — гэхдээ өгвол аудит лог-д хадгалагдана
  @IsOptional()
  @IsString()
  reason?: string;
}

// Багш+/Админ бүртгэл/төлбөр/огнооны маргаантай асуудлыг бүрэн засах боломж
// (SPEC/эзэмшигчийн шаардлага): дүн, арга, огноо, сар, тайлбар засна.
// Мөнгөтэй холбоотой ЗАСВАР болгонд шалтгаан заавал (аудит лог-д before/after-тай хамт).
export class UpdatePaymentDto {
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Дүн 0-ээс их байх ёстой' })
  amount?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  // ISO огноо — төлсөн цагийг нь буруу бичсэн бол засна
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  // "2026-09" — аль сард хамаарахыг нь засна
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Сар YYYY-MM хэлбэртэй байна' })
  forMonth?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'Засварын шалтгааныг заавал бичнэ' })
  reason: string;
}

// Баталгаажсан төлбөрийг буцаах — олгосон эрхийг автоматаар цуцална
export class ReversePaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Буцаах шалтгааныг заавал бичнэ' })
  reason: string;
}
