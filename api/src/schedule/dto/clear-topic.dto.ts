import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ClearTopicDto {
  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  date: string;
}
