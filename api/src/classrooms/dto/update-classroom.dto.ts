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
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(ClassroomType)
  type?: ClassroomType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  // Хоосон стринг явуулбал багшгүй болгоно (teacherId цэвэрлэнэ)
  @IsOptional()
  @IsString()
  teacherId?: string | null;
}
