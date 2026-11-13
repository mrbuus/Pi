import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// 'error' — клиентийн техникийн алдаа (зураг уншиж/илгээж чадаагүй; эзэн 2026-11-12)
export const USAGE_KINDS = ['page', 'click', 'error'] as const;
export const USAGE_DEVICES = ['mobile', 'tablet', 'desktop'] as const;

export class UsageEventDto {
  @ApiProperty({ enum: USAGE_KINDS })
  @IsIn(USAGE_KINDS)
  kind: (typeof USAGE_KINDS)[number];

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(300)
  path: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  target?: string;
}

// Клиент 20 секунд тутам эсвэл хуудас нуугдахад багцлан илгээнэ.
export class RecordUsageDto {
  @ApiProperty({ enum: USAGE_DEVICES })
  @IsIn(USAGE_DEVICES)
  device: (typeof USAGE_DEVICES)[number];

  @ApiProperty({ type: () => [UsageEventDto], minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => UsageEventDto)
  events: UsageEventDto[];
}
