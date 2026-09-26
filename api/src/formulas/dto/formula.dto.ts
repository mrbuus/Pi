import { IsArray, IsInt, IsOptional, IsString, IsIn, Min, Max } from 'class-validator';

export class FormulaDto {
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsString() section!: string;
  @IsInt() order!: number;
  @IsIn(['CORE', 'EXTRA']) level!: string;
  @IsOptional() @IsInt() @Min(7) @Max(12) grade?: number;
  @IsArray() @IsString({ each: true }) topicSlugs!: string[];
  @IsString() latex!: string;
  @IsString() general!: string;
  @IsOptional() @IsArray() variants?: unknown[];
  @IsOptional() @IsArray() conditions?: unknown[];
  @IsOptional() @IsString() explanation?: string;
  @IsOptional() @IsArray() derivation?: unknown[];
  @IsOptional() @IsString() mnemonic?: string;
  @IsArray() examples!: unknown[];
  @IsOptional() @IsArray() commonMistakes?: unknown[];
  @IsOptional() @IsString() eeshTip?: string;
  @IsArray() @IsString({ each: true }) related!: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) keywords?: string[];
  @IsOptional() @IsString() widget?: string;
  @IsArray() quiz!: unknown[];
}
