import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Subject } from '../../generated/prisma/enums';

/**
 * "Энэ ба цаашдын бүх хичээл"-ийг өөрчлөх.
 *
 * `from` огнооноос эхлэн шинэ утга үйлчилнэ. Түүнээс өмнөх түүх (ирц,
 * гэрийн даалгавар, сэдэв) ХЭВЭЭР үлдэнэ.
 *
 * Талбар өгөөгүй бол хуучин утга нь өвлөгдөнө — жишээ нь зөвхөн цагийг
 * солихыг хүсвэл startMinute/endMinute-ыг л явуулна.
 */
export class SplitSeriesDto {
  @IsDateString()
  from: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute?: number;

  // null явуулбал багшийг САЛГАНА (ангийн үндсэн багш руу буцна).
  @IsOptional()
  @IsString()
  teacherId?: string | null;

  @IsOptional()
  @IsString()
  room?: string | null;

  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject | null;
}
