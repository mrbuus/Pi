import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TestGradingMode, TestType } from '../../generated/prisma/enums';
import { LEAVE_LIMITS, type LeaveLimit } from '../leave-limit';

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

  // Аппаас гарах дүрэм: 3 = Зөөлөн (анхдагч), 2 = Хатуу (leave-limit.ts)
  // IsOptional биш: null-ийг ч татгалзана (санд NOT NULL)
  @ApiPropertyOptional({ enum: LEAVE_LIMITS, default: 3 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(LEAVE_LIMITS)
  leaveLimit?: LeaveLimit;

  // Нийтлэг цонх (exam-window.ts): ISO огноо
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  opensAt?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  closesAt?: string;

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
