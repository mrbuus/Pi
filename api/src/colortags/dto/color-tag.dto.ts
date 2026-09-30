import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SetColorTagDto {
  // Hex өнгө (ж: #34d6a8) эсвэл нэрлэсэн өнгө
  @ApiProperty({ type: String })
  @IsString()
  color: string;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
