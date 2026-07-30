import { IsDateString } from 'class-validator';

export class ClearTopicDto {
  @IsDateString()
  date: string;
}
