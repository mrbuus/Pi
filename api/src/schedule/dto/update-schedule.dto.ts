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
  @IsOptional()
  @IsString()
  classroomId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute?: number;

  @IsOptional()
  @IsString()
  teacherId?: string | null;

  @IsOptional()
  @IsString()
  room?: string | null;

  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject | null;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}
