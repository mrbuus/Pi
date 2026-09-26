import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SubmitDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageKeys?: string[];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  note?: string;
}
