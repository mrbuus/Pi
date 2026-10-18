import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** Байршуулсан зургийн түлхүүрүүд (POST /uploads-аас) — бүтэн жагсаалт, 0–12. */
export class ImageKeysDto {
  @ApiProperty({ type: [String], maxItems: 12 })
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  @Matches(/^\w[\w.-]*$/, { each: true })
  imageKeys: string[];
}

export class MakeupDecisionDto {
  @ApiProperty({ enum: ['CONFIRM', 'WAIVE', 'REOPEN'] })
  @IsIn(['CONFIRM', 'WAIVE', 'REOPEN'])
  action: 'CONFIRM' | 'WAIVE' | 'REOPEN';

  @ApiPropertyOptional({ type: String, maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string | null;
}
