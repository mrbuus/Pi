import { Transform, TransformFnParams } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ClassroomType, Subject } from '../../generated/prisma/enums';

export class CreateClassroomDto {
  @ApiProperty({ type: String })
  @Transform((p: TransformFnParams): unknown =>
    typeof p.value === 'string' ? p.value.trim().replace(/\s+/g, ' ') : p.value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @ApiProperty({ enum: ClassroomType })
  @IsEnum(ClassroomType)
  type: ClassroomType;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 13 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(13) // 13 = төгсөгчдийн анги (импортын «13-x» ангиуд)
  grade?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional({ enum: Subject, nullable: true })
  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject | null;
}
