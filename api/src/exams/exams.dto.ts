import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export const REVIEW_MODES = ['AUTO', 'NONE', 'PROBLEMS', 'FULL'] as const;
export type ReviewMode = (typeof REVIEW_MODES)[number];

export class AssignExamClassDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Шалгалтын огноо (ISO); өгөгдмөл — одоо',
  })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Бодолт хэд хоногийн дараа автоматаар нээгдэх (өгөгдмөл 7)',
  })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(365)
  reviewAfterDays?: number | null;
}

export class UpdateExamClassDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ enum: REVIEW_MODES })
  @IsOptional()
  @IsIn(REVIEW_MODES as unknown as string[])
  reviewLevel?: ReviewMode;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(365)
  reviewAfterDays?: number | null;
}

export class ScoringGroupDto {
  @ApiProperty({ type: String, example: '1-1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  label: string;

  @ApiProperty({ type: [String], example: ['a', 'b'] })
  @IsArray()
  @ArrayMaxSize(16)
  @IsString({ each: true })
  boxes: string[];

  @ApiProperty({ type: Number, example: 3 })
  @IsInt()
  @Min(0)
  @Max(100)
  points: number;
}

export class SetScoringGroupsDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  problemId: string;

  @ApiPropertyOptional({
    type: () => [ScoringGroupDto],
    nullable: true,
    description: 'null — бодлого бүхэлдээ нэг багц',
  })
  @ValidateIf((_o, v) => v !== null)
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ScoringGroupDto)
  groups: ScoringGroupDto[] | null;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    description: 'Бодлогын ачаалсан хувилбар — зөрвөл 409 (өөрчлөлтийн түүх)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;

  @ApiPropertyOptional({
    type: Boolean,
    description: '409-ийн дараа «Миний хувилбарыг хадгалах»',
  })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

/** Багшийн торыг ачаалах үеийн мөрийн төлөв (нүдний түвшний нэгтгэлд). */
export class GradebookBaseDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(400)
  @IsString({ each: true })
  wrong: string[];

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  absent: boolean;
}

export class GradebookRowDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  absent?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Буруу (0) зүйлсийн түлхүүр; бусад нь зөв',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(400)
  @IsString({ each: true })
  wrong?: string[];

  @ApiPropertyOptional({
    type: String,
    description: 'Онлайн дүнг засах шалтгаан (Багш+/Админ)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    type: () => GradebookBaseDto,
    description:
      'Ачаалсан үеийн төлөв — өгвөл зөвхөн өөрчилсөн нүдийг бичнэ (бусад багшийн оруулсныг дарахгүй). Excel импортод өгөхгүй — мөрийг бүхэлд нь солино.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GradebookBaseDto)
  base?: GradebookBaseDto;
}

export class SaveGradebookDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiPropertyOptional({ enum: ['MANUAL', 'EXCEL'] })
  @IsOptional()
  @IsIn(['MANUAL', 'EXCEL'])
  source?: 'MANUAL' | 'EXCEL';

  @ApiProperty({ type: () => [GradebookRowDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => GradebookRowDto)
  rows: GradebookRowDto[];
}
