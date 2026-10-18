import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { HomeworkMarkStatus } from '../generated/prisma/enums';
import { SetHomeworkMarkDto } from './dto/set-homework-mark.dto';

/** Нөхцөлт бичилт: серверийн одоогийн төлөв ийм байвал л өөрчилнө (зэрэг тэмдэглэх үед) */
export const HW_ONLY_IF = ['UNMARKED', ...Object.values(HomeworkMarkStatus)] as const;
export type HomeworkOnlyIf = (typeof HW_ONLY_IF)[number];

/** PATCH /classrooms/:id/homework-marks/:studentId — нөхцөлт бичилттэй */
export class PatchHomeworkMarkDto extends SetHomeworkMarkDto {
  @ApiPropertyOptional({ enum: HW_ONLY_IF })
  @IsOptional()
  @IsIn(HW_ONLY_IF as unknown as string[])
  onlyIf?: HomeworkOnlyIf;
}

export class BulkHomeworkEntryDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({ enum: HomeworkMarkStatus, nullable: true })
  @IsOptional()
  @IsEnum(HomeworkMarkStatus)
  status?: HomeworkMarkStatus | null;

  @ApiPropertyOptional({ enum: HW_ONLY_IF })
  @IsOptional()
  @IsIn(HW_ONLY_IF as unknown as string[])
  onlyIf?: HomeworkOnlyIf;
}

/** «Бүгд хийсэн» / «Буцаах» — зөвхөн өөрчлөх нүднүүд (бүх ангийг биш), нөхцөлтэй */
export class BulkHomeworkMarksDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: () => [BulkHomeworkEntryDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BulkHomeworkEntryDto)
  entries: BulkHomeworkEntryDto[];
}
