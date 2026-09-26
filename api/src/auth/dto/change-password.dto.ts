import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_DIGIT_RE,
  PASSWORD_LETTER_RE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
} from '../password-policy';

export class ChangePasswordDto {
  @ApiProperty({ type: String, writeOnly: true })
  @IsString()
  currentPassword: string;

  // Анхны нууц үг = утасны дугаар тул солиход л жинхэнэ хамгаалалт эхэлнэ (SPEC §6.2).
  // Бодлого: password-policy.ts (8+ тэмдэгт, үсэг ба тоо).
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
