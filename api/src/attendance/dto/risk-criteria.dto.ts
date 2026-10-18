import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

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
}
