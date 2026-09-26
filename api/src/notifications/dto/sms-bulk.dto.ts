import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ type: [String], minItems: 1, maxItems: 2000 })
  @IsArray()
  @ArrayMinSize(1)
  // Нэг батчийн дээд хэмжээ — санамсаргүй бүх сурагч руу давхар илгээхээс
  // сэргийлнэ (359 сурагч + эцэг эх багтана)
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  phones: string[];

  @ApiProperty({ type: String, maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  text: string;

  @ApiPropertyOptional({ enum: ['NOTIFICATION', 'MARKETING', 'REMINDER'] })
  @IsOptional()
  @IsIn(['NOTIFICATION', 'MARKETING', 'REMINDER'])
  kind?: string;

  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
