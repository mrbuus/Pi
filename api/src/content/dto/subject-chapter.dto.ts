import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Subject } from '../../generated/prisma/enums';

// POST /chapters/for-subject — номгүй хичээлд (Нийгмийн ухаан г.м.) тестийн
// бүлгийг үүсгэнэ: хичээлийн ном байхгүй бол «Нийгмийн ухаан» ном үүснэ.
export class SubjectChapterDto {
  @ApiProperty({ enum: Subject })
  @IsEnum(Subject)
  subject: Subject;

  @ApiProperty({ type: String, maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
}
