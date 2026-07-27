import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateVideoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  // YouTube эсвэл шууд MP4 холбоос — s3Key талбарт хадгалагдана
  @IsOptional()
  @IsUrl({}, { message: 'Зөв холбоос (URL) оруулна уу' })
  url?: string;

  @IsOptional()
  @IsString()
  chapterId?: string;
}
