import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * «Танхим солих»: `id` мөрийн анги `otherId` мөрийн ангитай танхимаа `from`
 * огнооноос эхлэн солино. Хэрэв `id` мөрийн гараг/цаг/багш бас өөрчлөгдөж байвал
 * тэдгээрийг хамт явуулна (шинэ утгаараа нөгөө ангитай давхцаж байх ёстой).
 */
export class SwapRoomDto {
  @ApiProperty()
  @IsString()
  otherId: string;

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

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  teacherId?: string | null;
}
