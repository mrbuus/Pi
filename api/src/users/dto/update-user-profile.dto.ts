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
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'Утасны дугаар 8 оронтой байх ёстой' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Имэйл хаяг буруу байна' })
  email?: string;

  // ---- StudentProfile талбарууд (зөвхөн role=STUDENT дээр хэрэглэгдэнэ) ----
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'Эцгийн утас 8 оронтой байх ёстой' })
  fatherPhone?: string;

  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'Эхийн утас 8 оронтой байх ёстой' })
  motherPhone?: string;

  @IsOptional()
  @IsString()
  guardianNote?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  tuitionAmount?: number;

  @IsOptional()
  @IsEnum(TuitionPlan)
  tuitionPlan?: TuitionPlan;

  @IsOptional()
  @IsString()
  tuitionNote?: string;

  @IsOptional()
  @IsDateString()
  joinedOn?: string;

  @IsOptional()
  @IsDateString()
  leftOn?: string;
}
