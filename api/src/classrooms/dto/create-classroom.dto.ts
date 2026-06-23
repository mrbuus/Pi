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
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ClassroomType)
  type: ClassroomType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  @IsOptional()
  @IsString()
  teacherId?: string;
}
