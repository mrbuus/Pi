import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  coverKey?: string;
}
