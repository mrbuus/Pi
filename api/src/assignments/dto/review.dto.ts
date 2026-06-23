import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Багшийн шалгалтын 3 үйлдэл: онлайн батлах / буцаах / ангид биетээр шалгасан (SPEC §10)
export enum ReviewAction {
  APPROVE = 'APPROVE',
  RETURN = 'RETURN',
  MARK_IN_CLASS = 'MARK_IN_CLASS',
}

export class ReviewDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsEnum(ReviewAction)
  action: ReviewAction;

  @IsOptional()
  @IsString()
  note?: string;
}
