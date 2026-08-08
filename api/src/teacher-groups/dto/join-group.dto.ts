import { IsString, IsNotEmpty, Length } from 'class-validator';

export class JoinGroupDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 8)
  joinCode: string;
}
