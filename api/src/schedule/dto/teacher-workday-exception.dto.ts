import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class TeacherWorkDayExceptionDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  working: boolean;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  note?: string;
}
