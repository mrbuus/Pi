import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { CalendarDayType } from '../../generated/prisma/enums';

export class UpdateCalendarDayDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(CalendarDayType)
  type?: CalendarDayType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  note?: string | null;
}
