import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  Matches,
  MaxLength,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AssignmentType } from '../../generated/prisma/enums';

export class CreateAssignmentDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: AssignmentType })
  @IsOptional()
  @IsEnum(AssignmentType)
  type?: AssignmentType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @MaxLength(200, { each: true })
  @Matches(/^[\w][\w.-]*$/, { each: true })
  @IsString({ each: true })
  imageKeys?: string[];

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  /** Даалгавар өгсөн хичээлийн өдөр (YYYY-MM-DD). Хичээлгүй өдөр бол өмнөх хичээл рүү шилжинэ */
  @ApiPropertyOptional({ type: String, example: '2026-10-26' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  lessonDate?: string;
}
