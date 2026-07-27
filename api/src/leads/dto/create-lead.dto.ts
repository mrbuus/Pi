import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Subject } from '../../generated/prisma/enums';

// Монгол гар утасны дугаар: зайг арилгаад яг 8 оронтой байх ёстой
// (үйлчилгээ үзүүлэгчийн кодтой холилдохоос сэргийлж +976 угтвар авахгүй —
// хэрэглэгч зөвхөн 8 оронтой дугаараа бичнэ).
const PHONE_REGEX = /^[0-9]{8}$/;

export class CreateLeadDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 100, { message: 'Нэр 2-100 тэмдэгтийн хооронд байх ёстой' })
  name: string;

  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @Matches(PHONE_REGEX, {
    message: 'Утасны дугаар 8 оронтой байх ёстой (жишээ: 99112233)',
  })
  phone: string;

  // 1–3 хичээл сонгож болно, давхцалгүй байх ёстой. Тухайн хичээл
  // нээлттэй эсэхийг сервер тал (LeadsService.create) жинхэнээр шалгана.
  @IsArray()
  @ArrayMinSize(1, { message: 'Хамгийн багадаа 1 хичээл сонгоно уу' })
  @ArrayMaxSize(3, { message: 'Хамгийн ихдээ 3 хичээл сонгож болно' })
  @ArrayUnique({ message: 'Хичээл давхцаж болохгүй' })
  @IsEnum(Subject, { each: true })
  subjects: Subject[];

  @IsInt()
  @Min(1)
  @Max(12)
  grade: number;
}
