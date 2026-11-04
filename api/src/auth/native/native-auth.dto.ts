import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// ValidationPipe({whitelist:true}) decorator-гүй талбарыг чимээгүй хасдаг тул заавал.
export class GoogleNativeDto {
  @ApiProperty({ description: 'Google Sign-In SDK-ийн idToken' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  idToken: string;

  @ApiPropertyOptional({ description: '«Намайг сана» (session-ttl.ts)' })
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}

export class AppleNativeDto {
  @ApiProperty({ description: 'Sign in with Apple-ийн identityToken (JWT)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  identityToken: string;

  @ApiPropertyOptional({ description: 'Апп Apple-д өгсөн nonce (түүхий утга)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nonce?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
