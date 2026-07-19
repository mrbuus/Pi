import { Matches } from 'class-validator';

export class SetAvatarDto {
  // /uploads-аас буцсан файлын key — аюулгүй нэрний хэлбэрийг хатуу шалгана
  @Matches(/^[\w][\w.-]*$/, { message: 'Буруу файлын key' })
  key: string;
}
