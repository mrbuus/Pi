import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ type: String })
  @Matches(/^\d{6}$/, { message: 'Код 6 оронтой байх ёстой' })
  @IsNotEmpty()
  code: string;
}
