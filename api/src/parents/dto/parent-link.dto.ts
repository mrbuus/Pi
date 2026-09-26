import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class RequestParentLinkDto {
  @ApiProperty({ type: String })
  @Matches(/^\d{8}$/, { message: 'Сурагчийн утас 8 оронтой байх ёстой' })
  @IsNotEmpty()
  studentPhone: string;
}
