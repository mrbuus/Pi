import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SelfState } from '../../generated/prisma/enums';

export class TestAnswerDto {
  @IsString()
  @IsNotEmpty()
  problemId: string;

  @IsDefined()
  answer: unknown;

  // Өөрийн тэмдэглэгээ — буудсанаа шударгаар тэмдэглэвэл аналитик сайжирна (SPEC §9.1)
  @IsOptional()
  @IsEnum(SelfState)
  selfState?: SelfState;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentSec?: number;
}

export class SubmitTestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TestAnswerDto)
  answers: TestAnswerDto[];
}
