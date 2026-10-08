import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateVideoDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  // YouTube эсвэл шууд MP4 холбоос — s3Key талбарт хадгалагдана
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUrl({}, { message: 'Зөв холбоос (URL) оруулна уу' })
  @MaxLength(2048)
  url?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  chapterId?: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  problemId?: string | null;
}
