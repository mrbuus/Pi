import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TuitionPlan } from '../../generated/prisma/enums';

const PHONE = /^\d{8}$/;
const PHONE_MSG = 'Утасны дугаар 8 оронтой байх ёстой';

/**
 * Багш+/Админ танхимын сурагчийг гараар бүртгэнэ (эзэн 2026-10-13).
 * Нэвтрэх: утас, нууц үг = утас (эзний дүрэм). Анги сонговол салбар/секц
 * ангийн нэрээс («12-1 (Баруун 4)») автоматаар бөглөгдөнө.
 */
export class CreateClassroomStudentDto {
  @ApiProperty({ type: String })
  @IsString({ message: 'Овог заавал' })
  @IsNotEmpty({ message: 'Овог заавал' })
  @MaxLength(60, { message: 'Овог хэт урт байна' })
  lastName: string;

  @ApiProperty({ type: String })
  @IsString({ message: 'Нэр заавал' })
  @IsNotEmpty({ message: 'Нэр заавал' })
  @MaxLength(60, { message: 'Нэр хэт урт байна' })
  firstName: string;

  @ApiProperty({ type: String, description: 'Сурагчийн утас — нэвтрэх нэр ба нууц үг' })
  @Matches(PHONE, { message: PHONE_MSG })
  phone: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  classroomId?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Сургуулийн нэр хэт урт байна' })
  school?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Matches(PHONE, { message: PHONE_MSG })
  fatherPhone?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Matches(PHONE, { message: PHONE_MSG })
  motherPhone?: string;

  /** Хичээлд суурьж эхэлсэн өдөр (YYYY-MM-DD). Хоосон бол өнөөдөр. */
  @ApiPropertyOptional({ type: String, example: '2026-10-13' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Эхэлсэн огноо буруу байна' })
  joinedOn?: string;

  @ApiPropertyOptional({ enum: TuitionPlan })
  @IsOptional()
  @IsEnum(TuitionPlan)
  tuitionPlan?: TuitionPlan;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Тэмдэглэл 500 тэмдэгтээс ихгүй' })
  note?: string;
}
