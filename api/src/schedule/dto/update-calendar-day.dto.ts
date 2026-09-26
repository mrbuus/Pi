import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { CalendarDayType } from '../../generated/prisma/enums';

export class UpdateCalendarDayDto {
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: CalendarDayType })
  @IsOptional()
  @IsEnum(CalendarDayType)
  type?: CalendarDayType;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}
