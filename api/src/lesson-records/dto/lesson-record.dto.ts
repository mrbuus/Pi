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
