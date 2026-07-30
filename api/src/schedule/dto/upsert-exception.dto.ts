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
  @IsDateString()
  date: string;

  @IsEnum(ScheduleExceptionKind)
  kind: ScheduleExceptionKind;

  // MOVED үед — newDate эсвэл шинэ цаг заавал хэрэгтэй
  @IsOptional()
  @IsDateString()
  newDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  newStartMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  newEndMinute?: number;

  @IsOptional()
  @IsString()
  newRoom?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
