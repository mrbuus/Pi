import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TestGradingMode, TestType } from '../../generated/prisma/enums';

export class UpdateTestProblemDto {
  @IsString()
  @IsNotEmpty()
  problemId: string;

  @IsInt()
  @Min(1)
  order: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  points?: number;
}

export class UpdateTestDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(TestType)
  type?: TestType;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(TestGradingMode)
  gradingMode?: TestGradingMode;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  chapterId?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  timeLimitMin?: number | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  groupKey?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  variantLabel?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  pdfKey?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  price?: number | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayUnique((problem: UpdateTestProblemDto) => problem.problemId)
  @ArrayUnique((problem: UpdateTestProblemDto) => problem.order)
  @ValidateNested({ each: true })
  @Type(() => UpdateTestProblemDto)
  problems?: UpdateTestProblemDto[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsString({ each: true })
  classroomIds?: string[];
}
