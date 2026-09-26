import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// ValidationPipe({whitelist:true}) decorator-гүй талбарыг чимээгүй хасдаг тул заавал.
export class GoogleExchangeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  code: string;
}
