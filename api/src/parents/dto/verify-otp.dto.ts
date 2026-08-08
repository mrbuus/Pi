import { IsNotEmpty, Matches } from 'class-validator';

export class VerifyOtpDto {
  @Matches(/^\d{6}$/, { message: 'Код 6 оронтой байх ёстой' })
  @IsNotEmpty()
  code: string;
}
