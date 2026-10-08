import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MinLength,
  Min,
} from 'class-validator';
import { ConsentDto } from './consent.dto';
import { StudentType } from '../../generated/prisma/enums';

// Сурагчийн хичээл — сурагчийн кодын үсгийг тодорхойлно (common/codes.ts):
// MATH -> M, SOCIAL_STUDIES -> N, BOTH -> B (эсвэл заагаагүй бол мөн B)
export type RegisterSubject = 'MATH' | 'SOCIAL_STUDIES' | 'BOTH';

export class RegisterDto extends ConsentDto {
  // Утас эсвэл имэйл аль нэг нь заавал (доор service шалгана).
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'Утасны дугаар 8 оронтой байх ёстой' })
  phone?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsEmail({}, { message: 'Имэйл хаяг буруу байна' })
  email?: string;

  // Өөрийн дуртай нэр (nickname). Заагаагүй бол овог нэрээс автоматаар үүснэ.
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  username?: string;

  // Имэйлээр бүртгүүлбэл нууц үг заавал. Утсаар бол анхдагч = утас.
  @ApiPropertyOptional({ type: String, minLength: 4, writeOnly: true })
  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'Нууц үг 4-өөс доошгүй тэмдэгт байх ёстой' })
  password?: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  // Заагаагүй бол энгийн худалдан авагч (BUYER) болно
  @ApiPropertyOptional({ enum: StudentType })
  @IsOptional()
  @IsEnum(StudentType)
  studentType?: StudentType;

  // Заавал биш — заагаагүй бол сурагчийн код 'B' (аль аль/тодорхойгүй) үсэгтэй үүснэ
  @ApiPropertyOptional({ enum: ['MATH', 'SOCIAL_STUDIES', 'BOTH'] })
  @IsOptional()
  @IsIn(['MATH', 'SOCIAL_STUDIES', 'BOTH'], {
    message: 'Хичээл буруу байна',
  })
  subject?: RegisterSubject;

  // Эцэг эхийн account үүсгэхэд true; багш/админ role-ийг public register-ээр нээхгүй
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  asParent?: boolean;

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

  // Танхимын сурагчид заавал: тухайн өдрийн огноо (ЖЖЖЖССӨӨ)
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  activationCode?: string;
}
