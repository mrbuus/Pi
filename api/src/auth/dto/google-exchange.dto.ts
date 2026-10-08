import { IsNotEmpty, IsString } from 'class-validator';

/** Google callback-оос ирсэн нэг удаагийн кодыг JWT-ээр солих DTO. */
export class GoogleExchangeDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
