import { IsDateString, IsNotEmpty, IsString, Matches } from 'class-validator';

export class WeeklyReportQueryDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  week!: string;
}
