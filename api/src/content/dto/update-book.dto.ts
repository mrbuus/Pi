import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Subject } from '../../generated/prisma/enums';

// Ном засах — code талбарыг зориудаар оруулаагүй: бодлогын token
// ("100-23-05") номын кодоос үүсдэг тул код өөрчлөгдвөл түүхэн token-ууд
// урагдана. Код солих шаардлагатай бол шинэ ном үүсгэнэ.
export class UpdateBookDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  coverKey?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  sourceLabel?: string;

  @ApiPropertyOptional({ enum: Subject })
  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
