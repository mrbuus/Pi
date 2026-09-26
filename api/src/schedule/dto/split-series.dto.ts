import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  from: string;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 1439 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute?: number;

  // null явуулбал багшийг САЛГАНА (ангийн үндсэн багш руу буцна).
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  teacherId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  room?: string | null;

  @ApiPropertyOptional({ enum: Subject, nullable: true })
  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject | null;
}
