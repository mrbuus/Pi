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
  @IsOptional()
  @IsString()
  bookId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  @IsOptional()
  @IsBoolean()
  freePreview?: boolean;

  @IsOptional()
  @IsString()
  topicId?: string | null;
}
