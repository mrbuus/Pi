import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AssignmentType } from '../../generated/prisma/enums';

// Даалгавар засах — ангийг эзэмшигч Багш эсвэл Багш+/Админ. Бүх талбар optional.
export class UpdateAssignmentDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

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
  @IsString({ each: true })
  imageKeys?: string[];

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
