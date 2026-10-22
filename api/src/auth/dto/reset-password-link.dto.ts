import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_DIGIT_RE,
  PASSWORD_LETTER_RE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
} from '../password-policy';

/** Имэйлээр ирсэн нэг удаагийн холбоосоор нууц үг солих (эзэн 2026-10-22) */
export class ResetPasswordLinkDto {
  // 32 байт base64url = 43 тэмдэгт; хэт урт мөрийг ӨС-д хүргэхгүй.
  @ApiProperty({ type: String, maxLength: 200, writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Холбоос буруу байна' })
  token: string;

  @ApiProperty({
    type: String,
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    writeOnly: true,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_POLICY_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: 'Нууц үг хэт урт байна' })
  @Matches(PASSWORD_LETTER_RE, { message: PASSWORD_POLICY_MESSAGE })
  @Matches(PASSWORD_DIGIT_RE, { message: PASSWORD_POLICY_MESSAGE })
  newPassword: string;
}
