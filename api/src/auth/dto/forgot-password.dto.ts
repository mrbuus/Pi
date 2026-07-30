import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  // Утас, имэйл эсвэл нэвтрэх нэр — нэвтрэх маягттай ижил талбар.
  // MaxLength нь хэт урт мөрөөр өгөгдлийн санг ачаалахаас сэргийлнэ.
  @IsString()
  @IsNotEmpty({ message: 'Утасны дугаараа оруулна уу' })
  @MaxLength(120)
  identifier: string;
}
