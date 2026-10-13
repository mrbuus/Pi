import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export const REVIEW_CHOICES = ['AUTO', 'NONE', 'PROBLEMS', 'FULL'] as const;
export type ReviewChoice = (typeof REVIEW_CHOICES)[number];

export class AssignThousandDto {
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Эргэн харалт автоматаар нээгдэх огноо (ISO)' })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsISO8601()
  reviewAutoAt?: string | null;
}

export class SetThousandReviewDto {
  @ApiPropertyOptional({ enum: REVIEW_CHOICES })
  @IsOptional()
  @IsIn(REVIEW_CHOICES as unknown as string[])
  reviewLevel?: ReviewChoice;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsISO8601()
  reviewAutoAt?: string | null;
}

export class SetYoutubeDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(500)
  url: string | null;

  @ApiPropertyOptional({ type: Number, minimum: 0, description: 'Бодлогын ачаалсан хувилбар — зөрвөл 409' })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;
}
