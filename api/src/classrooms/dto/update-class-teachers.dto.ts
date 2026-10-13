import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Ангийн хоёр багш (эзэн 2026-10-13) — Багш+/Админ. Талбарыг илгээхгүй бол
 * хэвээр; `null` эсвэл хоосон мөр илгээвэл чөлөөлнө.
 */
export class UpdateClassTeachersDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  teacherId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  assistantTeacherId?: string | null;
}
