import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class CreateFeedbackDto {
  @IsUUID() clientRequestId: string;
  @IsIn(['BUG', 'SUGGESTION', 'QUESTION']) kind: string;
  @Transform(trim) @IsString() @Length(3, 120) subject: string;
  @Transform(trim) @IsString() @Length(10, 10000) body: string;
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\/(?:[A-Za-z0-9_-]+\/?)*$/)
  contextPath?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  attachmentKeys?: string[];
}
export class TriageFeedbackDto {
  @IsIn(['OPEN', 'IN_REVIEW', 'RESOLVED']) state: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  response?: string;
}
