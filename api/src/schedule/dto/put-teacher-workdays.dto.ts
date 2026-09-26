import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
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
}
