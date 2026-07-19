import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateVideoDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  chapterId: string;

  // YouTube эсвэл шууд MP4 холбоос — s3Key талбарт хадгалагдана (SPEC §3:
  // production-д S3 руу шилжихэд энэ утга л key болно, гэрээ өөрчлөгдөхгүй)
  @IsUrl({}, { message: 'Зөв холбоос (URL) оруулна уу' })
  url: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;
}
