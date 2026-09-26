import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class JoinGroupDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @Length(6, 8)
  joinCode: string;
}
