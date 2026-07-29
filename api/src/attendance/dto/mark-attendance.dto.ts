import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus, LateRange } from '../../generated/prisma/enums';

export class AttendanceEntryDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  // Сурагч тус бүрийн өдрийн тайлбар (ж: "Өвчтэй тул тасалсан")
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Тайлбар 300 тэмдэгтээс ихгүй байх ёстой' })
  note?: string;

  // Хэдий хугацаагаар хоцорсон — зөвхөн status=LATE үед хамааралтай.
  // Бусад статусын үед service дотор автоматаар NULL болгож цэвэрлэнэ.
  @IsOptional()
  @IsEnum(LateRange)
  lateRange?: LateRange;
}

export class MarkAttendanceDto {
  @IsDateString()
  date: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
