import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertTopicDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  chapterId?: string;
}
