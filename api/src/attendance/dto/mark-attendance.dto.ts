import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  // Сурагч тус бүрийн өдрийн тайлбар (ж: "Өвчтэй тул тасалсан")
  @ApiPropertyOptional({ type: String, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Тайлбар 300 тэмдэгтээс ихгүй байх ёстой' })
  note?: string;

  // Хэдий хугацаагаар хоцорсон — зөвхөн status=LATE үед хамааралтай.
  // Бусад статусын үед service дотор автоматаар NULL болгож цэвэрлэнэ.
  @ApiPropertyOptional({ enum: LateRange })
  @IsOptional()
  @IsEnum(LateRange)
  lateRange?: LateRange;
}

export class MarkAttendanceDto {
  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: () => [AttendanceEntryDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
