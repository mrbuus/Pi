import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/** Хичээл батлах — тухайн хуваарийн аль өдрийнх. */
export class ConfirmLessonDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  date: string;
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
