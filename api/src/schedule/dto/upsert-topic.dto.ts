import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertTopicDto {
  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  chapterId?: string;
}
