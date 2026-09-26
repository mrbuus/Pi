import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Subject } from '../../generated/prisma/enums';

// Бүх талбар сонголттой — зөвхөн ирсэн талбаруудыг л шинэчилнэ.
export class UpdateScheduleDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  classroomId?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 1439 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute?: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  teacherId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  room?: string | null;

  @ApiPropertyOptional({ enum: Subject, nullable: true })
  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}
