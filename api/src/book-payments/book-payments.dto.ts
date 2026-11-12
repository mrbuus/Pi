import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BOOK_AMOUNT_MAX, BOOK_NOTE_MAX } from './book-payments.logic';

/** Сурагчийн хуудаснаас: PAID = өгсөн, SKIPPED = авахгүй, NONE = тэмдэглэгээг болиулах */
export class SetBookPaymentDto {
  @ApiProperty({ enum: ['PAID', 'SKIPPED', 'NONE'] })
  @IsIn(['PAID', 'SKIPPED', 'NONE'])
  status: 'PAID' | 'SKIPPED' | 'NONE';

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    maximum: BOOK_AMOUNT_MAX,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(BOOK_AMOUNT_MAX)
  amount?: number | null;

  /** Мөнгийг хүлээж авсан багш — өгөөгүй бол тэмдэглэж буй хүн */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  collectedById?: string;

  /** Мөнгөө өгөх үед сууж байсан анги; null = ангигүй */
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  classroomId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: BOOK_NOTE_MAX,
  })
  @IsOptional()
  @IsString()
  @MaxLength(BOOK_NOTE_MAX + 40)
  note?: string | null;
}
