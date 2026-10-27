import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BEHAVIOR_FLAGS } from './behavior-flags';

/** Зан төлөвийн шошго нэмэх — товч тайлбартай. */
export class AddBehaviorFlagDto {
  @ApiProperty({ enum: Object.keys(BEHAVIOR_FLAGS) })
  @IsIn(Object.keys(BEHAVIOR_FLAGS))
  kind: string;

  @ApiPropertyOptional({ type: String, maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string | null;

  /** Аль ангийн самбараас нэмсэн (түүхэнд) */
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  classroomId?: string | null;
}

/** Шошго хасах — яагаад хассан (заавал биш). Түүх устахгүй. */
export class RemoveBehaviorFlagDto {
  @ApiPropertyOptional({ type: String, maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string | null;
}

/**
 * «Өмнө үзсэн сэдэв» (эзэн 2026-10-27) — өмнө үзсэн тестийн БҮТЭН багц.
 * Сонголтоос гарсан тест зөөлөн хасагдана (мөр устахгүй).
 */
export class SavePastCoverageDto {
  @ApiProperty({ type: [String], maxItems: 2000 })
  @IsArray()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  testIds: string[];
}
