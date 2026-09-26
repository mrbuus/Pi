import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Uploads controller (../storage/uploads.controller.ts)-ийн `GET /files/:key`
// заавал ЯГ ЭНЭ regex-ээр key-г шалгадаг тул энд ч мөн адилыг ашиглана —
// эс тэгвээс дурын мөр (path traversal, URL) imageKeys-д орж болзошгүй.
export const UPLOAD_KEY_REGEX = /^[\w][\w.-]*$/;

export class CreateTheoryDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1, { message: 'Гарчиг хоосон байж болохгүй' })
  @MaxLength(200, { message: 'Гарчиг 200 тэмдэгтээс хэтрэхгүй байх ёстой' })
  title: string;

  @ApiProperty({ type: String, minLength: 1, maxLength: 50000 })
  @IsString()
  @MinLength(1, { message: 'Онолын агуулга хоосон байж болохгүй' })
  @MaxLength(50000, {
    message: 'Онолын агуулга 50000 тэмдэгтээс хэтрэхгүй байх ёстой',
  })
  content: string;

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(UPLOAD_KEY_REGEX, { each: true, message: 'Буруу зургийн key' })
  imageKeys?: string[];
}

export class UpdateTheoryDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Гарчиг хоосон байж болохгүй' })
  @MaxLength(200, { message: 'Гарчиг 200 тэмдэгтээс хэтрэхгүй байх ёстой' })
  title?: string;

  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 50000 })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Онолын агуулга хоосон байж болохгүй' })
  @MaxLength(50000, {
    message: 'Онолын агуулга 50000 тэмдэгтээс хэтрэхгүй байх ёстой',
  })
  content?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(UPLOAD_KEY_REGEX, { each: true, message: 'Буруу зургийн key' })
  imageKeys?: string[];
}

export class ReorderTheoryDto {
  @ApiProperty({ type: [String], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}
