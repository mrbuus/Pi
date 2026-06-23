import { IsArray, IsOptional, IsString } from 'class-validator';

export class SubmitDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageKeys?: string[];

  @IsOptional()
  @IsString()
  note?: string;
}
