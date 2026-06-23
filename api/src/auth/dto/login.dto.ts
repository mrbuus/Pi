import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Нэвтрэхдээ утас, имэйл эсвэл username аль нэгийг бичнэ.
// `phone`-ийг хуучин клиенттэй нийцтэй байлгахын тулд хадгалсан —
// шинэ клиент `identifier`-ээр (аль ч төрөл) илгээж болно.
export class LoginDto {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
