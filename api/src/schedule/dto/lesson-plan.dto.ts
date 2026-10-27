import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DISMISS_MODES, type DismissMode } from '../lesson-plan.logic';

/** PUT /schedule/:scheduleId/plan — Багш+, Админ. */
export class PutLessonPlanDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  testIds: string[];

  @ApiPropertyOptional({ enum: DISMISS_MODES, nullable: true })
  @IsOptional()
  @IsIn([...DISMISS_MODES])
  dismissMode?: DismissMode | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  photoStudentId?: string | null;

  /**
   * «Орох тест» талбарт багшийн чөлөөт бичвэр (эзэн 2026-10-27) — хичээл үргэлж
   * номноос биш. Өгвөл LessonTopic.title болно (тест сонгосон ч); хоосон бол
   * гарчиг тестүүдийн нэрээс. Өгөхгүй (undefined) бол хуучин дүрэм хэвээр.
   */
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;
}
