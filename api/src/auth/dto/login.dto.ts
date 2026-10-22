import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  /**
   * «Намайг сана» (эзэн 2026-10-22): true → 30 хоног, false → 12 цаг (вэб
   * sessionStorage-д хадгална). Ирээгүй бол 7 хоног (хуучин клиент). session-ttl.ts
   */
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean({ message: '«Намайг сана» утга буруу байна' })
  remember?: boolean;
}
