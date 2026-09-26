import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddAssigneeDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
