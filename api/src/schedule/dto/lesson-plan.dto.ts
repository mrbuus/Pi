import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { DISMISS_MODES, type DismissMode } from '../lesson-plan.logic';

/** PUT /schedule/:scheduleId/plan — Багш+, Админ. */
export class PutLessonPlanDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  testIds: string[];

  @ApiPropertyOptional({ enum: DISMISS_MODES, nullable: true })
  @IsOptional()
  @IsIn([...DISMISS_MODES])
  dismissMode?: DismissMode | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  photoStudentId?: string | null;
}
