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
  @IsString()
  @MinLength(1, { message: 'Гарчиг хоосон байж болохгүй' })
  @MaxLength(200, { message: 'Гарчиг 200 тэмдэгтээс хэтрэхгүй байх ёстой' })
  title: string;

  @IsString()
  @MinLength(1, { message: 'Онолын агуулга хоосон байж болохгүй' })
  @MaxLength(50000, {
    message: 'Онолын агуулга 50000 тэмдэгтээс хэтрэхгүй байх ёстой',
  })
  content: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(UPLOAD_KEY_REGEX, { each: true, message: 'Буруу зургийн key' })
  imageKeys?: string[];
}

export class UpdateTheoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Гарчиг хоосон байж болохгүй' })
  @MaxLength(200, { message: 'Гарчиг 200 тэмдэгтээс хэтрэхгүй байх ёстой' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Онолын агуулга хоосон байж болохгүй' })
  @MaxLength(50000, {
    message: 'Онолын агуулга 50000 тэмдэгтээс хэтрэхгүй байх ёстой',
  })
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(UPLOAD_KEY_REGEX, { each: true, message: 'Буруу зургийн key' })
  imageKeys?: string[];
}

export class ReorderTheoryDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}
