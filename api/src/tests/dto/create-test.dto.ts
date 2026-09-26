import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  problemId: string;

  @ApiProperty({ type: Number, minimum: 1 })
  @IsInt()
  @Min(1)
  order: number;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;
}

export class CreateTestDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: TestType })
  @IsEnum(TestType)
  type: TestType;

  @ApiPropertyOptional({ enum: TestGradingMode })
  @IsOptional()
  @IsEnum(TestGradingMode)
  gradingMode?: TestGradingMode;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  chapterId?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMin?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  groupKey?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  variantLabel?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  pdfKey?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ type: () => [TestProblemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestProblemInputDto)
  problems?: TestProblemInputDto[];

  // Аль ангиудад харагдах вэ — автоматаар бүх ангид харагдахгүй (SPEC §8)
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classroomIds?: string[];
}
