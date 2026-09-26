import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProblemFormat } from '../../generated/prisma/enums';
import { ChoiceOptionInputDto } from './create-problem.dto';

// Багш+/Админ бодлогын АГУУЛГА (статемент/сонголт/хариу/зураг)-ыг гараар
// шууд засах DTO. Бүх талбар optional — зөвхөн ирсэн талбарыг л шинэчилнэ.
export class UpdateProblemDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  statementText?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  choices?: string[];

  // Хуучин загвар: зөв хариуг шууд утгаар (choiceOptions ирвэл үл хэрэгсэнэ,
  // автоматаар зөв сонголтын текстээс тооцно).
  @ApiPropertyOptional({ oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'array', items: {} }, { type: 'object', additionalProperties: true }], nullable: true, description: 'Legacy JSON value; grading and content services apply format-specific rules.' })
  @IsOptional()
  correctAnswer?: unknown;

  // Шинэ загвар: сонголт бүрийн текст + isCorrect. Ирвэл хуучин ProblemChoice
  // мөрүүдийг устгаад дахин үүсгэнэ (createProblem-тэй ижил зарчим).
  @ApiPropertyOptional({ type: () => [ChoiceOptionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceOptionInputDto)
  choiceOptions?: ChoiceOptionInputDto[];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  imageKey?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({ enum: ProblemFormat })
  @IsOptional()
  @IsEnum(ProblemFormat)
  format?: ProblemFormat;
}
