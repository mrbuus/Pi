import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TestGradingMode, TestType } from '../../generated/prisma/enums';

export class TestProblemInputDto {
  @IsString()
  @IsNotEmpty()
  problemId: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;
}

export class CreateTestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(TestType)
  type: TestType;

  @IsOptional()
  @IsEnum(TestGradingMode)
  gradingMode?: TestGradingMode;

  @IsOptional()
  @IsString()
  chapterId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMin?: number;

  @IsOptional()
  @IsString()
  groupKey?: string;

  @IsOptional()
  @IsString()
  variantLabel?: string;

  @IsOptional()
  @IsString()
  pdfKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestProblemInputDto)
  problems?: TestProblemInputDto[];

  // Аль ангиудад харагдах вэ — автоматаар бүх ангид харагдахгүй (SPEC §8)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classroomIds?: string[];
}
