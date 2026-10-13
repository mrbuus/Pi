import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
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
