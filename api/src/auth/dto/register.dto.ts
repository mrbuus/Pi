import {
  IsEmail,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MinLength,
  Min,
} from 'class-validator';
import { StudentType } from '../../generated/prisma/enums';

export class RegisterDto {
  // Утас эсвэл имэйл аль нэг нь заавал (доор service шалгана).
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'Утасны дугаар 8 оронтой байх ёстой' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Имэйл хаяг буруу байна' })
  email?: string;

  // Өөрийн дуртай нэр (nickname). Заагаагүй бол овог нэрээс автоматаар үүснэ.
  @IsOptional()
  @IsString()
  username?: string;

  // Имэйлээр бүртгүүлбэл нууц үг заавал. Утсаар бол анхдагч = утас.
  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'Нууц үг 4-өөс доошгүй тэмдэгт байх ёстой' })
  password?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  // Заагаагүй бол энгийн худалдан авагч (BUYER) болно
  @IsOptional()
  @IsEnum(StudentType)
  studentType?: StudentType;

  // Эцэг эхийн account үүсгэхэд true; багш/админ role-ийг public register-ээр нээхгүй
  @IsOptional()
  @IsBoolean()
  asParent?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  @IsOptional()
  @IsString()
  school?: string;

  // Танхимын сурагчид заавал: тухайн өдрийн огноо (ЖЖЖЖССӨӨ)
  @IsOptional()
  @IsString()
  activationCode?: string;
}
