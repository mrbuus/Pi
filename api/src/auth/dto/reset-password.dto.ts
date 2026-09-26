import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { CODE_LENGTH } from '../password-reset.util';

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

  @ApiProperty({ type: String, minLength: 6, maxLength: 72, writeOnly: true })
  @IsString()
  @MinLength(6, { message: 'Шинэ нууц үг дор хаяж 6 тэмдэгт байна' })
  @MaxLength(72, { message: 'Нууц үг хэт урт байна' })
  newPassword: string;
}
