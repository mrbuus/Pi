import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Subject } from '../../generated/prisma/enums';

// Нэг цагийн хэв маягийг ХЭД ХЭДЭН долоо хоногийн өдөрт зэрэг үүсгэх
// (жишээ нь 12-р ангийн 1,3,5,6 — Даваа/Лхагва/Баасан/Бямба).
export class BulkCreateScheduleDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ enum: Subject })
  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;

  @ApiProperty({ type: Number, minimum: 0, maximum: 1439 })
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute: number;

  @ApiProperty({ type: Number, minimum: 1, maximum: 1440 })
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute: number;

  @ApiProperty({ type: [Number], minimum: 0, maximum: 6, minItems: 1 })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
