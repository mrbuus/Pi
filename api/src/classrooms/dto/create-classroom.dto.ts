import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ClassroomType } from '../../generated/prisma/enums';

export class CreateClassroomDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ClassroomType })
  @IsEnum(ClassroomType)
  type: ClassroomType;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  teacherId?: string;
}
