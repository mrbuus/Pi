import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/enums';

// Чөлөөт дүнгийн зарчим: систем үнэ тулгахгүй, хэрэглэгч дүнгээ өөрөө бичнэ (SPEC §12.1)
export class CreatePaymentDto {
  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  clientRequestId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  purchaseId?: string;

  @ApiProperty({ type: Number, minimum: 0, maximum: 2147483647 })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  amount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  description?: string;

  // "2026-09" — аль сарын төлбөр
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Сар YYYY-MM хэлбэртэй байна' })
  forMonth?: string;
}

export class CreateManualPaymentDto extends CreatePaymentDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  userId: string;
}

export class ConfirmPaymentDto {
  // Баталгаажуулахдаа эрх олгох бол — passId зааж өгнө
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  passId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  note?: string;

  // Төлбөрийн дүн сонгосон эрхийн үнээс бага байгааг мэдэж байгаад зориудаар
  // зөвшөөрөх бол л true өгнө (жишээ нь: хэсэгчилсэн хөнгөлөлт). Анхдагчаар
  // дутуу төлбөрөөр эрх олгохыг хориглоно.
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  overrideUnderpay?: boolean;
}

export class RejectPaymentDto {
  // Заавал биш — гэхдээ өгвол аудит лог-д хадгалагдана
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Багш+/Админ бүртгэл/төлбөр/огнооны маргаантай асуудлыг бүрэн засах боломж
// (SPEC/эзэмшигчийн шаардлага): дүн, арга, огноо, сар, тайлбар засна.
// Мөнгөтэй холбоотой ЗАСВАР болгонд шалтгаан заавал (аудит лог-д before/after-тай хамт).
export class UpdatePaymentDto {
  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Дүн 0-ээс их байх ёстой' })
  amount?: number;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  // ISO огноо — төлсөн цагийг нь буруу бичсэн бол засна
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  // "2026-09" — аль сард хамаарахыг нь засна
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Сар YYYY-MM хэлбэртэй байна' })
  forMonth?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty({ message: 'Засварын шалтгааныг заавал бичнэ' })
  reason: string;
}

// Баталгаажсан төлбөрийг буцаах — олгосон эрхийг автоматаар цуцална
export class ReversePaymentDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty({ message: 'Буцаах шалтгааныг заавал бичнэ' })
  reason: string;
}
