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
  @IsOptional()
  @IsString()
  statementText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  choices?: string[];

  // Хуучин загвар: зөв хариуг шууд утгаар (choiceOptions ирвэл үл хэрэгсэнэ,
  // автоматаар зөв сонголтын текстээс тооцно).
  @IsOptional()
  correctAnswer?: unknown;

  // Шинэ загвар: сонголт бүрийн текст + isCorrect. Ирвэл хуучин ProblemChoice
  // мөрүүдийг устгаад дахин үүсгэнэ (createProblem-тэй ижил зарчим).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceOptionInputDto)
  choiceOptions?: ChoiceOptionInputDto[];

  @IsOptional()
  @IsString()
  imageKey?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsEnum(ProblemFormat)
  format?: ProblemFormat;
}
