import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateVideoDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  // YouTube эсвэл шууд MP4 холбоос — s3Key талбарт хадгалагдана
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUrl({}, { message: 'Зөв холбоос (URL) оруулна уу' })
  url?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  chapterId?: string;
}
