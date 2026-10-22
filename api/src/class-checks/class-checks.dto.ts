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
  @ApiProperty({ maxLength: CHECK_TITLE_MAX })
  @IsString()
  @MaxLength(CHECK_TITLE_MAX + 40) // илүү зайг cleanCheckTitle шахна
  title: string;

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
}
