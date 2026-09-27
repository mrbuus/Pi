import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { REVIEW_RESULTS, type ReviewResult } from './review-scheduler';

export class ReviewDueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}
export class SubmitReviewDto {
  @IsOptional() @IsIn(REVIEW_RESULTS) result?: ReviewResult;
  @IsOptional() @IsString() @Length(1, 8192) exerciseToken?: string;
  @IsOptional() @IsString() @Length(1, 1000) answer?: string;
}
