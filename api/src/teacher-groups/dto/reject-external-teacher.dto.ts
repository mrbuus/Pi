import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectExternalTeacherDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(450)
  reason: string;
}
