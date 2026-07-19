import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  // Анхны нууц үг = утасны дугаар тул солиход л жинхэнэ хамгаалалт эхэлнэ (SPEC §6.2)
  @IsString()
  @MinLength(6, { message: 'Шинэ нууц үг дор хаяж 6 тэмдэгт байна' })
  newPassword: string;
}
