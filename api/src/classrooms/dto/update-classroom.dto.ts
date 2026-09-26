import { ApiPropertyOptional } from '@nestjs/swagger';
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

// Ангийн мэдээлэл засах — Админ. Бүх талбар optional (partial patch).
export class UpdateClassroomDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ enum: ClassroomType })
  @IsOptional()
  @IsEnum(ClassroomType)
  type?: ClassroomType;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  // Хоосон стринг явуулбал багшгүй болгоно (teacherId цэвэрлэнэ)
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  teacherId?: string | null;
}
