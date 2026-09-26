import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ enum: TagType })
  @IsEnum(TagType)
  type: TagType;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  name: string;
}

// Шинэ загвар: сонголтын ТЕКСТ + аль нь зөв (isCorrect flag).
// Багш үсэг ("C") биш, бодит хариултын текстийг оруулна.
export class ChoiceOptionInputDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  isCorrect: boolean;
}

export class CreateProblemDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  chapterId: string;

  // Token өгөхгүй бол ном+хуудас+дугаараас автоматаар үүснэ: "100-23-05"
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  number?: number;

  @ApiProperty({ enum: ProblemFormat })
  @IsEnum(ProblemFormat)
  format: ProblemFormat;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  statementText?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  imageKey?: string;

  @ApiPropertyOptional({ oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'array', items: {} }, { type: 'object', additionalProperties: true }], nullable: true, description: 'Legacy JSON value; grading and content services apply format-specific rules.' })
  @IsOptional()
  choices?: unknown;

  // Шинэ загвар: сонголт бүрийн текст + isCorrect. Энэ массив ирвэл
  // ProblemChoice мөрүүд үүсч, грейдинг flag-аар явна (байрлал/үсгээс үл хамаарна).
  // Яг 1 нь isCorrect=true байх ёстой. Ирвэл correctAnswer-г автоматаар гаргана.
  @ApiPropertyOptional({ type: () => [ChoiceOptionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceOptionInputDto)
  choiceOptions?: ChoiceOptionInputDto[];

  // Хуучин загвар (скан): зөв хариуг үсэг/утгаар. choiceOptions ирэхэд
  // заавал биш — зөв сонголтын текстээс автоматаар бөглөгдөнө.
  @ApiPropertyOptional({ oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'array', items: {} }, { type: 'object', additionalProperties: true }], nullable: true, description: 'Legacy JSON value; grading and content services apply format-specific rules.' })
  @IsOptional()
  correctAnswer?: unknown;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ type: () => [TagInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagInputDto)
  tags?: TagInputDto[];

  // Томьёоны нэрс — байхгүй бол автоматаар бүртгэгдэнэ
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formulas?: string[];
}
