import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Засварын DTO-д нэмэх нийтлэг талбар: засварлагч ачаалсан хувилбараа илгээнэ.
 * Зөрвөл сервер бусдын өөрчлөлттэй нэгтгэнэ; ижил талбарыг хоёулаа өөрөөр засвал
 * 409 VERSION_CONFLICT (revisions/revision-store.ts). Илгээхгүй бол шалгахгүй.
 */
export class ExpectedVersionDto {
  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    description: 'Засварлагч ачаалсан хувилбар — зөрвөл 409',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      '409-ийн дараа «Миний хувилбарыг хадгалах»: зөрчилтэй талбарт миний утга, бусад талбарт бусдын өөрчлөлт хэвээр (expectedVersion-д АНХ ачаалсан хувилбараа илгээнэ)',
  })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

export class RestoreRevisionDto extends ExpectedVersionDto {
  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Сурагч өгсөн тестийн бодлогын хариуг сэргээхийг батална (өмнөх дүн дахин бодогдохгүй)',
  })
  @IsOptional()
  @IsBoolean()
  confirm?: boolean;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
