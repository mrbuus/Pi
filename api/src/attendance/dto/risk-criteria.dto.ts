import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

/** Асуудалтай сурагчийн шалгуур — мужийг сервис шалгана (board-logic CRITERIA_LIMITS) */
export class RiskCriteriaDto {
  @ApiProperty({ enum: [7, 14, 30, 60, 90] })
  @IsInt()
  windowDays: number;

  @ApiProperty({ minimum: 50, maximum: 100 })
  @IsInt()
  minAttendance: number;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  maxAbsences: number;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  maxLates: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsInt()
  minHomework: number;

  @ApiProperty({ minimum: 1, maximum: 6 })
  @IsInt()
  missingStreak: number;

  /** Сүүлийн шалгалтын хувь үүнээс бага бол (0 = тооцохгүй); ирүүлээгүй бол анхдагч 50 */
  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 50 })
  @IsOptional()
  @IsInt()
  minQuiz?: number;
}
