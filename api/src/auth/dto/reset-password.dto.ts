import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { CODE_LENGTH } from '../password-reset.util';
import {
  PASSWORD_DIGIT_RE,
  PASSWORD_LETTER_RE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
} from '../password-policy';

export class ResetPasswordDto {
  @ApiProperty({ type: String, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  identifier: string;

  // Яг 6 цифр. Энд хатуу шалгаснаар өгөгдлийн санд огт хүрэлгүйгээр
  // хэлбэр буруу хүсэлтүүд шүүгдэнэ.
  @ApiProperty({ type: String })
  @IsString()
  @Matches(new RegExp(`^\\d{${CODE_LENGTH}}$`), {
    message: `Код ${CODE_LENGTH} оронтой тоо байх ёстой`,
  })
  code: string;

  // Бодлого: password-policy.ts (8+ тэмдэгт, үсэг ба тоо)
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
