import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateVideoDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  chapterId: string;

  // YouTube эсвэл шууд MP4 холбоос — s3Key талбарт хадгалагдана (SPEC §3:
  // production-д S3 руу шилжихэд энэ утга л key болно, гэрээ өөрчлөгдөхгүй)
  @ApiProperty({ type: String })
  @IsUrl({}, { message: 'Зөв холбоос (URL) оруулна уу' })
  url: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;
}
