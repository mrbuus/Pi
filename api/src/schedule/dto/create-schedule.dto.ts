import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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

// Долоо хоногийн өдөр: 0=Ням, 1=Даваа … 6=Бямба (JS Date.getDay()-тэй ижил —
// ClassSchedule.weekday-ийн коммент харна уу).
export class CreateScheduleDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiProperty({ type: Number, minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  // Шөнө дундаас хойшхи минут (09:00 = 540)
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

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
