import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CHECK_AMOUNT_MAX, CHECK_TITLE_MAX } from './class-checks.logic';

/** Шинэ чек — «Номны мөнгө», дүн (₮) заавал биш */
export class CreateClassCheckDto {
  /** Номын чек бол заавал биш — нэр нь номын нэр болно */
  @ApiPropertyOptional({ maxLength: CHECK_TITLE_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(CHECK_TITLE_MAX + 40) // илүү зайг cleanCheckTitle шахна
  title?: string;

  /** Номын чек (эзэн 2026-11-12): BOOKS-ийн түлхүүр. Дүн (үнэ) заавал. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(24)
  bookKey?: string;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: CHECK_AMOUNT_MAX,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(CHECK_AMOUNT_MAX)
  amount?: number | null;
}

/** Нэр/дүн засах, хаах (archived=true) эсвэл сэргээх (archived=false) */
export class UpdateClassCheckDto {
  @ApiPropertyOptional({ maxLength: CHECK_TITLE_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(CHECK_TITLE_MAX + 40)
  title?: string;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: CHECK_AMOUNT_MAX,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(CHECK_AMOUNT_MAX)
  amount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

/** Нэг сурагчийн тэмдэглэгээ — toggle биш, тодорхой утга (зэрэг дарахад найдвартай) */
export class SetClassCheckMarkDto {
  @ApiProperty()
  @IsBoolean()
  checked: boolean;

  // ── Доорх нь зөвхөн номын чекэд (энгийн чек үл тооно) ──

  /** «Авахгүй» — энэ номыг авахгүй сурагч */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  skipped?: boolean;

  /** Энэ сурагчийн бодит дүн — өгөөгүй бол чекийн үнэ */
  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(CHECK_AMOUNT_MAX)
  amount?: number | null;

  /** Мөнгийг хүлээж авсан багш — өгөөгүй бол тэмдэглэж буй хүн */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  collectedById?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string | null;
}
