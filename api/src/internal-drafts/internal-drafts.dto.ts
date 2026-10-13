import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Subject, TestType } from '../generated/prisma/enums';
import { DRAFT_KINDS, MAX_CHOICES } from './draft-model';

/** StoredFile.key — uploads-ийн uuid.ext */
const FILE_KEY = /^[\w][\w.-]{0,199}$/;

export class CreateDraftSetDto {
  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: Subject })
  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  chapterId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  topic?: string | null;
}

export class UpdateDraftSetDto extends CreateDraftSetDto {}

/** Блокийн агуулга — үүсгэх, бөөнөөр нэмэх, засахад ижил талбарууд. */
export class DraftBlockFieldsDto {
  @ApiPropertyOptional({ enum: DRAFT_KINDS })
  @IsOptional()
  @IsIn(DRAFT_KINDS as unknown as string[])
  kind?: string;

  @ApiPropertyOptional({ type: String, maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  statement?: string;

  @ApiPropertyOptional({ type: [String], maxItems: MAX_CHOICES })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CHOICES)
  @IsString({ each: true })
  @MaxLength(4000, { each: true })
  choices?: string[];

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  answer?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  solution?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(FILE_KEY, { message: 'Зургийн түлхүүр буруу' })
  imageKey?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tag?: string | null;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  points?: number;
}

export class CreateDraftBlockDto extends DraftBlockFieldsDto {
  /** Энэ блокийн ДАРАА оруулна; байхгүй бол хамгийн сүүлд. */
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  afterId?: string;

  /** true — хамгийн эхэнд оруулна (устгасныг «Буцаах»-д). */
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  atStart?: boolean;
}

export class BulkDraftBlocksDto {
  @ApiProperty({ type: () => [DraftBlockFieldsDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DraftBlockFieldsDto)
  blocks: DraftBlockFieldsDto[];

  @ApiProperty({ enum: ['PASTE', 'WORD'] })
  @IsIn(['PASTE', 'WORD'])
  source: 'PASTE' | 'WORD';
}

export class UpdateDraftBlockDto extends DraftBlockFieldsDto {
  @ApiProperty({ type: Number, minimum: 0 })
  @IsInt()
  @Min(0)
  expectedVersion: number;

  /** 409-ийн дараа «Миний хувилбарыг хадгалах» */
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

export class ReorderDraftBlocksDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  blockIds: string[];
}

export class CheckDraftAnswersDto {
  /** blockId → хариу (CHOICE: үсэг, NUMERIC: тоо) */
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  @IsObject()
  answers: Record<string, string>;
}

export class PublishTestDto {
  @ApiProperty({ type: String, maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ enum: [TestType.CUSTOM, TestType.DAILY, TestType.EESH_MOCK] })
  @IsIn([TestType.CUSTOM, TestType.DAILY, TestType.EESH_MOCK])
  type: TestType;

  /** true — ноорог тест (сурагчид харагдахгүй, дараа ангид онооно) */
  @ApiProperty({ type: Boolean })
  @IsBoolean()
  isDraft: boolean;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 600 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  timeLimitMin?: number;
}

export class PublishDraftSetDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  chapterId: string;

  @ApiPropertyOptional({ type: () => PublishTestDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PublishTestDto)
  test?: PublishTestDto;
}
