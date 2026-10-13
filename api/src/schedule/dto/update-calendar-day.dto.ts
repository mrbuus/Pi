import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
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

  @ApiPropertyOptional({
    type: [String],
    description: 'Хамаарах ангиуд (өгвөл солигдоно). Хоосон = БҮХ анги.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  classroomIds?: string[];
}
