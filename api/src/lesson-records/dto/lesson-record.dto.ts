import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Батлахад: ангийн БОДИТ хийсэн тест + хассан бодлого (Problem.id). */
export class ConfirmTestDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  testId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  excludedProblemIds: string[];
}

/**
 * Хичээл батлах — тухайн хуваарийн аль өдрийнх. `tests` өгвөл тэр өдрийн
 * ангийн (сангийн) тестийн бүртгэлийг ЯГ энэ жагсаалтаар солино (эзэн 2026-10-18).
 */
export class ConfirmLessonDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ type: () => [ConfirmTestDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ConfirmTestDto)
  tests?: ConfirmTestDto[];

  /**
   * «Орох тест» чөлөөт бичвэр — хичээлийн сэдэв (эзэн 2026-10-27). Хоосон бол
   * хуучин дүрмээр (төлөвлөгөөний гарчиг, эс бөгөөс тестүүдийн нэр).
   */
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string | null;

  /** Чөлөөт тайлбар. undefined = өмнөхийг хадгална, "" / null = арилгана. */
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  /** Бодсон бодлогын дугаар, бичсэнээр («1-12, 15, 20»). undefined = өмнөхийг хадгална. */
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  problemNumbers?: string | null;
}

/** Багшийн нэмэлт тайлбар. Хоосон бол устгана (мөр үлдээхгүй). */
export class LessonNoteDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ type: String, maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  body?: string | null;
}
