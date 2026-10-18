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
import { ClassroomType, Subject } from '../../generated/prisma/enums';

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

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 13 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(13)
  grade?: number;

  // Хоосон стринг явуулбал багшгүй болгоно (teacherId цэвэрлэнэ)
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  teacherId?: string | null;

  // Туслах ангийн багш (2026-10-13) — хоосон стринг бол чөлөөлнө
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  assistantTeacherId?: string | null;

  // Хичээлийн сэдэв (null = MATH, анхдагч)
  @ApiPropertyOptional({ enum: Subject, nullable: true })
  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject | null;
}
