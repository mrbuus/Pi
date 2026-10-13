import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PutTeacherWorkDaysDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  // Хоосон массив = багш "тогтмол ажлын өдөргүй" болгоно (бүхнийг цэвэрлэнэ)
  @ApiProperty({ type: [Number], minimum: 0, maximum: 6 })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];

  // 0 = 7 хоног бүр (анхдагч), 1 = СОНДГОЙ, 2 = ТЭГШ 7 хоног.
  // Зөвхөн энэ ээлжийн мөрүүдийг солино.
  @ApiPropertyOptional({ type: Number, enum: [0, 1, 2], default: 0 })
  @IsOptional()
  @IsIn([0, 1, 2])
  parity?: number;

  // Хүснэгтийн мөрийн дараалал (өгөхгүй бол өмнөхөөрөө / хамгийн сүүлд).
  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
