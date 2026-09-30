import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CalendarDayType } from '../../generated/prisma/enums';

export class CreateCalendarDayDto {
  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: CalendarDayType })
  @IsEnum(CalendarDayType)
  type: CalendarDayType;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  note?: string;
}
