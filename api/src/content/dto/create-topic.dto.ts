import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

// БҮТ-ийн үндсэн агуулгын муж (Тоо тоолол, Алгебр, Функц, Геометр, Магадлал...)
export class CreateTopicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
