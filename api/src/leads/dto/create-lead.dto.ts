import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { LeadSubject } from '../../generated/prisma/enums';

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

  @IsEnum(LeadSubject)
  subject: LeadSubject;

  @IsInt()
  @Min(1)
  @Max(12)
  grade: number;
}
