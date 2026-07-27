import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { StudentNoteType } from '../../generated/prisma/enums';

export class CreateNoteDto {
  @IsEnum(StudentNoteType)
  type: StudentNoteType;

  @IsString()
  @Length(1, 4000, { message: 'Тэмдэглэл 1–4000 тэмдэгт байх ёстой' })
  body: string;
}

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @Length(1, 4000, { message: 'Тэмдэглэл 1–4000 тэмдэгт байх ёстой' })
  body?: string;

  // Шийдэгдсэн огноог тавих (шийдвэрлэсэн) эсвэл дахин нээхэд null дамжуулна
  @IsOptional()
  @IsDateString()
  resolvedAt?: string | null;
}
