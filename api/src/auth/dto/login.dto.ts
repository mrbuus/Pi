import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Нэвтрэхдээ утас, имэйл эсвэл username аль нэгийг бичнэ.
// `phone`-ийг хуучин клиенттэй нийцтэй байлгахын тулд хадгалсан —
// шинэ клиент `identifier`-ээр (аль ч төрөл) илгээж болно.
export class LoginDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ type: String, writeOnly: true })
  @IsString()
  @IsNotEmpty()
  password: string;
}
