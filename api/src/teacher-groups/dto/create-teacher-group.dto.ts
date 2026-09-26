import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateTeacherGroupDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
