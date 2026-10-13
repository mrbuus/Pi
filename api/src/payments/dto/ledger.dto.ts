import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
