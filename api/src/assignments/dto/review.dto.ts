import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Багшийн шалгалтын 3 үйлдэл: онлайн батлах / буцаах / ангид биетээр шалгасан (SPEC §10)
export enum ReviewAction {
  APPROVE = 'APPROVE',
  RETURN = 'RETURN',
  MARK_IN_CLASS = 'MARK_IN_CLASS',
}

export class ReviewDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ enum: ReviewAction })
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  note?: string;
}
