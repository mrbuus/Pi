import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
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

/** PUT classrooms/:id/homework-deadline — самбарын өдөр D-д шалгах даалгаврын хугацаа */
export class SetHomeworkDeadlineDto {
  @ApiProperty({ example: '2026-11-05', description: 'Самбарын өдөр (даалгаврыг шалгах хичээл)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @ApiProperty({ example: '2026-11-04', description: 'Хугацааны огноо: өмнөх хичээлээс энэ хичээл хүртэл' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate: string;

  @ApiProperty({ example: '21:00', description: '24 цагийн хэлбэр HH:MM (AM/PM үгүй)' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Цагийг 24 цагийн хэлбэрээр (00:00–23:59) оруулна уу' })
  time: string;

  @ApiProperty({ description: 'true = хугацаа өнгөрсөн ч илгээж болно (хоцорсон гэж тэмдэглэнэ)' })
  @IsBoolean()
  allowLate: boolean;
}
