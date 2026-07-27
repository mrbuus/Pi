import { IsNotEmpty, IsString } from 'class-validator';

export class AddAssigneeDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
