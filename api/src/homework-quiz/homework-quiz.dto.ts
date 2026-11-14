import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Matches, Max, Min, ValidateIf } from 'class-validator';
import { QUIZ_MAX_PROBLEMS } from './quiz-score';

/** Шалгалт эхлүүлэх / бодлогын тоог засах */
export class SetHomeworkQuizDto {
  @ApiProperty({ example: '2026-11-08', description: 'Самбарын өдөр' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Огнооны формат буруу байна (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ example: 10, minimum: 1, maximum: QUIZ_MAX_PROBLEMS })
  @IsInt({ message: 'Бодлогын тоо бүхэл тоо байна' })
  @Min(1, { message: 'Бодлогын тоо 1-ээс багагүй' })
  @Max(QUIZ_MAX_PROBLEMS, { message: `Бодлогын тоо ${QUIZ_MAX_PROBLEMS}-аас ихгүй` })
  problemCount: number;
}

/** Нэг сурагчийн оноо; null = цэвэрлэх */
export class SetHomeworkQuizScoreDto {
  @ApiProperty({ example: '2026-11-08' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Огнооны формат буруу байна (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ example: 7.5, nullable: true, description: '0..бодлогын тоо, бутархай 2 хүртэл орон; null = цэвэрлэх' })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false }, { message: 'Оноо тоо, бутархай нь 2 хүртэл оронтой' })
  @Min(0, { message: 'Оноо 0-ээс багагүй' })
  score: number | null;
}
