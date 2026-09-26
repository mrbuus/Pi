import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FormulaQueryDto {
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() topic?: string;
  @IsOptional() @IsIn(['CORE', 'EXTRA']) level?: string;
  @IsOptional() @IsInt() @Min(7) @Max(12) grade?: number;
}

export class FormulaStudentQueryDto {
  @IsOptional() @IsString() studentId?: string;
}
