import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ type: String, writeOnly: true })
  @IsString()
  currentPassword: string;

  // Анхны нууц үг = утасны дугаар тул солиход л жинхэнэ хамгаалалт эхэлнэ (SPEC §6.2)
  @ApiProperty({ type: String, minLength: 6, writeOnly: true })
  @IsString()
  @MinLength(6, { message: 'Шинэ нууц үг дор хаяж 6 тэмдэгт байна' })
  newPassword: string;
}
