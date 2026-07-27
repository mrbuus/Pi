import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Subject } from '../../generated/prisma/enums';

// Ном засах — code талбарыг зориудаар оруулаагүй: бодлогын token
// ("100-23-05") номын кодоос үүсдэг тул код өөрчлөгдвөл түүхэн token-ууд
// урагдана. Код солих шаардлагатай бол шинэ ном үүсгэнэ.
export class UpdateBookDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  coverKey?: string;

  @IsOptional()
  @IsString()
  sourceLabel?: string;

  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
