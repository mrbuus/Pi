import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus, HomeworkMarkStatus, LateRange } from '../generated/prisma/enums';
import { MAX_TESTS } from './makeup-visits.logic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** POST /makeup-visits — сурагчдыг нэмэх (нэг өдөр, нэг газар) */
export class CreateMakeupVisitsDto {
  @ApiProperty({ type: String, format: 'date' })
  @Matches(DATE, { message: 'Огноо буруу байна (YYYY-MM-DD)' })
  date: string;

  /** Зочилсон анги; ирүүлээгүй/null = 406 өрөө */
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  hostClassroomId?: string | null;

  @ApiProperty({ type: [String], maxItems: 60 })
  @IsArray()
  @ArrayNotEmpty({ message: 'Сурагч сонгоно уу' })
  @ArrayMaxSize(60)
  @IsString({ each: true })
  studentIds: string[];
}

/** PATCH /makeup-visits/:id — ирц, даалгавар, тайлбар (ирүүлээгүй талбар хуучнаараа) */
export class UpdateMakeupVisitDto {
  /** null = цэвэрлэх (хугацаа, ирцийн тэмдэглэл хамт арилна) */
  @ApiPropertyOptional({ enum: AttendanceStatus, nullable: true })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  attStatus?: AttendanceStatus | null;

  /** Зөвхөн LATE үед хадгалагдана */
  @ApiPropertyOptional({ enum: LateRange, nullable: true })
  @IsOptional()
  @IsEnum(LateRange)
  lateRange?: LateRange | null;

  @ApiPropertyOptional({ type: String, maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Тэмдэглэл 200 тэмдэгтээс ихгүй' })
  attNote?: string | null;

  @ApiPropertyOptional({ enum: HomeworkMarkStatus, nullable: true })
  @IsOptional()
  @IsEnum(HomeworkMarkStatus)
  hwStatus?: HomeworkMarkStatus | null;

  @ApiPropertyOptional({ type: String, maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Тэмдэглэл 200 тэмдэгтээс ихгүй' })
  hwNote?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Тайлбар 500 тэмдэгтээс ихгүй' })
  comment?: string | null;
}

export class MakeupTestDto {
  /** Бодлогын сангийн тест; null = гараар бичсэн сэдэв */
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  testId?: string | null;

  /** Сэдвийн нэр (testId-тэй бол сервер тестийн нэрийг өөрөө тавина) */
  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

/** PUT /makeup-visits/tests — 406-ийн нэг эсвэл олон сурагчид ИЖИЛ тест/сэдэв тавих */
export class SetMakeupTestsDto {
  @ApiProperty({ type: [String], maxItems: 60 })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  visitIds: string[];

  /** Бүтэн жагсаалт (хоосон = бүгдийг хасах) */
  @ApiProperty({ type: [MakeupTestDto], maxItems: MAX_TESTS })
  @IsArray()
  @ArrayMaxSize(MAX_TESTS)
  @ValidateNested({ each: true })
  @Type(() => MakeupTestDto)
  tests: MakeupTestDto[];
}
