import 'reflect-metadata';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsDefined, IsIn, IsInt, IsString,
  Length, Matches, Max, Min, Validate, ValidateIf, ValidateNested,
  ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface,
} from 'class-validator';
import { FORMULA_SECTIONS, FORMULA_SLUG_PATTERN, FORMULA_TOPICS, FORMULA_WIDGETS } from '../formula-schema';

export class FormulaVariantDto {
  @IsString() @Length(1, 120) label!: string;
  @IsString() @Length(1, 500) latex!: string;
}

export class FormulaExampleDto {
  @IsString() @Length(1, 2000) problem!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 2000, { each: true }) steps!: string[];
  @IsString() @Length(1, 1000) answer!: string;
}

@ValidatorConstraint({ name: 'formulaQuizShape', async: false })
class FormulaQuizShapeConstraint implements ValidatorConstraintInterface {
  validate(_type: unknown, args: ValidationArguments) {
    const quiz = args.object as { type?: string; answer?: string; why?: string; distractors?: string[] };
    if (quiz.type === 'blank') {
      return Array.isArray(quiz.distractors)
        && new Set(quiz.distractors).size === quiz.distractors.length
        && !quiz.distractors.includes(quiz.answer ?? '')
        && quiz.why === undefined;
    }
    if (quiz.type === 'truefalse') {
      return ['true', 'false'].includes(quiz.answer ?? '')
        && typeof quiz.why === 'string' && quiz.why.length > 0
        && quiz.distractors === undefined;
    }
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} has an invalid quiz discriminator payload`;
  }
}

export class FormulaQuizDto {
  @IsIn(['blank', 'truefalse']) @Validate(FormulaQuizShapeConstraint) type!: 'blank' | 'truefalse';
  @IsString() @Length(1, 1000) prompt!: string;
  @IsString() @Length(1, 1000) answer!: string;
  @ValidateIf((value: FormulaQuizDto) => value.type === 'blank')
  @IsDefined() @IsArray() @ArrayMinSize(2) @ArrayMaxSize(10) @IsString({ each: true }) @Length(1, 500, { each: true }) distractors?: string[];
  @ValidateIf((value: FormulaQuizDto) => value.type === 'truefalse')
  @IsDefined() @IsString() @Length(1, 1000) why?: string;
}

export class FormulaDto {
  @IsString() @Length(1, 120) @Matches(FORMULA_SLUG_PATTERN) slug!: string;
  @IsString() @Length(1, 200) title!: string;
  @IsString() @IsIn([...FORMULA_SECTIONS]) section!: string;
  @IsInt() @Min(0) @Max(10000) order!: number;
  @IsIn(['CORE', 'EXTRA']) level!: string;
  @IsInt() @Min(7) @Max(12) grade!: number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @IsString({ each: true }) @IsIn([...FORMULA_TOPICS], { each: true }) topicSlugs!: string[];
  @IsString() @Length(1, 1000) latex!: string;
  @IsString() @Length(1, 1000) general!: string;
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => FormulaVariantDto) variants!: FormulaVariantDto[];
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @Length(1, 200, { each: true }) conditions!: string[];
  @IsString() @Length(1, 3000) explanation!: string;
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(6) @IsString({ each: true }) @Length(1, 2000, { each: true }) derivation!: string[];
  @IsString() @Length(1, 1000) mnemonic!: string;
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => FormulaExampleDto) examples!: FormulaExampleDto[];
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @Length(1, 500, { each: true }) commonMistakes!: string[];
  @IsString() @Length(1, 1000) eeshTip!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @IsString({ each: true }) @Matches(FORMULA_SLUG_PATTERN, { each: true }) related!: string[];
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @IsString({ each: true }) @Length(1, 120, { each: true }) keywords!: string[];
  @ValidateIf((value: FormulaDto) => value.widget !== null)
  @IsIn([...FORMULA_WIDGETS]) widget!: string | null;
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => FormulaQuizDto) quiz!: FormulaQuizDto[];
}
