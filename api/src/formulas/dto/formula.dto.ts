import 'reflect-metadata';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsDefined, IsIn, IsInt, IsString,
  Length, Matches, Max, Min, ValidateIf, ValidateNested,
} from 'class-validator';
import { FORMULA_SECTIONS, FORMULA_TOPICS, FORMULA_WIDGETS } from '../formula-schema';

export class FormulaVariantDto {
  @IsString() @Length(1, 120) label!: string;
  @IsString() @Length(1, 500) latex!: string;
}

export class FormulaExampleDto {
  @IsString() @Length(1, 2000) problem!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 2000, { each: true }) steps!: string[];
  @IsString() @Length(1, 1000) answer!: string;
}

export class FormulaQuizDto {
  @IsIn(['blank', 'truefalse']) type!: 'blank' | 'truefalse';
  @IsString() @Length(1, 1000) prompt!: string;
  @IsString() @Length(1, 1000) answer!: string;
  @ValidateIf((value: FormulaQuizDto) => value.type === 'blank')
  @IsDefined() @IsArray() @ArrayMinSize(2) @ArrayMaxSize(10) @IsString({ each: true }) @Length(1, 500, { each: true }) distractors?: string[];
  @ValidateIf((value: FormulaQuizDto) => value.type === 'truefalse')
  @IsDefined() @IsString() @Length(1, 1000) why?: string;
}

export class FormulaDto {
  @IsString() @Length(1, 120) @Matches(/^[a-z0-9-]+$/) slug!: string;
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
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @IsString({ each: true }) @Matches(/^[a-z0-9-]+$/, { each: true }) related!: string[];
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @IsString({ each: true }) @Length(1, 120, { each: true }) keywords!: string[];
  @ValidateIf((value: FormulaDto) => value.widget !== null)
  @IsIn([...FORMULA_WIDGETS]) widget!: string | null;
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => FormulaQuizDto) quiz!: FormulaQuizDto[];
}
