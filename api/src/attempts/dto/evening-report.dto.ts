import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SelfState } from '../../generated/prisma/enums';

export class EveningEntryDto {
  // Бодлогыг ID-гаар нь ч, token-оор нь ч («100-23-05») зааж болно
  @IsOptional()
  @IsString()
  problemId?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsEnum(SelfState)
  selfState: SelfState;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentSec?: number;
}

export class EveningReportDto {
  // Аль өдрийн хичээлийн тэмдэглэгээ вэ — өгөхгүй бол өнөөдөр (УБ цагаар)
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => EveningEntryDto)
  entries: EveningEntryDto[];
}
