import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export const LOGIN_TEXT_MAX = 1000;

/** Нэвтрэх хуудасны тайлбар/зарлал — энгийн текст, мөр шилжилттэй (HTML биш) */
export class LoginTextDto {
  @ApiProperty({ type: String, maxLength: LOGIN_TEXT_MAX })
  @IsString()
  @MaxLength(LOGIN_TEXT_MAX, { message: `Тайлбар ${LOGIN_TEXT_MAX} тэмдэгтээс хэтрэхгүй` })
  body: string;
}
