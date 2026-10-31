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

  /**
   * Бодлогын санд байхгүй сэдвүүд (эзэн 2026-10-31) — тесттэй зэрэг, хэдийг ч.
   * Өгвөл `title`-ыг үл тооно: гарчиг = тестүүдийн нэр + эдгээр.
   */
  @ApiPropertyOptional({ type: [String], maxItems: 12 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  customTopics?: string[];
}

/** PUT /schedule/day-meal — амралтын өдрийн хоол, Багш+ / Админ. */
export class PutDayMealDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  cookId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  food?: string | null;
}
