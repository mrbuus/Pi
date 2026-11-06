import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export const ALLOC_KINDS = ['TUITION', 'BOOK', 'ANSWER_SHEET', 'STAFF_FINE', 'TRANSFER', 'EXPENSE', 'OTHER'] as const;
export const ROW_LANES = ['manual', 'tuition', 'other', 'expense'] as const;
export type RowLane = (typeof ROW_LANES)[number];

export class AllocPartDto {
  @IsIn(ALLOC_KINDS)
  kind!: (typeof ALLOC_KINDS)[number];

  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  studentId?: string;
}

/** Нэг гүйлгээг хэд хэдэн хэсэгт хуваарилах — нийлбэр нь гүйлгээний дүнтэй тэнцүү. */
export class AllocateDto {
  @ValidateNested({ each: true })
  @Type(() => AllocPartDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  parts!: AllocPartDto[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class ListRowsQueryDto {
  @IsIn(ROW_LANES)
  lane!: RowLane;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class StudentSearchQueryDto {
  @IsString()
  @MaxLength(60)
  q!: string;
}
