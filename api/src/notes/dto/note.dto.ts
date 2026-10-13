import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { StudentNoteType } from '../../generated/prisma/enums';

export class CreateNoteDto {
  @ApiProperty({ enum: StudentNoteType })
  @IsEnum(StudentNoteType)
  type: StudentNoteType;

  @ApiProperty({ type: String })
  @IsString()
  @Length(1, 4000, { message: 'Тэмдэглэл 1–4000 тэмдэгт байх ёстой' })
  body: string;

  // Зөвхөн төлбөрийн тэмдэглэлд: эцэг эх төлөхөөр амласан өдөр
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Огноо ЖЖЖЖ-СС-ӨӨ хэлбэртэй байна' })
  promisedOn?: string;
}

export class UpdateNoteDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @Length(1, 4000, { message: 'Тэмдэглэл 1–4000 тэмдэгт байх ёстой' })
  body?: string;

  // Шийдэгдсэн огноог тавих (шийдвэрлэсэн) эсвэл дахин нээхэд null дамжуулна
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  resolvedAt?: string | null;

  // Амласан өдрийг өөрчлөх; null бол арилгана
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Огноо ЖЖЖЖ-СС-ӨӨ хэлбэртэй байна' })
  promisedOn?: string | null;
}
