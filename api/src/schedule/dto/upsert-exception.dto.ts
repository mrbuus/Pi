import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ScheduleExceptionKind } from '../../generated/prisma/enums';

export class UpsertExceptionDto {
  // Өөрчлөгдөж буй анхны (natural) тохиолдлын огноо
  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: ScheduleExceptionKind })
  @IsEnum(ScheduleExceptionKind)
  kind: ScheduleExceptionKind;

  // MOVED үед — newDate эсвэл шинэ цаг заавал хэрэгтэй
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  newDate?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 1439 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  newStartMinute?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  newEndMinute?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  newRoom?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  note?: string;
}
