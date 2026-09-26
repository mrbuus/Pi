import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { TuitionPlan } from '../../generated/prisma/enums';

// Сурагчийн бүтэн бүртгэл засах (SPEC — эрхийн матриц: Багш+/Админ).
// Бүх талбар optional — ирсэн талбарыг л шинэчилнэ (partial patch).
export class UpdateUserProfileDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'Утасны дугаар 8 оронтой байх ёстой' })
  phone?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsEmail({}, { message: 'Имэйл хаяг буруу байна' })
  email?: string;

  // ---- StudentProfile талбарууд (зөвхөн role=STUDENT дээр хэрэглэгдэнэ) ----
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'Эцгийн утас 8 оронтой байх ёстой' })
  fatherPhone?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'Эхийн утас 8 оронтой байх ёстой' })
  motherPhone?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  guardianNote?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tuitionAmount?: number;

  @ApiPropertyOptional({ enum: TuitionPlan })
  @IsOptional()
  @IsEnum(TuitionPlan)
  tuitionPlan?: TuitionPlan;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  tuitionNote?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  joinedOn?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  leftOn?: string;
}
