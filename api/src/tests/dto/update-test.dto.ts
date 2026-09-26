import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  problemId: string;

  @ApiProperty({ type: Number, minimum: 1 })
  @IsInt()
  @Min(1)
  order: number;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  points?: number;
}

export class UpdateTestDto {
  @ApiPropertyOptional({ type: String })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ enum: TestType })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(TestType)
  type?: TestType;

  @ApiPropertyOptional({ enum: TestGradingMode })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(TestGradingMode)
  gradingMode?: TestGradingMode;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  chapterId?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1 })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  timeLimitMin?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  groupKey?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  variantLabel?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  pdfKey?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0 })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  price?: number | null;

  @ApiPropertyOptional({ type: () => [UpdateTestProblemDto] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayUnique((problem: UpdateTestProblemDto) => problem.problemId)
  @ArrayUnique((problem: UpdateTestProblemDto) => problem.order)
  @ValidateNested({ each: true })
  @Type(() => UpdateTestProblemDto)
  problems?: UpdateTestProblemDto[];

  @ApiPropertyOptional({ type: [String] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsString({ each: true })
  classroomIds?: string[];
}
