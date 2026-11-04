import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const DELETION_STATUSES = ['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'] as const;
export type DeletionStatus = (typeof DELETION_STATUSES)[number];

export class CreateDeletionRequestDto {
  @ApiPropertyOptional({ description: 'Шалтгаан (заавал биш)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ReviewDeletionRequestDto {
  @ApiPropertyOptional({ enum: DELETION_STATUSES })
  @IsIn(DELETION_STATUSES, { message: 'Төлөв буруу байна' })
  status: DeletionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ListDeletionRequestsQuery {
  @ApiPropertyOptional({ enum: DELETION_STATUSES })
  @IsOptional()
  @IsIn(DELETION_STATUSES, { message: 'Төлөв буруу байна' })
  status?: DeletionStatus;
}
