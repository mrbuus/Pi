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
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  // Шөнө дундаас хойшхи минут (09:00 = 540)
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute: number;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
