import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class LedgerBoardQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  classroomId?: string;

  @ApiPropertyOptional({ enum: ['problems', 'promises'] })
  @IsOptional()
  @IsIn(['problems', 'promises'])
  view?: 'problems' | 'promises';

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

// Гараар бүртгэх төлбөр — бэлэн эсвэл данс (QPay гараар бүртгэгдэхгүй)
export class LedgerPayDto {
  @ApiProperty({ type: Number, minimum: 1000 })
  @IsInt({ message: 'Дүн бүхэл тоо байна' })
  @Min(1000, { message: 'Дүн 1000₮-өөс багагүй байна' })
  @Max(50_000_000)
  amount: number;

  @ApiProperty({ enum: ['CASH', 'BANK_TRANSFER'] })
  @IsIn(['CASH', 'BANK_TRANSFER'])
  method: 'CASH' | 'BANK_TRANSFER';

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Огноо ЖЖЖЖ-СС-ӨӨ хэлбэртэй байна' })
  paidOn?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Сар YYYY-MM хэлбэртэй байна' })
  forMonth?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  clientRequestId?: string;
}

// Багш+ / Админ: «бүтэн жил» гэж тооцох (full=true) эсвэл системийн тооцоонд
// буцаах (full=false). Төлсөн дүнд хүрэхгүй — зөвхөн төлөв (эзэн 2026-10-31).
export class LedgerSettleDto {
  @ApiProperty({ type: Boolean })
  @IsBoolean()
  full: boolean;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

/**
 * Сар бүрийн төлбөрийн хугацаа сунгах (эзэн 2026-11-12) — хэмжээ хязгааргүй, шалтгаан заавал.
 * Хоёр хэлбэр: (month + days) эсвэл «ирээгүй» хугацаа (gapFrom + gapTo, эзэн 2026-11-16) — сервер
 * хоног, сарыг өөрөө тооцно.
 */
export class LedgerExtendDto {
  @ApiPropertyOptional({ type: String, example: '2026-09' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Сар YYYY-MM хэлбэртэй байх ёстой' })
  month?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Сунгах хоног 1-ээс багагүй' })
  @Max(365)
  days?: number;

  @ApiPropertyOptional({ type: String, example: '2026-10-10' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Өдөр YYYY-MM-DD хэлбэртэй байх ёстой' })
  gapFrom?: string;

  @ApiPropertyOptional({ type: String, example: '2026-10-20' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Өдөр YYYY-MM-DD хэлбэртэй байх ёстой' })
  gapTo?: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(300)
  @Matches(/\S/, { message: 'Шалтгаанаа бичнэ үү' })
  reason: string;
}

/** Энэ жил суж эхэлсэн өдөр (эзэн 2026-11-16); on = null бол гараар тавьсныг арилгана */
export class LedgerCycleStartDto {
  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-09-07' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Өдөр YYYY-MM-DD хэлбэртэй байх ёстой' })
  on?: string | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
