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
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus, LateRange } from '../../generated/prisma/enums';

/** Нөхцөлт бичилт: серверийн одоогийн төлөв ийм байвал л өөрчилнө (зэрэг тэмдэглэх үед) */
export const ONLY_IF_VALUES = ['UNMARKED', ...Object.values(AttendanceStatus)] as const;
export type AttendanceOnlyIf = (typeof ONLY_IF_VALUES)[number];

export class AttendanceEntryDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  /**
   * Төлөв. `null` = тэмдэглэгээг цэвэрлэх (мөр устна); ирүүлээгүй = зөвхөн
   * тэмдэглэл/хоцролтын хугацааг шинэчилнэ (мөр байх ёстой).
   */
  @ApiPropertyOptional({ enum: AttendanceStatus, nullable: true })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus | null;

  // Сурагч тус бүрийн өдрийн тайлбар (ж: "Өвчтэй тул тасалсан").
  // Ирүүлээгүй бол ХУУЧИН ТЭМДЭГЛЭЛ ХЭВЭЭР (D8); null эсвэл "" бол цэвэрлэнэ.
  @ApiPropertyOptional({ type: String, maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Тайлбар 300 тэмдэгтээс ихгүй байх ёстой' })
  note?: string | null;

  // Хэдий хугацаагаар хоцорсон — зөвхөн status=LATE үед хамааралтай.
  // Ирүүлээгүй бол хуучнаараа; LATE-ээс өөр төлөвт үргэлж NULL болно.
  @ApiPropertyOptional({ enum: LateRange, nullable: true })
  @IsOptional()
  @IsEnum(LateRange)
  lateRange?: LateRange | null;

  /** «Бүгд ирсэн»/«Буцаах»: серверийн төлөв ийм байвал л бичнэ (өөр багшийнхыг дарахгүй) */
  @ApiPropertyOptional({ enum: ONLY_IF_VALUES })
  @IsOptional()
  @IsIn(ONLY_IF_VALUES as unknown as string[])
  onlyIf?: AttendanceOnlyIf;
}

export class MarkAttendanceDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: () => [AttendanceEntryDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
