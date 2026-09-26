import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { TestGradingMode, TestType } from '../../generated/prisma/enums';

/** Snapshot of the test-builder form; it is never returned to student routes. */
export class TestDraftStateDto {
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsEnum(TestType) type?: TestType;
  @IsOptional() @IsEnum(TestGradingMode) gradingMode?: TestGradingMode;
  @IsOptional() @IsString() chapterId?: string;
  @IsOptional() @IsString() timeLimit?: string;
  @IsOptional() @IsString() groupKey?: string;
  @IsOptional() @IsString() variantLabel?: string;
  @IsOptional() @IsString() pdfKey?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedProblems?: string[];
  @IsOptional() @IsObject() pointOverrides?: Record<string, number>;
  @IsOptional() @IsArray() @IsString({ each: true }) selectedClasses?: string[];
}

export class CreateTestDraftDto extends TestDraftStateDto {}

export class UpdateTestDraftDto extends TestDraftStateDto {
  @IsInt()
  @Min(1)
  expectedRevision: number;
}

export class DraftIdParamDto {
  @IsString()
  @MinLength(1)
  id: string;
}
