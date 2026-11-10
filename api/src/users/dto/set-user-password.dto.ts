import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Админ нууц үг тохируулах. `password` өгөөгүй бол утасны дугаар руу буцаана.
export class SetUserPasswordDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  password?: string;
}
