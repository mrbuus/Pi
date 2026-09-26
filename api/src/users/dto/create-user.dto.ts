import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Role } from '../../generated/prisma/enums';

export class CreateUserDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'Утасны дугаар 8 оронтой байх ёстой' })
  phone?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsEmail({}, { message: 'Имэйл хаяг буруу байна' })
  email?: string;

  // Зөвхөн role=STUDENT үед хэрэглэгдэнэ
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;
}
