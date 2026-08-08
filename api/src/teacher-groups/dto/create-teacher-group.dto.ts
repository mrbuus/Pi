import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateTeacherGroupDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
