import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class SetAvatarDto {
  // /uploads-аас буцсан файлын key — аюулгүй нэрний хэлбэрийг хатуу шалгана
  @ApiProperty({ type: String })
  @Matches(/^[\w][\w.-]*$/, { message: 'Буруу файлын key' })
  key: string;
}
