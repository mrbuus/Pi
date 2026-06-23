import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProblemFormat, TagType } from '../../generated/prisma/enums';

export class TagInputDto {
  @IsEnum(TagType)
  type: TagType;

  @IsString()
  @IsNotEmpty()
  name: string;
}

// Шинэ загвар: сонголтын ТЕКСТ + аль нь зөв (isCorrect flag).
// Багш үсэг ("C") биш, бодит хариултын текстийг оруулна.
export class ChoiceOptionInputDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateProblemDto {
  @IsString()
  @IsNotEmpty()
  chapterId: string;

  // Token өгөхгүй бол ном+хуудас+дугаараас автоматаар үүснэ: "100-23-05"
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  number?: number;

  @IsEnum(ProblemFormat)
  format: ProblemFormat;

  @IsOptional()
  @IsString()
  statementText?: string;

  @IsOptional()
  @IsString()
  imageKey?: string;

  @IsOptional()
  choices?: unknown;

  // Шинэ загвар: сонголт бүрийн текст + isCorrect. Энэ массив ирвэл
  // ProblemChoice мөрүүд үүсч, грейдинг flag-аар явна (байрлал/үсгээс үл хамаарна).
  // Яг 1 нь isCorrect=true байх ёстой. Ирвэл correctAnswer-г автоматаар гаргана.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceOptionInputDto)
  choiceOptions?: ChoiceOptionInputDto[];

  // Хуучин загвар (скан): зөв хариуг үсэг/утгаар. choiceOptions ирэхэд
  // заавал биш — зөв сонголтын текстээс автоматаар бөглөгдөнө.
  @IsOptional()
  correctAnswer?: unknown;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagInputDto)
  tags?: TagInputDto[];

  // Томьёоны нэрс — байхгүй бол автоматаар бүртгэгдэнэ
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formulas?: string[];
}
