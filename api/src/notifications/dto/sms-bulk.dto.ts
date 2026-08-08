import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/*
 * Бөөн SMS-ийн DTO — талбар бүр валидацитай.
 *
 * ⚠️ Өмнө нь контроллер энгийн interface хэрэглэдэг байсан тул хоосон биетэй
 * хүсэлт `request.phones.map` дээр 500 өгдөг байв (smoke test-ээр илэрсэн).
 * class-validator ангид сольсноор ValidationPipe хоосон/буруу биеийг 400
 * болгож, service-д ХЭЗЭЭ Ч undefined ирэхгүй.
 */
export class SmsBulkDto {
  @IsArray()
  @ArrayMinSize(1)
  // Нэг батчийн дээд хэмжээ — санамсаргүй бүх сурагч руу давхар илгээхээс
  // сэргийлнэ (359 сурагч + эцэг эх багтана)
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  phones: string[];

  @IsString()
  @MaxLength(1000)
  text: string;

  @IsOptional()
  @IsIn(['NOTIFICATION', 'MARKETING', 'REMINDER'])
  kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
