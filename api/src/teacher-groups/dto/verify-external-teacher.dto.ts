import { IsString, IsOptional, MaxLength } from 'class-validator';

export class VerifyExternalTeacherDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
