import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// Бүлэг сэдэв засах. bookId/topicId-г null дамжуулж чөлөөлж болно (@IsOptional
// нь null-ийг ч алгасна) — өөр ном/муж руу шилжүүлэхэд хэрэгтэй.
export class UpdateChapterDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  bookId?: string | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  freePreview?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  topicId?: string | null;
}
