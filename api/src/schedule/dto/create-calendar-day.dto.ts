import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CalendarDayType } from '../../generated/prisma/enums';

export class CreateCalendarDayDto {
  @IsDateString()
  date: string;

  @IsEnum(CalendarDayType)
  type: CalendarDayType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  note?: string;
}
