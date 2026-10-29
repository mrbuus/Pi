import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
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

  // Сурагчид харагдах нэр («Е-1»), дараалал, нуух — зөвхөн ADMIN (service шалгана).
  // null/хоосон → title руу буцна.
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(80)
  displayName?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(10000)
  displayOrder?: number | null;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  studentHidden?: boolean;
}
