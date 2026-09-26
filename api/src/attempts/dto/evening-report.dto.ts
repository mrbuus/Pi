import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  problemId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiProperty({ enum: SelfState })
  @IsEnum(SelfState)
  selfState: SelfState;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentSec?: number;
}

export class EveningReportDto {
  // Аль өдрийн хичээлийн тэмдэглэгээ вэ — өгөхгүй бол өнөөдөр (УБ цагаар)
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ type: () => [EveningEntryDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => EveningEntryDto)
  entries: EveningEntryDto[];
}
